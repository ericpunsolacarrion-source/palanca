import { useHistorialMensual } from '../lib/useHistorialMensual'
import { formatearEuros } from '../lib/categorias'

const ALTURA = 90

export default function GraficoEvolucion({ usuarioId }) {
  const { meses, cargando } = useHistorialMensual(usuarioId)

  if (cargando) return null

  const maximo = Math.max(1, ...meses.flatMap((m) => [m.ingresos, m.gastos]))

  return (
    <div className="grafico fade-in-up">
      <h2>Evolución (6 meses)</h2>
      <div className="grafico-barras" style={{ height: ALTURA + 24 }}>
        {meses.map((m) => (
          <div key={m.clave} className="grafico-columna">
            <div className="grafico-par" style={{ height: ALTURA }}>
              <div
                className="barra ingreso"
                style={{ height: `${(m.ingresos / maximo) * 100}%` }}
                title={`Ingresos: ${formatearEuros(m.ingresos)}`}
              />
              <div
                className="barra gasto"
                style={{ height: `${(m.gastos / maximo) * 100}%` }}
                title={`Gastos: ${formatearEuros(m.gastos)}`}
              />
            </div>
            <span className="grafico-etiqueta">{m.etiqueta}</span>
          </div>
        ))}
      </div>
      <div className="grafico-leyenda">
        <span><i className="punto ingreso" /> Ingresos</span>
        <span><i className="punto gasto" /> Gastos</span>
      </div>
    </div>
  )
}
