import { useEffect, useState } from "react";
import { llamarAdmin } from "./api.js";

const FORMULARIO_VACIO = {
  nombre: "",
  descripcion: "",
  tipo: "producto",
  categoria: "",
  precio_referencia: "",
  modalidad: "requiere_consulta",
  a_medida: false,
  destacado: false,
};

const dinero = (valor) =>
  valor === null || valor === undefined
    ? "Consultar precio"
    : Number(valor).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      });

export default function AdminCatalogo({ alExpirar }) {
  const [productos, setProductos] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [editando, setEditando] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [imagenEdicion, setImagenEdicion] = useState({});
  const [productoModalId, setProductoModalId] = useState(null);

  async function cargarProductos(silencioso = false) {
    if (!silencioso) setCargando(true);
    setError("");
    try {
      const datos = await llamarAdmin("/catalogo");
      setProductos(Array.isArray(datos) ? datos : []);
    } catch (e) {
      if (e.estado === 401) {
        alExpirar?.();
        return;
      }
      setError(e.message || "No fue posible cargar el catálogo.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(() => setMensaje(""), 3500);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  useEffect(() => {
    if (productoModalId === null) return;
    const alTeclear = (e) => {
      if (e.key === "Escape") setProductoModalId(null);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [productoModalId]);

  function cambiarCampo(e) {
    const { name, value, type, checked } = e.target;
    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function prepararEdicion(producto) {
    setEditando(producto.id);
    setFormulario({
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      tipo: producto.tipo || "producto",
      categoria: producto.categoria || "",
      precio_referencia: producto.precio_referencia ?? "",
      modalidad: producto.modalidad || "requiere_consulta",
      a_medida: Boolean(Number(producto.a_medida)),
      destacado: Boolean(Number(producto.destacado)),
    });
    setArchivos([]);
    setMensaje("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpiarFormulario() {
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setArchivos([]);
    setMensaje("");
    setError("");
  }

  async function guardarProducto(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const datos = {
      ...formulario,
      precio_referencia:
        formulario.precio_referencia === ""
          ? null
          : Number(formulario.precio_referencia),
      categoria: formulario.categoria.trim() || null,
    };

    try {
      let respuesta;
      if (editando) {
        respuesta = await llamarAdmin(`/catalogo/${editando}`, {
          method: "PUT",
          body: JSON.stringify(datos),
        });
      } else {
        respuesta = await llamarAdmin("/catalogo", {
          method: "POST",
          body: JSON.stringify(datos),
        });
      }

      const idProducto = editando || respuesta.id;

      if (archivos.length && idProducto) {
        const formData = new FormData();
        archivos.forEach((archivo) => formData.append("imagenes", archivo));
        await llamarAdmin(`/catalogo/${idProducto}/imagenes`, {
          method: "POST",
          body: formData,
        });
      }

      await cargarProductos(true);
      setEditando(null);
      setFormulario(FORMULARIO_VACIO);
      setArchivos([]);
      setMensaje(
        archivos.length
          ? "Producto guardado e imágenes cargadas correctamente."
          : "Producto guardado correctamente."
      );
    } catch (e) {
      if (e.estado === 401) {
        alExpirar?.();
        return;
      }
      setError(e.message || "No fue posible guardar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  function seleccionarArchivos(e) {
    const seleccion = Array.from(e.target.files || []);
    if (seleccion.length > 8) {
      setError("Puedes seleccionar máximo 8 imágenes por carga.");
      setArchivos([]);
      e.target.value = "";
      return;
    }
    const formatos = ["image/jpeg", "image/png", "image/webp"];
    const invalido = seleccion.find(
      (archivo) => !formatos.includes(archivo.type) || archivo.size > 5 * 1024 * 1024
    );
    if (invalido) {
      setError("Usa imágenes JPG, PNG o WEBP de máximo 5 MB cada una.");
      setArchivos([]);
      e.target.value = "";
      return;
    }
    setError("");
    setArchivos(seleccion);
  }

  async function cambiarEstadoProducto(producto) {
    const nuevoEstado = !Boolean(Number(producto.activo));
    if (!window.confirm(
      `${nuevoEstado ? "¿Activar" : "Desactivar"} "${producto.nombre}"?`
    )) return;

    try {
      setError("");
      await llamarAdmin(`/catalogo/${producto.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ activo: nuevoEstado }),
      });
      await cargarProductos(true);
      setMensaje("Estado del producto actualizado.");
    } catch (e) {
      if (e.estado === 401) return alExpirar?.();
      setError(e.message);
    }
  }

  async function guardarImagen(imagen) {
    const datos = imagenEdicion[imagen.id] || {};
    try {
      setError("");
      await llamarAdmin(`/catalogo/imagenes/${imagen.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          titulo: datos.titulo ?? imagen.titulo,
          descripcion: datos.descripcion ?? imagen.descripcion ?? "",
          orden: datos.orden ?? imagen.orden,
        }),
      });
      await cargarProductos(true);
      setMensaje("Información de la imagen actualizada.");
    } catch (e) {
      if (e.estado === 401) return alExpirar?.();
      setError(e.message);
    }
  }

  async function cambiarEstadoImagen(imagen) {
    const nuevoEstado = !Boolean(Number(imagen.activo));
    try {
      setError("");
      await llamarAdmin(`/catalogo/imagenes/${imagen.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ activo: nuevoEstado }),
      });
      await cargarProductos(true);
      setMensaje("Estado de la imagen actualizado.");
    } catch (e) {
      if (e.estado === 401) return alExpirar?.();
      setError(e.message);
    }
  }

  function cambiarDatoImagen(id, campo, valor) {
    setImagenEdicion((actual) => ({
      ...actual,
      [id]: { ...actual[id], [campo]: valor },
    }));
  }

  const baseImagen = import.meta.env.DEV ? "http://localhost:3001" : "";

  return (
    <section className="catalogo-admin">
      <h2>Administrar catálogo</h2>
      <p>Agrega productos o servicios, modifica sus datos y administra sus fotografías.</p>

      {error && <p className="error">{error}</p>}
      {mensaje && <div className="toast" role="status">{mensaje}</div>}

      <form className="formulario" onSubmit={guardarProducto}>
        <h3>{editando ? "Editar producto o servicio" : "Agregar al catálogo"}</h3>

        <div className="fila">
          <div className="grupo">
            <label htmlFor="catalogo-nombre">Nombre *</label>
            <input
              id="catalogo-nombre"
              name="nombre"
              value={formulario.nombre}
              onChange={cambiarCampo}
              maxLength={120}
              required
            />
          </div>
          <div className="grupo">
            <label htmlFor="catalogo-tipo">Tipo *</label>
            <select id="catalogo-tipo" name="tipo" value={formulario.tipo} onChange={cambiarCampo}>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
            </select>
          </div>
        </div>

        <div className="fila">
          <div className="grupo">
            <label htmlFor="catalogo-categoria">Categoría</label>
            <input
              id="catalogo-categoria"
              name="categoria"
              value={formulario.categoria}
              onChange={cambiarCampo}
              maxLength={60}
              placeholder="Ej. Uniformes, arreglos..."
            />
          </div>
          <div className="grupo">
            <label htmlFor="catalogo-precio">Precio de referencia (COP)</label>
            <input
              id="catalogo-precio"
              name="precio_referencia"
              type="number"
              min="0"
              step="100"
              value={formulario.precio_referencia}
              onChange={cambiarCampo}
              placeholder="Dejar vacío para consultar"
            />
          </div>
        </div>

        <div className="grupo">
          <label htmlFor="catalogo-modalidad">Modalidad</label>
          <select
            id="catalogo-modalidad"
            name="modalidad"
            value={formulario.modalidad}
            onChange={cambiarCampo}
          >
            <option value="entrega_inmediata">Entrega inmediata</option>
            <option value="por_encargo">Por encargo</option>
            <option value="requiere_consulta">Requiere consulta</option>
          </select>
        </div>

        <div className="grupo">
          <label htmlFor="catalogo-descripcion">Descripción</label>
          <textarea
            id="catalogo-descripcion"
            name="descripcion"
            rows="3"
            value={formulario.descripcion}
            onChange={cambiarCampo}
          />
        </div>

        <div className="fila">
          <label className="autorizacion">
            <input
              type="checkbox"
              name="a_medida"
              checked={formulario.a_medida}
              onChange={cambiarCampo}
            />
            Se puede elaborar a medida
          </label>
          <label className="autorizacion">
            <input
              type="checkbox"
              name="destacado"
              checked={formulario.destacado}
              onChange={cambiarCampo}
            />
            Mostrar como destacado
          </label>
        </div>

        <div className="grupo">
          <label htmlFor="catalogo-imagenes">
            Imágenes {editando ? "(puedes agregar más)" : "(puedes cargarlas después de crear)"}
          </label>
          <input
            id="catalogo-imagenes"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={seleccionarArchivos}
          />
          <span className="nota">Máximo 8 imágenes por carga. JPG, PNG o WEBP de hasta 5 MB cada una.</span>
          {archivos.length > 0 && (
            <span className="nota">{archivos.length} imagen(es) seleccionada(s).</span>
          )}
        </div>

        <div className="acciones">
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}
          </button>
          {editando && (
            <button type="button" className="secundario" onClick={limpiarFormulario}>
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: 28 }}>
        <h3>Productos y servicios registrados</h3>
        {cargando ? (
          <p>Cargando catálogo...</p>
        ) : productos.length === 0 ? (
          <p>Aún no hay productos registrados.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
            {productos.map((producto) => (
              <article
                key={producto.id}
                style={{ background: "#fff", border: "1px solid #dce2e8", borderRadius: 10, padding: 16 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <strong>{producto.nombre}</strong>
                  <span className="nota">{Boolean(Number(producto.activo)) ? "Activo" : "Inactivo"}</span>
                </div>
                <p className="nota">
                  {producto.tipo} · {producto.categoria || "Sin categoría"}
                </p>
                <p>{dinero(producto.precio_referencia)}</p>
                {producto.descripcion && <p>{producto.descripcion}</p>}
                <p className="nota">
                  {producto.modalidad?.replaceAll("_", " ")}
                  {Boolean(Number(producto.a_medida)) ? " · A medida" : ""}
                  {Boolean(Number(producto.destacado)) ? " · Destacado" : ""}
                </p>

                <div className="acciones">
                  <button type="button" onClick={() => prepararEdicion(producto)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="secundario"
                    onClick={() => cambiarEstadoProducto(producto)}
                  >
                    {Boolean(Number(producto.activo)) ? "Desactivar" : "Activar"}
                  </button>
                </div>

                <div style={{ marginTop: 16 }}>
                  <strong>Imágenes ({producto.imagenes?.length || 0})</strong>
                  {!producto.imagenes?.length && <p className="nota">Sin imágenes todavía.</p>}
                  {Boolean(producto.imagenes?.length) && (
                    <div className="miniaturas">
                      {producto.imagenes.slice(0, 4).map((imagen) => (
                        <img
                          key={imagen.id}
                          src={`${baseImagen}${imagen.ruta_imagen}`}
                          alt={imagen.titulo || producto.nombre}
                        />
                      ))}
                      {producto.imagenes.length > 4 && (
                        <span className="mas">+{producto.imagenes.length - 4}</span>
                      )}
                    </div>
                  )}
                  <button type="button" className="secundario" onClick={() => setProductoModalId(producto.id)}>
                    Administrar imágenes
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {productoModalId !== null && (() => {
        const producto = productos.find((p) => p.id === productoModalId);
        if (!producto) return null;
        return (
          <div className="modal-fondo" onClick={() => setProductoModalId(null)}>
            <div className="modal-caja" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="modal-cabecera">
                <h3>Imágenes de {producto.nombre}</h3>
                <button type="button" className="secundario" style={{ marginBottom: 0 }} onClick={() => setProductoModalId(null)}>
                  Cerrar
                </button>
              </div>
              <div className="modal-cuerpo">
                {!producto.imagenes?.length && (
                  <p className="nota">Sin imágenes todavía. Puedes cargarlas al editar el producto.</p>
                )}
                <div className="modal-rejilla">
                  {(producto.imagenes || []).map((imagen) => {
                    const datos = imagenEdicion[imagen.id] || {};
                    return (
                      <div key={imagen.id} className="modal-imagen">
                        <img
                          className={Boolean(Number(imagen.activo)) ? "" : "oculta"}
                          src={`${baseImagen}${imagen.ruta_imagen}`}
                          alt={imagen.titulo || producto.nombre}
                        />
                        <div className="grupo">
                          <label>Título</label>
                          <input
                            value={datos.titulo ?? imagen.titulo}
                            maxLength={120}
                            onChange={(e) => cambiarDatoImagen(imagen.id, "titulo", e.target.value)}
                          />
                        </div>
                        <div className="grupo">
                          <label>Descripción de imagen</label>
                          <input
                            value={datos.descripcion ?? imagen.descripcion ?? ""}
                            maxLength={255}
                            onChange={(e) => cambiarDatoImagen(imagen.id, "descripcion", e.target.value)}
                          />
                        </div>
                        <div className="grupo">
                          <label>Orden</label>
                          <input
                            type="number"
                            value={datos.orden ?? imagen.orden}
                            onChange={(e) => cambiarDatoImagen(imagen.id, "orden", Number(e.target.value))}
                          />
                        </div>
                        <div className="acciones">
                          <button type="button" onClick={() => guardarImagen(imagen)}>
                            Guardar imagen
                          </button>
                          <button type="button" className="secundario" onClick={() => cambiarEstadoImagen(imagen)}>
                            {Boolean(Number(imagen.activo)) ? "Ocultar imagen" : "Mostrar imagen"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
