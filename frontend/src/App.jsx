import { useEffect, useState } from "react";
import FormularioSolicitud from "./FormularioSolicitud.jsx";
import Admin from "./Admin.jsx";
import { urlImagen } from "./api.js";

const ETIQUETAS = {
  entrega_inmediata: "Entrega inmediata",
  por_encargo: "Por encargo",
  requiere_consulta: "Requiere consulta",
};

function TarjetaProducto({ producto: p }) {
  const [indice, setIndice] = useState(0);
  const imagenes = p.imagenes || [];
  const actual = imagenes[indice] || imagenes[0];

  return (
    <article className="tarjeta">
      {actual && (
        <img
          className="tarjeta-foto"
          src={urlImagen(actual.ruta_imagen)}
          alt={actual.descripcion || actual.titulo || p.nombre}
          loading="lazy"
        />
      )}
      {imagenes.length > 1 && (
        <div className="miniaturas">
          {imagenes.map((imagen, i) => (
            <button
              key={imagen.id}
              type="button"
              className={i === indice ? "miniatura activa" : "miniatura"}
              onClick={() => setIndice(i)}
              aria-label={`Ver imagen ${i + 1} de ${imagenes.length}`}
            >
              <img src={urlImagen(imagen.ruta_imagen)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <span className="categoria">{p.categoria}</span>
      {Boolean(p.destacado) && <span className="insignia">Destacado</span>}
      <h2>{p.nombre}</h2>
      <p>{p.descripcion}</p>
      <div className="pie">
        <span className="etiqueta">
          {ETIQUETAS[p.modalidad]}
          {Boolean(p.a_medida) && " \u00b7 A la medida"}
        </span>
        <strong>
          {p.precio_referencia === null
            ? "Consultar precio"
            : `$${Number(p.precio_referencia).toLocaleString("es-CO")}`}
        </strong>
      </div>
    </article>
  );
}
function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/productos")
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar el catálogo");
        return res.json();
      })
      .then(setProductos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="contenedor">
      <header className="encabezado">
        <h1>ConfeXpress</h1>
        <p>Catálogo de productos y servicios de confección</p>
      </header>

      {cargando && <p>Cargando catálogo...</p>}
      {error && <p className="error">{error}</p>}

      <div className="rejilla">
        {productos.map((p) => (
          <TarjetaProducto key={p.id} producto={p} />
        ))}
      </div>

      <FormularioSolicitud productos={productos} />
    </div>
  );
}

function esAdmin() {
  return window.location.hash.startsWith("#/admin");
}

export default function App() {
  const [admin, setAdmin] = useState(esAdmin());

  useEffect(() => {
    const alCambiar = () => setAdmin(esAdmin());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  return admin ? <Admin /> : <Catalogo />;
}