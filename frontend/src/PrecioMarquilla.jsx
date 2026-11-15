import { useEffect, useState } from "react";
import { llamarAdmin } from "./api.js";

// Precio de la marquilla personalizada: es un valor del negocio, no de una prenda.
// La pagina lo lee de /api/configuracion; aqui el administrador lo cambia.

export default function PrecioMarquilla() {
  const [precio, setPrecio] = useState("");
  const [vigente, setVigente] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((datos) => {
        setPrecio(String(datos.precio_marquilla));
        setVigente(datos.precio_marquilla);
      })
      .catch(() => setError("No se pudo cargar el precio de la marquilla."));
  }, []);

  async function guardar() {
    setMensaje("");
    setError("");
    if (precio === "") {
      setError("Escribe el precio de la marquilla en pesos.");
      return;
    }
    setGuardando(true);
    try {
      const respuesta = await llamarAdmin("/configuracion/marquilla", {
        method: "PUT",
        body: JSON.stringify({ precio: Number(precio) }),
      });
      setVigente(respuesta.precio_marquilla);
      setMensaje("Precio de la marquilla guardado.");
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="medidas-item">
      <h4>Precio de la marquilla personalizada</h4>
      <p className="nota">
        Es un valor fijo por prenda. Se muestra en la página y se suma a las prendas que lleven marquilla.
      </p>
      <div className="fila">
        <div className="grupo">
          <label>Precio por prenda ($)</label>
          <input
            inputMode="numeric"
            value={precio}
            onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))}
            style={{ width: 140 }}
          />
        </div>
      </div>
      <button type="button" onClick={guardar} disabled={guardando || vigente === null}>
        {guardando ? "Guardando..." : "Guardar precio"}
      </button>
      {mensaje && <p className="exito">{mensaje}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}