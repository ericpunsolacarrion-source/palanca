import { etiquetaMes } from '../lib/movimientosUtils'

// Selector de periodo GLOBAL del dashboard: un único control que gobierna
// todos los bloques a la vez (métricas, tasa de ahorro, categorías, evolución).
// `meses` es el rango contiguo (más reciente primero); `valor` la clave activa.
export default function PeriodoSelector({ meses, valor, onCambiar }) {
  const idx = meses.indexOf(valor)
  const esActual = idx === 0 // el primero del rango es el mes en curso
  const hayAnterior = idx < meses.length - 1
  const haySiguiente = idx > 0

  const irAnterior = () => hayAnterior && onCambiar(meses[idx + 1])
  const irSiguiente = () => haySiguiente && onCambiar(meses[idx - 1])

  return (
    <div className="periodo-selector fade-in-up">
      <button
        type="button"
        className="periodo-flecha"
        onClick={irAnterior}
        disabled={!hayAnterior}
        aria-label="Mes anterior"
      >
        ‹
      </button>

      <div className="periodo-centro">
        <select
          className="periodo-select"
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          aria-label="Elegir mes"
        >
          {meses.map((clave) => (
            <option key={clave} value={clave}>
              {etiquetaMes(clave)}
            </option>
          ))}
        </select>
        {!esActual && (
          <button type="button" className="periodo-hoy" onClick={() => onCambiar(meses[0])}>
            Hoy
          </button>
        )}
      </div>

      <button
        type="button"
        className="periodo-flecha"
        onClick={irSiguiente}
        disabled={!haySiguiente}
        aria-label="Mes siguiente"
      >
        ›
      </button>
    </div>
  )
}
