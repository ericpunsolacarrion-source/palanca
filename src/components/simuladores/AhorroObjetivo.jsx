import { useState } from 'react'
import { formatearEuros } from '../../lib/categorias'

export default function AhorroObjetivo({ ahorroMensual }) {
  const [objetivo, setObjetivo] = useState('')

  const objetivoNumero = Number(objetivo)
  const tieneObjetivoValido = objetivoNumero > 0

  let resultado = null
  if (tieneObjetivoValido) {
    if (ahorroMensual <= 0) {
      resultado = 'no-alcanzable'
    } else {
      resultado = Math.ceil(objetivoNumero / ahorroMensual)
    }
  }

  return (
    <div className="simulador fade-in-up">
      <h2>Ahorro objetivo</h2>
      <p className="ayuda">
        Con tu ahorro mensual actual de <strong>{formatearEuros(ahorroMensual)}</strong>,
        calculamos en cuántos meses llegarías a tu objetivo.
      </p>

      <label htmlFor="objetivo">Objetivo de ahorro (€)</label>
      <input
        id="objetivo"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        placeholder="ej. 3000"
      />

      {resultado === 'no-alcanzable' && (
        <p className="error">
          Con un ahorro mensual de {formatearEuros(ahorroMensual)} no alcanzarás este
          objetivo. Registra ingresos o reduce gastos para tener ahorro positivo.
        </p>
      )}

      {typeof resultado === 'number' && (
        <p className="resultado">
          Llegarás a tu objetivo en <strong>{resultado}</strong>{' '}
          {resultado === 1 ? 'mes' : 'meses'}.
        </p>
      )}
    </div>
  )
}
