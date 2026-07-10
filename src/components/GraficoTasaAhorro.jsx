import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { agregarPorMes, formatearPorcentaje } from '../lib/movimientosUtils'
import { formatearEuros } from '../lib/categorias'

const ALTO = 100
const PADDING_X = 12
const PADDING_Y = 16
const MESES_MIN = 6
const PASO_PX = 46 // ancho por mes al deslizar

function clamp(valor, min, max) {
  return Math.min(Math.max(valor, min), max)
}

// Nº de meses de historial: desde el primer movimiento hasta el mes actual.
function mesesDeHistorial(movimientos) {
  if (movimientos.length === 0) return MESES_MIN
  let min = Infinity
  for (const m of movimientos) {
    const t = new Date(m.fecha).getTime()
    if (t < min) min = t
  }
  const d0 = new Date(min)
  const hoy = new Date()
  const n = (hoy.getFullYear() - d0.getFullYear()) * 12 + (hoy.getMonth() - d0.getMonth()) + 1
  return Math.min(Math.max(n, MESES_MIN), 120) // hasta 10 años
}

export default function GraficoTasaAhorro({ movimientos }) {
  const nMeses = useMemo(() => mesesDeHistorial(movimientos), [movimientos])
  const meses = useMemo(() => agregarPorMes(movimientos, nMeses), [movimientos, nMeses])

  const conDatos = meses.map((m) => m.ingresos > 0)
  const ultimoConDatos = conDatos.lastIndexOf(true)
  const [seleccionado, setSeleccionado] = useState(null)
  const activo = seleccionado ?? (ultimoConDatos === -1 ? null : ultimoConDatos)

  const scrollRef = useRef(null)
  // Arranca mostrando el mes más reciente (extremo derecho).
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [nMeses])
  // Reset de selección si cambia el histórico.
  useEffect(() => setSeleccionado(null), [nMeses])

  if (ultimoConDatos === -1) return null

  const ancho = Math.max(300, PADDING_X * 2 + (meses.length - 1) * PASO_PX)

  const ratiosReales = meses.map((m) => (m.ingresos > 0 ? m.ratioAhorro : null))
  // Recortamos extremos solo para el dibujo (la etiqueta muestra el % real).
  const ratiosVisibles = ratiosReales.map((r) => (r === null ? 0 : clamp(r, -100, 100)))

  const minRatio = Math.min(0, ...ratiosVisibles)
  const maxRatio = Math.max(20, ...ratiosVisibles)
  const rango = maxRatio - minRatio || 1

  const paso = (ancho - PADDING_X * 2) / (ratiosVisibles.length - 1 || 1)
  const yDe = (r) => PADDING_Y + (1 - (r - minRatio) / rango) * (ALTO - PADDING_Y * 2)
  const yLineaCero = yDe(0)

  const puntos = ratiosVisibles.map((r, i) => ({ x: PADDING_X + i * paso, y: yDe(r) }))
  const linea = puntos.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${PADDING_X},${yLineaCero} ${linea} ${ancho - PADDING_X},${yLineaCero}`

  const mesActivo = activo !== null ? meses[activo] : null

  return (
    <div className="grafico fade-in-up">
      <div className="grafico-cabecera">
        <h2>Tasa de ahorro mensual</h2>
        {mesActivo && (
          <span className="grafico-detalle">
            <span className="grafico-detalle-mes">{mesActivo.etiqueta}</span>
            {ratiosReales[activo] === null
              ? 'sin ingresos'
              : `${formatearPorcentaje(ratiosReales[activo], 0)} · ${formatearEuros(mesActivo.ahorro)} ahorrados`}
          </span>
        )}
      </div>

      <div className="grafico-scroll" ref={scrollRef}>
        <div className="grafico-scroll-inner" style={{ width: ancho }}>
          <svg
            viewBox={`0 0 ${ancho} ${ALTO}`}
            height={ALTO}
            className="grafico-linea"
            style={{ width: ancho }}
          >
            <line x1={PADDING_X} y1={yLineaCero} x2={ancho - PADDING_X} y2={yLineaCero} className="linea-cero" />
            <polygon points={area} className="area-tasa" />
            <polyline points={linea} className="linea-tasa" fill="none" />
            {puntos.map((p, i) => (
              <g key={meses[i].clave}>
                {i === activo && <circle cx={p.x} cy={p.y} r={5} className="punto-activo-halo" />}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={i === activo ? 3.5 : 2}
                  className={i === activo ? 'punto-activo' : 'punto-tasa'}
                />
                <rect
                  x={p.x - paso / 2}
                  y={0}
                  width={paso}
                  height={ALTO}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSeleccionado(i)}
                  onMouseEnter={() => setSeleccionado(i)}
                />
              </g>
            ))}
          </svg>
          <div className="grafico-leyenda-meses" style={{ width: ancho }}>
            {meses.map((m, i) => (
              <button
                key={m.clave}
                type="button"
                className={`leyenda-mes-btn ${i === activo ? 'activo' : ''}`}
                onClick={() => setSeleccionado(i)}
              >
                {m.etiqueta}
                <br />
                {ratiosReales[i] === null ? '—' : `${ratiosReales[i].toFixed(0)}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {meses.length > MESES_MIN && (
        <span className="grafico-hint">← desliza para ver tu historial completo</span>
      )}
    </div>
  )
}
