import { useEffect, useState } from "react";
import { borrarToken, guardarToken, llamarAdmin, obtenerToken } from "./api.js";
import FormularioSolicitud from "./FormularioSolicitud.jsx";
import { NOMBRE_NEGOCIO } from "./config.js";

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

          <h3>Cotización</h3>
          <Cotizaciones solicitud={datos} alExpirar={alExpirar} alCambiar={recargar} />

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

const ESTADOS_COTIZACION = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

function dinero(valor) {
  return Number(valor).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function soloDigitos(texto) {
  return texto.replace(/\D/g, "");
}

function numeroInternacional(telefono) {
  let d = String(telefono).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  if (d.length === 10 && d.startsWith("09")) return `593${d.slice(1)}`;
  if (d.length === 9 && d.startsWith("9")) return `593${d}`;
  return d;
}

function enlaceWhatsApp(solicitud, cotizacion) {
  const numero = numeroInternacional(solicitud.telefono);
  const nombre = String(solicitud.cliente).trim().split(" ")[0];
  const detalle = cotizacion.lineas
    .map((l) => `- ${l.cantidad} x ${l.descripcion} (${dinero(l.precio_unitario)} c/u)`)
    .join("\n");
  const vence = cotizacion.fecha_vencimiento
    ? new Date(cotizacion.fecha_vencimiento).toLocaleDateString("es-CO")
    : null;
  const texto =
    `Hola ${nombre}, esta es tu cotización de ${NOMBRE_NEGOCIO}:\n${detalle}\n` +
    `Total: ${dinero(cotizacion.total)}` +
    (vence ? `\nVálida hasta el ${vence}.` : "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function Cotizaciones({ solicitud, alExpirar, alCambiar }) {
  const { datos, error, recargar } = useAdmin(
    `/solicitudes/${solicitud.id}/cotizaciones`,
    alExpirar
  );
  const [lineas, setLineas] = useState(() =>
    solicitud.items.map((it) => ({
      detalle_solicitud_id: it.id,
      descripcion: it.descripcion_solicitada,
      cantidad: String(it.cantidad),
      precio: "",
    }))
  );
  const [dias, setDias] = useState("15");
  const [avisoEstado, setAvisoEstado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const total = lineas.reduce(
    (suma, l) => suma + (Number(l.cantidad) || 0) * (Number(l.precio) || 0),
    0
  );

  function cambiar(indice, campo, valor) {
    setLineas(lineas.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)));
  }

  async function cambiarEstadoCotizacion(cotizacionId, estado) {
    setAvisoEstado("");
    try {
      const r = await llamarAdmin(`/cotizaciones/${cotizacionId}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setAvisoEstado(
        r.pedido_id
          ? `Cotización aceptada. Se creó el pedido #${r.pedido_id}.`
          : "Estado de la cotización actualizado."
      );
      recargar();
    } catch (e) {
      if (e.estado === 401) alExpirar();
      else setAvisoEstado(e.message);
    }
  }

  async function crear() {
    setMensaje("");
    setGuardando(true);
    try {
      await llamarAdmin(`/solicitudes/${solicitud.id}/cotizaciones`, {
        method: "POST",
        body: JSON.stringify({
          lineas: lineas.map((l) => ({
            detalle_solicitud_id: l.detalle_solicitud_id,
            descripcion: l.descripcion,
            cantidad: Number(l.cantidad),
            precio_unitario: Number(l.precio),
          })),
          dias_validez: Number(dias),
          observaciones,
        }),
      });
      setMensaje("Cotización creada.");
      recargar();
      alCambiar();
    } catch (e) {
      if (e.estado === 401) alExpirar();
      else setMensaje(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}
      {datos && datos.length > 0 && (
        <div className="tabla-contenedor" style={{ marginBottom: 16 }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Estado</th>
                <th>Emitida</th>
                <th>Vence</th>
                <th>Líneas</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{ESTADOS_COTIZACION[c.estado] ?? c.estado}</td>
                  <td>{fecha(c.fecha_emision)}</td>
                  <td>{c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString("es-CO") : "—"}</td>
                  <td>
                    {c.lineas.map((l) => (
                      <div key={l.id}>
                        {l.cantidad} × {l.descripcion} ({dinero(l.precio_unitario)})
                      </div>
                    ))}
                  </td>
                  <td>
                    <strong>{dinero(c.total)}</strong>
                    <div className="acciones" style={{ marginTop: 8 }}>
                      {c.estado === "borrador" && (
                        <button type="button" className="secundario" onClick={() => cambiarEstadoCotizacion(c.id, "enviada")}>
                          Marcar enviada
                        </button>
                      )}
                      {(c.estado === "borrador" || c.estado === "enviada") && (
                        <>
                          <button type="button" onClick={() => cambiarEstadoCotizacion(c.id, "aceptada")}>
                            Aceptar y crear pedido
                          </button>
                          <button type="button" className="secundario" onClick={() => cambiarEstadoCotizacion(c.id, "rechazada")}>
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                    <div>
                      <a
                        style={{
                          display: "inline-block",
                          position: "static",
                          margin: "8px 0 0",
                          padding: "8px 14px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          background: "#25d366",
                          color: "#fff",
                          borderRadius: 8,
                          textDecoration: "none",
                        }}
                        href={enlaceWhatsApp(solicitud, c)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Enviar por WhatsApp
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {avisoEstado && <p className="nota"><strong>{avisoEstado}</strong></p>}

      {solicitud.estado === "cancelada" ? (
        <p className="nota">La solicitud está cancelada: no se puede cotizar.</p>
      ) : (
        <div className="medidas-item">
          <h4>Nueva cotización</h4>
          {lineas.map((l, i) => (
            <div key={i} className="medidas-rejilla" style={{ alignItems: "end" }}>
              <label>
                Descripción
                <input
                  value={l.descripcion}
                  onChange={(e) => cambiar(i, "descripcion", e.target.value)}
                />
              </label>
              <label>
                Cantidad
                <input
                  inputMode="numeric"
                  value={l.cantidad}
                  onChange={(e) => cambiar(i, "cantidad", soloDigitos(e.target.value))}
                />
              </label>
              <label>
                Precio unitario ($)
                <input
                  inputMode="numeric"
                  value={l.precio}
                  onChange={(e) => cambiar(i, "precio", soloDigitos(e.target.value))}
                />
              </label>
              <div>
                <div className="nota">
                  Subtotal: {dinero((Number(l.cantidad) || 0) * (Number(l.precio) || 0))}
                </div>
                {lineas.length > 1 && (
                  <button
                    type="button"
                    className="secundario"
                    onClick={() => setLineas(lineas.filter((_, j) => j !== i))}
                  >
                    Quitar línea
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="secundario"
            onClick={() =>
              setLineas([
                ...lineas,
                { detalle_solicitud_id: null, descripcion: "", cantidad: "1", precio: "" },
              ])
            }
          >
            + Agregar línea
          </button>
          <div className="medidas-rejilla" style={{ marginTop: 12 }}>
            <label>
              Vigencia (días)
              <input
                inputMode="numeric"
                value={dias}
                onChange={(e) => setDias(soloDigitos(e.target.value))}
              />
            </label>
            <label>
              Observaciones
              <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </label>
          </div>
          <h4>Total: {dinero(total)}</h4>
          <div className="acciones">
            <button type="button" onClick={crear} disabled={guardando}>
              {guardando ? "Guardando..." : "Crear cotización"}
            </button>
          </div>
          {mensaje && (
            <p
              className={mensaje === "Cotización creada." ? "" : "error"}
              style={mensaje === "Cotización creada." ? { color: "#1b7f3b" } : undefined}
            >
              {mensaje}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const ESTADOS_PEDIDO = {
  confirmado: "Confirmado",
  en_confeccion: "En confección",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
const CLASE_PEDIDO = {
  confirmado: "estado-recibida",
  en_confeccion: "estado-en_revision",
  listo: "estado-en_revision",
  entregado: "estado-cotizada",
  cancelado: "estado-cancelada",
};
const SIGUIENTE_PEDIDO = {
  confirmado: { estado: "en_confeccion", texto: "Pasar a en confección" },
  en_confeccion: { estado: "listo", texto: "Marcar listo" },
  listo: { estado: "entregado", texto: "Marcar entregado" },
};

function ListaPedidos({ alExpirar }) {
  const { datos, error, recargar } = useAdmin("/pedidos", alExpirar);
  const [mensaje, setMensaje] = useState("");

  async function cambiar(id, estado) {
    setMensaje("");
    try {
      await llamarAdmin(`/pedidos/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      recargar();
    } catch (e) {
      if (e.estado === 401) alExpirar();
      else setMensaje(e.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p>Cargando...</p>;
  if (datos.length === 0) return <p>Todavía no hay pedidos. Se crean al aceptar una cotización.</p>;

  return (
    <div>
      {mensaje && <p className="error">{mensaje}</p>}
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Pedido</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.id}
                  <div className="nota">Solicitud #{p.solicitud_id}</div>
                </td>
                <td>
                  {p.cliente}
                  <div className="nota">{p.telefono}</div>
                </td>
                <td>{p.detalle}</td>
                <td>{dinero(p.total)}</td>
                <td>
                  <span className={`estado ${CLASE_PEDIDO[p.estado]}`}>
                    {ESTADOS_PEDIDO[p.estado]}
                  </span>
                  {p.fecha_entrega_real && (
                    <div className="nota">
                      Entregado el {new Date(p.fecha_entrega_real).toLocaleDateString("es-CO")}
                    </div>
                  )}
                </td>
                <td>
                  {SIGUIENTE_PEDIDO[p.estado] && (
                    <button type="button" onClick={() => cambiar(p.id, SIGUIENTE_PEDIDO[p.estado].estado)}>
                      {SIGUIENTE_PEDIDO[p.estado].texto}
                    </button>
                  )}{" "}
                  {SIGUIENTE_PEDIDO[p.estado] && (
                    <button type="button" className="secundario" onClick={() => cambiar(p.id, "cancelado")}>
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <button
          className={pestana === "pedidos" ? "activa" : ""}
          onClick={() => {
            setPestana("pedidos");
            setAbierta(null);
          }}
        >
          Pedidos
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
      {pestana === "pedidos" && <ListaPedidos alExpirar={salir} />}
    </div>
  );
}