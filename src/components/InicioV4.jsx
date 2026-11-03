import { useMemo } from 'react'
import { formatearEuros } from '../lib/categorias'
import { etiquetaCategoria } from '../lib/categorias'
import { etiquetaMes, formatearPorcentaje, limiteGastoPresupuesto } from '../lib/movimientosUtils'
import { balanceInicio, resumenDelMes } from '../lib/inicio'
import { usePresupuestoCompartido } from '../lib/DatosCompartidos'
import { preguntarAFulcro } from '../lib/fulcro'
import Icono from './Icono'

// INICIO v4 «El punto de apoyo» (docs/DISENO.md). Todas las cifras salen de
// balanceInicio / resumenDelMes (lib/inicio.js); aquí solo se dibujan.

const redondo = (v) => Math.round(v)
const conSigno = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatearEuros(Math.abs(redondo(v)))}`

// EL FIEL: la firma de Palanca. Barra con el apoyo (▲ latón) al 25 %; se
// inclina con el ratio de ahorro: 0 % plana, ≥ 30 % sube 6° (tope), en
// negativo baja. Al cambiar el dato se asienta (transición CSS de 600 ms).
export function Fiel({ ratio = 0 }) {
  const ang = -Math.max(-6, Math.min(6, (ratio / 30) * 6))
  return (
    <svg className="fiel" viewBox="0 0 400 64" role="img" aria-label={`Ahorro del ${Math.round(ratio)} %`}>
      <line x1="0" y1="58" x2="400" y2="58" className="fiel-base" />
      <g className="fiel-barra" style={{ transform: `rotate(${ang}deg)`, transformOrigin: '100px 40px' }}>
        <rect x="0" y="38" width="400" height="4" />
        <rect x="396" y="30" width="4" height="16" />
      </g>
      <path d="M91 58 L100 44 L109 58 Z" className="fiel-apoyo" />
    </svg>
  )
}

function Comparacion({ actual, media, invertir = false, unidad = '€' }) {
  if (media == null) return <span className="b4-comp">primer mes con datos</span>
  const dif = actual - media
  const pct = media !== 0 ? (dif / Math.abs(media)) * 100 : 0
  if (Math.abs(pct) < 5) return <span className="b4-comp">como siempre</span>
  const bien = invertir ? dif < 0 : dif > 0
  return (
    <span className={`b4-comp ${bien ? 'bien' : ''}`}>
      {unidad === '%' ? `${pct > 0 ? '+' : '−'}${Math.abs(Math.round(pct))} %` : conSigno(dif)} vs. tu media
    </span>
  )
}

/** Balance del mes: el Fiel + cuatro cifras, cada una contra tu media. */
export function BalanceMes({ movimientos, onVerAnalisis, onIrA }) {
  const b = useMemo(() => balanceInicio(movimientos), [movimientos])
  const r = useMemo(() => resumenDelMes(movimientos), [movimientos])
  const presupuesto = usePresupuestoCompartido()
  const t = b.totales
  const mes = etiquetaMes(b.clave, { month: 'long' })
  const Mes = mes.charAt(0).toUpperCase() + mes.slice(1)
  const limite = !b.cerrado && presupuesto.configurado ? limiteGastoPresupuesto(presupuesto, t.ingresos) : null
  const restante = limite != null ? limite - t.gastos : null

  return (
    <section className="b4 b4-balance fade-in-up" aria-label={b.cerrado ? `${Mes}, cerrado` : `${Mes} en curso`}>
      <header className="b4-cab">
        <h2 className="b4-titulo">{b.cerrado ? `${Mes}, cerrado` : `${Mes} en curso`}</h2>
        <button type="button" className="b4-enlace" onClick={onVerAnalisis}>Ver análisis</button>
      </header>
      <div className="b4-balance-cuerpo">
        <div className="b4-fiel">
          <Fiel ratio={t.ratioAhorro} />
          <p className="b4-fiel-frase">
            {t.ingresos > 0 ? (
              <>
                {b.cerrado ? 'Apartaste' : 'Llevas apartado'} <strong>el {formatearPorcentaje(Math.max(0, t.ratioAhorro), 0)}</strong>
                {t.ratioAhorro < 0 ? <> · gastaste más de lo que entró</> : null}
                {b.mejorMes && <span className="b4-etiqueta">tu mejor mes</span>}
              </>
            ) : (
              <>Aún no ha entrado dinero este mes</>
            )}
          </p>
          <p className="b4-fiel-nota">
            {b.medias.ratio != null ? `La barra sube cuando ahorras. Tu media es el ${formatearPorcentaje(b.medias.ratio, 0)}.` : 'La barra sube cuando ahorras.'}
          </p>
        </div>
        <dl className="b4-kpis">
          <div>
            <dt>Entró</dt>
            <dd>{formatearEuros(redondo(t.ingresos))}</dd>
            <Comparacion actual={t.ingresos} media={b.cerrado ? b.medias.ingresos : null} />
          </div>
          <div>
            <dt>Se fue</dt>
            <dd>{formatearEuros(redondo(t.gastos))}</dd>
            {b.cerrado ? (
              <Comparacion actual={t.gastos} media={b.medias.gastos} invertir unidad="%" />
            ) : restante != null ? (
              <span className={`b4-comp ${restante >= 0 ? '' : 'mal'}`}>
                {restante >= 0 ? `te quedan ${formatearEuros(redondo(restante))}` : `te has pasado ${formatearEuros(redondo(-restante))}`}
              </span>
            ) : r.ritmo ? (
              <span className={`b4-comp ${r.ritmo.difPct < -5 ? 'bien' : ''}`}>
                {Math.abs(r.ritmo.difPct) <= 5 ? 'como siempre a estas alturas' : `${r.ritmo.difPct > 0 ? '+' : '−'}${Math.round(Math.abs(r.ritmo.difPct))} % a estas alturas`}
              </span>
            ) : (
              <span className="b4-comp">quedan {r.diasRestantes} días</span>
            )}
          </div>
          <div>
            <dt>Apartaste</dt>
            <dd className={t.ahorro >= 0 ? 'b4-verde' : ''}>{t.ahorro < 0 ? '−' : ''}{formatearEuros(redondo(Math.abs(t.ahorro)))}</dd>
            <Comparacion actual={t.ahorro} media={b.cerrado ? b.medias.ahorro : null} />
          </div>
          <div>
            <dt>Invertido</dt>
            <dd className="b4-laton">{formatearEuros(redondo(t.invertido))}</dd>
            <button type="button" className="b4-comp b4-comp-enlace" onClick={() => onIrA('inversiones')}>ver inversión</button>
          </div>
        </dl>
      </div>
    </section>
  )
}

/** Mes nuevo (días 1–3): propuesta de meta con tu media. */
export function MesNuevo({ movimientos, onIrA }) {
  const b = useMemo(() => balanceInicio(movimientos), [movimientos])
  if (!b.cerrado || b.medias.ahorro == null || b.medias.ahorro <= 0) return null
  const ahora = new Date()
  const mes = ahora.toLocaleDateString('es-ES', { month: 'long' })
  return (
    <section className="b4 b4-nuevo fade-in-up" aria-label="Mes nuevo">
      <h2 className="b4-titulo">{mes.charAt(0).toUpperCase() + mes.slice(1)} empieza</h2>
      <p>
        Tu media es apartar <strong>{formatearEuros(redondo(b.medias.ahorro))}</strong> al mes. ¿Te pones esa meta para {mes}?
      </p>
      <div className="b4-nuevo-acc">
        <button type="button" className="b4-boton" onClick={() => onIrA('presupuesto')}>Fijar mi meta</button>
        <button type="button" className="b4-boton secundario" onClick={() => preguntarAFulcro(`¿Cuánto debería apartar en ${mes}?`)}>Preguntar a Fulcro</button>
      </div>
    </section>
  )
}

/** Lo que apartas cada mes: barras de los últimos 6 con la línea de tu media. */
export function ApartadoMeses({ movimientos }) {
  const b = useMemo(() => balanceInicio(movimientos), [movimientos])
  const serie = b.serie
  if (!serie.some((m) => m.ingresos > 0 || m.gastos > 0)) return null
  const W = 360
  const H = 168
  const T = 22
  const B = 24
  const max = Math.max(1, ...serie.map((m) => Math.max(0, m.ahorro)), b.medias.ahorro ?? 0) * 1.1
  const bw = 34
  const gap = (W - bw * serie.length) / (serie.length - 1)
  const y = (v) => T + (1 - Math.max(0, v) / max) * (H - T - B)
  const base = H - B
  const ultimo = serie.length - 1
  const dif = b.medias.ahorro != null ? b.totales.ahorro - b.medias.ahorro : null
  return (
    <section className="b4 b4-apartado fade-in-up" aria-label="Lo que apartas cada mes">
      <header className="b4-cab">
        <h2 className="b4-titulo">Lo que apartas cada mes</h2>
        <span className="b4-meta">últimos 6</span>
      </header>
      {dif != null && Math.abs(dif) >= 1 && (
        <p className="b4-sub">
          {etiquetaMes(b.clave, { month: 'long' }).replace(/^./, (c) => c.toUpperCase())} {dif >= 0 ? 'supera' : 'queda por debajo de'} tu media en <strong>{formatearEuros(redondo(Math.abs(dif)))}</strong>.
        </p>
      )}
      <svg className="b4-graf" viewBox={`-4 0 ${W + 50} ${H}`} role="img" aria-label="Ahorro por mes de los últimos 6 meses">
        {serie.map((m, i) => {
          const x = i * (bw + gap)
          const ult = i === ultimo
          return (
            <g key={m.clave}>
              <rect x={x} y={y(m.ahorro)} width={bw} height={Math.max(0, base - y(m.ahorro))} className={ult ? 'b4-barra actual' : 'b4-barra'} />
              <text x={x + bw / 2} y={y(m.ahorro) - 6} textAnchor="middle" className={`b4-valor ${ult ? 'actual' : ''} ${m.ahorro < 0 ? 'neg' : ''}`}>
                {(m.ahorro < 0 ? '−' : '') + redondo(Math.abs(m.ahorro)).toLocaleString('es-ES', { useGrouping: 'always' })}
              </text>
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" className={`b4-mes ${ult ? 'actual' : ''}`}>{m.etiqueta}</text>
            </g>
          )
        })}
        {b.medias.ahorro != null && b.medias.ahorro > 0 && (
          <>
            <line x1="-4" x2={W + 4} y1={y(b.medias.ahorro)} y2={y(b.medias.ahorro)} className="b4-media" />
            <text x={W + 8} y={y(b.medias.ahorro) + 4} className="b4-media-txt">media</text>
          </>
        )}
        <line x1="0" x2={W} y1={base} y2={base} className="b4-regla" />
      </svg>
    </section>
  )
}

/** En qué se fue: barras + diferencia contra tu media; destaca lo que más sube. */
export function EnQueSeFue({ movimientos, onVerAnalisis }) {
  const b = useMemo(() => balanceInicio(movimientos), [movimientos])
  if (b.categorias.length === 0) return null
  const max = b.categorias[0].total || 1
  const mes = etiquetaMes(b.clave, { month: 'long' }).toLowerCase()
  const sube = b.categorias.find((c) => c.nombre === b.masSube)
  return (
    <section className="b4 b4-encat fade-in-up" aria-label={`En qué se fue en ${mes}`}>
      <header className="b4-cab">
        <h2 className="b4-titulo">En qué se {b.cerrado ? 'fue' : 'va'} en {mes}</h2>
        <span className="b4-meta">{formatearEuros(redondo(b.totales.gastos))}{b.cerrado ? ' · vs. tu media' : ''}</span>
      </header>
      {sube && (
        <p className="b4-sub">
          <strong>{etiquetaCategoria(sube.nombre)}</strong> es lo que más sube (+{sube.difPct} %).
        </p>
      )}
      <ul className="b4-cats">
        {b.categorias.map((c) => (
          <li key={c.nombre} className={c.nombre === b.masSube ? 'destaca' : ''}>
            <span className="b4-cat-nombre">{etiquetaCategoria(c.nombre)}</span>
            <span className="b4-cat-barra" aria-hidden="true"><i style={{ width: `${Math.max(2, (c.total / max) * 100)}%` }} /></span>
            <span className="b4-cat-valor">{formatearEuros(redondo(c.total))}</span>
            <span className={`b4-cat-dif ${c.difPct == null ? '' : c.difPct > 5 ? 'sube' : c.difPct < -5 ? 'baja' : ''}`}>
              {c.difPct == null ? '' : Math.abs(c.difPct) <= 5 ? '=' : `${c.difPct > 0 ? '+' : '−'}${Math.abs(c.difPct)} %`}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="b4-enlace" onClick={onVerAnalisis}>
        Ver análisis <Icono nombre="chevron" tam={14} />
      </button>
    </section>
  )
}
