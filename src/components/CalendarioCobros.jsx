import { useMemo } from 'react'
import { formatearEuros } from '../lib/categorias'
import { cobrosProximos, costeAnual } from '../lib/periodicidad'

const DIAS_VENTANA = 30
const FMT_DIA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

// Color por compromiso: por orden de peso anual (el más caro, el primer color
// de la paleta). Distintos entre sí hasta 6 y estables mientras no cambie el orden.
const PALETA = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)']

const inicial = (nombre) => (String(nombre || '?').trim()[0] || '?').toUpperCase()

// Reparte los cobros en "carriles" para que dos burbujas del mismo día (o muy
// cercanas) no se pisen en la línea de tiempo.
function conCarriles(cobros) {
  const ultimoPorCarril = []
  return cobros.map((c) => {
    const pos = Math.max(0, c.dias)
    // ~4 días de separación mínima en el mismo carril (burbujas de hasta 44 px).
    let carril = ultimoPorCarril.findIndex((x) => pos - x >= 4)
    if (carril === -1) carril = ultimoPorCarril.length
    ultimoPorCarril[carril] = pos
    return { ...c, pos, carril: Math.min(carril, 2) }
  })
}

// ── Línea de tiempo de los próximos 30 días + reparto anual ──────────────────
// Visual principal del módulo de suscripciones: CUÁNDO te cobran (burbujas en
// el tiempo, tamaño ∝ importe) y EN QUÉ se va el año (barra apilada).
export default function CalendarioCobros({ items, onAbrir }) {
  const cobros = useMemo(
    () => cobrosProximos(items.filter((r) => r.tipo === 'gasto'), DIAS_VENTANA),
    [items],
  )
  const total = cobros.reduce((s, c) => s + Math.round(c.importe * 100), 0) / 100
  const maxImporte = Math.max(1, ...cobros.map((c) => c.importe))
  const burbujas = conCarriles(cobros)
  const carriles = Math.max(1, ...burbujas.map((b) => b.carril + 1))

  const hoy = new Date()
  const marcas = [0, 7, 14, 21, 28].map((d) => {
    const f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + d)
    return { d, texto: d === 0 ? 'hoy' : FMT_DIA.format(f).replace('.', '') }
  })

  const reparto = useMemo(() => {
    const filas = items
      .filter((r) => r.activo && r.tipo === 'gasto')
      .map((r) => ({ rec: r, anual: costeAnual(r) }))
      .filter((x) => x.anual > 0)
      .sort((a, b) => b.anual - a.anual)
    const totalAnual = filas.reduce((s, x) => s + x.anual, 0)
    const top = filas.slice(0, 5)
    const resto = filas.slice(5).reduce((s, x) => s + x.anual, 0)
    const colores = new Map(filas.map((x, i) => [x.rec.id, PALETA[i % PALETA.length]]))
    return { top, resto, totalAnual, colores }
  }, [items])
  const color = (rec) => reparto.colores.get(rec.id) ?? PALETA[5]

  return (
    <section className="cc fade-in-up" aria-label="Calendario de cobros">
      <header className="cc-cab">
        <span className="cc-titulo">Próximos 30 días</span>
        <span className="cc-total">{cobros.length ? formatearEuros(total) : 'Nada que pagar'}</span>
      </header>

      <div className="cc-linea" style={{ '--carriles': carriles }} role="list">
        <div className="cc-eje" aria-hidden="true">
          {marcas.map((m) => (
            <span key={m.d} className="cc-marca" style={{ left: `${(m.d / DIAS_VENTANA) * 100}%` }}>
              {m.texto}
            </span>
          ))}
        </div>
        {burbujas.map((b) => {
          const tam = 26 + Math.round(18 * Math.sqrt(b.importe / maxImporte))
          return (
            <button
              key={b.rec.id}
              type="button"
              role="listitem"
              className={`cc-burbuja ${b.dias <= 0 ? 'toca' : ''}`}
              style={{
                left: `${(b.pos / DIAS_VENTANA) * 100}%`,
                bottom: `${22 + b.carril * 40}px`,
                width: tam,
                height: tam,
                '--c': color(b.rec),
              }}
              onClick={() => onAbrir?.(b.rec)}
              aria-label={`${b.rec.nombre}, ${formatearEuros(b.importe)}, ${b.texto}`}
              title={`${b.rec.nombre} · ${formatearEuros(b.importe)} · ${b.texto}`}
            >
              {inicial(b.rec.nombre)}
            </button>
          )
        })}
      </div>

      {cobros.length > 0 && (
        <ul className="cc-lista">
          {cobros.slice(0, 4).map((c) => (
            <li key={c.rec.id} className={c.dias <= 0 ? 'toca' : ''}>
              <span className="cc-punto" style={{ background: color(c.rec) }} aria-hidden="true" />
              <span className="cc-cuando">{c.texto}</span>
              <span className="cc-nombre">{c.rec.nombre}</span>
              <span className="cc-importe">{formatearEuros(c.importe)}</span>
            </li>
          ))}
          {cobros.length > 4 && <li className="cc-mas">y {cobros.length - 4} más</li>}
        </ul>
      )}

      {reparto.top.length > 1 && (
        <div className="cc-reparto">
          <span className="cc-subtitulo">En qué se va tu año</span>
          <div className="cc-barra" aria-hidden="true">
            {reparto.top.map((x) => (
              <span
                key={x.rec.id}
                style={{ flexGrow: x.anual, background: color(x.rec) }}
              />
            ))}
            {reparto.resto > 0 && <span className="cc-barra-resto" style={{ flexGrow: reparto.resto }} />}
          </div>
          <ul className="cc-leyenda">
            {reparto.top.map((x) => (
              <li key={x.rec.id}>
                <span className="cc-punto" style={{ background: color(x.rec) }} aria-hidden="true" />
                <span className="cc-nombre">{x.rec.nombre}</span>
                <span className="cc-importe">
                  {formatearEuros(Math.round(x.anual))}
                  <span className="cc-pct"> · {Math.round((x.anual / reparto.totalAnual) * 100)}%</span>
                </span>
              </li>
            ))}
            {reparto.resto > 0 && (
              <li>
                <span className="cc-punto cc-barra-resto" aria-hidden="true" />
                <span className="cc-nombre">Otros</span>
                <span className="cc-importe">{formatearEuros(Math.round(reparto.resto))}</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  )
}
