import { useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import { useEscenariosIF } from '../../lib/useEscenariosIF'
import { toast } from '../../lib/toast'
import { confirmar } from '../../lib/confirmar'
import InputImporte from '../InputImporte'

const UMBRAL_DIAS = 30
const TOPE_MESES = 1200 // 100 años, límite de seguridad para el bucle

// Cálculo puro de la regla del 4% (reutilizado por el resultado en vivo y por
// la comparación de escenarios). Devuelve {objetivo, meses}: meses = 0 (ya),
// Infinity (inalcanzable) o el número de meses.
function calcularIF({ gasto, patrimonio, ahorro, rentabilidad }) {
  const numGasto = Number(gasto) || 0
  const objetivo = numGasto * 12 * 25
  if (numGasto <= 0) return { objetivo: 0, meses: null }
  const numPatrimonio = Number(patrimonio) || 0
  if (numPatrimonio >= objetivo) return { objetivo, meses: 0 }
  const numAhorro = Number(ahorro) || 0
  const r = (Number(rentabilidad) || 0) / 100 / 12
  if (numAhorro <= 0 && r <= 0) return { objetivo, meses: Infinity }
  let patrimonioAcum = numPatrimonio
  let meses = 0
  while (patrimonioAcum < objetivo && meses < TOPE_MESES) {
    patrimonioAcum = patrimonioAcum * (1 + r) + numAhorro
    meses += 1
  }
  return { objetivo, meses: meses >= TOPE_MESES ? Infinity : meses }
}

function textoTiempo(meses) {
  if (meses === null) return '—'
  if (meses === Infinity) return 'No alcanzable'
  if (meses === 0) return '¡Ya lo tienes!'
  return `${Math.floor(meses / 12)} a. y ${meses % 12} m.`
}

export default function IndependenciaFinanciera({ usuarioId, gastoMensualActual, ahorroMensualActual, diasConHistorial }) {
  const [gastoMensual, setGastoMensual] = useState(Math.round(gastoMensualActual) || null)
  const [patrimonioActual, setPatrimonioActual] = useState(null)
  const [ahorroMensual, setAhorroMensual] = useState(Math.round(ahorroMensualActual) || null)
  const [rentabilidad, setRentabilidad] = useState('5')
  const [nombre, setNombre] = useState('')

  const { items: escenarios, crear, eliminar } = useEscenariosIF(usuarioId)

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

  const parametros = { gasto: gastoMensual, patrimonio: patrimonioActual, ahorro: ahorroMensual, rentabilidad }
  const { objetivo: objetivoFIRE, meses: resultadoMeses } = calcularIF(parametros)
  const puedeCalcular = (Number(gastoMensual) || 0) > 0

  // Escenarios + (opcionalmente) el actual, con su resultado, para comparar.
  const filasComparar = escenarios.map((e) => ({ ...e, ...calcularIF(e) }))
  const mejorMeses = Math.min(
    ...filasComparar.map((f) => (typeof f.meses === 'number' ? f.meses : Infinity)),
    Infinity,
  )

  function guardarEscenario() {
    if (!puedeCalcular) return
    const nombreFinal = nombre.trim() || `Escenario ${escenarios.length + 1}`
    crear({
      nombre: nombreFinal,
      gasto: Number(gastoMensual) || 0,
      patrimonio: Number(patrimonioActual) || 0,
      ahorro: Number(ahorroMensual) || 0,
      rentabilidad: Number(rentabilidad) || 0,
    })
    setNombre('')
    toast('Escenario guardado')
  }

  function cargarEscenario(e) {
    setGastoMensual(Number(e.gasto) || null)
    setPatrimonioActual(Number(e.patrimonio) || null)
    setAhorroMensual(Number(e.ahorro) || null)
    setRentabilidad(String(e.rentabilidad ?? ''))
  }

  async function borrarEscenario(id) {
    if (await confirmar('¿Borrar este escenario?')) eliminar(id)
  }

  return (
    <div className="simulador fade-in-up">
      <h2>Independencia financiera</h2>
      <p className="ayuda">
        Basado en la regla del 4%: necesitas un patrimonio de 25 veces tu gasto anual para
        vivir de las rentas. Estimación orientativa, no es una recomendación de inversión.
      </p>
      <p className="ayuda">
        Prueba distintos <strong>escenarios</strong> (conservador, realista, optimista…) cambiando
        la rentabilidad o el ahorro, guárdalos y compáralos abajo.
      </p>

      <label htmlFor="fi-gasto">Gasto mensual estimado (€)</label>
      <InputImporte id="fi-gasto" value={gastoMensual} onValueChange={setGastoMensual} />

      <label htmlFor="fi-patrimonio">Patrimonio invertido actual (€)</label>
      <InputImporte
        id="fi-patrimonio"
        value={patrimonioActual}
        onValueChange={setPatrimonioActual}
        placeholder="0"
      />

      <label htmlFor="fi-ahorro">Ahorro/inversión mensual (€)</label>
      <InputImporte id="fi-ahorro" value={ahorroMensual} onValueChange={setAhorroMensual} />

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
            <span className="valor ingreso">{textoTiempo(resultadoMeses)}</span>
          </div>
        </div>
      )}

      {/* Guardar escenario */}
      {puedeCalcular && (
        <div className="if-guardar">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del escenario (ej. Conservador)"
          />
          <button type="button" onClick={guardarEscenario}>
            Guardar escenario
          </button>
        </div>
      )}

      {/* Comparación de escenarios */}
      {filasComparar.length > 0 && (
        <div className="if-comparacion">
          <span className="balance-etiqueta-principal">Comparar escenarios</span>
          <div className="if-tabla-scroll">
            <table className="if-tabla">
              <thead>
                <tr>
                  <th>Escenario</th>
                  <th>Ahorro/mes</th>
                  <th>Rentab.</th>
                  <th>Tiempo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filasComparar.map((f) => (
                  <tr key={f.id} className={typeof f.meses === 'number' && f.meses === mejorMeses ? 'mejor' : ''}>
                    <td>
                      <button type="button" className="if-cargar" onClick={() => cargarEscenario(f)}>
                        {f.nombre}
                      </button>
                    </td>
                    <td>{formatearEuros(Number(f.ahorro))}</td>
                    <td>{f.rentabilidad}%</td>
                    <td className="if-tiempo">{textoTiempo(f.meses)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-eliminar if-borrar"
                        onClick={() => borrarEscenario(f.id)}
                        aria-label={`Borrar ${f.nombre}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ayuda">
            Toca el nombre de un escenario para cargar sus valores. El más rápido en alcanzar la
            independencia aparece resaltado.
          </p>
        </div>
      )}
    </div>
  )
}
