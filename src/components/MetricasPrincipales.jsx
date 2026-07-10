import { useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import {
  formatearPorcentaje,
  ingresoMensualMedio,
  progresoObjetivo,
  totalesDe,
} from '../lib/movimientosUtils'
import { useCountUp } from '../lib/useCountUp'
import { usePresupuesto } from '../lib/usePresupuesto'
import { toast } from '../lib/toast'
import InputImporte from './InputImporte'

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

export default function MetricasPrincipales({ usuarioId, movimientos, historico }) {
  const {
    ingresos: totalIngresos,
    gastos: totalGastos,
    invertido: totalInvertido,
    ahorro,
    ratioAhorro,
  } = totalesDe(movimientos)

  // Media de ingresos del último año (contexto para "lo que cobras este mes").
  const mediaIngresos = ingresoMensualMedio(historico ?? movimientos)
  const media = mediaIngresos.media
  const comparativaIngreso =
    media > 0 && mediaIngresos.meses >= 2
      ? totalIngresos >= media * 1.05
        ? { simbolo: '▲', texto: 'por encima de tu media', clase: 'ingreso' }
        : totalIngresos <= media * 0.95
          ? { simbolo: '▼', texto: 'por debajo de tu media', clase: 'gasto' }
          : { simbolo: '≈', texto: 'en tu media habitual', clase: '' }
      : null

  const { objetivoInversionMensual, cargando, guardarObjetivoInversion } = usePresupuesto(usuarioId)
  const [editando, setEditando] = useState(false)
  const [valorInput, setValorInput] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function handleGuardarObjetivo(e) {
    e.preventDefault()
    const numero = Number(valorInput)
    if (!valorInput || !numero || numero <= 0) return
    setGuardando(true)
    await guardarObjetivoInversion(numero)
    setGuardando(false)
    setEditando(false)
    toast('Objetivo guardado')
  }

  const progreso = progresoObjetivo(totalInvertido, objetivoInversionMensual)

  return (
    <div className="metricas-principales fade-in-up">
      {/* Lo que entra: una línea fina con cobrado este mes + media (contexto). */}
      <div className="ingresos-linea">
        <span className="il-bloque">
          <span className="il-label">Este mes</span>
          <strong className="ingreso">{formatearEuros(totalIngresos)}</strong>
        </span>
        {media > 0 && mediaIngresos.meses >= 2 && (
          <span className="il-bloque il-media">
            <span className="il-label">media</span>
            <span>{formatearEuros(Math.round(media))}/mes</span>
            {comparativaIngreso && (
              <span
                className={`il-comp ${comparativaIngreso.clase}`}
                title={`${comparativaIngreso.texto} (últimos ${mediaIngresos.meses} meses)`}
              >
                {comparativaIngreso.simbolo}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Lo que te queda: ahorro del mes (titular). */}
      <div className="metrica-hero">
        <span className="etiqueta">Ahorro de este mes</span>
        <Cifra valor={ahorro} className={`metrica-hero-cifra ${ahorro >= 0 ? 'ingreso' : 'gasto'}`} />
        <span className="metrica-hero-sub">
          {totalIngresos > 0
            ? `Estás ahorrando el ${formatearPorcentaje(ratioAhorro, 0)} de tus ingresos`
            : 'Registra tus ingresos para ver tu ratio de ahorro'}
        </span>
      </div>

      {/* A dónde va: desglose del mes. */}
      <div className="metricas-grid metricas-grid-2">
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
                <InputImporte
                  id="objetivo-inversion"
                  value={valorInput}
                  onValueChange={setValorInput}
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
                    setValorInput(objetivoInversionMensual)
                    setEditando(true)
                  }}
                >
                  Editar
                </button>
              </div>
              <div className={`ratio-barra ${progreso.superado ? 'objetivo-superado' : ''}`}>
                <div
                  className="ratio-barra-relleno inversion"
                  style={{ width: `${progreso.barra}%` }}
                />
              </div>
              <span className="objetivo-inversion-detalle">
                {formatearEuros(totalInvertido)} de {formatearEuros(objetivoInversionMensual)} (
                <span className={progreso.superado ? 'texto-superado' : ''}>
                  {formatearPorcentaje(progreso.pct, 0)}
                </span>
                {progreso.superado && ' · ¡objetivo superado! 🎉'})
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
