import { useEffect, useState } from "react";
import { borrarToken, guardarToken, llamarAdmin, obtenerToken } from "./api.js";
import FormularioSolicitud from "./FormularioSolicitud.jsx";

const ESTADOS = {
  recibida: "Recibida",
  en_revision: "En revisión",
  cotizada: "Cotizada",
  cancelada: "Cancelada",
};
const ESTADOS_MANUALES = ["recibida", "en_revision", "cancelada"];
const ORIGENES = { web: "Web", presencial: "En el local", whatsapp: "WhatsApp" };

function fecha(valor) {
  return valor ? new Date(valor).toLocaleString("es-CO") : "—";
}

function useAdmin(ruta, alExpirar) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    setError("");
    llamarAdmin(ruta)
      .then((d) => activo && setDatos(d))
      .catch((e) => {
        if (!activo) return;
        if (e.estado === 401) alExpirar();
        else setError(e.message);
      });
    return () => {
      activo = false;
    };
  }, [ruta, version]);

  return { datos, error, recargar: () => setVersion((v) => v + 1) };
}

function Login({ alEntrar }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error || "No se pudo iniciar sesión.");
      guardarToken(datos.token);
      alEntrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="contenedor angosto">
      <section className="formulario">
        <h2>Panel administrativo</h2>
        <form onSubmit={entrar}>
          <div className="grupo">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </div>
  );
}

function ListaSolicitudes({ alAbrir, alExpirar }) {
  const { datos, error } = useAdmin("/solicitudes", alExpirar);
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p>Cargando...</p>;
  if (datos.length === 0) return <p>Todavía no hay solicitudes.</p>;

  return (
    <div className="tabla-contenedor">
      <table className="tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Teléfono</th>
            <th>Ítems</th>
            <th>Origen</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {datos.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{fecha(s.creada_en)}</td>
              <td>{s.cliente}</td>
              <td>{s.telefono}</td>
              <td>{s.items}</td>
              <td>{ORIGENES[s.origen]}</td>
              <td>
                <span className={`estado estado-${s.estado}`}>{ESTADOS[s.estado]}</span>
              </td>
              <td>
                <button className="secundario" onClick={() => alAbrir(s.id)}>
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetalleSolicitud({ id, alVolver, alExpirar }) {
  const { datos, error, recargar } = useAdmin(`/solicitudes/${id}`, alExpirar);
  const [mensaje, setMensaje] = useState("");

  async function cambiarEstado(estado) {
    setMensaje("");
    try {
      await llamarAdmin(`/solicitudes/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      recargar();
    } catch (e) {
      if (e.estado === 401) alExpirar();
      else setMensaje(e.message);
    }
  }

  return (
    <div>
      <button className="secundario" onClick={alVolver}>
        ← Volver a la lista
      </button>
      {error && <p className="error">{error}</p>}
      {!datos && !error && <p>Cargando...</p>}
      {datos && (
        <section className="formulario">
          <h2>
            Solicitud #{datos.id}{" "}
            <span className={`estado estado-${datos.estado}`}>{ESTADOS[datos.estado]}</span>
          </h2>
          <p>
            <strong>Cliente:</strong> {datos.cliente} · <strong>Teléfono:</strong> {datos.telefono}
            {datos.correo && (
              <>
                {" "}
                · <strong>Correo:</strong> {datos.correo}
              </>
            )}
          </p>
          <p>
            <strong>Recibida:</strong> {fecha(datos.creada_en)} · <strong>Origen:</strong>{" "}
            {ORIGENES[datos.origen]} ·{" "}
            <strong>Autorizó el tratamiento de datos:</strong>{" "}
            {datos.autorizacion_datos_en ? fecha(datos.autorizacion_datos_en) : "Sin registro"}
          </p>
          {datos.observaciones && (
            <p>
              <strong>Observaciones:</strong> {datos.observaciones}
            </p>
          )}

          <h3>Lo que pidió</h3>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Descripción</th>
                  <th>Cant.</th>
                  <th>Talla</th>
                  <th>Especificaciones</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      {it.producto ?? "Otro"}
                      {Boolean(it.a_medida) && <div className="nota">A la medida</div>}
                    </td>
                    <td>{it.descripcion_solicitada}</td>
                    <td>{it.cantidad}</td>
                    <td>{it.talla ?? "—"}</td>
                    <td>{it.especificaciones ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {datos.items.some((it) => it.a_medida) && (
            <>
              <h3>Medidas (en centímetros)</h3>
              {datos.items
                .filter((it) => it.a_medida)
                .map((it) => (
                  <MedidasItem key={it.id} item={it} alExpirar={alExpirar} />
                ))}
            </>
          )}

          <h3>Cambiar estado</h3>
          <div className="acciones">
            {ESTADOS_MANUALES.map((e) => (
              <button
                key={e}
                className="secundario"
                disabled={datos.estado === e}
                onClick={() => cambiarEstado(e)}
              >
                {ESTADOS[e]}
              </button>
            ))}
          </div>
          {mensaje && <p className="error">{mensaje}</p>}
        </section>
      )}
    </div>
  );
}

function MedidasItem({ item, alExpirar }) {
  const { datos, error } = useAdmin(`/items/${item.id}/medidas`, alExpirar);
  const [tipos, setTipos] = useState([]);
  const [valores, setValores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!datos) return;
    setTipos(datos.tipos);
    setValores(datos.valores);
  }, [datos]);

  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p>Cargando medidas...</p>;

  const catalogoPorId = Object.fromEntries(datos.catalogo.map((t) => [t.id, t]));
  const disponibles = datos.catalogo.filter((t) => !tipos.includes(t.id));

  async function guardar() {
    setMensaje("");
    setGuardando(true);
    try {
      const prendas = tipos.map((tipoId) => ({
        tipo_prenda_id: tipoId,
        medidas: catalogoPorId[tipoId].medidas
          .map((m) => ({ medida_id: m.id, valor: valores[`${tipoId}-${m.id}`] }))
          .filter((m) => m.valor !== undefined && String(m.valor).trim() !== ""),
      }));
      await llamarAdmin(`/items/${item.id}/medidas`, {
        method: "PUT",
        body: JSON.stringify({ prendas }),
      });
      setMensaje("Medidas guardadas.");
    } catch (e) {
      if (e.estado === 401) alExpirar();
      else setMensaje(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="medidas-item">
      <h4>
        {item.descripcion_solicitada} · cantidad {item.cantidad}
      </h4>
      {item.cantidad > 1 && (
        <p className="nota">
          Un juego de medidas sirve para una sola persona. Si son varias personas, registra cada
          una como un ítem aparte.
        </p>
      )}
      {tipos.map((tipoId) => {
        const tipo = catalogoPorId[tipoId];
        return (
          <fieldset key={tipoId} className="prenda">
            <legend>{tipo.nombre}</legend>
            <div className="medidas-rejilla">
              {tipo.medidas.map((m) => (
                <label key={m.id}>
                  {m.nombre}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valores[`${tipoId}-${m.id}`] ?? ""}
                    onChange={(e) =>
                      setValores({ ...valores, [`${tipoId}-${m.id}`]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              className="secundario"
              onClick={() => setTipos(tipos.filter((t) => t !== tipoId))}
            >
              Quitar {tipo.nombre.toLowerCase()}
            </button>
          </fieldset>
        );
      })}
      {disponibles.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && setTipos([...tipos, Number(e.target.value)])}
        >
          <option value="">+ Agregar prenda...</option>
          {disponibles.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      )}
      <div className="acciones">
        <button type="button" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar medidas"}
        </button>
      </div>
      {mensaje && (
        <p className={mensaje === "Medidas guardadas." ? "" : "error"} style={mensaje === "Medidas guardadas." ? { color: "#1b7f3b" } : undefined}>
          {mensaje}
        </p>
      )}
    </div>
  );
}

function ListaClientes({ alExpirar }) {
  const { datos, error } = useAdmin("/clientes", alExpirar);
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p>Cargando...</p>;
  if (datos.length === 0) return <p>Todavía no hay clientes.</p>;

  return (
    <div className="tabla-contenedor">
      <table className="tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Correo</th>
            <th>Registrado</th>
            <th>Solicitudes</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.nombre}</td>
              <td>{c.telefono}</td>
              <td>{c.correo ?? "—"}</td>
              <td>{fecha(c.creado_en)}</td>
              <td>{c.solicitudes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NuevaSolicitud() {
  const [productos, setProductos] = useState([]);
  const [medidas, setMedidas] = useState(null);
  useEffect(() => {
    llamarAdmin("/medidas/catalogo")
      .then(setMedidas)
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/productos")
      .then((r) => r.json())
      .then(setProductos)
      .catch(() => {});
  }, []);
  return <FormularioSolicitud productos={productos} modoAdmin medidas={medidas} />;
}

export default function Admin() {
  const [autenticado, setAutenticado] = useState(Boolean(obtenerToken()));
  const [pestana, setPestana] = useState("solicitudes");
  const [abierta, setAbierta] = useState(null);

  function salir() {
    borrarToken();
    setAutenticado(false);
    setAbierta(null);
  }

  if (!autenticado) return <Login alEntrar={() => setAutenticado(true)} />;

  return (
    <div className="contenedor">
      <header className="barra">
        <h1>ConfeXpress · Panel</h1>
        <button className="secundario" onClick={salir}>
          Cerrar sesión
        </button>
      </header>

      <nav className="pestanas">
        <button
          className={pestana === "solicitudes" ? "activa" : ""}
          onClick={() => {
            setPestana("solicitudes");
            setAbierta(null);
          }}
        >
          Solicitudes
        </button>
        <button
          className={pestana === "clientes" ? "activa" : ""}
          onClick={() => setPestana("clientes")}
        >
          Clientes
        </button>
      <button
          className={pestana === "nueva" ? "activa" : ""}
          onClick={() => setPestana("nueva")}
        >
          Nueva solicitud
        </button>
      </nav>

      {pestana === "solicitudes" && abierta === null && (
        <ListaSolicitudes alAbrir={setAbierta} alExpirar={salir} />
      )}
      {pestana === "solicitudes" && abierta !== null && (
        <DetalleSolicitud id={abierta} alVolver={() => setAbierta(null)} alExpirar={salir} />
      )}
      {pestana === "clientes" && <ListaClientes alExpirar={salir} />}
      {pestana === "nueva" && <NuevaSolicitud />}
    </div>
  );
}