import { formatearEuros } from '../lib/categorias'
import { useCountUp } from '../lib/useCountUp'

export default function IngresosDelMes({ movimientos }) {
  const totalIngresos = movimientos
    .filter((m) => m.tipo === 'ingreso')
    .reduce((s, m) => s + Number(m.importe), 0)

  const animado = useCountUp(totalIngresos)

  return (
    <div className="tarjeta-ingresos fade-in-up">
      <span className="balance-etiqueta-principal">Ingresos de este mes</span>
      <span className="ingresos-cifra">{formatearEuros(animado)}</span>
    </div>
  )
}
