import { useState } from 'react'
import { esInversion, formatearEuros } from '../lib/categorias'
import { usePresupuesto } from '../lib/usePresupuesto'
import { useCountUp } from '../lib/useCountUp'

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

export default function Presupuesto({ usuarioId, movimientos }) {
  const { tasaAhorroObjetivo, cargando, guardarTasa } = usePresupuesto(usuarioId)
  const [editando, setEditando] = useState(false)
  const [valorInput, setValorInput] = useState('')
  const [guardando, setGuardando] = useState(false)

  const totalIngresos = movimientos
    .filter((m) => m.tipo === 'ingreso')
    .reduce((s, m) => s + Number(m.importe), 0)

  // Invertir no cuenta como gasto de consumo, no debe agotar el presupuesto.
  const totalGastos = movimientos
    .filter((m) => m.tipo === 'gasto' && !esInversion(m))
    .reduce((s, m) => s + Number(m.importe), 0)

  const ratioAhorroReal = totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0

  async function handleGuardar(e) {
    e.preventDefault()
    const numero = Number(valorInput)
    if (numero < 0 || numero > 100) return
    setGuardando(true)
    await guardarTasa(numero)
    setGuardando(false)
    setEditando(false)
  }

  if (cargando) return <p>Cargando presupuesto…</p>

  if (tasaAhorroObjetivo === null || editando) {
    return (
      <form className="presupuesto-config fade-in-up" onSubmit={handleGuardar}>
        <h2>{tasaAhorroObjetivo === null ? 'Define tu presupuesto' : 'Ajustar objetivo'}</h2>
        <p className="ayuda">
          ¿Qué porcentaje de tus ingresos quieres ahorrar cada mes? Con eso calculamos
          automáticamente cuánto puedes gastar.
        </p>
        <label htmlFor="tasa">Tasa de ahorro objetivo (%)</label>
        <input
          id="tasa"
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="1"
          value={valorInput}
          onChange={(e) => setValorInput(e.target.value)}
          placeholder="ej. 20"
          autoFocus
        />
        <button type="submit" disabled={guardando || valorInput === ''}>
          {guardando ? 'Guardando…' : 'Guardar objetivo'}
        </button>
      </form>
    )
  }

  const presupuestoGasto = totalIngresos * (1 - tasaAhorroObjetivo / 100)
  const restante = presupuestoGasto - totalGastos
  const porcentajeGastado = presupuestoGasto > 0 ? (totalGastos / presupuestoGasto) * 100 : 0
  const sobrepasado = totalGastos > presupuestoGasto && presupuestoGasto > 0

  return (
    <div className="presupuesto fade-in-up">
      <div className="presupuesto-header">
        <h2>Presupuesto del mes</h2>
        <button
          type="button"
          className="link"
          onClick={() => {
            setValorInput(String(tasaAhorroObjetivo))
            setEditando(true)
          }}
        >
          Editar objetivo
        </button>
      </div>

      <span className="balance-etiqueta-principal">
        Objetivo: ahorrar el {tasaAhorroObjetivo}% de tus ingresos
      </span>

      {totalIngresos === 0 ? (
        <p className="ayuda" style={{ marginTop: 12 }}>
          Registra algún ingreso este mes para calcular tu presupuesto de gasto.
        </p>
      ) : (
        <>
          <Cifra
            valor={presupuestoGasto}
            className="balance-hero"
          />
          <span className="balance-etiqueta-principal">disponible para gastar este mes</span>

          <div className="ratio-barra" style={{ marginTop: 16 }}>
            <div
              className={`ratio-barra-relleno ${sobrepasado ? 'sobrepasado' : ''}`}
              style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
            />
          </div>

          <div className="balance-grid" style={{ marginTop: 16 }}>
            <div className="balance-item">
              <span className="etiqueta">Gastado</span>
              <span className="valor gasto">{formatearEuros(totalGastos)}</span>
            </div>
            <div className="balance-item">
              <span className="etiqueta">{restante >= 0 ? 'Te queda' : 'Excedido en'}</span>
              <span className={`valor ${restante >= 0 ? 'ingreso' : 'gasto'}`}>
                {formatearEuros(Math.abs(restante))}
              </span>
            </div>
            <div className="balance-item">
              <span className="etiqueta">Ahorro real</span>
              <span className={`valor ${ratioAhorroReal >= tasaAhorroObjetivo ? 'ingreso' : 'gasto'}`}>
                {ratioAhorroReal.toFixed(1)}%
              </span>
            </div>
          </div>

          {sobrepasado && (
            <p className="error" style={{ marginTop: 12 }}>
              Has superado tu presupuesto de gasto este mes.
            </p>
          )}
        </>
      )}
    </div>
  )
}
