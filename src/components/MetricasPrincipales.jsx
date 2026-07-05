import { useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import { formatearPorcentaje, totalesDe } from '../lib/movimientosUtils'
import { useCountUp } from '../lib/useCountUp'
import { usePresupuesto } from '../lib/usePresupuesto'
import { toast } from '../lib/toast'

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

export default function MetricasPrincipales({ usuarioId, movimientos }) {
  const {
    ingresos: totalIngresos,
    gastos: totalGastos,
    invertido: totalInvertido,
    ahorro,
    ratioAhorro,
  } = totalesDe(movimientos)

  const { objetivoInversionMensual, cargando, guardarObjetivoInversion } = usePresupuesto(usuarioId)
  const [editando, setEditando] = useState(false)
  const [valorInput, setValorInput] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function handleGuardarObjetivo(e) {
    e.preventDefault()
    const numero = Number(valorInput)
    if (!numero || numero <= 0) return
    setGuardando(true)
    await guardarObjetivoInversion(numero)
    setGuardando(false)
    setEditando(false)
    toast('Objetivo guardado')
  }

  const progresoInversion = objetivoInversionMensual
    ? Math.min((totalInvertido / objetivoInversionMensual) * 100, 100)
    : 0

  return (
    <div className="metricas-principales fade-in-up">
      <div className="metrica-hero">
        <span className="etiqueta">Ahorro de este mes</span>
        <Cifra valor={ahorro} className={`metrica-hero-cifra ${ahorro >= 0 ? 'ingreso' : 'gasto'}`} />
        <span className="metrica-hero-sub">
          {totalIngresos > 0
            ? `Estás ahorrando el ${formatearPorcentaje(ratioAhorro, 0)} de tus ingresos`
            : 'Registra tus ingresos para ver tu ratio de ahorro'}
        </span>
      </div>

      <div className="metricas-grid">
        <div className="metrica-bloque">
          <span className="etiqueta">Ingresos</span>
          <Cifra valor={totalIngresos} className="metrica-cifra ingreso" />
        </div>
        <div className="metrica-bloque">
          <span className="etiqueta">Gastos</span>
          <Cifra valor={totalGastos} className="metrica-cifra gasto" />
        </div>
        <div className="metrica-bloque">
          <span className="etiqueta">Inversión</span>
          <Cifra valor={totalInvertido} className="metrica-cifra inversion" />
        </div>
      </div>

      <div className="ratio-ahorro-linea">
        <span>Ratio de ahorro</span>
        <span>{formatearPorcentaje(ratioAhorro)}</span>
      </div>
      <div className="ratio-barra">
        <div className="ratio-barra-relleno" style={{ width: `${Math.min(Math.max(ratioAhorro, 0), 100)}%` }} />
      </div>

      {!cargando && (
        <div className="objetivo-inversion">
          {editando || objetivoInversionMensual === null ? (
            <form onSubmit={handleGuardarObjetivo} className="objetivo-inversion-form">
              <label htmlFor="objetivo-inversion">¿Cuánto quieres invertir cada mes?</label>
              <div className="objetivo-inversion-fila">
                <input
                  id="objetivo-inversion"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  placeholder="ej. 300"
                />
                <button type="submit" disabled={guardando || !valorInput}>
                  {guardando ? '…' : 'Guardar'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="objetivo-inversion-header">
                <span>
                  Objetivo mensual: <strong>{formatearEuros(objetivoInversionMensual)}</strong>
                </span>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setValorInput(String(objetivoInversionMensual))
                    setEditando(true)
                  }}
                >
                  Editar
                </button>
              </div>
              <div className="ratio-barra">
                <div
                  className="ratio-barra-relleno inversion"
                  style={{ width: `${progresoInversion}%` }}
                />
              </div>
              <span className="objetivo-inversion-detalle">
                {formatearEuros(totalInvertido)} de {formatearEuros(objetivoInversionMensual)} (
                {formatearPorcentaje(progresoInversion, 0)})
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
