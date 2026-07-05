import { useHistorialMensual } from '../lib/useHistorialMensual'

const ANCHO = 300
const ALTO = 100
const PADDING_X = 12
const PADDING_Y = 16

function clamp(valor, min, max) {
  return Math.min(Math.max(valor, min), max)
}

export default function GraficoTasaAhorro({ usuarioId }) {
  const { meses, cargando } = useHistorialMensual(usuarioId)

  if (cargando) return null

  const ratiosReales = meses.map((m) => (m.ingresos > 0 ? ((m.ingresos - m.gastos) / m.ingresos) * 100 : null))
  const hayDatos = ratiosReales.some((r) => r !== null)

  if (!hayDatos) return null

  // Recortamos valores extremos solo para el dibujo (la etiqueta siempre muestra el % real)
  const ratiosVisibles = ratiosReales.map((r) => (r === null ? 0 : clamp(r, -100, 100)))

  const minRatio = Math.min(0, ...ratiosVisibles)
  const maxRatio = Math.max(20, ...ratiosVisibles)
  const rango = maxRatio - minRatio || 1

  const paso = (ANCHO - PADDING_X * 2) / (ratiosVisibles.length - 1 || 1)
  const yDe = (r) => PADDING_Y + (1 - (r - minRatio) / rango) * (ALTO - PADDING_Y * 2)
  const yLineaCero = yDe(0)

  const puntos = ratiosVisibles.map((r, i) => ({ x: PADDING_X + i * paso, y: yDe(r) }))
  const linea = puntos.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${PADDING_X},${yLineaCero} ${linea} ${ANCHO - PADDING_X},${yLineaCero}`

  return (
    <div className="grafico fade-in-up">
      <h2>Tasa de ahorro mensual</h2>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="grafico-linea">
        <line x1={PADDING_X} y1={yLineaCero} x2={ANCHO - PADDING_X} y2={yLineaCero} className="linea-cero" />
        <polygon points={area} className="area-tasa" />
        <polyline points={linea} className="linea-tasa" fill="none" />
      </svg>
      <div className="grafico-leyenda-meses">
        {meses.map((m, i) => (
          <span key={m.clave}>
            {m.etiqueta}
            <br />
            {ratiosReales[i] === null ? '—' : `${ratiosReales[i].toFixed(0)}%`}
          </span>
        ))}
      </div>
    </div>
  )
}
