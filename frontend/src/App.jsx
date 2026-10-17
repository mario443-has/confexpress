import { useEffect, useState } from "react";
import FormularioSolicitud from "./FormularioSolicitud.jsx";
import Admin from "./Admin.jsx";

const ETIQUETAS = {
  entrega_inmediata: "Entrega inmediata",
  por_encargo: "Por encargo",
  requiere_consulta: "Requiere consulta",
};

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
          <article key={p.id} className="tarjeta">
            <span className="categoria">{p.categoria}</span>
            {Boolean(p.destacado) && <span className="insignia">Destacado</span>}
            <h2>{p.nombre}</h2>
            <p>{p.descripcion}</p>
            <div className="pie">
              <span className="etiqueta">
                {ETIQUETAS[p.modalidad]}
                {Boolean(p.a_medida) && " · A la medida"}
              </span>
              <strong>
                {p.precio_referencia === null
                  ? "Consultar precio"
                  : `$${Number(p.precio_referencia).toLocaleString("es-CO")}`}
              </strong>
            </div>
          </article>
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