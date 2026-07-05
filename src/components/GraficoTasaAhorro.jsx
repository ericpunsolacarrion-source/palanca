import { useHistorialMensual } from '../lib/useHistorialMensual'

const ANCHO = 280
const ALTO = 90
const PADDING = 8

export default function GraficoTasaAhorro({ usuarioId }) {
  const { meses, cargando } = useHistorialMensual(usuarioId)

  if (cargando) return null

  const ratios = meses.map((m) => (m.ingresos > 0 ? ((m.ingresos - m.gastos) / m.ingresos) * 100 : 0))
  const hayDatos = meses.some((m) => m.ingresos > 0)

  if (!hayDatos) return null

  const minRatio = Math.min(0, ...ratios)
  const maxRatio = Math.max(10, ...ratios)
  const rango = maxRatio - minRatio || 1

  const paso = (ANCHO - PADDING * 2) / (ratios.length - 1 || 1)
  const puntos = ratios.map((r, i) => {
    const x = PADDING + i * paso
    const y = PADDING + (1 - (r - minRatio) / rango) * (ALTO - PADDING * 2)
    return { x, y, r }
  })

  const linea = puntos.map((p) => `${p.x},${p.y}`).join(' ')
  const yLineaCero = PADDING + (1 - (0 - minRatio) / rango) * (ALTO - PADDING * 2)

  return (
    <div className="grafico fade-in-up">
      <h2>Tasa de ahorro mensual</h2>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="grafico-linea" preserveAspectRatio="none">
        <line x1={PADDING} y1={yLineaCero} x2={ANCHO - PADDING} y2={yLineaCero} className="linea-cero" />
        <polyline points={linea} className="linea-tasa" fill="none" />
        {puntos.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className="punto-tasa" />
        ))}
      </svg>
      <div className="grafico-leyenda-meses">
        {meses.map((m, i) => (
          <span key={m.clave}>
            {m.etiqueta} {ratios[i].toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  )
}
