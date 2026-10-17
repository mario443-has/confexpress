export default function EditorMedidas({
  catalogo,
  tipos,
  valores,
  cantidad,
  alCambiarTipos,
  alCambiarValores,
}) {
  const porId = Object.fromEntries(catalogo.map((t) => [t.id, t]));
  const disponibles = catalogo.filter((t) => !tipos.includes(t.id));

  return (
    <div className="medidas-item">
      <h4>Medidas (en centímetros)</h4>
      {cantidad > 1 && (
        <p className="nota">
          Un juego de medidas sirve para una sola persona. Si son varias personas, registra cada
          una como un ítem aparte.
        </p>
      )}
      {tipos.length === 0 && (
        <p className="nota">Agrega las prendas de las que vas a tomar medidas.</p>
      )}
      {tipos.map((tipoId) => {
        const tipo = porId[tipoId];
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
                      alCambiarValores({ ...valores, [`${tipoId}-${m.id}`]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              className="secundario"
              onClick={() => alCambiarTipos(tipos.filter((t) => t !== tipoId))}
            >
              Quitar {tipo.nombre.toLowerCase()}
            </button>
          </fieldset>
        );
      })}
      {disponibles.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && alCambiarTipos([...tipos, Number(e.target.value)])}
        >
          <option value="">+ Agregar prenda...</option>
          {disponibles.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}