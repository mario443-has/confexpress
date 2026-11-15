import { useEffect, useState } from "react";
import { urlImagen } from "./api.js";
import { agregarAlCarrito } from "./carrito.js";

// Precio aproximado de la marquilla personalizada, por prenda.
const PRECIO_MARQUILLA = 3000;

const GENEROS = { nino: "Niños", nina: "Niñas", todos: "Niños y niñas" };

const pesos = (valor) => `$${Number(valor).toLocaleString("es-CO")}`;

const sinTildes = (texto) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Escudo({ colegio, tamano }) {
  const estilo = { width: tamano, height: tamano };
  if (colegio.escudo) {
    return (
      <img
        className="escudo"
        style={estilo}
        src={urlImagen(colegio.escudo)}
        alt={`Escudo de ${colegio.nombre}`}
        loading="lazy"
      />
    );
  }
  const letras = colegio.nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return (
    <div className="escudo-iniciales" style={{ ...estilo, fontSize: tamano / 3 }}>
      {letras}
    </div>
  );
}

// Ids de productos que ya pertenecen a algún colegio (no se repiten en la lista general).
export function useIdsEnColegios() {
  const [ids, setIds] = useState(() => new Set());
  useEffect(() => {
    fetch("/api/colegios/prendas-ids")
      .then((res) => (res.ok ? res.json() : []))
      .then((lista) => setIds(new Set(lista)))
      .catch(() => {});
  }, []);
  return ids;
}

export function SeccionColegios() {
  const [colegios, setColegios] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/colegios")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los colegios.");
        return res.json();
      })
      .then(setColegios)
      .catch(() => setColegios([]));
  }, []);

  if (!colegios) return null;
  const conPrendas = colegios.filter((c) => c.prendas > 0);
  if (conPrendas.length === 0) return null;

  const q = sinTildes(busqueda.trim());
  const filtrados = conPrendas.filter((c) => sinTildes(c.nombre).includes(q));

  return (
    <section>
      <h2 className="subtitulo">Uniformes de colegios</h2>
      <p className="ayuda">Elige tu colegio para ver sus prendas, tallas y precios aproximados.</p>
      <input
        className="buscador-colegios"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar colegio"
      />
      {filtrados.length === 0 ? (
        <p className="nota">No encontramos un colegio con ese nombre.</p>
      ) : (
        <div className="rejilla-colegios">
          {filtrados.map((c) => (
            <a key={c.id} className="tarjeta-colegio" href={`#/colegio/${c.id}`}>
              <Escudo colegio={c} tamano={84} />
              <span>{c.nombre}</span>
              <span className="nota">
                {c.prendas} {c.prendas === 1 ? "prenda" : "prendas"}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function textoPlazo(dias) {
  if (dias === null || dias === undefined) return "";
  if (dias === 0) return " · aprox. el mismo día";
  return ` · aprox. ${dias} ${dias === 1 ? "día" : "días"}`;
}

function TarjetaPrenda({ prenda: p, colegio }) {
  const [talla, setTalla] = useState("");
  const [conMarquilla, setConMarquilla] = useState(false);
  const [nombreMarquilla, setNombreMarquilla] = useState("");
  const [aviso, setAviso] = useState(null);
  const seleccion = p.tallas.find((t) => t.talla === talla);
  const foto = p.imagenes[0];

  function agregar() {
    if (p.tallas.length > 0 && !seleccion) {
      setAviso({ error: true, texto: "Elige una talla antes de agregar." });
      return;
    }
    if (conMarquilla && !nombreMarquilla.trim()) {
      setAviso({ error: true, texto: "Escribe el nombre que irá en la marquilla." });
      return;
    }
    const listo = !p.a_medida && Boolean(seleccion) && seleccion.cantidad > 0 && !conMarquilla;
    const resultado = agregarAlCarrito({
      producto_id: p.id,
      nombre: p.nombre,
      colegio: colegio || "",
      talla: seleccion ? seleccion.talla : "",
      cantidad: 1,
      con_marquilla: conMarquilla,
      nombre_marquilla: conMarquilla ? nombreMarquilla.trim() : "",
      precio: seleccion ? seleccion.precio : p.precio_referencia,
      dias_encargo: p.dias_encargo,
      listo,
    });
    setAviso(
      resultado.ok
        ? { error: false, texto: "Agregada a tu solicitud." }
        : { error: true, texto: resultado.error }
    );
  }
  const precios = p.tallas.map((t) => t.precio);
  const desde = precios.length > 0 ? Math.min(...precios) : p.precio_referencia;

  let estado = null;
  if (p.a_medida) {
    estado = { clase: "encargo", texto: `Por encargo · a la medida${textoPlazo(p.dias_encargo)}` };
  } else if (seleccion) {
    estado =
      seleccion.cantidad > 0 && !conMarquilla
        ? { clase: "listo", texto: "Listo para entregar" }
        : { clase: "encargo", texto: `Por encargo${textoPlazo(p.dias_encargo)}` };
  }

  return (
    <article className="tarjeta">
      {foto && (
        <img
          className="tarjeta-foto"
          src={urlImagen(foto.ruta)}
          alt={foto.titulo || p.nombre}
          loading="lazy"
        />
      )}
      <span className="categoria">
        {p.genero ? GENEROS[p.genero] : ""}
        {p.es_opcional ? (p.genero ? " · Opcional" : "Opcional") : ""}
      </span>
      <h2>{p.nombre}</h2>
      {p.descripcion && <p>{p.descripcion}</p>}

      {p.tallas.length > 0 && (
        <div className="chips">
          {p.tallas.map((t) => {
            const lista = !p.a_medida && t.cantidad > 0;
            const clases = ["chip", lista ? "chip-listo" : "", t.talla === talla ? "activa" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={t.talla}
                type="button"
                className={clases}
                onClick={() => setTalla(t.talla === talla ? "" : t.talla)}
              >
                {t.talla}
              </button>
            );
          })}
        </div>
      )}

      <div>
        {seleccion ? (
          <span className="precio-aprox">{pesos(seleccion.precio)} aprox.</span>
        ) : desde !== null && desde !== undefined ? (
          <span className="precio-aprox">Desde {pesos(desde)}</span>
        ) : (
          <span className="precio-aprox">Cotizar</span>
        )}
      </div>

      {estado && <span className={`estado-talla ${estado.clase}`}>{estado.texto}</span>}
      {!estado && p.tallas.length > 0 && <p className="nota">Elige una talla para ver la disponibilidad.</p>}
      {p.a_medida && <p className="nota">Las medidas se toman en persona.</p>}
      {p.admite_marquilla && (
        <p className="nota">
          Admite marquilla personalizada (aprox. {pesos(PRECIO_MARQUILLA)} por prenda, siempre por encargo).
        </p>
      )}
    {p.admite_marquilla && (
      <label className="marquilla-opcion">
        <input
          type="checkbox"
          checked={conMarquilla}
          onChange={(e) => setConMarquilla(e.target.checked)}
        />
        <span>Con marquilla personalizada</span>
      </label>
    )}
    {p.admite_marquilla && conMarquilla && (
      <input
        className="marquilla-nombre"
        value={nombreMarquilla}
        maxLength={40}
        onChange={(e) => setNombreMarquilla(e.target.value)}
        placeholder="Nombre que irá en la marquilla"
      />
    )}
    <button type="button" className="agregar-solicitud" onClick={agregar}>
      Agregar a mi solicitud
    </button>
    {aviso && <p className={aviso.error ? "error" : "exito"}>{aviso.texto}</p>}
    </article>
  );
}

export function VistaColegio({ id }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`/api/colegios/${id}`)
      .then(async (res) => {
        const cuerpo = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(cuerpo.error || "No se pudo cargar el colegio.");
        return cuerpo;
      })
      .then(setDatos)
      .catch((e) => setError(e.message));
  }, [id]);

  const volver = (
    <a className="volver" href="#/">
      ← Volver al catálogo
    </a>
  );

  if (error) {
    return (
      <section>
        {volver}
        <p className="error">{error}</p>
      </section>
    );
  }
  if (!datos) return <p>Cargando...</p>;

  const grupos = [
    { titulo: "Uniforme de diario", lista: datos.prendas.filter((p) => !p.es_opcional && p.linea === "diario") },
    { titulo: "Uniforme de deportes", lista: datos.prendas.filter((p) => !p.es_opcional && p.linea === "deportes") },
    { titulo: "Otras prendas", lista: datos.prendas.filter((p) => !p.es_opcional && !p.linea) },
    { titulo: "Opcionales", lista: datos.prendas.filter((p) => p.es_opcional) },
  ].filter((g) => g.lista.length > 0);

  return (
    <section>
      {volver}
      <div className="cabecera-colegio">
        <Escudo colegio={datos} tamano={72} />
        <h2>{datos.nombre}</h2>
      </div>

      {grupos.length === 0 && <p className="nota">Este colegio todavía no tiene prendas.</p>}
      {grupos.map((g) => (
        <div key={g.titulo}>
          <h3 className="subtitulo">{g.titulo}</h3>
          <div className="rejilla">
            {g.lista.map((p) => (
              <TarjetaPrenda key={p.id} prenda={p} colegio={datos.nombre} />
            ))}
          </div>
        </div>
      ))}

      <p className="aviso" style={{ marginTop: 24 }}>
        Los precios son aproximados y se confirman en la cotización. La disponibilidad la confirma
        E &amp; M Confecciones al recibir tu solicitud.
      </p>
    </section>
  );
}