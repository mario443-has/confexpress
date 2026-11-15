const soloDigitos = (texto) => String(texto).replace(/\D/g, "");

export default function PrendaExtras({ extras, setExtras, colegios, aMedida }) {
  const cambiar = (campo, valor) => setExtras({ ...extras, [campo]: valor });

  function cambiarTalla(i, campo, valor) {
    cambiar(
      "tallas",
      extras.tallas.map((t, j) => (j === i ? { ...t, [campo]: valor } : t))
    );
  }
  const agregarTalla = () =>
    cambiar("tallas", [...extras.tallas, { talla: "", precio: "", cantidad: "0" }]);
  const quitarTalla = (i) => cambiar("tallas", extras.tallas.filter((_, j) => j !== i));

  const marcado = (id) => extras.colegios.find((c) => c.colegio_id === id);
  function alternarColegio(id) {
    if (marcado(id)) {
      cambiar("colegios", extras.colegios.filter((c) => c.colegio_id !== id));
    } else {
      cambiar("colegios", [...extras.colegios, { colegio_id: id, es_opcional: false }]);
    }
  }
  function alternarOpcional(id) {
    cambiar(
      "colegios",
      extras.colegios.map((c) => (c.colegio_id === id ? { ...c, es_opcional: !c.es_opcional } : c))
    );
  }

  const visibles = colegios.filter((c) => c.activo || marcado(c.id));

  return (
    <div className="medidas-item">
      <h4>Datos de la prenda (colegios, tallas y precios)</h4>

      <div className="fila">
        <div className="grupo">
          <label>Línea</label>
          <select value={extras.linea} onChange={(e) => cambiar("linea", e.target.value)}>
            <option value="">Sin línea (pijameros, dotaciones, arreglos...)</option>
            <option value="diario">Uniforme de diario</option>
            <option value="deportes">Uniforme de deportes</option>
          </select>
        </div>
        <div className="grupo">
          <label>Para</label>
          <select value={extras.genero} onChange={(e) => cambiar("genero", e.target.value)}>
            <option value="">No aplica</option>
            <option value="nino">Niños</option>
            <option value="nina">Niñas</option>
            <option value="todos">Niños y niñas</option>
          </select>
        </div>
        <div className="grupo">
          <label>Días aprox. si es por encargo</label>
          <input
            inputMode="numeric"
            value={extras.dias_encargo}
            onChange={(e) => cambiar("dias_encargo", soloDigitos(e.target.value))}
            placeholder="Ej. 3"
          />
        </div>
      </div>

      <label className="autorizacion">
        <input
          type="checkbox"
          checked={extras.admite_marquilla}
          onChange={(e) => cambiar("admite_marquilla", e.target.checked)}
        />
        Admite marquilla personalizada
      </label>

      <h4>Tallas</h4>
      {aMedida && (
        <p className="nota">
          Esta prenda es a la medida: la cantidad no se usa, siempre es por encargo. Puedes cargar el
          precio por talla o dejarlo sin tallas y usar solo el precio de referencia.
        </p>
      )}
      {extras.tallas.length === 0 ? (
        <p className="nota">Todavía no hay tallas. Agrega cada talla con su precio y cuántas tienes listas.</p>
      ) : (
        <div className="tabla-contenedor" style={{ marginBottom: 8 }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Talla</th>
                <th>Precio ($)</th>
                <th>Listas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {extras.tallas.map((t, i) => (
                <tr key={i}>
                  <td>
                    <input
                      value={t.talla}
                      maxLength={20}
                      onChange={(e) => cambiarTalla(i, "talla", e.target.value)}
                      style={{ width: 90 }}
                    />
                  </td>
                  <td>
                    <input
                      inputMode="numeric"
                      value={t.precio}
                      onChange={(e) => cambiarTalla(i, "precio", soloDigitos(e.target.value))}
                      style={{ width: 120 }}
                    />
                  </td>
                  <td>
                    <input
                      inputMode="numeric"
                      value={t.cantidad}
                      onChange={(e) => cambiarTalla(i, "cantidad", soloDigitos(e.target.value))}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>
                    <button type="button" className="secundario" onClick={() => quitarTalla(i)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" className="secundario" onClick={agregarTalla}>
        + Agregar talla
      </button>

      <h4>Colegios donde aplica</h4>
      {visibles.length === 0 ? (
        <p className="nota">Primero crea los colegios en la sección Colegios, arriba.</p>
      ) : (
        <div style={{ maxHeight: 240, overflowY: "auto" }}>
          {visibles.map((c) => {
            const m = marcado(c.id);
            return (
              <div
                key={c.id}
                style={{ display: "flex", gap: 16, alignItems: "center", padding: "4px 0", flexWrap: "wrap" }}
              >
                <label className="autorizacion" style={{ margin: 0 }}>
                  <input type="checkbox" checked={Boolean(m)} onChange={() => alternarColegio(c.id)} />
                  {c.nombre}
                  {!c.activo && <span className="nota"> (desactivado)</span>}
                </label>
                {m && (
                  <label className="autorizacion" style={{ margin: 0 }}>
                    <input type="checkbox" checked={m.es_opcional} onChange={() => alternarOpcional(c.id)} />
                    Opcional en este colegio
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}