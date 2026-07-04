import { esInversion, formatearEuros } from '../lib/categorias'
import { useCountUp } from '../lib/useCountUp'

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

export default function Balance({ movimientos }) {
  const totalIngresos = movimientos
    .filter((m) => m.tipo === 'ingreso')
    .reduce((suma, m) => suma + Number(m.importe), 0)

  // Las aportaciones a inversión no cuentan como consumo: no penalizan el ahorro.
  const totalGastos = movimientos
    .filter((m) => m.tipo === 'gasto' && !esInversion(m))
    .reduce((suma, m) => suma + Number(m.importe), 0)

  const totalInvertido = movimientos
    .filter((m) => m.tipo === 'gasto' && esInversion(m))
    .reduce((suma, m) => suma + Number(m.importe), 0)

  // El ahorro incluye lo invertido: invertir no es "gastar", es una forma de ahorro.
  const ahorro = totalIngresos - totalGastos
  const ratioAhorro = totalIngresos > 0 ? (ahorro / totalIngresos) * 100 : 0

  return (
    <div className="balance fade-in-up">
      <span className="balance-etiqueta-principal">Ahorro de este mes</span>
      <Cifra valor={ahorro} className={`balance-hero ${ahorro >= 0 ? 'ingreso' : 'gasto'}`} />

      <div className="balance-grid">
        <div className="balance-item">
          <span className="etiqueta">Ingresos</span>
          <Cifra valor={totalIngresos} className="valor ingreso" />
        </div>
        <div className="balance-item">
          <span className="etiqueta">Gastos</span>
          <Cifra valor={totalGastos} className="valor gasto" />
        </div>
        <div className="balance-item">
          <span className="etiqueta">Ratio de ahorro</span>
          <span className="valor">{ratioAhorro.toFixed(1)}%</span>
        </div>
      </div>

      {totalInvertido > 0 && (
        <p className="balance-nota">
          De tu ahorro, <strong>{formatearEuros(totalInvertido)}</strong> los has invertido este mes.
        </p>
      )}

      <div className="ratio-barra">
        <div
          className="ratio-barra-relleno"
          style={{ width: `${Math.min(Math.max(ratioAhorro, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}
