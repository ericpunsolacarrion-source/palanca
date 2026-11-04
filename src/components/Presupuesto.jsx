import { useMemo, useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import { diasRestantesDelMes, formatearPorcentaje, gastoPorCategoria, limiteGastoPresupuesto, totalesDe } from '../lib/movimientosUtils'
import { usePresupuestoCompartido } from '../lib/DatosCompartidos'
import { toast } from '../lib/toast'
import { useCountUp } from '../lib/useCountUp'
import InputImporte from './InputImporte'
import { esV5 } from '../lib/diseno'
import { claveMesActual, etiquetaMes } from '../lib/movimientosUtils'
import { categoriasFrenteAMedia } from '../lib/presupuesto'
import { resumenDelMes } from '../lib/inicio'
import { etiquetaCategoria } from '../lib/categorias'
import { preguntarAFulcro } from '../lib/fulcro'
import { Anillo } from './v5/Graficos'
import Icono from './Icono'

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
  const cats = useMemo(() => categoriasFrenteAMedia(historico, clave), [historico, clave])
  const maximo = Math.max(1, ...cats.map((c) => Math.max(c.gastado, c.media ?? 0)))
  const colores = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)']

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

      <section className="v5-tarjeta v5-presu-cats" aria-label="Por categoría">
        <header className="v5-tarjeta-cab">
          <h2>Por categoría</h2>
          <button type="button" className="v5-enlace" onClick={() => preguntarAFulcro('¿En qué puedo recortar este mes?')}>
            <Icono nombre="consultor" tam={14} /> ¿Dónde recorto?
          </button>
        </header>
        {cats.length === 0 ? (
          <p className="v5-nota-vacia">Aún no hay gastos este mes.</p>
        ) : (
          <ul className="v5-cats">
            {cats.slice(0, 7).map((c, i) => (
              <li key={c.nombre}>
                <span className="v5-cat-relleno" style={{ width: `${(c.gastado / maximo) * 100}%`, '--c': colores[i % colores.length] }} aria-hidden="true" />
                {c.media > 0 && <span className="v5-cat-media" style={{ left: `${(c.media / maximo) * 100}%` }} aria-hidden="true" />}
                <span className="v5-cat-nombre">
                  <i style={{ background: colores[i % colores.length] }} aria-hidden="true" />
                  {etiquetaCategoria(c.nombre)}
                </span>
                <span className="v5-cat-valor">
                  <b className="num">{formatearEuros(c.gastado)}</b>
                  {c.media > 0 && <small className="num">de {formatearEuros(Math.round(c.media))} habituales</small>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="v5-tenue v5-pie-nota">La raya es lo que sueles gastar en un mes entero en esa categoría (media de tus últimos meses).</p>
      </section>

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
