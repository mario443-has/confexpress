import { useEffect, useState } from "react";
import { llamarAdmin } from "./api.js";

function iniciales(nombre) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function Escudo({ colegio, tamano = 56 }) {
  const base = { width: tamano, height: tamano, borderRadius: "50%", flexShrink: 0 };
  if (colegio.escudo) {
    return (
      <img
        src={colegio.escudo}
        alt={`Escudo de ${colegio.nombre}`}
        style={{ ...base, objectFit: "contain", background: "#fff", border: "1px solid #d9e2ec" }}
      />
    );
  }
  return (
    <div
      style={{
        ...base,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#d8eef0",
        color: "#0b4f63",
        fontWeight: 700,
      }}
    >
      {iniciales(colegio.nombre)}
    </div>
  );
}

export default function AdminColegios({ alExpirar }) {
  const [colegios, setColegios] = useState(null);
  const [nombre, setNombre] = useState("");
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function cargar() {
    try {
      setColegios(await llamarAdmin("/colegios"));
    } catch (e) {
      if (e.estado === 401) alExpirar();
      else setError(e.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function ejecutar(accion, exito) {
    setError("");
    setMensaje("");
    setOcupado(true);
    try {
      await accion();
      setMensaje(exito);
      await cargar();
      return true;
    } catch (e) {
      if (e.estado === 401) alExpirar();
      else setError(e.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function crear(e) {
    e.preventDefault();
    const ok = await ejecutar(
      () => llamarAdmin("/colegios", { method: "POST", body: JSON.stringify({ nombre }) }),
      "Colegio creado."
    );
    if (ok) setNombre("");
  }

  async function guardarNombre() {
    const ok = await ejecutar(
      () =>
        llamarAdmin(`/colegios/${editando.id}`, {
          method: "PUT",
          body: JSON.stringify({ nombre: editando.nombre }),
        }),
      "Nombre actualizado."
    );
    if (ok) setEditando(null);
  }

  function alternar(c) {
    return ejecutar(
      () =>
        llamarAdmin(`/colegios/${c.id}/estado`, {
          method: "PATCH",
          body: JSON.stringify({ activo: !c.activo }),
        }),
      c.activo ? "Colegio desactivado." : "Colegio activado."
    );
  }

  function subirEscudo(c, archivo) {
    if (!archivo) return;
    const formData = new FormData();
    formData.append("escudo", archivo);
    return ejecutar(
      () => llamarAdmin(`/colegios/${c.id}/escudo`, { method: "POST", body: formData }),
      "Escudo guardado."
    );
  }

  return (
    <section className="formulario" style={{ marginBottom: 24 }}>
      <h2>Colegios</h2>
      <p className="nota">
        Crea cada colegio y sube su escudo (JPG, PNG o WEBP, hasta 2 MB, mejor cuadrado). Después, al
        crear las prendas, marcas a qué colegios aplica cada una.
      </p>

      <form onSubmit={crear} className="acciones" style={{ marginBottom: 16 }}>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del colegio"
          style={{ flex: 1, minWidth: 220 }}
          required
        />
        <button type="submit" disabled={ocupado}>
          Crear colegio
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {mensaje && <p style={{ color: "#1b7f3b" }}>{mensaje}</p>}
      {!colegios && !error && <p>Cargando...</p>}
      {colegios && colegios.length === 0 && <p className="nota">Todavía no hay colegios.</p>}

      {colegios && colegios.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Escudo</th>
                <th>Colegio</th>
                <th>Prendas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {colegios.map((c) => (
                <tr key={c.id} style={c.activo ? undefined : { opacity: 0.55 }}>
                  <td>
                    <Escudo colegio={c} />
                  </td>
                  <td>
                    {editando && editando.id === c.id ? (
                      <input
                        value={editando.nombre}
                        onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      />
                    ) : (
                      c.nombre
                    )}
                  </td>
                  <td>{c.prendas}</td>
                  <td>{c.activo ? "Activo" : "Desactivado"}</td>
                  <td>
                    {editando && editando.id === c.id ? (
                      <>
                        <button type="button" onClick={guardarNombre} disabled={ocupado}>
                          Guardar
                        </button>{" "}
                        <button type="button" className="secundario" onClick={() => setEditando(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="secundario"
                          onClick={() => setEditando({ id: c.id, nombre: c.nombre })}
                        >
                          Cambiar nombre
                        </button>{" "}
                        <button type="button" className="secundario" onClick={() => alternar(c)} disabled={ocupado}>
                          {c.activo ? "Desactivar" : "Activar"}
                        </button>
                        <div className="nota" style={{ marginTop: 6 }}>
                          {c.escudo ? "Cambiar escudo" : "Subir escudo"}:{" "}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={ocupado}
                            onChange={(e) => {
                              const archivo = e.target.files[0];
                              e.target.value = "";
                              subirEscudo(c, archivo);
                            }}
                          />
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}