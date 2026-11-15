import { useEffect, useState } from "react";
import { llamarAdmin } from "./api.js";

const dinero = (valor) =>
  Number(valor).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

export default function ConfirmarCatalogo({ solicitudId, alExpirar, alCambiar }) {
  const [datos, setDatos] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    llamarAdmin(`/solicitudes/${solicitudId}/precios-catalogo`)
      .then((d) => {
        if (activo) setDatos(d);
      })
      .catch((e) => {
        if (!activo) return;
        if (e.estado === 401) alExpirar();
        else setErrorCarga(e.message);
      });
    return () => {
      activo = false;
    };
  }, [solicitudId, version]);

  if (errorCarga) return <p className="error">{errorCarga}</p>;
  if (!datos || !datos.algun_fijo) return null;

  const puedeConfirmar =
    datos.todo_fijo && !datos.ya_tiene_pedido && datos.solicitud.estado !== "cancelada";

  async function confirmar() {
    const pregunta =
      `¿Crear el pedido con estos precios por ${dinero(datos.total)}?\n\n` +
      "Antes de confirmar, verifica que tengas las prendas listas y que la fecha se pueda cumplir.";
    if (!window.confirm(pregunta)) return;
    setAviso(null);
    setOcupado(true);
    try {
      const r = await llamarAdmin(`/solicitudes/${solicitudId}/confirmar-catalogo`, {
        method: "POST",
      });
      setAviso({
        error: false,
        texto: `Pedido #${r.pedido_id} creado por ${dinero(r.total)}. Míralo en la pestaña Pedidos.`,
      });
      setVersion((v) => v + 1);
      alCambiar();
    } catch (e) {
      if (e.estado === 401) alExpirar();
      else setAviso({ error: true, texto: e.message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="medidas-item">
      <h4>Precios fijos del catálogo</h4>
      <p className="nota">
        Estas prendas tienen precio fijo: el cliente ya lo vio en la tienda, no hace falta cotizarlas de nuevo.
      </p>
      {datos.solicitud.fecha_requerida && (
        <p>
          <strong>Fecha en que lo necesita:</strong>{" "}
          {new Date(datos.solicitud.fecha_requerida).toLocaleDateString("es-CO")}
        </p>
      )}
      <div className="tabla-contenedor" style={{ marginBottom: 12 }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Detalle</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Marquilla</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {datos.items.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.descripcion}
                  {i.talla ? ` · talla ${i.talla}` : ""}
                  {i.especificaciones && <div className="nota">{i.especificaciones}</div>}
                </td>
                <td>{i.cantidad}</td>
                <td>{i.fijo ? dinero(i.precio) : "Cotizar"}</td>
                <td>
                  {i.con_marquilla ? (i.fijo ? `${dinero(i.marquilla_unitaria)} c/u` : "Sí") : "—"}
                </td>
                <td>{i.fijo ? dinero(i.subtotal) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {datos.ya_tiene_pedido ? (
        <p className="nota">Esta solicitud ya tiene un pedido.</p>
      ) : datos.todo_fijo ? (
        <>
          <h4>Total: {dinero(datos.total)}</h4>
          <div className="acciones">
            <button type="button" onClick={confirmar} disabled={ocupado || !puedeConfirmar}>
              {ocupado ? "Creando pedido..." : "Confirmar con precios del catálogo"}
            </button>
          </div>
        </>
      ) : (
        <p className="nota">
          Algunas líneas no tienen precio fijo (a la medida o sin precio): cotiza esta solicitud con el
          formulario de abajo.
        </p>
      )}
      {aviso && (
        <p className={aviso.error ? "error" : ""} style={aviso.error ? undefined : { color: "#1b7f3b" }}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}