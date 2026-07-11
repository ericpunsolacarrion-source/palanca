import { useMemo, useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import {
  claveMesActual,
  estimacionGastoMensual,
  filtrarMesActual,
  ingresoMensualMedio,
  resumenMensualMedio,
  totalesDe,
} from '../lib/movimientosUtils'
import { usePlanificaciones } from '../lib/usePlanificaciones'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import InputImporte from './InputImporte'

const N_MESES = 6

function proximosMeses(n) {
  const hoy = new Date()
  const arr = []
  for (let i = 1; i <= n; i += 1) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const etiqueta = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(d)
    arr.push({ clave, etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1) })
  }
  return arr
}

function FormularioPlan({ inicial, medias, onGuardar, onCancelar, guardando }) {
  const [ingreso, setIngreso] = useState(inicial ? Number(inicial.ingreso_previsto) : medias.ingreso)
  const [gasto, setGasto] = useState(inicial ? Number(inicial.gasto_previsto) : medias.gasto)
  const [inversion, setInversion] = useState(
    inicial ? Number(inicial.inversion_prevista) : medias.inversion,
  )

  const ahorro = (Number(ingreso) || 0) - (Number(gasto) || 0)
  const libre = ahorro - (Number(inversion) || 0)

  return (
    <form
      className="plan-form"
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar({ ingreso: Number(ingreso) || 0, gasto: Number(gasto) || 0, inversion: Number(inversion) || 0 })
      }}
    >
      {(medias.ingreso > 0 || medias.gasto > 0) && (
        <p className="ayuda plan-referencia">
          De referencia, en tus últimos meses: ingresos{' '}
          <strong>{formatearEuros(medias.ingreso)}</strong>, gastos{' '}
          <strong>{formatearEuros(medias.gasto)}</strong>, invertido{' '}
          <strong>{formatearEuros(medias.inversion)}</strong>.
        </p>
      )}

      <label htmlFor="plan-ingreso">Ingreso que esperas (€)</label>
      <InputImporte id="plan-ingreso" value={ingreso} onValueChange={setIngreso} />

      <label htmlFor="plan-gasto">Gasto máximo que te pones (€)</label>
      <InputImporte id="plan-gasto" value={gasto} onValueChange={setGasto} />

      <label htmlFor="plan-inversion">Cuánto quieres invertir (€)</label>
      <InputImporte id="plan-inversion" value={inversion} onValueChange={setInversion} />

      <div className="plan-derivado">
        <span>
          Ahorrarías <strong className={ahorro >= 0 ? 'ingreso' : 'gasto'}>{formatearEuros(ahorro)}</strong>
        </span>
        {libre >= 0 ? (
          <span className="ayuda">De ese ahorro, te quedarían {formatearEuros(libre)} libres tras invertir.</span>
        ) : (
          <span className="ayuda" style={{ color: 'var(--gasto)' }}>
            Quieres invertir más de lo que ahorrarías: ajusta las cifras.
          </span>
        )}
      </div>

      <div className="edicion-acciones">
        <button type="button" className="btn-eliminar" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar plan'}
        </button>
      </div>
    </form>
  )
}

function ComparacionMesActual({ plan, real }) {
  const filas = [
    { etiqueta: 'Ingresos', prev: Number(plan.ingreso_previsto), real: real.ingresos, masEsMejor: true },
    { etiqueta: 'Gastos', prev: Number(plan.gasto_previsto), real: real.gastos, masEsMejor: false },
    { etiqueta: 'Inversión', prev: Number(plan.inversion_prevista), real: real.invertido, masEsMejor: true },
  ]
  return (
    <div className="plan-comparacion">
      <span className="balance-etiqueta-principal">Tu plan de este mes vs la realidad</span>
      {filas.map((f) => {
        const diff = f.real - f.prev
        const bien = f.masEsMejor ? diff >= 0 : diff <= 0
        return (
          <div key={f.etiqueta} className="plan-comp-fila">
            <span className="plan-comp-cat">{f.etiqueta}</span>
            <span className="plan-comp-cifras">
              plan {formatearEuros(f.prev)} · real{' '}
              <strong className={bien ? 'ingreso' : 'gasto'}>{formatearEuros(f.real)}</strong>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function PlanificacionFutura({ usuarioId, movimientos }) {
  const { planes, cargando, tablaFalta, guardar, eliminar } = usePlanificaciones(usuarioId)
  const [editandoMes, setEditandoMes] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const meses = useMemo(() => proximosMeses(N_MESES), [])

  const medias = useMemo(() => {
    const ing = ingresoMensualMedio(movimientos).media
    const gas = estimacionGastoMensual(movimientos).estimacion
    const inv = resumenMensualMedio(movimientos).invertidoMedio
    return {
      ingreso: Math.round(ing) || null,
      gasto: Math.round(gas) || null,
      inversion: Math.round(inv) || null,
    }
  }, [movimientos])

  const planMesActual = planes[claveMesActual()]
  const realMesActual = useMemo(() => totalesDe(filtrarMesActual(movimientos)), [movimientos])

  // Acumulado proyectado si el usuario cumple los planes de los próximos meses.
  const proyeccion = useMemo(() => {
    let ahorro = 0
    let inversion = 0
    let mesesConPlan = 0
    for (const { clave } of meses) {
      const p = planes[clave]
      if (!p) continue
      mesesConPlan += 1
      ahorro += Number(p.ingreso_previsto) - Number(p.gasto_previsto)
      inversion += Number(p.inversion_prevista)
    }
    return { ahorro, inversion, mesesConPlan }
  }, [planes, meses])

  if (tablaFalta) {
    return (
      <div className="simulador fade-in-up">
        <h2>Planifica los próximos meses</h2>
        <p className="ayuda" style={{ color: 'var(--gasto)' }}>
          Esta función estará disponible en cuanto se active (falta crear la tabla de
          planificaciones).
        </p>
      </div>
    )
  }

  async function handleGuardar(mes, datos) {
    setGuardando(true)
    const ok = await guardar(mes, datos)
    setGuardando(false)
    if (ok) {
      setEditandoMes(null)
      toast('Plan guardado')
    } else {
      toast('No se ha podido guardar', 'error')
    }
  }

  async function handleEliminar(mes) {
    if (!(await confirmar('¿Eliminar la planificación de este mes?'))) return
    const ok = await eliminar(mes)
    if (ok) toast('Planificación eliminada')
    else toast('No se ha podido eliminar', 'error')
  }

  return (
    <div className="simulador fade-in-up">
      <h2>Planifica los próximos meses</h2>
      <p className="ayuda">
        Prepara con antelación cuánto quieres ingresar, gastar e invertir. Cuando llegue el mes,
        podrás comparar tu plan con lo que pasó de verdad.
      </p>

      {planMesActual && <ComparacionMesActual plan={planMesActual} real={realMesActual} />}

      {proyeccion.mesesConPlan > 0 && (
        <div className="plan-proyeccion">
          <span className="plan-proyeccion-titulo">Si cumples tus planes…</span>
          <div className="plan-proyeccion-cifras">
            <div className="pp-bloque">
              <span className="pp-valor ingreso">{formatearEuros(proyeccion.ahorro)}</span>
              <span className="pp-label">ahorrados</span>
            </div>
            <span className="pp-mas">+</span>
            <div className="pp-bloque">
              <span className="pp-valor inversion">{formatearEuros(proyeccion.inversion)}</span>
              <span className="pp-label">invertidos</span>
            </div>
          </div>
          <span className="plan-proyeccion-nota">
            en {proyeccion.mesesConPlan} {proyeccion.mesesConPlan === 1 ? 'mes' : 'meses'} planificados
            (la inversión forma parte del ahorro).
          </span>
        </div>
      )}

      {cargando ? (
        <div className="skeleton skeleton-linea" style={{ width: '60%', height: 40 }} />
      ) : (
        <div className="plan-lista">
          {meses.map(({ clave, etiqueta }) => {
            const plan = planes[clave]
            if (editandoMes === clave) {
              return (
                <div key={clave} className="plan-card">
                  <span className="plan-mes">{etiqueta}</span>
                  <FormularioPlan
                    inicial={plan}
                    medias={medias}
                    guardando={guardando}
                    onGuardar={(datos) => handleGuardar(clave, datos)}
                    onCancelar={() => setEditandoMes(null)}
                  />
                </div>
              )
            }
            const ahorro = plan ? Number(plan.ingreso_previsto) - Number(plan.gasto_previsto) : 0
            return (
              <div key={clave} className="plan-card">
                <div className="plan-card-cabecera">
                  <span className="plan-mes">{etiqueta}</span>
                  {plan ? (
                    <span className="grupo-botones">
                      <button type="button" className="btn-editar" onClick={() => setEditandoMes(clave)}>
                        Editar
                      </button>
                      <button type="button" className="btn-eliminar" onClick={() => handleEliminar(clave)}>
                        Eliminar
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="link" onClick={() => setEditandoMes(clave)}>
                      Planificar
                    </button>
                  )}
                </div>
                {plan && (
                  <div className="plan-resumen">
                    <span>
                      <span className="il-label">Ingreso</span> {formatearEuros(Number(plan.ingreso_previsto))}
                    </span>
                    <span>
                      <span className="il-label">Gasto</span> {formatearEuros(Number(plan.gasto_previsto))}
                    </span>
                    <span>
                      <span className="il-label">Invertir</span>{' '}
                      {formatearEuros(Number(plan.inversion_prevista))}
                    </span>
                    <span>
                      <span className="il-label">Ahorro</span>{' '}
                      <strong className={ahorro >= 0 ? 'ingreso' : 'gasto'}>{formatearEuros(ahorro)}</strong>
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
