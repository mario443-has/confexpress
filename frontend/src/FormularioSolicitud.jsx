import { useState } from "react";
import { NOMBRE_NEGOCIO, WHATSAPP_NUMERO } from "./config.js";
import { obtenerToken } from "./api.js";
import EditorMedidas from "./EditorMedidas.jsx";

const ITEM_VACIO = {
  tipos: [],
  valores: {},
  producto_id: "",
  descripcion: "",
  cantidad: 1,
  talla: "",
  especificaciones: "",
};

export default function FormularioSolicitud({ productos, modoAdmin = false, medidas = null }) {
  const [origen, setOrigen] = useState("presencial");

  function prendasDelItem(it) {
    if (!medidas) return [];
    return it.tipos.map((tipoId) => {
      const tipo = medidas.catalogo.find((t) => t.id === tipoId);
      return {
        tipo_prenda_id: tipoId,
        medidas: (tipo ? tipo.medidas : [])
          .map((m) => ({ medida_id: m.id, valor: it.valores[`${tipoId}-${m.id}`] }))
          .filter((m) => m.valor !== undefined && String(m.valor).trim() !== ""),
      };
    });
  }
  const endpoint = modoAdmin ? "/api/admin/solicitudes" : "/api/solicitudes";
  const encabezados = {
    "Content-Type": "application/json",
    ...(modoAdmin ? { Authorization: `Bearer ${obtenerToken() ?? ""}` } : {}),
  };
  const [cliente, setCliente] = useState({ nombre: "", telefono: "", correo: "" });
  const [observaciones, setObservaciones] = useState("");
  const [items, setItems] = useState([{ ...ITEM_VACIO }]);
  const [autoriza, setAutoriza] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(null);

  const hayAMedida = items.some((it) => {
    const p = productos.find((x) => String(x.id) === String(it.producto_id));
    return p && Boolean(p.a_medida);
  });

  function cambiarCliente(campo, valor) {
    setCliente({ ...cliente, [campo]: valor });
  }

  function cambiarItem(indice, campo, valor) {
    setItems(items.map((it, i) => (i === indice ? { ...it, [campo]: valor } : it)));
  }

  function elegirProducto(indice, id) {
    const producto = productos.find((p) => String(p.id) === id);
    setItems(
      items.map((it, i) => {
        if (i !== indice) return it;
        const descripcion = !it.descripcion && producto ? producto.nombre : it.descripcion;
        const tipos =
          modoAdmin && producto && producto.a_medida && medidas
            ? medidas.precargas[producto.id] ?? []
            : [];
        return { ...it, producto_id: id, descripcion, tipos, valores: {} };
      })
    );
  }

  function agregarItem() {
    setItems([...items, { ...ITEM_VACIO }]);
  }

  function quitarItem(indice) {
    setItems(items.filter((_, i) => i !== indice));
  }

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setExito(null);
    setEnviando(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: encabezados,
        body: JSON.stringify({
          ...cliente,
          observaciones,
          autoriza_datos: autoriza,
          ...(modoAdmin ? { origen } : {}),
          items: items.map((it) => ({
            ...it,
            producto_id: it.producto_id ? Number(it.producto_id) : null,
            cantidad: Number(it.cantidad),
            ...(modoAdmin ? { prendas: prendasDelItem(it) } : {}),
          })),
        }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error || "No se pudo enviar la solicitud.");
      setExito(datos.id);
      setCliente({ nombre: "", telefono: "", correo: "" });
      setObservaciones("");
      setItems([{ ...ITEM_VACIO }]);
      setAutoriza(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const enlaceWhatsApp = WHATSAPP_NUMERO
    ? `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
        `Hola, quiero cotizar un trabajo con ${NOMBRE_NEGOCIO}.`
      )}`
    : null;

  return (
    <section className="formulario">
      <h2>{modoAdmin ? "Registrar solicitud (cliente en el local o por WhatsApp)" : "Solicitar cotización"}</h2>
      <p className="ayuda" hidden={modoAdmin}>
        Cuéntanos qué necesitas. El negocio revisará tu solicitud y te contactará con la cotización.
      </p>

      <form onSubmit={enviar}>
        <div className="grupo">
          <label>Nombre *</label>
          <input
            value={cliente.nombre}
            onChange={(e) => cambiarCliente("nombre", e.target.value)}
            required
          />
        </div>
        <div className="fila">
          <div className="grupo">
            <label>Teléfono / WhatsApp *</label>
            <input
              value={cliente.telefono}
              onChange={(e) => cambiarCliente("telefono", e.target.value)}
              required
            />
          </div>
          <div className="grupo">
            <label>Correo (opcional)</label>
            <input
              value={cliente.correo}
              onChange={(e) => cambiarCliente("correo", e.target.value)}
            />
          </div>
        </div>

        <h3>Qué necesitas</h3>
        {items.map((it, i) => (
          <div key={i} className="item">
            <div className="fila">
              <div className="grupo">
                <label>Producto o servicio del catálogo</label>
                <select
                  value={it.producto_id}
                  onChange={(e) => elegirProducto(i, e.target.value)}
                >
                  <option value="">Otro / no está en el catálogo</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grupo">
                <label>Descripción *</label>
                <input
                  value={it.descripcion}
                  onChange={(e) => cambiarItem(i, "descripcion", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="fila">
              <div className="grupo">
                <label>Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  value={it.cantidad}
                  onChange={(e) => cambiarItem(i, "cantidad", e.target.value)}
                  required
                />
              </div>
              <div className="grupo">
                <label>Talla (uniformes escolares)</label>
                <input
                  value={it.talla}
                  onChange={(e) => cambiarItem(i, "talla", e.target.value)}
                />
              </div>
            </div>
            <div className="grupo">
              <label>Especificaciones (diseño, colores, logo, etc.)</label>
              <textarea
                rows="2"
                value={it.especificaciones}
                onChange={(e) => cambiarItem(i, "especificaciones", e.target.value)}
              />
            </div>
            {modoAdmin &&
              medidas &&
              productos.some((p) => String(p.id) === String(it.producto_id) && p.a_medida) && (
                <EditorMedidas
                  catalogo={medidas.catalogo}
                  tipos={it.tipos}
                  valores={it.valores}
                  cantidad={Number(it.cantidad)}
                  alCambiarTipos={(t) => cambiarItem(i, "tipos", t)}
                  alCambiarValores={(v) => cambiarItem(i, "valores", v)}
                />
              )}
            {items.length > 1 && (
              <button type="button" className="secundario" onClick={() => quitarItem(i)}>
                Quitar este ítem
              </button>
            )}
          </div>
        ))}

        {hayAMedida && !modoAdmin && (
          <p className="aviso">
            Este trabajo se confecciona a la medida. Las medidas y los materiales se
            definen en persona; cuéntanos tu diseño y te contactaremos para coordinarlo.
          </p>
        )}

        <button type="button" className="secundario" onClick={agregarItem}>
          + Agregar otro producto o talla
        </button>

        <div className="grupo">
          <label>Observaciones generales</label>
          <textarea
            rows="3"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        {modoAdmin && (
          <div className="grupo">
            <label>¿Cómo llegó este cliente?</label>
            <select value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="presencial">En el local</option>
              <option value="whatsapp">Por WhatsApp</option>
            </select>
          </div>
        )}
        <label className="autorizacion">
          <input
            type="checkbox"
            checked={autoriza}
            onChange={(e) => setAutoriza(e.target.checked)}
            required
          />
          <span>
            {modoAdmin ? "El cliente autoriza a " : "Autorizo a "}{NOMBRE_NEGOCIO} el tratamiento de {modoAdmin ? "sus" : "mis"} datos personales (nombre, teléfono y
            correo) para gestionar esta solicitud. *
          </span>
        </label>

        {error && <p className="error">{error}</p>}
        {exito && (
          <p className="exito">
            {modoAdmin
              ? `Solicitud #${exito} registrada.`
              : `Solicitud #${exito} enviada. El negocio la revisará y te contactará.`}
          </p>
        )}

        <div className="acciones">
          <button type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar solicitud"}
          </button>
          {enlaceWhatsApp && !modoAdmin && (
            <a className="boton-whatsapp" href={enlaceWhatsApp} target="_blank" rel="noreferrer">
              Hablar por WhatsApp
            </a>
          )}
        </div>
      </form>
    </section>
  );
}