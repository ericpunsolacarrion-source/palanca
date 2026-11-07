import { useMemo, useState } from 'react'
import { esConsumo, formatearFecha, formatearPorcentaje, agregarPorMes, etiquetaMes, progresoObjetivo, resumenMensualMedio, totalesDe } from '../../lib/movimientosUtils'
import { etiquetaCategoria, formatearEuros } from '../../lib/categorias'
import { categoriasComparadas, contextoMes, delMes, insightsDelMes, referenciaHabitual, serieProyeccion } from '../../lib/analisis'
import { usePresupuestoCompartido } from '../../lib/DatosCompartidos'
import { toast } from '../../lib/toast'
import InputImporte from '../InputImporte'
import PeriodoSelector from '../PeriodoSelector'
import Icono from '../Icono'
import { Anillo, GraficoArea, GraficoFlujo, GraficoProyeccion, Leyenda } from './Graficos'

// INICIO · ANÁLISIS (v5): el centro de control del mes.
//  1. Tu mes: cuánto queda (ahorro) y a dónde ha ido lo que entró, frente a lo
//     habitual A LA MISMA ALTURA del mes · objetivo de inversión.
//  2. Evolución: entra / sale / queda mes a mes · tasa de ahorro (meses cerrados).
//  3. En qué se va (contra tu media) · qué ha cambiado (insights calculados).
//  4. Tu futuro: proyección con rentabilidad como hipótesis editable.
// Toda la lógica vive en lib/analisis.js (probada) y en las reglas únicas.

const COLORES = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)']
const HORIZONTES = [5, 10, 20, 30]

export default function AnalisisV5({ historico, clave, meses, onCambiarMes, onVerMovimientos, onIrARegistro, children }) {
  const ctx = useMemo(() => contextoMes(clave), [clave])
  const t = useMemo(() => totalesDe(delMes(historico, clave)), [historico, clave])
  const ref = useMemo(() => referenciaHabitual(historico, ctx), [historico, ctx])
  const insights = useMemo(() => insightsDelMes(historico, ctx), [historico, ctx])
  const cats = useMemo(() => categoriasComparadas(historico, ctx), [historico, ctx])

  return (
    <div className="v5-ana">
      <div className="v5-ana-barra">
        <PeriodoSelector meses={meses} valor={clave} onCambiar={onCambiarMes} />
        <span className="v5-tenue v5-ana-contexto">
          {ctx.parcial
            ? `Mes en curso · día ${ctx.dia} de ${ctx.diasMes}. Las comparaciones son a la misma altura de tus meses anteriores.`
            : 'Mes cerrado · comparado con tus meses completos anteriores.'}
        </span>
      </div>

      <div className="v5-ana-rejilla">
        <TuMes t={t} ctx={ctx} ref_={ref} onVerMovimientos={onVerMovimientos} />
        <ObjetivoInversion invertido={t.invertido} historico={historico} />
        <Flujo historico={historico} clave={clave} ctx={ctx} />
        <TasaAhorro historico={historico} clave={clave} ctx={ctx} />
        <EnQueSeVa cats={cats} ctx={ctx} historico={historico} clave={clave} />
        <QueHaCambiado insights={insights} />
        <Futuro historico={historico} onIrARegistro={onIrARegistro} />
      </div>
      {children}
    </div>
  )
}

// ── 1. Tu mes ───────────────────────────────────────────────────────────────
function TuMes({ t, ctx, ref_, onVerMovimientos }) {
  const media = ref_.media
  const altura = ctx.parcial ? `a día ${ctx.dia}` : 'en un mes'
  const libre = t.ahorro - t.invertido
  const base = Math.max(t.ingresos, t.gastos + Math.max(0, t.invertido))
  const seg = base > 0
    ? [
        { k: 'gasto', nombre: 'Gastado', valor: t.gastos, color: 'var(--gasto)' },
        { k: 'inversion', nombre: 'Invertido', valor: Math.max(0, t.invertido), color: 'var(--inversion)' },
        { k: 'libre', nombre: 'Sin invertir', valor: Math.max(0, libre), color: 'var(--accent)' },
      ].filter((s) => s.valor > 0)
    : []
  const filas = [
    { k: 'ingreso', nombre: 'Entra', valor: t.ingresos, media: media?.ingresos, color: 'var(--accent)', mejorSiSube: true },
    { k: 'gasto', nombre: 'Sale', valor: t.gastos, media: media?.gastos, color: 'var(--gasto)', mejorSiSube: false },
    { k: 'inversion', nombre: 'Invertido', valor: t.invertido, media: media?.invertido, color: 'var(--inversion)', mejorSiSube: true },
  ]

  return (
    <section className="v5-tarjeta v5-ana-mes" aria-label="Tu mes">
      <header className="v5-tarjeta-cab">
        <h2>{ctx.parcial ? 'Tu mes, hasta hoy' : `Tu ${etiquetaMes(ctx.clave, { month: 'long' })}`}</h2>
        {ctx.parcial && <span className="v5-insignia info">En curso</span>}
      </header>
      <div className="v5-ana-mes-cuerpo">
        <div className="v5-ana-ahorro">
          <span className="v5-etq">{ctx.parcial ? 'Llevas ahorrado' : 'Ahorraste'}</span>
          <b className={`v5-cifra-hero num ${t.ahorro < 0 ? 'v5-negativo' : 'v5-positivo'}`}>{formatearEuros(t.ahorro)}</b>
          {t.ingresos > 0 ? (
            <span className="v5-ana-ratio">
              <b className="num">{formatearPorcentaje(t.ratioAhorro, 0)}</b> de lo que ha entrado
              {media && media.ingresos > 0 && (
                <span className="v5-tenue">
                  {' '}
                  · tu media {altura}: <span className="num">{formatearPorcentaje(media.ratioAhorro, 0)}</span>
                </span>
              )}
            </span>
          ) : (
            <span className="v5-tenue">{ctx.parcial ? 'Aún no ha entrado nada este mes.' : 'No hubo ingresos este mes.'}</span>
          )}
          {t.ingresos > 0 && (
            <span className="v5-barra v5-ana-ratio-barra" role="img" aria-label={`Ratio de ahorro ${Math.round(t.ratioAhorro)} %${media ? `, media ${Math.round(media.ratioAhorro)} %` : ''}`}>
              <span className={`v5-barra-relleno ${t.ratioAhorro < 0 ? 'pasado' : ''}`} style={{ width: `${Math.min(100, Math.max(0, t.ratioAhorro))}%` }} />
              {media && media.ingresos > 0 && <span className="v5-barra-hoy" style={{ left: `${Math.min(100, Math.max(0, media.ratioAhorro))}%` }} title="Tu media a esta altura" />}
            </span>
          )}
        </div>
        <ul className="v5-ana-kpis">
          {filas.map((f) => {
            const dif = f.media == null ? null : Math.round((f.valor - f.media) * 100) / 100
            const bueno = dif == null || Math.abs(dif) < 1 ? null : f.mejorSiSube ? dif > 0 : dif < 0
            return (
              <li key={f.k}>
                <button type="button" className="v5-ana-kpi" onClick={() => onVerMovimientos?.(f.k)}>
                  <span className="v5-etq">
                    <i className="v5-punto" style={{ background: f.color }} />
                    {f.nombre}
                  </span>
                  <b className={`num ${f.k === 'inversion' ? 'v5-oro' : ''}`}>{formatearEuros(f.valor)}</b>
                  <small className="v5-tenue">
                    {f.media == null ? (
                      'Sin meses para comparar'
                    ) : (
                      <>
                        Habitual {altura}: <span className="num">{formatearEuros(Math.round(f.media))}</span>
                        {bueno !== null && (
                          <span className={`v5-ana-delta ${f.k === 'gasto' ? '' : bueno ? 'bien' : 'aviso'}`}>
                            {' '}
                            {dif > 0 ? '+' : '−'}
                            {formatearEuros(Math.round(Math.abs(dif)))}
                          </span>
                        )}
                      </>
                    )}
                  </small>
                  <span className="v5-ana-ver" aria-hidden="true">
                    <Icono nombre="chevron" tam={14} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {seg.length > 0 && (
        <div className="v5-ana-destino">
          <div className="v5-ana-destino-cab">
            <span className="v5-etq">A dónde ha ido lo que ha entrado</span>
            {t.gastos > t.ingresos && <span className="v5-insignia critico">Ha salido más de lo que entró</span>}
          </div>
          <div className="v5-reparto grande" aria-hidden="true">
            {seg.map((s) => (
              <span key={s.k} style={{ flexGrow: s.valor, background: s.color }} />
            ))}
            {base > t.ingresos && t.ingresos > 0 && <span className="v5-ana-hueco" style={{ flexGrow: 0 }} />}
          </div>
          <ul className="v5-ana-destino-leyenda">
            {seg.map((s) => (
              <li key={s.k}>
                <i style={{ background: s.color }} aria-hidden="true" />
                {s.nombre}
                <b className="num">{formatearEuros(s.valor)}</b>
                {t.ingresos > 0 && <small className="v5-tenue num">{formatearPorcentaje((s.valor / t.ingresos) * 100, 0)}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// ── Objetivo de inversión ───────────────────────────────────────────────────
function ObjetivoInversion({ invertido, historico }) {
  const { objetivoInversionMensual: objetivo, cargando, guardarObjetivoInversion } = usePresupuestoCompartido()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const mediaInv = useMemo(() => resumenMensualMedio(historico).invertidoMedio, [historico])
  const p = progresoObjetivo(invertido, objetivo)

  async function guardar(e) {
    e.preventDefault()
    const n = Number(valor)
    if (!valor || !(n > 0)) return
    setGuardando(true)
    const ok = await guardarObjetivoInversion(n)
    setGuardando(false)
    if (ok) {
      setEditando(false)
      toast('Objetivo guardado')
    }
  }

  return (
    <section className="v5-tarjeta v5-ana-inv" aria-label="Objetivo de inversión">
      <header className="v5-tarjeta-cab">
        <h2>Objetivo de inversión</h2>
        {objetivo != null && !editando && (
          <button type="button" className="v5-enlace" onClick={() => { setValor(objetivo); setEditando(true) }}>
            Editar
          </button>
        )}
      </header>
      {cargando ? null : editando || objetivo == null ? (
        <form className="v5-ana-inv-form" onSubmit={guardar}>
          <label htmlFor="ana-objetivo-inv">¿Cuánto quieres invertir cada mes?</label>
          <div className="v5-ana-inv-fila">
            <InputImporte id="ana-objetivo-inv" value={valor} onValueChange={setValor} placeholder="ej. 300" />
            <button type="submit" className="v5-boton primario" disabled={guardando || !valor}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            {objetivo != null && (
              <button type="button" className="v5-boton fantasma" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            )}
          </div>
          <p className="v5-tenue v5-pie-nota">Invertir no gasta presupuesto: es parte de tu ahorro.</p>
        </form>
      ) : (
        <div className="v5-ana-inv-cuerpo">
          <Anillo pct={Math.min(p.pct, 100)} tam={128} grosor={12} color="var(--inversion)" etiqueta={`Has invertido el ${Math.round(p.pct)} % de tu objetivo`}>
            <span className="v5-anillo-pct">
              <b>{Math.round(p.pct)} %</b>
              <small>del objetivo</small>
            </span>
          </Anillo>
          <dl className="v5-ana-inv-cifras">
            <div>
              <dt>Invertido</dt>
              <dd className="num v5-oro">{formatearEuros(invertido)}</dd>
            </div>
            <div>
              <dt>Objetivo</dt>
              <dd className="num">{formatearEuros(objetivo)}</dd>
            </div>
            <div>
              <dt>{p.superado ? 'Superado en' : invertido >= objetivo ? 'Este mes' : 'Te faltan'}</dt>
              <dd className={`num ${p.superado || invertido >= objetivo ? 'v5-positivo' : ''}`}>
                {invertido >= objetivo && !p.superado ? 'Cumplido' : formatearEuros(Math.abs(Math.round((objetivo - invertido) * 100) / 100))}
              </dd>
            </div>
          </dl>
        </div>
      )}
      {mediaInv > 0 && !editando && objetivo != null && (
        <p className="v5-tenue v5-pie-nota">
          Sueles invertir <span className="num">{formatearEuros(Math.round(mediaInv))}</span> al mes.
        </p>
      )}
    </section>
  )
}

// ── 2. Evolución: entra / sale / queda ──────────────────────────────────────
function Flujo({ historico, clave, ctx }) {
  const [n, setN] = useState(6)
  const serie = useMemo(
    () =>
      agregarPorMes(historico, n, clave).map((m) => ({
        clave: m.clave,
        etiqueta: etiquetaMes(m.clave, { month: 'short' }).replace('.', ''),
        etiquetaLarga: etiquetaMes(m.clave),
        entra: m.ingresos,
        sale: m.gastos,
        queda: m.ahorro,
        enCurso: ctx.parcial && m.clave === clave,
      })),
    [historico, n, clave, ctx.parcial],
  )
  const cerrados = serie.filter((p) => !p.enCurso && (p.entra > 0 || p.sale > 0))
  const negativos = cerrados.filter((p) => p.queda < 0)
  const med = (k) => (cerrados.length ? cerrados.reduce((s, p) => s + p[k], 0) / cerrados.length : 0)
  const hayDatos = serie.some((p) => p.entra > 0 || p.sale > 0)

  return (
    <section className="v5-tarjeta v5-ana-flujo" aria-label="Entra, sale y queda">
      <header className="v5-tarjeta-cab">
        <h2>Entra, sale y queda</h2>
        <div className="v5-seg" role="group" aria-label="Periodo">
          {[6, 12].map((k) => (
            <button key={k} type="button" className={n === k ? 'activo' : ''} aria-pressed={n === k} onClick={() => setN(k)}>
              {k} meses
            </button>
          ))}
        </div>
      </header>
      {hayDatos ? (
        <>
          <dl className="v5-ana-medias">
            <div>
              <dt>Entra de media</dt>
              <dd className="num">{formatearEuros(Math.round(med('entra')))}</dd>
            </div>
            <div>
              <dt>Sale de media</dt>
              <dd className="num">{formatearEuros(Math.round(med('sale')))}</dd>
            </div>
            <div>
              <dt>Queda de media</dt>
              <dd className={`num ${med('queda') < 0 ? 'v5-negativo' : 'v5-positivo'}`}>{formatearEuros(Math.round(med('queda')))}</dd>
            </div>
            <div>
              <dt>Meses en negativo</dt>
              <dd className={`num ${negativos.length ? 'v5-negativo' : ''}`}>
                {negativos.length} <small className="v5-tenue">de {cerrados.length}</small>
              </dd>
            </div>
          </dl>
          <GraficoFlujo serie={serie} alto={230} titulo={`Lo que entró, salió y quedó cada mes, últimos ${n} meses`} />
          <div className="v5-ana-pie">
            <Leyenda
              series={[
                { clave: 'e', nombre: 'Entró', color: 'var(--accent)' },
                { clave: 's', nombre: 'Salió', color: 'var(--gasto)' },
                { clave: 'q', nombre: 'Quedó (punto; rojo si negativo)', color: 'var(--text-h)' },
              ]}
            />
            {ctx.parcial && <span className="v5-tenue">* Mes en curso, sin cerrar.</span>}
          </div>
          {negativos.length > 0 && (
            <p className="v5-tenue v5-pie-nota">
              Saliste por encima de lo que entró en {negativos.map((p) => p.etiquetaLarga).join(', ')}.
            </p>
          )}
        </>
      ) : (
        <p className="v5-nota-vacia">En cuanto tengas un mes con ingresos y gastos, aquí verás lo que entra, sale y queda.</p>
      )}
    </section>
  )
}

// ── Tasa de ahorro (solo meses cerrados con ingresos) ───────────────────────
function TasaAhorro({ historico, clave, ctx }) {
  const datos = useMemo(() => {
    const meses = agregarPorMes(historico, 13, clave).filter((m) => !(ctx.parcial && m.clave === clave) && m.ingresos > 0)
    return meses.slice(-12).map((m) => ({ clave: m.clave, etiqueta: etiquetaMes(m.clave, { month: 'short' }).replace('.', ''), etiquetaLarga: etiquetaMes(m.clave), valor: Math.round(m.ratioAhorro * 10) / 10 }))
  }, [historico, clave, ctx.parcial])
  const media = datos.length ? datos.reduce((s, p) => s + p.valor, 0) / datos.length : 0
  const mejor = datos.reduce((a, p) => (!a || p.valor > a.valor ? p : a), null)
  const peor = datos.reduce((a, p) => (!a || p.valor < a.valor ? p : a), null)
  const ult = datos.at(-1)

  return (
    <section className="v5-tarjeta v5-ana-tasa" aria-label="Tasa de ahorro">
      <header className="v5-tarjeta-cab">
        <h2>Tasa de ahorro</h2>
        <span className="v5-tenue v5-mini-etq">Meses cerrados</span>
      </header>
      {datos.length >= 2 ? (
        <>
          <div className="v5-ana-tasa-cifras">
            <div>
              <span className="v5-etq">Media {datos.length} meses</span>
              <b className="num v5-cifra-l">{formatearPorcentaje(media, 0)}</b>
            </div>
            <div>
              <span className="v5-etq">{etiquetaMes(ult.clave, { month: 'long' })}</span>
              <b className={`num v5-cifra-m ${ult.valor < 0 ? 'v5-negativo' : ''}`}>{formatearPorcentaje(ult.valor, 0)}</b>
            </div>
          </div>
          <GraficoArea serie={datos} alto={210} titulo="Tasa de ahorro de cada mes cerrado" formato={(v) => formatearPorcentaje(v, 0)} />
          <p className="v5-tenue v5-pie-nota">
            Mejor: {mejor.etiquetaLarga} ({formatearPorcentaje(mejor.valor, 0)}) · Peor: {peor.etiquetaLarga} ({formatearPorcentaje(peor.valor, 0)})
          </p>
        </>
      ) : (
        <p className="v5-nota-vacia">La tasa de ahorro aparece con dos meses cerrados con ingresos.</p>
      )}
    </section>
  )
}

// ── 3. En qué se va ─────────────────────────────────────────────────────────
function EnQueSeVa({ cats, ctx, historico, clave }) {
  const [abierta, setAbierta] = useState(null)
  const [todas, setTodas] = useState(false)
  const visibles = cats.filter((c) => c.gastado > 0 || c.habitual >= 5)
  const lista = todas ? visibles : visibles.slice(0, 7)
  const total = visibles.reduce((s, c) => s + c.gastado, 0)
  const detalle = useMemo(
    () => (abierta ? delMes(historico, clave, ctx.dia).filter((m) => esConsumo(m) && (m.categoria?.nombre ?? 'Sin categoría') === abierta).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) : []),
    [abierta, historico, clave, ctx.dia],
  )

  return (
    <section className="v5-tarjeta v5-ana-cats" aria-label="En qué se va">
      <header className="v5-tarjeta-cab">
        <h2>En qué se va</h2>
        {total > 0 && <span className="v5-tenue num">{formatearEuros(total)} en total</span>}
      </header>
      {visibles.length === 0 ? (
        <p className="v5-nota-vacia">No hay gastos de consumo en este periodo.</p>
      ) : (
        <>
          <div className="v5-ana-cats-cab v5-tenue" aria-hidden="true">
            <span>Categoría</span>
            <span>Gastado</span>
            <span>Habitual {ctx.parcial ? `a día ${ctx.dia}` : 'al mes'}</span>
            <span>Diferencia</span>
          </div>
          <ul className="v5-ana-cats-lista">
            {lista.map((c, i) => {
              const color = COLORES[i % COLORES.length]
              const tono = c.dif == null || Math.abs(c.dif) < Math.max(10, (c.habitual || 0) * 0.1) ? 'igual' : c.dif > 0 ? 'sube' : 'baja'
              const abiertaEsta = abierta === c.nombre
              // Cada fila a su propia escala: lo que importa es lo gastado frente
              // a SU media (las cifras de al lado dan el tamaño absoluto).
              const escala = Math.max(1, c.gastado, c.habitual ?? 0) * 1.12
              return (
                <li key={c.nombre} className={abiertaEsta ? 'abierta' : ''}>
                  <button type="button" className="v5-ana-cat" onClick={() => setAbierta(abiertaEsta ? null : c.nombre)} aria-expanded={abiertaEsta}>
                    <span className="v5-ana-cat-nombre">
                      <i style={{ background: color }} aria-hidden="true" />
                      {etiquetaCategoria(c.nombre)}
                      {c.subiendo && (
                        <span className="v5-ana-sube" title="Sube por tercer mes seguido" aria-label="Sube por tercer mes seguido">
                          <Icono nombre="sube" tam={14} />
                        </span>
                      )}
                    </span>
                    <span className="v5-ana-cat-barra" aria-hidden="true">
                      <span className="v5-ana-cat-relleno" style={{ width: `${(c.gastado / escala) * 100}%`, background: tono === 'sube' ? 'var(--aviso)' : color }} />
                      {c.habitual > 0 && <span className="v5-ana-cat-media" style={{ left: `${(c.habitual / escala) * 100}%` }} />}
                    </span>
                    <b className="num">{formatearEuros(c.gastado)}</b>
                    <span className="num v5-tenue">{c.habitual == null ? '—' : formatearEuros(Math.round(c.habitual))}</span>
                    <span className={`num v5-ana-dif ${tono}`}>
                      {c.dif == null ? '—' : tono === 'igual' ? 'En tu media' : `${c.dif > 0 ? '+' : '−'}${formatearEuros(Math.round(Math.abs(c.dif)))}`}
                    </span>
                  </button>
                  {abiertaEsta && (
                    <ul className="v5-ana-cat-detalle">
                      {detalle.length === 0 ? (
                        <li className="v5-tenue">Sin movimientos en este periodo.</li>
                      ) : (
                        detalle.slice(0, 8).map((m) => (
                          <li key={m.id}>
                            <span className="v5-tenue num">{formatearFecha(m.fecha)}</span>
                            <span className="v5-ana-cat-concepto">{m.nota || m.fuente?.nombre || etiquetaCategoria(c.nombre)}</span>
                            <b className="num">{m.tipo === 'ingreso' ? '+' : '−'}{formatearEuros(Number(m.importe))}</b>
                          </li>
                        ))
                      )}
                      {detalle.length > 8 && <li className="v5-tenue">y {detalle.length - 8} más</li>}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="v5-ana-pie">
            <span className="v5-tenue">Cada barra compara lo gastado con su raya: lo habitual {ctx.parcial ? 'a esta altura del mes' : 'en un mes'}. La flecha marca 3 meses seguidos subiendo. Toca una categoría para ver sus movimientos.</span>
            {visibles.length > 7 && (
              <button type="button" className="v5-enlace" onClick={() => setTodas((v) => !v)}>
                {todas ? 'Ver menos' : `Ver las ${visibles.length}`}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

// ── Qué ha cambiado (insights) ──────────────────────────────────────────────
const ICONO_TONO = { neutro: 'check', info: 'calendario' }
function QueHaCambiado({ insights }) {
  return (
    <section className="v5-tarjeta v5-ana-insights" aria-label="Qué ha cambiado">
      <header className="v5-tarjeta-cab">
        <h2>Qué ha cambiado</h2>
      </header>
      <ul className="v5-ana-insights-lista">
        {insights.map((i) => (
          <li key={i.id} className={`v5-ana-insight ${i.tono}`}>
            <span className="v5-ana-insight-icono" aria-hidden="true">
              <Icono nombre={i.flecha ?? ICONO_TONO[i.tono] ?? 'check'} tam={15} />
            </span>
            <span>
              <b>{i.titulo}</b>
              <small>{i.detalle}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="v5-tenue v5-pie-nota">Calculado con tus movimientos: hasta 6 meses anteriores con datos, a la misma altura del mes.</p>
    </section>
  )
}

// ── 4. Tu futuro con Palanca ────────────────────────────────────────────────
function Futuro({ historico, onIrARegistro }) {
  const [anios, setAnios] = useState(10)
  const [rent, setRent] = useState(7)
  const { ahorroMedio, mesesConIngresos } = useMemo(() => resumenMensualMedio(historico), [historico])
  const puntos = useMemo(() => serieProyeccion(Math.max(0, ahorroMedio), anios, rent), [ahorroMedio, anios, rent])

  if (mesesConIngresos === 0 || ahorroMedio <= 0) {
    return (
      <section className="v5-tarjeta v5-ana-futuro" aria-label="Tu futuro con Palanca">
        <header className="v5-tarjeta-cab">
          <h2>Tu futuro con Palanca</h2>
        </header>
        <p className="v5-nota-vacia">Con tus ingresos y gastos de un mes verás a dónde te lleva tu ahorro dentro de 5, 10, 20 o 30 años.</p>
        {onIrARegistro && (
          <button type="button" className="v5-boton primario" onClick={onIrARegistro}>
            Apuntar movimientos
          </button>
        )}
      </section>
    )
  }

  const fin = puntos.at(-1)
  const dif = fin.invertido - fin.parado
  const cambiarRent = (d) => setRent((r) => Math.max(0, Math.min(12, Math.round((r + d) * 2) / 2)))

  return (
    <section className="v5-tarjeta v5-ana-futuro" aria-label="Tu futuro con Palanca">
      <div className="v5-ana-futuro-izq">
        <header className="v5-tarjeta-cab">
          <h2>Tu futuro con Palanca</h2>
        </header>
        <p className="v5-ana-futuro-frase">
          Si sigues ahorrando <b className="num">{formatearEuros(Math.round(ahorroMedio * 100) / 100)}</b> al mes (tu media de {mesesConIngresos} {mesesConIngresos === 1 ? 'mes' : 'meses'}), dentro de <b>{anios} años</b>:
        </p>
        <div className="v5-ana-futuro-controles">
          <div className="v5-seg" role="group" aria-label="Horizonte">
            {HORIZONTES.map((h) => (
              <button key={h} type="button" className={anios === h ? 'activo' : ''} aria-pressed={anios === h} onClick={() => setAnios(h)}>
                {h} años
              </button>
            ))}
          </div>
          <div className="v5-ana-rent" role="group" aria-label="Rentabilidad anual supuesta">
            <span className="v5-etq">Rentabilidad supuesta</span>
            <button type="button" className="v5-boton icono-solo" onClick={() => cambiarRent(-0.5)} aria-label="Bajar rentabilidad" disabled={rent <= 0}>
              <Icono nombre="menos" tam={14} />
            </button>
            <b className="num" aria-live="polite">{formatearPorcentaje(rent, rent % 1 ? 1 : 0)}</b>
            <button type="button" className="v5-boton icono-solo" onClick={() => cambiarRent(0.5)} aria-label="Subir rentabilidad" disabled={rent >= 12}>
              <Icono nombre="mas" tam={14} />
            </button>
          </div>
        </div>
        <dl className="v5-ana-escenarios">
          <div>
            <dt>
              <i style={{ background: 'var(--text)' }} aria-hidden="true" />
              Sin invertir (0 %)
            </dt>
            <dd className="num">{formatearEuros(Math.round(fin.parado))}</dd>
          </div>
          <div>
            <dt>
              <i style={{ background: 'var(--inversion)' }} aria-hidden="true" />
              Invertido al {formatearPorcentaje(rent, rent % 1 ? 1 : 0)}
            </dt>
            <dd className="num v5-oro">{formatearEuros(Math.round(fin.invertido))}</dd>
          </div>
          <div className="v5-ana-diferencia">
            <dt>Lo que pondría el interés compuesto</dt>
            <dd className="num">{dif > 0 ? '+' : ''}{formatearEuros(Math.round(dif))}</dd>
          </div>
        </dl>
        <p className="v5-tenue v5-pie-nota">
          Simulación, no una promesa ni una recomendación de inversión. La rentabilidad es una hipótesis que puedes cambiar; las rentabilidades pasadas no garantizan las futuras. No incluye lo que ya tienes ahorrado.
        </p>
      </div>
      <div className="v5-ana-futuro-dcha">
        <GraficoProyeccion puntos={puntos} alto={280} titulo={`Tu ahorro dentro de ${anios} años, invertido y sin invertir`} />
        <Leyenda
          series={[
            { clave: 'i', nombre: `Invertido al ${formatearPorcentaje(rent, rent % 1 ? 1 : 0)}`, color: 'var(--inversion)' },
            { clave: 'p', nombre: 'Sin invertir', color: 'var(--text)' },
          ]}
        />
      </div>
    </section>
  )
}
