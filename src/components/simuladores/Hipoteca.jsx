import { useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import SimulacionesGuardadas from '../SimulacionesGuardadas'
import InputImporte from '../InputImporte'

const PILDORAS_HIPOTECA = [
  {
    titulo: 'Reducir plazo vs reducir cuota',
    texto:
      'Al amortizar anticipadamente puedes elegir bajar la cuota o acortar el plazo. Acortar el plazo suele ahorrarte MÁS intereses, porque eliminas los intereses de los últimos años. Bajar la cuota te da aire cada mes, pero sigues pagando el préstamo el mismo tiempo. Esta herramienta simula acortar el plazo: mantienes tu cuota y le sumas el extra.',
  },
  {
    titulo: 'Por qué amortizar pronto ahorra tanto',
    texto:
      'En una hipoteca (sistema francés) las primeras cuotas son casi todo intereses y muy poco capital. Por eso amortizar en los primeros años recorta muchos más intereses que hacerlo al final, cuando ya casi solo pagas capital. Cuanto antes reduzcas capital, menos intereses se generan sobre él.',
  },
  {
    titulo: 'TIN y TAE no son lo mismo',
    texto:
      'El TIN es solo el tipo de interés nominal. La TAE incluye además comisiones y otros gastos del préstamo, así que refleja mejor el coste real. Comparar dos hipotecas solo por el TIN engaña: una con TIN más bajo pero muchas comisiones puede salir más cara. Mira siempre la TAE.',
  },
  {
    titulo: 'Mira el total pagado, no solo la cuota',
    texto:
      'A lo largo de toda la vida del préstamo, la suma de intereses puede suponer una parte enorme de lo que devuelves. La cuota mensual parece asumible, pero el "total pagado" es lo que de verdad te cuesta la casa. Es una cifra que casi nadie visualiza al firmar.',
  },
  {
    titulo: 'El poder de una aportación extra pequeña',
    texto:
      'Una aportación extra mensual modesta, mantenida en el tiempo, puede recortar años de hipoteca y un buen pellizco de intereses, porque reduces capital pronto. Prueba a subir la "aportación extra" en la pestaña de amortización y compruébalo con tus propios números.',
  },
]

function InfoHipoteca() {
  return (
    <div className="info-hipoteca">
      <span className="balance-etiqueta-principal">¿Sabías que…?</span>
      {PILDORAS_HIPOTECA.map((p) => (
        <details key={p.titulo} className="info-pildora">
          <summary>{p.titulo}</summary>
          <p>{p.texto}</p>
        </details>
      ))}
    </div>
  )
}

function calcularCuota(capital, interesAnual, meses) {
  const r = interesAnual / 100 / 12
  if (r === 0) return capital / meses
  return (capital * r) / (1 - Math.pow(1 + r, -meses))
}

function mesesParaAmortizar(capital, interesAnual, cuota) {
  const r = interesAnual / 100 / 12
  if (r === 0) return Math.ceil(capital / cuota)
  if (cuota <= capital * r) return Infinity
  return Math.ceil(-Math.log(1 - (capital * r) / cuota) / Math.log(1 + r))
}

export default function Hipoteca({ usuarioId }) {
  const [modo, setModo] = useState('cuota')

  // Modo: calcular cuota
  const [importe, setImporte] = useState(null)
  const [interes, setInteres] = useState('')
  const [anios, setAnios] = useState('')

  // Modo: amortización anticipada
  const [capitalPendiente, setCapitalPendiente] = useState(null)
  const [interesAmort, setInteresAmort] = useState('')
  const [aniosRestantes, setAniosRestantes] = useState('')
  const [aportacionExtra, setAportacionExtra] = useState(null)

  const numImporte = Number(importe) || 0
  const numInteres = Number(interes) || 0
  const numAnios = Number(anios) || 0
  const puedeCalcularCuota = numImporte > 0 && numAnios > 0

  let cuota = 0
  let totalPagado = 0
  let totalIntereses = 0

  if (puedeCalcularCuota) {
    const meses = numAnios * 12
    cuota = calcularCuota(numImporte, numInteres, meses)
    totalPagado = cuota * meses
    totalIntereses = totalPagado - numImporte
  }

  const numCapitalPendiente = Number(capitalPendiente) || 0
  const numInteresAmort = Number(interesAmort) || 0
  const numAniosRestantes = Number(aniosRestantes) || 0
  const numAportacionExtra = Number(aportacionExtra) || 0
  const puedeCalcularAmort = numCapitalPendiente > 0 && numAniosRestantes > 0 && numAportacionExtra > 0

  let resultadoAmort = null

  if (puedeCalcularAmort) {
    const mesesOriginales = numAniosRestantes * 12
    const cuotaOriginal = calcularCuota(numCapitalPendiente, numInteresAmort, mesesOriginales)
    const nuevaCuota = cuotaOriginal + numAportacionExtra
    const mesesNuevos = mesesParaAmortizar(numCapitalPendiente, numInteresAmort, nuevaCuota)

    if (mesesNuevos === Infinity) {
      resultadoAmort = 'insuficiente'
    } else {
      const interesesOriginales = cuotaOriginal * mesesOriginales - numCapitalPendiente
      const interesesNuevos = nuevaCuota * mesesNuevos - numCapitalPendiente
      resultadoAmort = {
        mesesAhorrados: mesesOriginales - mesesNuevos,
        interesesAhorrados: interesesOriginales - interesesNuevos,
        nuevaCuota,
      }
    }
  }

  return (
    <div className="simulador fade-in-up">
      <h2>Hipoteca y préstamos</h2>

      <div className="tipo-toggle">
        <button type="button" className={modo === 'cuota' ? 'activo' : ''} onClick={() => setModo('cuota')}>
          Calcular cuota
        </button>
        <button
          type="button"
          className={modo === 'amortizacion' ? 'activo' : ''}
          onClick={() => setModo('amortizacion')}
        >
          Amortización anticipada
        </button>
      </div>

      {modo === 'cuota' ? (
        <>
          <p className="ayuda">Calcula la cuota mensual de un préstamo o hipoteca a tipo fijo.</p>

          <label htmlFor="h-importe">Importe del préstamo (€)</label>
          <InputImporte id="h-importe" value={importe} onValueChange={setImporte} placeholder="ej. 150.000" />

          <label htmlFor="h-interes">Interés anual (TIN %)</label>
          <input
            id="h-interes"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={interes}
            onChange={(e) => setInteres(e.target.value)}
            placeholder="ej. 3.2"
          />

          <label htmlFor="h-anios">Plazo (años)</label>
          <input
            id="h-anios"
            type="number"
            inputMode="decimal"
            min="0"
            value={anios}
            onChange={(e) => setAnios(e.target.value)}
            placeholder="ej. 30"
          />

          {puedeCalcularCuota && (
            <div className="balance-grid" style={{ marginTop: 16 }}>
              <div className="balance-item">
                <span className="etiqueta">Cuota mensual</span>
                <span className="valor">{formatearEuros(cuota)}</span>
              </div>
              <div className="balance-item">
                <span className="etiqueta">Total intereses</span>
                <span className="valor gasto">{formatearEuros(totalIntereses)}</span>
              </div>
              <div className="balance-item">
                <span className="etiqueta">Total pagado</span>
                <span className="valor">{formatearEuros(totalPagado)}</span>
              </div>
            </div>
          )}

          {puedeCalcularCuota && (
            <p className="ayuda info-contextual">
              A lo largo de toda la vida del préstamo pagarás{' '}
              <strong className="gasto">{formatearEuros(totalIntereses)}</strong> solo en intereses:
              casi nadie visualiza esta cifra al firmar. Mira el total pagado, no solo la cuota.
            </p>
          )}

          <SimulacionesGuardadas
            usuarioId={usuarioId}
            tipo="hipoteca"
            datosActuales={puedeCalcularCuota ? { importe, interes, anios } : null}
            onCargar={(datos) => {
              setImporte(Number(datos.importe) || null)
              setInteres(String(datos.interes))
              setAnios(String(datos.anios))
            }}
          />
        </>
      ) : (
        <>
          <p className="ayuda">
            Simula cuánto ahorras en tiempo e intereses si aportas una cuota extra cada mes.
          </p>

          <label htmlFor="a-capital">Capital pendiente (€)</label>
          <InputImporte
            id="a-capital"
            value={capitalPendiente}
            onValueChange={setCapitalPendiente}
            placeholder="ej. 120.000"
          />

          <label htmlFor="a-interes">Interés anual (TIN %)</label>
          <input
            id="a-interes"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={interesAmort}
            onChange={(e) => setInteresAmort(e.target.value)}
            placeholder="ej. 3.2"
          />

          <label htmlFor="a-anios">Años restantes</label>
          <input
            id="a-anios"
            type="number"
            inputMode="decimal"
            min="0"
            value={aniosRestantes}
            onChange={(e) => setAniosRestantes(e.target.value)}
            placeholder="ej. 25"
          />

          <label htmlFor="a-extra">Aportación extra mensual (€)</label>
          <InputImporte
            id="a-extra"
            value={aportacionExtra}
            onValueChange={setAportacionExtra}
            placeholder="ej. 100"
          />

          {resultadoAmort === 'insuficiente' && (
            <p className="error">La aportación extra es demasiado baja para amortizar el préstamo.</p>
          )}

          {resultadoAmort && resultadoAmort !== 'insuficiente' && (
            <div className="balance-grid" style={{ marginTop: 16 }}>
              <div className="balance-item">
                <span className="etiqueta">Tiempo ahorrado</span>
                <span className="valor ingreso">
                  {Math.floor(resultadoAmort.mesesAhorrados / 12)} a. y{' '}
                  {resultadoAmort.mesesAhorrados % 12} m.
                </span>
              </div>
              <div className="balance-item">
                <span className="etiqueta">Intereses ahorrados</span>
                <span className="valor ingreso">{formatearEuros(resultadoAmort.interesesAhorrados)}</span>
              </div>
              <div className="balance-item">
                <span className="etiqueta">Nueva cuota</span>
                <span className="valor">{formatearEuros(resultadoAmort.nuevaCuota)}</span>
              </div>
            </div>
          )}
        </>
      )}

      <InfoHipoteca />
    </div>
  )
}
