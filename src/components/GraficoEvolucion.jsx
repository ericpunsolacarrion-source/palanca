import { useEffect, useMemo, useState } from 'react'
import { agregarPorMes } from '../lib/movimientosUtils'
import { formatearEuros } from '../lib/categorias'

const ALTURA = 90
const MESES = 6

export default function GraficoEvolucion({ movimientos, mesFin }) {
  const meses = useMemo(() => agregarPorMes(movimientos, MESES, mesFin), [movimientos, mesFin])

  const conDatos = meses.map((m) => m.ingresos > 0 || m.gastos > 0)
  const ultimoConDatos = conDatos.lastIndexOf(true)
  const [seleccionado, setSeleccionado] = useState(null)
  // Al cambiar de periodo global, se reinicia la selección local para destacar
  // por defecto el mes elegido (el último de la ventana).
  useEffect(() => setSeleccionado(null), [mesFin])
  const porDefecto = mesFin ? meses.length - 1 : ultimoConDatos
  const activo = seleccionado ?? (porDefecto < 0 ? null : porDefecto)

  if (movimientos.length === 0) return null

  const maximo = Math.max(1, ...meses.flatMap((m) => [m.ingresos, m.gastos]))
  const mesActivo = activo !== null ? meses[activo] : null

  return (
    <div className="grafico fade-in-up">
      <div className="grafico-cabecera">
        <h2>Evolución (6 meses)</h2>
        {mesActivo && (
          <span className="grafico-detalle">
            <span className="grafico-detalle-mes">{mesActivo.etiqueta}</span>
            <span className="detalle-ingreso">+{formatearEuros(mesActivo.ingresos)}</span>
            {' − '}
            <span className="detalle-gasto">{formatearEuros(mesActivo.gastos)}</span>
            {' = '}
            <span className={`detalle-neto ${mesActivo.ahorro >= 0 ? 'ingreso' : 'gasto'}`}>
              {mesActivo.ahorro >= 0 ? '+' : '−'}
              {formatearEuros(Math.abs(mesActivo.ahorro))}
            </span>
          </span>
        )}
      </div>
      <div className="grafico-barras" style={{ height: ALTURA + 24 }}>
        {meses.map((m, i) => (
          <button
            key={m.clave}
            type="button"
            className={`grafico-columna ${i === activo ? 'activa' : ''}`}
            onClick={() => setSeleccionado(i)}
            onMouseEnter={() => setSeleccionado(i)}
            aria-label={`${m.etiqueta}: ingresos ${formatearEuros(m.ingresos)}, gastos ${formatearEuros(m.gastos)}`}
          >
            <div className="grafico-par" style={{ height: ALTURA }}>
              <div className="barra ingreso" style={{ height: `${(m.ingresos / maximo) * 100}%` }} />
              <div className="barra gasto" style={{ height: `${(m.gastos / maximo) * 100}%` }} />
            </div>
            <span className="grafico-etiqueta">{m.etiqueta}</span>
          </button>
        ))}
      </div>
      <div className="grafico-leyenda">
        <span><i className="punto ingreso" /> Ingresos</span>
        <span><i className="punto gasto" /> Gastos</span>
      </div>
    </div>
  )
}
