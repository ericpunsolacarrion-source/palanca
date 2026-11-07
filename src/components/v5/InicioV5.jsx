import { useMemo, useState } from 'react'
import { etiquetaCategoria, formatearEuros } from '../../lib/categorias'
import { bolsas, etiquetaMes, formatearPorcentaje, hoyIso, limiteGastoPresupuesto, ultimaReconciliacion } from '../../lib/movimientosUtils'
import { balanceInicio, cambioPatrimonioMes, conceptoDe, evolucionPatrimonio, fechaRelativa, resumenDelMes } from '../../lib/inicio'
import { cobrosProximos } from '../../lib/periodicidad'
import { usePresupuestoCompartido } from '../../lib/DatosCompartidos'
import { useSaldo } from '../../lib/useSaldo'
import { preguntarAFulcro } from '../../lib/fulcro'
import { esInversion, esTraspaso } from '../../lib/categorias'
import { AjusteSaldo } from '../Patrimonio'
import AvisosCobros from '../AvisosCobros'
import Icono from '../Icono'
import Avatar from './Avatar'
import { GraficoArea, GraficoBarras, Leyenda } from './Graficos'
import { recortarInicio } from '../../lib/patrimonio'

// INICIO v5: responde en segundos a «¿cómo estoy?».
//   Fila 1 · Patrimonio (dónde estoy) + El mes (qué está pasando).
//   Fila 2 · Flujo de 6 meses (tendencia) + Próximos cobros (lo comprometido).
//   Fila 3 · En qué se va (consumo vs tu media) + Últimos movimientos.
// Todo sale de las utilidades del motor (lib/inicio, movimientosUtils,
// periodicidad): aquí no se calcula dinero a mano.

const DIAS_AVISO = 45
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const signoMov = (m) => (esTraspaso(m) ? '' : esInversion(m) ? (m.tipo === 'ingreso' ? '+' : '') : m.tipo === 'gasto' ? '−' : '+')
const claseMov = (m) => (esInversion(m) ? 'inversion' : esTraspaso(m) ? 'traspaso' : m.tipo)

function diasDesde(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function Tarjeta({ className = '', titulo, accion, children, etiqueta }) {
  return (
    <section className={`v5-tarjeta ${className}`} aria-label={etiqueta ?? titulo}>
      {(titulo || accion) && (
        <header className="v5-tarjeta-cab">
          {titulo && <h2>{titulo}</h2>}
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}

// ── Patrimonio ──────────────────────────────────────────────────────────────
function PatrimonioHero({ usuarioId, movimientos, onGuardado, onIrA, soloLectura }) {
  const [meses, setMeses] = useState(12)
  const [ajustando, setAjustando] = useState(false)
  const { ultimaReconciliacion: ultimaMeta } = useSaldo(usuarioId)
  const { patrimonio, bolsaLiquidez, bolsaInversion } = useMemo(() => bolsas(movimientos, hoyIso()), [movimientos])
  const cambio = useMemo(() => cambioPatrimonioMes(movimientos), [movimientos])
  const serie = useMemo(
    () =>
      recortarInicio(evolucionPatrimonio(movimientos, meses)).map((p) => ({
        etiqueta: etiquetaMes(p.mes, { month: 'short' }).replace('.', ''),
        etiquetaLarga: etiquetaMes(p.mes),
        valor: p.valor,
      })),
    [movimientos, meses],
  )
  const conDatos = serie.filter((p) => p.valor !== 0).length >= 2
  const ultima = [ultimaMeta, ultimaReconciliacion(movimientos)].filter(Boolean).sort().pop() ?? null
  const dias = diasDesde(ultima)
  const pctInv = patrimonio > 0 ? Math.min(100, Math.max(0, (bolsaInversion / patrimonio) * 100)) : 0

  return (
    <Tarjeta
      className="v5-ini-patrimonio"
      etiqueta="Tu patrimonio"
      titulo="Patrimonio neto"
      accion={
        <div className="v5-seg" role="group" aria-label="Periodo del gráfico">
          {[6, 12, 24].map((n) => (
            <button key={n} type="button" className={meses === n ? 'activo' : ''} aria-pressed={meses === n} onClick={() => setMeses(n)}>
              {n === 24 ? '2 años' : `${n} meses`}
            </button>
          ))}
        </div>
      }
    >
      <div className="v5-hero-fila">
        <div className={`v5-cifra-hero num ${patrimonio < 0 ? 'v5-negativo' : ''}`}>{formatearEuros(patrimonio)}</div>
        {cambio !== 0 && (
          <span className={`v5-insignia ${cambio > 0 ? 'bien' : 'critico'}`}>
            <Icono nombre={cambio > 0 ? 'sube' : 'baja'} tam={13} />
            {cambio > 0 ? '+' : '−'}
            {formatearEuros(Math.abs(cambio))} este mes
          </span>
        )}
      </div>
      {conDatos ? (
        <GraficoArea serie={serie} alto={210} titulo={`Evolución del patrimonio, últimos ${meses} meses`} />
      ) : (
        <p className="v5-nota-vacia">La evolución aparece en cuanto tengas dos meses con datos.</p>
      )}
      <div className="v5-bolsas">
        <div className="v5-reparto" aria-hidden="true">
          <span style={{ flexGrow: 100 - pctInv, background: 'var(--accent)' }} />
          {pctInv > 0 && <span style={{ flexGrow: pctInv, background: 'var(--inversion)' }} />}
        </div>
        <div className="v5-bolsa">
          <span className="v5-etq"><i className="v5-punto" style={{ background: 'var(--accent)' }} />Disponible</span>
          <b className="num">{formatearEuros(bolsaLiquidez)}</b>
        </div>
        <button type="button" className="v5-bolsa v5-bolsa-boton" onClick={() => onIrA('inversiones')}>
          <span className="v5-etq"><i className="v5-punto" style={{ background: 'var(--inversion)' }} />Invertido <small>(aportado)</small></span>
          <b className="num">{formatearEuros(bolsaInversion)}</b>
        </button>
        {!soloLectura && (
          <div className="v5-bolsa v5-fiabilidad">
            <span className={`v5-etq ${!ultima || dias > DIAS_AVISO ? 'aviso' : ''}`}>
              {!ultima ? 'Sin cuadrar con tu banco' : dias > DIAS_AVISO ? `Cuadrado hace ${dias} días` : `Cuadrado ${dias === 0 ? 'hoy' : `hace ${dias} día${dias === 1 ? '' : 's'}`}`}
            </span>
            <button type="button" className="v5-enlace" onClick={() => setAjustando(true)}>
              Ajustar saldo
            </button>
          </div>
        )}
      </div>
      {ajustando && <AjusteSaldo usuarioId={usuarioId} bolsaLiquidez={bolsaLiquidez} onCerrar={() => setAjustando(false)} onGuardado={onGuardado} />}
    </Tarjeta>
  )
}

// ── El mes ──────────────────────────────────────────────────────────────────
// Contra la media solo se compara un mes CERRADO (a mitad de mes, lo
// acumulado siempre parece poco frente a un mes entero).
function Comparado({ valor, media, inverso = false }) {
  if (media === undefined) return null
  if (media == null || media === 0) return <span className="v5-tenue">sin media aún</span>
  const dif = valor - media
  if (Math.abs(dif) < Math.max(1, Math.abs(media) * 0.03)) return <span className="v5-tenue">como tu media</span>
  const mejor = inverso ? dif < 0 : dif > 0
  return (
    <span className={mejor ? 'v5-positivo' : 'v5-tenue'}>
      {dif > 0 ? '+' : '−'}
      {formatearEuros(Math.round(Math.abs(dif)))} vs media
    </span>
  )
}

function ElMes({ movimientos, onRegistrar, onIrA }) {
  const presupuesto = usePresupuestoCompartido()
  const b = useMemo(() => balanceInicio(movimientos), [movimientos])
  const r = useMemo(() => resumenDelMes(movimientos), [movimientos])
  const t = b.totales
  const nombreMes = etiquetaMes(b.clave, { month: 'long' })
  const limite = !b.cerrado && presupuesto.configurado ? limiteGastoPresupuesto(presupuesto, t.ingresos) : null
  const pctGastado = limite > 0 ? (t.gastos / limite) * 100 : 0
  const pctMes = ((r.dia - 0.5) / r.diasMes) * 100
  const restante = limite != null ? limite - t.gastos : null
  // Ritmo contra lo que SUELES llevar a estas alturas (el alquiler del día 2
  // no es «ir rápido»); sin historia, reparto lineal del presupuesto.
  const habitual = r.ritmo ? Math.min(r.ritmo.habitual, limite ?? Infinity) : null
  const rapido = habitual != null ? t.gastos > habitual * 1.05 + 1 : pctGastado > pctMes + 5
  const pctRef = limite > 0 && habitual != null ? Math.min(100, (habitual / limite) * 100) : pctMes
  const ahorroPos = t.ahorro >= 0

  return (
    <Tarjeta
      className="v5-ini-mes"
      titulo={b.cerrado ? `${nombreMes}, cerrado` : `${nombreMes} en curso`}
      accion={<span className="v5-tenue v5-meta">{b.cerrado ? 'Resumen del mes pasado' : r.diasRestantes === 1 ? 'Último día' : `Quedan ${r.diasRestantes} días`}</span>}
    >
      <div className="v5-mes-ahorro">
        <span className="v5-etq">{r.ingresoPendiente && !b.cerrado ? 'Llevas gastado' : ahorroPos ? 'Has ahorrado' : 'Has gastado más de lo que entró'}</span>
        <span className={`v5-cifra-l num ${r.ingresoPendiente && !b.cerrado ? '' : ahorroPos ? 'v5-positivo' : 'v5-negativo'}`}>
          {r.ingresoPendiente && !b.cerrado ? formatearEuros(t.gastos) : `${ahorroPos ? '' : '−'}${formatearEuros(Math.abs(t.ahorro))}`}
        </span>
        <span className="v5-tenue v5-sub">
          {r.ingresoPendiente && !b.cerrado
            ? `Tu ingreso suele llegar hacia el día ${r.diaIngresoHabitual}`
            : t.ingresos > 0
              ? `${formatearPorcentaje(t.ratioAhorro, 0)} de lo que ha entrado${b.medias.ratio != null ? ` · tu media, ${formatearPorcentaje(b.medias.ratio, 0)}` : ''}`
              : 'Aún no ha entrado nada este mes'}
        </span>
      </div>

      <dl className="v5-kpis">
        <div>
          <dt><i className="v5-punto" style={{ background: 'var(--accent)' }} />Entra</dt>
          <dd className="num">{formatearEuros(t.ingresos)}</dd>
          <Comparado valor={t.ingresos} media={b.cerrado ? b.medias.ingresos : undefined} />
        </div>
        <div>
          <dt><i className="v5-punto" style={{ background: 'var(--gasto)' }} />Sale</dt>
          <dd className="num">{formatearEuros(t.gastos)}</dd>
          <Comparado valor={t.gastos} media={b.cerrado ? b.medias.gastos : undefined} inverso />
        </div>
        <div>
          <dt><i className="v5-punto" style={{ background: 'var(--inversion)' }} />Invertido</dt>
          <dd className="num">{formatearEuros(t.invertido)}</dd>
          <button type="button" className="v5-enlace" onClick={() => onIrA('inversiones')}>Ver patrimonio</button>
        </div>
      </dl>

      {limite != null ? (
        <button type="button" className="v5-presu" onClick={() => onIrA('presupuesto')}>
          <span className="v5-presu-fila">
            <span>Presupuesto</span>
            <span className={restante < 0 ? 'v5-negativo' : ''}>
              {restante >= 0 ? `Quedan ${formatearEuros(Math.round(restante))}` : `Te has pasado ${formatearEuros(Math.round(-restante))}`}
            </span>
          </span>
          <span className="v5-barra" role="presentation">
            <span className={`v5-barra-relleno ${pctGastado > 100 ? 'pasado' : rapido ? 'rapido' : ''}`} style={{ width: `${Math.min(100, pctGastado)}%` }} />
            <span className="v5-barra-hoy" style={{ left: `${pctRef}%` }} title={habitual != null ? 'Lo habitual a estas alturas' : 'A ritmo constante'} />
          </span>
        </button>
      ) : (
        !b.cerrado &&
        r.ritmo && (
          <div className="v5-ritmo">
            <span className="v5-etq">Ritmo de gasto a día {r.dia}</span>
            {[
              { k: 'Este mes', v: t.gastos, c: r.ritmo.difPct > 5 ? 'var(--aviso)' : 'var(--accent)' },
              { k: 'Lo habitual', v: r.ritmo.habitual, c: 'var(--superficie-4)' },
            ].map((f) => (
              <div key={f.k} className="v5-ritmo-fila">
                <span className="v5-tenue">{f.k}</span>
                <span className="v5-ritmo-barra" aria-hidden="true">
                  <span style={{ width: `${(f.v / Math.max(t.gastos, r.ritmo.habitual, 1)) * 100}%`, background: f.c }} />
                </span>
                <b className="num">{formatearEuros(Math.round(f.v))}</b>
              </div>
            ))}
            <p className="v5-tenue v5-sub">
              {Math.abs(r.ritmo.difPct) <= 5
                ? 'Gastas como siempre a estas alturas del mes.'
                : r.ritmo.difPct < 0
                  ? `Un ${Math.round(-r.ritmo.difPct)} % menos que de costumbre a estas alturas.`
                  : `Un ${Math.round(r.ritmo.difPct)} % más que de costumbre a estas alturas.`}
            </p>
          </div>
        )
      )}

      <div className="v5-acciones">
        <button type="button" className="v5-boton" onClick={() => onRegistrar('gasto')}>
          <Icono nombre="menos" tam={16} /> Gasto
        </button>
        <button type="button" className="v5-boton" onClick={() => onRegistrar('ingreso')}>
          <Icono nombre="mas" tam={16} /> Ingreso
        </button>
        <button type="button" className="v5-boton" onClick={() => onRegistrar('importar')} aria-label="Importar extracto del banco">
          <Icono nombre="importar" tam={16} /> Importar
        </button>
      </div>
    </Tarjeta>
  )
}

// ── Flujo de 6 meses ────────────────────────────────────────────────────────
const SERIES_FLUJO = [
  { clave: 'ingresos', nombre: 'Entra', color: 'var(--accent)' },
  { clave: 'gastos', nombre: 'Sale', color: '#6f7f77' },
]

function Flujo({ movimientos, onVerAnalisis }) {
  const b = useMemo(() => balanceInicio(movimientos), [movimientos])
  const serie = b.serie.map((m) => ({
    etiqueta: etiquetaMes(m.clave, { month: 'short' }).replace('.', ''),
    etiquetaLarga: etiquetaMes(m.clave),
    valores: { ingresos: m.ingresos, gastos: m.gastos },
  }))
  const conDatos = b.serie.filter((m) => m.ingresos > 0 || m.gastos > 0)
  const ahorroMedio = conDatos.length ? conDatos.reduce((s, m) => s + m.ahorro, 0) / conDatos.length : 0
  // Totales de los mismos 6 meses dibujados (en céntimos para sumar exacto).
  const suma = (k) => conDatos.reduce((t, m) => t + Math.round(m[k] * 100), 0) / 100
  const totalSerie = { ingresos: suma('ingresos'), gastos: suma('gastos'), ahorro: suma('ahorro') }
  const positivos = conDatos.filter((m) => m.ahorro > 0).length
  return (
    <Tarjeta
      className="v5-ini-flujo"
      titulo="Entra y sale · 6 meses"
      accion={
        <button type="button" className="v5-enlace" onClick={onVerAnalisis}>
          Ver análisis <Icono nombre="chevron" tam={14} />
        </button>
      }
    >
      <div className="v5-flujo-cab">
        <Leyenda series={SERIES_FLUJO} />
        {conDatos.length > 0 && (
          <span className="v5-tenue">
            Ahorro medio <b className={`num ${ahorroMedio >= 0 ? 'v5-positivo' : 'v5-negativo'}`}>{formatearEuros(Math.round(ahorroMedio))}</b> al mes
          </span>
        )}
      </div>
      <GraficoBarras serie={serie} series={SERIES_FLUJO} alto={escritorio() ? 'auto' : 200} titulo="Ingresos y gastos de los últimos 6 meses" />
      {conDatos.length > 0 && (
        <dl className="v5-graf-resumen">
          <div>
            <dt>Entró en 6 meses</dt>
            <dd className="num">{formatearEuros(Math.round(totalSerie.ingresos))}</dd>
          </div>
          <div>
            <dt>Salió</dt>
            <dd className="num">{formatearEuros(Math.round(totalSerie.gastos))}</dd>
          </div>
          <div>
            <dt>Te quedó</dt>
            <dd className={`num ${totalSerie.ahorro >= 0 ? 'v5-positivo' : 'v5-negativo'}`}>{formatearEuros(Math.round(totalSerie.ahorro))}</dd>
          </div>
          <div>
            <dt>Meses en positivo</dt>
            <dd className="num">
              {positivos} <small>de {conDatos.length}</small>
            </dd>
          </div>
        </dl>
      )}
    </Tarjeta>
  )
}

const escritorio = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches

// ── Próximos cobros (Base) ──────────────────────────────────────────────────
function ProximosCobros({ recurrentes, onIrA }) {
  const cobros = useMemo(() => cobrosProximos((recurrentes ?? []).filter((r) => r.tipo === 'gasto'), 30), [recurrentes])
  const total = cobros.reduce((s, c) => s + Math.round(c.importe * 100), 0) / 100
  return (
    <Tarjeta
      className="v5-ini-cobros"
      titulo="Próximos cobros"
      accion={
        <button type="button" className="v5-enlace" onClick={() => onIrA('suscripciones')}>
          Ver Base <Icono nombre="chevron" tam={14} />
        </button>
      }
    >
      {cobros.length === 0 ? (
        <p className="v5-nota-vacia">Nada que pagar en los próximos 30 días. Añade tus fijos en Base y te avisamos.</p>
      ) : (
        <>
          <div className="v5-cobros-total">
            <span className="v5-tenue">Comprometido en 30 días</span>
            <b className="num">{formatearEuros(total)}</b>
          </div>
          <ul className="v5-lista">
            {cobros.slice(0, 5).map((c) => (
              <li key={c.rec.id} className="v5-fila">
                <Avatar nombre={c.rec.nombre} tam={34} />
                <span className="v5-fila-texto">
                  <b>{c.rec.nombre}</b>
                  <small>{capital(c.texto)}</small>
                </span>
                <span className="v5-fila-dcha">
                  <b className="num">{formatearEuros(c.importe)}</b>
                  {c.dias <= 0 ? <span className="v5-insignia aviso">Por confirmar</span> : c.dias === 1 ? <span className="v5-insignia info">Mañana</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {cobros.length > 5 && <p className="v5-tenue v5-mas">y {cobros.length - 5} más</p>}
        </>
      )}
    </Tarjeta>
  )
}

// ── En qué se va ────────────────────────────────────────────────────────────
function EnQueSeVa({ movimientos }) {
  const b = useMemo(() => balanceInicio(movimientos), [movimientos])
  const total = b.categorias.reduce((s, c) => s + c.total, 0)
  const maximo = Math.max(1, ...b.categorias.map((c) => Math.max(c.total, c.media)))
  return (
    <Tarjeta
      className="v5-ini-cats"
      titulo={`En qué se va · ${etiquetaMes(b.clave, { month: 'long' }).toLowerCase()}`}
      accion={
        <button type="button" className="v5-enlace" onClick={() => preguntarAFulcro(`¿En qué gasto más en ${etiquetaMes(b.clave, { month: 'long' }).toLowerCase()}?`)}>
          <Icono nombre="consultor" tam={14} /> Preguntar a Fulcro
        </button>
      }
    >
      {b.categorias.length === 0 ? (
        <p className="v5-nota-vacia">Aún no hay gastos este mes.</p>
      ) : (
        <ul className="v5-cats">
          {b.categorias.map((c, i) => (
            <li key={c.nombre}>
              <span className="v5-cat-relleno" style={{ width: `${(c.total / maximo) * 100}%`, '--c': `var(--cat-${i + 1})` }} aria-hidden="true" />
              {c.media > 0 && <span className="v5-cat-media" style={{ left: `${(c.media / maximo) * 100}%` }} title={`Tu media: ${formatearEuros(c.media)}`} aria-hidden="true" />}
              <span className="v5-cat-nombre">
                <i style={{ background: `var(--cat-${i + 1})` }} aria-hidden="true" />
                {etiquetaCategoria(c.nombre)}
                <small>{total > 0 ? `${Math.round((c.total / total) * 100)} %` : ''}</small>
              </span>
              <span className="v5-cat-valor">
                <b className="num">{formatearEuros(Math.round(c.total))}</b>
                {c.difPct != null && Math.abs(c.difPct) > 5 && (
                  <small className={c.difPct > 0 ? 'v5-sube' : 'v5-baja'}>
                    {c.difPct > 0 ? '↑' : '↓'} {Math.abs(c.difPct)} %
                  </small>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {b.categorias.some((c) => c.media > 0) && <p className="v5-tenue v5-pie-nota">La raya marca tu media de los meses anteriores.</p>}
    </Tarjeta>
  )
}

// ── Últimos movimientos ─────────────────────────────────────────────────────
function Ultimos({ movimientos, onVerTodos }) {
  const ultimos = movimientos.slice(0, 6)
  return (
    <Tarjeta
      className="v5-ini-ultimos"
      titulo="Últimos movimientos"
      accion={
        <button type="button" className="v5-enlace" onClick={onVerTodos}>
          Ver todos <Icono nombre="chevron" tam={14} />
        </button>
      }
    >
      <ul className="v5-lista">
        {ultimos.map((m) => {
          const concepto = conceptoDe(m)
          const clase = claseMov(m)
          return (
            <li key={m.id} className="v5-fila">
              <Avatar nombre={concepto} movimiento={m} tam={34} />
              <span className="v5-fila-texto">
                <b>{concepto}</b>
                <small>
                  {etiquetaCategoria(m.categoria?.nombre, m.tipo)} · {fechaRelativa(m.fecha)}
                </small>
              </span>
              <b className={`num v5-importe ${clase}`}>
                {signoMov(m)}
                {formatearEuros(Number(m.importe))}
              </b>
            </li>
          )
        })}
      </ul>
    </Tarjeta>
  )
}

export default function InicioV5({
  usuarioId,
  movimientos,
  recurrentes,
  cargandoRecurrentes,
  soloLectura = false,
  onGuardado,
  onRegistrar,
  onConfirmarCobro,
  onIrA,
  onVerAnalisis,
  avisosRenovacion = null,
  recordatoriosEmail = null,
  onAbrirCuenta,
}) {
  return (
    <div className="v5-inicio">
      <div className="v5-ini-avisos">
        <AvisosCobros
          cargando={cargandoRecurrentes}
          usuarioId={usuarioId}
          recurrentes={recurrentes}
          movimientos={movimientos}
          onVerSuscripciones={() => onIrA('suscripciones')}
          onConfirmar={onConfirmarCobro}
          avisosRenovacion={avisosRenovacion}
          recordatoriosEmail={recordatoriosEmail}
          onAbrirCuenta={onAbrirCuenta}
        />
      </div>
      <PatrimonioHero usuarioId={usuarioId} movimientos={movimientos} onGuardado={onGuardado} onIrA={onIrA} soloLectura={soloLectura} />
      <ElMes movimientos={movimientos} onRegistrar={onRegistrar} onIrA={onIrA} />
      <Flujo movimientos={movimientos} onVerAnalisis={onVerAnalisis} />
      <ProximosCobros recurrentes={recurrentes} onIrA={onIrA} />
      <EnQueSeVa movimientos={movimientos} />
      <Ultimos movimientos={movimientos} onVerTodos={() => onRegistrar('historial')} />
    </div>
  )
}
