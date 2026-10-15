import { useState } from "react";
import { NOMBRE_NEGOCIO, WHATSAPP_NUMERO } from "./config.js";

const ITEM_VACIO = {
  producto_id: "",
  descripcion: "",
  cantidad: 1,
  talla: "",
  especificaciones: "",
};

export default function FormularioSolicitud({ productos }) {
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
        return { ...it, producto_id: id, descripcion };
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
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cliente,
          observaciones,
          autoriza_datos: autoriza,
          items: items.map((it) => ({
            ...it,
            producto_id: it.producto_id ? Number(it.producto_id) : null,
            cantidad: Number(it.cantidad),
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
      <h2>Solicitar cotización</h2>
      <p className="ayuda">
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
            {items.length > 1 && (
              <button type="button" className="secundario" onClick={() => quitarItem(i)}>
                Quitar este ítem
              </button>
            )}
          </div>
        ))}

        {hayAMedida && (
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

        <label className="autorizacion">
          <input
            type="checkbox"
            checked={autoriza}
            onChange={(e) => setAutoriza(e.target.checked)}
            required
          />
          <span>
            Autorizo a {NOMBRE_NEGOCIO} el tratamiento de mis datos personales (nombre, teléfono y
            correo) para gestionar esta solicitud. *
          </span>
        </label>

        {error && <p className="error">{error}</p>}
        {exito && (
          <p className="exito">
            Solicitud #{exito} enviada. El negocio la revisará y te contactará.
          </p>
        )}

        <div className="acciones">
          <button type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar solicitud"}
          </button>
          {enlaceWhatsApp && (
            <a className="boton-whatsapp" href={enlaceWhatsApp} target="_blank" rel="noreferrer">
              Hablar por WhatsApp
            </a>
          )}
        </div>
      </form>
    </section>
  );
}