import { useEffect, useState } from "react";

const ETIQUETAS = {
  entrega_inmediata: "Entrega inmediata",
  por_encargo: "Por encargo",
  requiere_consulta: "Requiere consulta",
};

export default function App() {
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
            <h2>{p.nombre}</h2>
            <p>{p.descripcion}</p>
            <div className="pie">
              <span className="etiqueta">{ETIQUETAS[p.modalidad]}</span>
              <strong>
                {p.precio_referencia === null
                  ? "Consultar precio"
                  : `$${Number(p.precio_referencia).toLocaleString("es-CO")}`}
              </strong>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}