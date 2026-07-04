import { useState } from 'react'
import { formatearEuros } from '../../lib/categorias'

const UMBRAL_DIAS = 30
const TOPE_MESES = 1200 // 100 años, límite de seguridad para el bucle

export default function IndependenciaFinanciera({ gastoMensualActual, ahorroMensualActual, diasConHistorial }) {
  const [gastoMensual, setGastoMensual] = useState(String(Math.round(gastoMensualActual) || ''))
  const [patrimonioActual, setPatrimonioActual] = useState('')
  const [ahorroMensual, setAhorroMensual] = useState(String(Math.round(ahorroMensualActual) || ''))
  const [rentabilidad, setRentabilidad] = useState('5')

  if (diasConHistorial < UMBRAL_DIAS) {
    return (
      <div className="simulador fade-in-up">
        <h2>Independencia financiera</h2>
        <p className="ayuda">
          Este simulador se desbloquea cuando llevas al menos {UMBRAL_DIAS} días registrando
          movimientos, para poder basar la estimación en datos reales tuyos. De momento llevas{' '}
          {diasConHistorial} {diasConHistorial === 1 ? 'día' : 'días'}.
        </p>
      </div>
    )
  }

  const numGasto = Number(gastoMensual) || 0
  const numPatrimonio = Number(patrimonioActual) || 0
  const numAhorro = Number(ahorroMensual) || 0
  const numRentabilidad = Number(rentabilidad) || 0

  const objetivoFIRE = numGasto * 12 * 25
  const puedeCalcular = numGasto > 0

  let resultado = null
  if (puedeCalcular) {
    if (numPatrimonio >= objetivoFIRE) {
      resultado = { meses: 0 }
    } else if (numAhorro <= 0 && numRentabilidad <= 0) {
      resultado = 'inalcanzable'
    } else {
      const r = numRentabilidad / 100 / 12
      let patrimonio = numPatrimonio
      let meses = 0
      while (patrimonio < objetivoFIRE && meses < TOPE_MESES) {
        patrimonio = patrimonio * (1 + r) + numAhorro
        meses += 1
      }
      resultado = meses >= TOPE_MESES ? 'inalcanzable' : { meses }
    }
  }

  return (
    <div className="simulador fade-in-up">
      <h2>Independencia financiera</h2>
      <p className="ayuda">
        Basado en la regla del 4%: necesitas un patrimonio de 25 veces tu gasto anual para
        vivir de las rentas. Estimación orientativa, no es una recomendación de inversión.
      </p>

      <label htmlFor="fi-gasto">Gasto mensual estimado (€)</label>
      <input
        id="fi-gasto"
        type="number"
        inputMode="decimal"
        min="0"
        value={gastoMensual}
        onChange={(e) => setGastoMensual(e.target.value)}
      />

      <label htmlFor="fi-patrimonio">Patrimonio invertido actual (€)</label>
      <input
        id="fi-patrimonio"
        type="number"
        inputMode="decimal"
        min="0"
        value={patrimonioActual}
        onChange={(e) => setPatrimonioActual(e.target.value)}
        placeholder="0"
      />

      <label htmlFor="fi-ahorro">Ahorro/inversión mensual (€)</label>
      <input
        id="fi-ahorro"
        type="number"
        inputMode="decimal"
        min="0"
        value={ahorroMensual}
        onChange={(e) => setAhorroMensual(e.target.value)}
      />

      <label htmlFor="fi-rentabilidad">Rentabilidad anual esperada (%)</label>
      <input
        id="fi-rentabilidad"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={rentabilidad}
        onChange={(e) => setRentabilidad(e.target.value)}
      />

      {puedeCalcular && (
        <div className="balance-grid" style={{ marginTop: 16 }}>
          <div className="balance-item">
            <span className="etiqueta">Objetivo (regla del 4%)</span>
            <span className="valor">{formatearEuros(objetivoFIRE)}</span>
          </div>
          <div className="balance-item">
            <span className="etiqueta">Tiempo estimado</span>
            <span className="valor ingreso">
              {resultado === 'inalcanzable'
                ? 'No alcanzable así'
                : resultado.meses === 0
                  ? '¡Ya lo tienes!'
                  : `${Math.floor(resultado.meses / 12)} años y ${resultado.meses % 12} meses`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
