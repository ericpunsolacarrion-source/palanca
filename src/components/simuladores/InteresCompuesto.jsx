import { useState } from 'react'
import { formatearEuros } from '../../lib/categorias'

export default function InteresCompuesto() {
  const [inicial, setInicial] = useState('')
  const [mensual, setMensual] = useState('')
  const [anios, setAnios] = useState('')
  const [rentabilidad, setRentabilidad] = useState('')

  const aportacionInicial = Number(inicial) || 0
  const aportacionMensual = Number(mensual) || 0
  const numAnios = Number(anios) || 0
  const numRentabilidad = Number(rentabilidad) || 0

  const puedeCalcular = numAnios > 0 && (aportacionInicial > 0 || aportacionMensual > 0)

  let valorFinal = 0
  let totalAportado = 0

  if (puedeCalcular) {
    const meses = numAnios * 12
    const r = numRentabilidad / 100 / 12
    totalAportado = aportacionInicial + aportacionMensual * meses

    if (r === 0) {
      valorFinal = totalAportado
    } else {
      valorFinal =
        aportacionInicial * Math.pow(1 + r, meses) +
        aportacionMensual * ((Math.pow(1 + r, meses) - 1) / r)
    }
  }

  const interesesGenerados = valorFinal - totalAportado

  return (
    <div className="simulador fade-in-up">
      <h2>Interés compuesto</h2>
      <p className="ayuda">
        Proyección matemática de cómo crecería tu dinero con aportaciones periódicas. No es
        una recomendación de inversión, solo una estimación.
      </p>

      <label htmlFor="ic-inicial">Aportación inicial (€)</label>
      <input
        id="ic-inicial"
        type="number"
        inputMode="decimal"
        min="0"
        value={inicial}
        onChange={(e) => setInicial(e.target.value)}
        placeholder="ej. 1000"
      />

      <label htmlFor="ic-mensual">Aportación mensual (€)</label>
      <input
        id="ic-mensual"
        type="number"
        inputMode="decimal"
        min="0"
        value={mensual}
        onChange={(e) => setMensual(e.target.value)}
        placeholder="ej. 100"
      />

      <label htmlFor="ic-anios">Años</label>
      <input
        id="ic-anios"
        type="number"
        inputMode="decimal"
        min="0"
        value={anios}
        onChange={(e) => setAnios(e.target.value)}
        placeholder="ej. 10"
      />

      <label htmlFor="ic-rentabilidad">Rentabilidad anual estimada (%)</label>
      <input
        id="ic-rentabilidad"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={rentabilidad}
        onChange={(e) => setRentabilidad(e.target.value)}
        placeholder="ej. 6"
      />

      {puedeCalcular && (
        <>
          <div className="balance-grid" style={{ marginTop: 16 }}>
            <div className="balance-item">
              <span className="etiqueta">Total aportado</span>
              <span className="valor">{formatearEuros(totalAportado)}</span>
            </div>
            <div className="balance-item">
              <span className="etiqueta">Intereses generados</span>
              <span className="valor ingreso">{formatearEuros(interesesGenerados)}</span>
            </div>
            <div className="balance-item">
              <span className="etiqueta">Valor final</span>
              <span className="valor">{formatearEuros(valorFinal)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
