import { useMemo, useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import { diasRestantesDelMes, formatearPorcentaje, gastoPorCategoria, ingresoMensualMedio, limiteGastoPresupuesto, totalesDe } from '../lib/movimientosUtils'
import { usePresupuestoCompartido } from '../lib/DatosCompartidos'
import { toast } from '../lib/toast'
import { useCountUp } from '../lib/useCountUp'
import InputImporte from './InputImporte'
import { esV5 } from '../lib/diseno'
import { claveMesActual, etiquetaMes } from '../lib/movimientosUtils'
import { resumenDelMes } from '../lib/inicio'
import { Anillo } from './v5/Graficos'
import Icono from './Icono'
import LimitesCategoria from './v5/LimitesCategoria'

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

export default function Presupuesto({ movimientos, gastoEstimado, historico = [] }) {
  const {
    metodo,
    tasaAhorroObjetivo,
    gastoMaximoFijo,
    configurado,
    cargando,
    guardarPresupuesto,
  } = usePresupuestoCompartido()

  const [editando, setEditando] = useState(false)
  const [metodoInput, setMetodoInput] = useState('tasa')
  const [valorInput, setValorInput] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Al cambiar de método, se limpia el valor para que no arrastre el marcador
  // del método anterior (ej. un 25 de la tasa apareciendo como 25 € de gasto).
  function cambiarMetodo(nuevo) {
    if (nuevo === metodoInput) return
    setMetodoInput(nuevo)
    setValorInput(null)
  }

  // Regla única (ver CLAUDE.md): la inversión no es gasto de consumo,
  // así que no agota el presupuesto.
  const {
    ingresos: totalIngresos,
    gastos: totalGastos,
    ratioAhorro: ratioAhorroReal,
  } = totalesDe(movimientos)

  const topCategorias = useMemo(() => {
    const mapa = gastoPorCategoria(movimientos)
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [movimientos])

  const [errorGuardado, setErrorGuardado] = useState(null)

  async function handleGuardar(e) {
    e.preventDefault()
    const numero = Number(valorInput)
    if (valorInput == null || numero <= 0) return
    if (metodoInput === 'tasa' && numero > 100) return
    setGuardando(true)
    setErrorGuardado(null)
    const ok = await guardarPresupuesto(metodoInput, numero)
    setGuardando(false)
    if (ok) {
      setEditando(false)
      toast('Presupuesto guardado')
    } else {
      setErrorGuardado('No se ha podido guardar. Inténtalo de nuevo.')
    }
  }

  if (cargando) return <p>Cargando presupuesto…</p>

  if ((!configurado || editando) && esV5()) {
    return (
      <ConfigV5
        configurado={configurado}
        metodoInput={metodoInput}
        cambiarMetodo={cambiarMetodo}
        valorInput={valorInput}
        setValorInput={setValorInput}
        guardando={guardando}
        errorGuardado={errorGuardado}
        onGuardar={handleGuardar}
        onCancelar={() => setEditando(false)}
        gastoEstimado={gastoEstimado}
        historico={historico}
        ingresosMes={totalIngresos}
      />
    )
  }

  if (!configurado || editando) {
    return (
      <form className="presupuesto-config fade-in-up" onSubmit={handleGuardar}>
        <h2>{configurado ? 'Ajustar presupuesto' : 'Define tu presupuesto'}</h2>
        <p className="ayuda">Elige cómo prefieres limitar tu gasto mensual.</p>

        <div className="tipo-toggle">
          <button
            type="button"
            className={metodoInput === 'tasa' ? 'activo' : ''}
            onClick={() => cambiarMetodo('tasa')}
          >
            Por tasa de ahorro
          </button>
          <button
            type="button"
            className={metodoInput === 'fijo' ? 'activo' : ''}
            onClick={() => cambiarMetodo('fijo')}
          >
            Gasto máximo fijo
          </button>
        </div>

        <details className="info-pildora info-metodos">
          <summary>¿Qué método me conviene?</summary>
          <p>
            <strong>Por porcentaje:</strong> el % es fijo, pero en euros se adapta cada mes a tus
            ingresos. Los meses buenos te deja gastar más; los flojos, aprieta solo. Es el método
            más flexible.
          </p>
          <p>
            <strong>Por euros fijos:</strong> el límite es constante pases lo que pases. En los
            meses que ingresas más, ese excedente no se gasta: se ahorra automáticamente. Por eso
            suele construir patrimonio más rápido, aunque es menos adaptativo.
          </p>
        </details>

        {metodoInput === 'tasa' ? (
          <>
            <label htmlFor="tasa">Tasa de ahorro objetivo (%)</label>
            <input
              id="tasa"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={valorInput ?? ''}
              onChange={(e) => setValorInput(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="ej. 20"
              autoFocus
            />
            <p className="ayuda">
              Calculamos cuánto puedes gastar cada mes según tus ingresos reales.
            </p>
          </>
        ) : (
          <>
            <label htmlFor="fijo">¿Cuánto quieres gastar como máximo al mes? (€)</label>
            <InputImporte
              id="fijo"
              value={valorInput}
              onValueChange={setValorInput}
              placeholder="ej. 500"
              autoFocus
            />
            <p className="ayuda">Un límite fijo, sin importar cuánto ingreses ese mes.</p>
            {gastoEstimado?.estimacion > 0 && (
              <p className="estimacion-gasto">
                Tu gasto mensual estimado es <strong>{formatearEuros(gastoEstimado.estimacion)}</strong>
                {gastoEstimado.provisional
                  ? ' (provisional, con solo 1 mes de datos)'
                  : ` (media de tus últimos ${gastoEstimado.mesesUsados} meses)`}
                .
              </p>
            )}
          </>
        )}

        {errorGuardado && <p className="error">{errorGuardado}</p>}

        <button type="submit" disabled={guardando || valorInput == null}>
          {guardando ? 'Guardando…' : 'Guardar presupuesto'}
        </button>

        {configurado && (
          <button type="button" className="btn-eliminar" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        )}
      </form>
    )
  }

  const presupuestoGasto = limiteGastoPresupuesto({ metodo, tasaAhorroObjetivo, gastoMaximoFijo }, totalIngresos) ?? 0
  const restante = presupuestoGasto - totalGastos
  const porcentajeGastado = presupuestoGasto > 0 ? (totalGastos / presupuestoGasto) * 100 : 0
  const sobrepasado = totalGastos > presupuestoGasto && presupuestoGasto > 0
  const dias = diasRestantesDelMes()
  const presupuestoDiario = restante > 0 ? restante / dias : 0
  const sinIngresosParaCalcular = metodo === 'tasa' && totalIngresos === 0

  const abrirEdicion = () => {
    setMetodoInput(metodo)
    setValorInput(metodo === 'fijo' ? gastoMaximoFijo : tasaAhorroObjetivo)
    setEditando(true)
  }

  if (esV5()) {
    return (
      <PresupuestoV5
        metodo={metodo}
        tasaAhorroObjetivo={tasaAhorroObjetivo}
        gastoMaximoFijo={gastoMaximoFijo}
        presupuestoGasto={presupuestoGasto}
        totalGastos={totalGastos}
        totalIngresos={totalIngresos}
        ratioAhorroReal={ratioAhorroReal}
        restante={restante}
        dias={dias}
        presupuestoDiario={presupuestoDiario}
        sinIngresos={sinIngresosParaCalcular}
        gastoEstimado={gastoEstimado}
        historico={historico}
        onEditar={abrirEdicion}
      />
    )
  }

  return (
    <div className="presupuesto fade-in-up">
      <div className="presupuesto-header">
        <h2>Presupuesto del mes</h2>
        <button
          type="button"
          className="link"
          onClick={() => {
            setMetodoInput(metodo)
            setValorInput(metodo === 'fijo' ? gastoMaximoFijo : tasaAhorroObjetivo)
            setEditando(true)
          }}
        >
          Editar
        </button>
      </div>

      <span className="balance-etiqueta-principal">
        {metodo === 'fijo'
          ? `Objetivo: gastar máximo ${formatearEuros(gastoMaximoFijo)} al mes`
          : `Objetivo: ahorrar el ${tasaAhorroObjetivo}% de tus ingresos`}
      </span>

      {sinIngresosParaCalcular ? (
        <p className="ayuda" style={{ marginTop: 12 }}>
          Registra algún ingreso este mes para calcular tu presupuesto de gasto.
        </p>
      ) : (
        <>
          {/* Héroe = lo ACCIONABLE (cuánto te queda para gastar). El tope pasa a
              contexto (queda en el "Objetivo" de arriba). Mismos datos, otro peso. */}
          <span className="presu-hero-label">
            {restante >= 0 ? 'Te queda para gastar' : 'Has excedido tu presupuesto en'}
          </span>
          <Cifra valor={Math.abs(restante)} className={`balance-hero ${restante >= 0 ? 'ingreso' : 'gasto'}`} />

          <div className="ratio-barra" style={{ marginTop: 16 }}>
            <div
              className={`ratio-barra-relleno ${sobrepasado ? 'sobrepasado' : ''}`}
              style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
            />
          </div>

          <div className="balance-grid presu-cards" style={{ marginTop: 16 }}>
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
              <span className="valor">{formatearPorcentaje(ratioAhorroReal)}</span>
            </div>
          </div>

          {restante > 0 && (
            <p className="presupuesto-diario">
              Puedes gastar <strong>{formatearEuros(presupuestoDiario)}</strong> al día durante los{' '}
              {dias} días que quedan de mes.
            </p>
          )}

          {sobrepasado && (
            <p className="error" style={{ marginTop: 12 }}>
              Has superado tu presupuesto de gasto este mes.
            </p>
          )}

          {gastoEstimado?.estimacion > 0 && !gastoEstimado.provisional && (
            <p className="estimacion-gasto">
              Sueles gastar unos <strong>{formatearEuros(gastoEstimado.estimacion)}</strong> al mes
              (media de tus últimos {gastoEstimado.mesesUsados} meses).
            </p>
          )}

          {topCategorias.length > 0 && (
            <div className="presupuesto-categorias">
              <span className="balance-etiqueta-principal">En qué se te va el presupuesto</span>
              {topCategorias.map(([nombre, valor]) => (
                <div key={nombre} className="presupuesto-categoria-fila">
                  <span>{nombre}</span>
                  <div className="mini-barra">
                    <div
                      className="mini-barra-relleno"
                      style={{ width: `${presupuestoGasto > 0 ? Math.min((valor / presupuestoGasto) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <span className="presupuesto-categoria-valor">{formatearEuros(valor)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── v5: anillo + ritmo del mes + categorías frente a tu media ───────────────
function PresupuestoV5({ metodo, tasaAhorroObjetivo, gastoMaximoFijo, presupuestoGasto, totalGastos, totalIngresos, ratioAhorroReal, restante, dias, presupuestoDiario, sinIngresos, gastoEstimado, historico, onEditar }) {
  const clave = claveMesActual()
  const hoy = new Date()
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const pctMes = ((hoy.getDate() - 0.5) / diasMes) * 100
  const pct = presupuestoGasto > 0 ? (totalGastos / presupuestoGasto) * 100 : 0
  // Referencia «a estas alturas»: lo que SUELES llevar gastado a este día del
  // mes (como el Inicio: el alquiler del día 2 no es «ir rápido»). Sin
  // historia, el reparto lineal del presupuesto.
  const ritmo = useMemo(() => resumenDelMes(historico).ritmo, [historico])
  const deberias = ritmo ? Math.min(ritmo.habitual, presupuestoGasto) : presupuestoGasto * (pctMes / 100)
  const pctReferencia = presupuestoGasto > 0 ? Math.min(100, (deberias / presupuestoGasto) * 100) : pctMes
  const rapido = totalGastos > deberias * 1.05 + 1
  const estado = pct > 100 ? { t: 'Te has pasado', c: 'critico' } : rapido ? { t: 'Vas más rápido de lo habitual', c: 'aviso' } : { t: 'Vas bien', c: 'bien' }

  return (
    <div className="v5-presupuesto">
      <section className="v5-tarjeta v5-presu-hero" aria-label="Presupuesto del mes">
        <header className="v5-tarjeta-cab">
          <h2>{etiquetaMes(clave)}</h2>
          <button type="button" className="v5-boton" onClick={onEditar}>
            <Icono nombre="nota" tam={15} /> Editar presupuesto
          </button>
        </header>
        {sinIngresos ? (
          <p className="v5-nota-vacia">Tu presupuesto es ahorrar el {tasaAhorroObjetivo} % de lo que ingresas: apunta algún ingreso de este mes para calcular cuánto puedes gastar.</p>
        ) : (
          <>
            <div className="v5-presu-cuerpo">
              <Anillo pct={pct} tam={156} grosor={14} color={rapido ? 'var(--aviso)' : 'var(--accent)'} etiqueta={`Has gastado el ${Math.round(pct)} % del presupuesto`}>
                <span className="v5-anillo-pct">
                  <b>{Math.round(pct)} %</b>
                  <small>gastado</small>
                </span>
              </Anillo>
              <dl className="v5-presu-cifras">
                <div>
                  <dt>Presupuesto</dt>
                  <dd className="num">{formatearEuros(presupuestoGasto)}</dd>
                </div>
                <div>
                  <dt>Gastado</dt>
                  <dd className="num">{formatearEuros(totalGastos)}</dd>
                </div>
                <div>
                  <dt>{restante >= 0 ? 'Te queda' : 'Te has pasado'}</dt>
                  <dd className={`num ${restante >= 0 ? 'v5-positivo' : 'v5-negativo'}`}>{formatearEuros(Math.abs(restante))}</dd>
                </div>
              </dl>
            </div>
            <div className="v5-presu-ritmo">
              <div className="v5-presu-ritmo-cab">
                <span className={`v5-insignia ${estado.c}`}>{estado.t}</span>
                <span className="v5-tenue">
                  {ritmo ? `A día ${hoy.getDate()} sueles llevar` : `A día ${hoy.getDate()}, a ritmo constante, llevarías`} <b className="num">{formatearEuros(Math.round(deberias))}</b>
                </span>
              </div>
              <span className="v5-barra grande" role="img" aria-label={`Gastado ${Math.round(pct)} % con el ${Math.round(pctMes)} % del mes recorrido`}>
                <span className={`v5-barra-relleno ${pct > 100 ? 'pasado' : rapido ? 'rapido' : ''}`} style={{ width: `${Math.min(100, pct)}%` }} />
                <span className="v5-barra-hoy" style={{ left: `${pctReferencia}%` }} title={ritmo ? 'Lo habitual a estas alturas' : 'A ritmo constante'} />
              </span>
              <div className="v5-presu-ritmo-pie v5-tenue">
                <span>0 €</span>
                <span>La raya: {ritmo ? 'lo habitual a hoy' : 'a ritmo constante'}</span>
                <span className="num">{formatearEuros(presupuestoGasto)}</span>
              </div>
            </div>
            <p className="v5-presu-frase">
              {restante > 0 ? (
                <>
                  Puedes gastar <b className="num">{formatearEuros(presupuestoDiario)}</b> al día durante los {dias} días que quedan.
                </>
              ) : (
                'Has llegado al límite que te pusiste para este mes.'
              )}
            </p>
          </>
        )}
      </section>

      <LimitesCategoria historico={historico} clave={clave} presupuestoGasto={sinIngresos ? 0 : presupuestoGasto} />

      <section className="v5-tarjeta v5-presu-info" aria-label="Cómo funciona tu presupuesto">
        <header className="v5-tarjeta-cab">
          <h2>Tu regla</h2>
        </header>
        <p className="v5-presu-regla">
          {metodo === 'fijo' ? (
            <>Gastar como máximo <b className="num">{formatearEuros(gastoMaximoFijo)}</b> al mes, entre lo que ingreses.</>
          ) : (
            <>Ahorrar el <b>{tasaAhorroObjetivo} %</b> de lo que ingresas: este mes, puedes gastar hasta <b className="num">{formatearEuros(presupuestoGasto)}</b> de tus <b className="num">{formatearEuros(totalIngresos)}</b>.</>
          )}
        </p>
        <dl className="v5-presu-mini">
          <div>
            <dt>Ahorro real este mes</dt>
            <dd className="num">{formatearPorcentaje(ratioAhorroReal, 0)}</dd>
          </div>
          {gastoEstimado?.estimacion > 0 && !gastoEstimado.provisional && (
            <div>
              <dt>Sueles gastar</dt>
              <dd className="num">{formatearEuros(gastoEstimado.estimacion)} <small className="v5-tenue">/ mes</small></dd>
            </div>
          )}
        </dl>
        <p className="v5-tenue v5-pie-nota">Invertir no gasta presupuesto: la inversión es parte de tu ahorro.</p>
      </section>
    </div>
  )
}

// ── v5: configurar el presupuesto general (dos modalidades, explicadas) ─────
function ConfigV5({ configurado, metodoInput, cambiarMetodo, valorInput, setValorInput, guardando, errorGuardado, onGuardar, onCancelar, gastoEstimado, historico, ingresosMes = 0 }) {
  const ingresoMedio = useMemo(() => ingresoMensualMedio(historico), [historico])
  // La MISMA base que usa el motor: lo que ha entrado este mes (limiteGastoPresupuesto).
  const tasaValida = valorInput != null && valorInput >= 0 && valorInput <= 100
  const limiteMes = tasaValida && ingresosMes > 0 ? limiteGastoPresupuesto({ metodo: 'tasa', tasaAhorroObjetivo: valorInput }, ingresosMes) : null
  const limiteHabitual = tasaValida && ingresoMedio.media > 0 && ingresoMedio.meses >= 2 ? limiteGastoPresupuesto({ metodo: 'tasa', tasaAhorroObjetivo: valorInput }, ingresoMedio.media) : null
  const opciones = [
    {
      id: 'tasa',
      titulo: 'Un porcentaje de lo que ingresas',
      texto: 'Eliges cuánto ahorrar (p. ej. el 20 %). El límite en euros se adapta cada mes a lo que entra: los meses buenos te deja gastar más; los flojos, aprieta solo.',
    },
    {
      id: 'fijo',
      titulo: 'Una cantidad fija al mes',
      texto: 'Un tope en euros que no cambia, ingreses lo que ingreses. Lo que entra de más esos meses se queda ahorrado: suele hacer crecer el patrimonio más rápido.',
    },
  ]
  return (
    <div className="v5-presupuesto">
      <form className="v5-tarjeta v5-presu-config" onSubmit={onGuardar}>
        <header className="v5-tarjeta-cab">
          <h2>{configurado ? 'Ajustar tu presupuesto' : 'Define tu presupuesto'}</h2>
        </header>
        <p className="v5-tenue v5-presu-config-intro">Elige cómo quieres limitar tu gasto de consumo. Invertir nunca gasta presupuesto.</p>
        <div className="v5-presu-opciones" role="radiogroup" aria-label="Cómo limitar el gasto">
          {opciones.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={metodoInput === o.id} className={`v5-presu-opcion ${metodoInput === o.id ? 'activa' : ''}`} onClick={() => cambiarMetodo(o.id)}>
              <span className="v5-presu-opcion-marca" aria-hidden="true">{metodoInput === o.id && <Icono nombre="check" tam={13} />}</span>
              <b>{o.titulo}</b>
              <small>{o.texto}</small>
            </button>
          ))}
        </div>
        <div className="v5-presu-config-campo">
          {metodoInput === 'tasa' ? (
            <>
              <label htmlFor="tasa">¿Qué porcentaje de lo que ingresas quieres ahorrar?</label>
              <div className="v5-presu-config-fila">
                <input id="tasa" type="number" inputMode="decimal" min="0" max="100" step="1" value={valorInput ?? ''} onChange={(e) => setValorInput(e.target.value === '' ? null : Number(e.target.value))} placeholder="ej. 20" autoFocus />
                <span className="v5-tenue">%</span>
              </div>
              {tasaValida && (
                <div className="v5-presu-estimacion" aria-live="polite">
                  <span className="v5-presu-estimacion-regla">
                    Ahorrar el <b>{valorInput} %</b> = puedes gastar el <b>{100 - valorInput} %</b> de lo que entra.
                  </span>
                  {limiteMes != null ? (
                    <span>
                      Este mes han entrado <b className="num">{formatearEuros(ingresosMes)}</b> → tu límite sería <b className="num v5-positivo">{formatearEuros(Math.round(limiteMes * 100) / 100)}</b>.
                    </span>
                  ) : (
                    <span className="v5-tenue">Este mes aún no ha entrado nada: el límite se calcula con lo que vaya entrando.</span>
                  )}
                  {limiteHabitual != null && (
                    <span className="v5-tenue">
                      Con lo que sueles ingresar (<span className="num">{formatearEuros(Math.round(ingresoMedio.media))}</span>/mes) serían unos <span className="num">{formatearEuros(Math.round(limiteHabitual))}</span>. Sube o baja según lo que entre.
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <label htmlFor="fijo">¿Cuánto quieres gastar como máximo al mes?</label>
              <InputImporte id="fijo" value={valorInput} onValueChange={setValorInput} placeholder="ej. 1.500" autoFocus />
              {valorInput > 0 && (
                <div className="v5-presu-estimacion" aria-live="polite">
                  <span className="v5-presu-estimacion-regla">
                    Límite fijo: <b className="num">{formatearEuros(valorInput)}</b> al mes, entre lo que entre.
                  </span>
                  {ingresoMedio.media > 0 && ingresoMedio.meses >= 2 ? (
                    <span className="v5-tenue">
                      Con lo que sueles ingresar (<span className="num">{formatearEuros(Math.round(ingresoMedio.media))}</span>/mes) equivale a ahorrar cerca del <b>{Math.max(0, Math.round((1 - valorInput / ingresoMedio.media) * 100))} %</b>.
                    </span>
                  ) : (
                    <span className="v5-tenue">Con un par de meses de ingresos te diremos qué porcentaje supone.</span>
                  )}
                </div>
              )}
              {gastoEstimado?.estimacion > 0 && (
                <p className="v5-tenue v5-pie-nota">
                  Sueles gastar <b className="num">{formatearEuros(gastoEstimado.estimacion)}</b> al mes{gastoEstimado.provisional ? ' (provisional, con un solo mes de datos)' : ` (media de tus últimos ${gastoEstimado.mesesUsados} meses)`}.
                </p>
              )}
            </>
          )}
          {metodoInput === 'tasa' && valorInput > 100 && <p className="v5-aviso-texto">El porcentaje tiene que estar entre 0 y 100.</p>}
          {errorGuardado && <p className="v5-aviso-texto">{errorGuardado}</p>}
        </div>
        <div className="v5-presu-config-acciones">
          {configurado && (
            <button type="button" className="v5-boton fantasma" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button type="submit" className="v5-boton primario" disabled={guardando || valorInput == null || (metodoInput === 'tasa' && valorInput > 100)}>
            {guardando ? 'Guardando…' : 'Guardar presupuesto'}
          </button>
        </div>
      </form>
      <LimitesCategoria historico={historico} clave={claveMesActual()} presupuestoGasto={0} />
    </div>
  )
}
