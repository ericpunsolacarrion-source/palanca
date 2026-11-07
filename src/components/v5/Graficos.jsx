import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useAncho } from '../../lib/useAncho'
import { formatearEuros } from '../../lib/categorias'
import { formatearCompacto } from '../../lib/movimientosUtils'

// Kit de gráficos v5 (SVG propio, sin librerías): marcas finas, rejilla
// recesiva, un solo eje, tooltip al pasar el ratón o el dedo y tabla de datos
// accesible. Paleta y reglas en docs/DISENO.md (validada CVD y contraste).

// Marcas «bonitas» del eje: 3–4 líneas en números redondos.
function marcasEje(min, max, n = 4) {
  if (min === max) {
    const d = Math.abs(max) || 1
    min -= d * 0.1
    max += d * 0.1
  }
  const bruto = (max - min) / n
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? bruto
  const ini = Math.floor(min / paso) * paso
  const fin = Math.ceil(max / paso) * paso
  const marcas = []
  for (let v = ini; v <= fin + paso / 2; v += paso) marcas.push(Math.round(v * 100) / 100)
  return marcas
}

const ejeTexto = (v) => (v < 0 ? '−' : '') + (Math.abs(v) >= 1000 ? formatearCompacto(Math.abs(v)) : String(Math.round(Math.abs(v))))

function Tooltip({ x, y, ancho, children }) {
  const izquierda = x > ancho * 0.62
  return (
    <div className="v5-tooltip" style={{ left: x, top: y, transform: `translate(${izquierda ? 'calc(-100% - 12px)' : '12px'}, -50%)` }} role="status">
      {children}
    </div>
  )
}

/**
 * Área de una serie temporal (patrimonio, saldo…).
 * serie: [{ etiqueta, etiquetaLarga?, valor }]
 */
export function GraficoArea({ serie, alto = 220, color = 'var(--accent)', titulo, formato = formatearEuros, resaltarUltimo = true }) {
  const [ref, ancho] = useAncho()
  const [activo, setActivo] = useState(null)
  const idGrad = useId().replace(/:/g, '')
  const M = { arriba: 12, abajo: 26, izq: 46, der: 12 }
  const w = Math.max(200, ancho)
  const h = alto
  const valores = serie.map((p) => p.valor)
  // Dominio: desde 0 si la serie es positiva (o desde algo menos que su mínimo
  // si vive lejos de 0); si baja de 0, un poco por debajo de su mínimo. Las
  // marcas solo se dibujan dentro del dominio (sin «−5k» por un −40 €).
  const { marcas, vMin, vMax } = useMemo(() => {
    const lo = Math.min(...valores)
    const hi = Math.max(...valores)
    const rango = hi - lo || Math.abs(hi) || 1
    const dMin = lo >= 0 ? (lo > hi * 0.6 ? lo - rango * 0.15 : 0) : lo - rango * 0.06
    const todas = marcasEje(dMin, hi, 4)
    const max = todas[todas.length - 1]
    return { marcas: todas.filter((m) => m >= dMin - 1e-9), vMin: dMin, vMax: max }
  }, [valores.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const x = useCallback((i) => M.izq + (serie.length === 1 ? 0.5 : i / (serie.length - 1)) * (w - M.izq - M.der), [serie.length, w]) // eslint-disable-line react-hooks/exhaustive-deps
  const y = (v) => M.arriba + (1 - (v - vMin) / (vMax - vMin || 1)) * (h - M.arriba - M.abajo)
  const linea = serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ')
  const base = y(Math.min(Math.max(0, vMin), vMax))
  const area = `${linea} L${x(serie.length - 1).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z`
  const cadaCuanto = Math.ceil(serie.length / Math.max(2, Math.floor((w - M.izq) / 64)))

  function mover(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.touches?.[0]?.clientX ?? e.clientX) - r.left
    const t = (px - M.izq) / (w - M.izq - M.der)
    setActivo(Math.max(0, Math.min(serie.length - 1, Math.round(t * (serie.length - 1)))))
  }
  const ult = serie.length - 1
  const sel = activo ?? null

  return (
    <figure className="v5-graf" ref={ref} aria-label={titulo}>
      <svg width={w} height={h} role="img" aria-label={titulo} onMouseMove={mover} onMouseLeave={() => setActivo(null)} onTouchStart={mover} onTouchMove={mover} onTouchEnd={() => setActivo(null)}>
        <defs>
          <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={M.izq} x2={w - M.der} y1={y(m)} y2={y(m)} className={m === 0 ? 'v5-graf-cero' : 'v5-graf-rejilla'} />
            <text x={M.izq - 10} y={y(m)} className="v5-graf-eje" textAnchor="end" dominantBaseline="middle">
              {ejeTexto(m)}
            </text>
          </g>
        ))}
        {serie.map((p, i) =>
          i % cadaCuanto === 0 || i === ult ? (
            <text key={p.etiqueta + i} x={x(i)} y={h - 6} className="v5-graf-eje" textAnchor={i === 0 ? 'start' : i === ult ? 'end' : 'middle'}>
              {p.etiqueta}
            </text>
          ) : null,
        )}
        <path d={area} fill={`url(#${idGrad})`} />
        <path d={linea} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {sel !== null && <line x1={x(sel)} x2={x(sel)} y1={M.arriba} y2={h - M.abajo} className="v5-graf-guia" />}
        {(sel !== null || resaltarUltimo) && (
          <circle cx={x(sel ?? ult)} cy={y(serie[sel ?? ult].valor)} r="5" fill={color} stroke="var(--card-bg)" strokeWidth="2.5" />
        )}
      </svg>
      {sel !== null && (
        <Tooltip x={x(sel)} y={y(serie[sel].valor)} ancho={w}>
          <span className="v5-tooltip-etq">{serie[sel].etiquetaLarga ?? serie[sel].etiqueta}</span>
          <b>{formato(serie[sel].valor)}</b>
        </Tooltip>
      )}
      <TablaDatos titulo={titulo} filas={serie.map((p) => [p.etiquetaLarga ?? p.etiqueta, formato(p.valor)])} />
    </figure>
  )
}

/**
 * Barras agrupadas por mes (p. ej. entra / sale), con la última destacada.
 * serie: [{ etiqueta, etiquetaLarga?, valores: { [clave]: número } }]
 * series: [{ clave, nombre, color }]
 */
export function GraficoBarras({ serie, series, alto = 220, titulo, formato = formatearEuros, destacarUltimo = true }) {
  const [ref, ancho] = useAncho()
  const [activo, setActivo] = useState(null)
  const M = { arriba: 12, abajo: 26, izq: 46, der: 8 }
  const w = Math.max(200, ancho)
  const h = alto
  const maximo = Math.max(1, ...serie.flatMap((p) => series.map((s) => p.valores[s.clave] ?? 0)))
  const marcas = marcasEje(0, maximo, 4)
  const vMax = marcas[marcas.length - 1]
  const y = (v) => M.arriba + (1 - v / vMax) * (h - M.arriba - M.abajo)
  const banda = (w - M.izq - M.der) / serie.length
  const hueco = 2
  const anchoBarra = Math.min(22, Math.max(6, (banda * 0.62 - hueco * (series.length - 1)) / series.length))
  const grupo = anchoBarra * series.length + hueco * (series.length - 1)
  const ult = serie.length - 1

  return (
    <figure className="v5-graf" ref={ref} aria-label={titulo} onMouseLeave={() => setActivo(null)}>
      <svg width={w} height={h} role="img" aria-label={titulo}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={M.izq} x2={w - M.der} y1={y(m)} y2={y(m)} className={m === 0 ? 'v5-graf-cero' : 'v5-graf-rejilla'} />
            <text x={M.izq - 10} y={y(m)} className="v5-graf-eje" textAnchor="end" dominantBaseline="middle">
              {ejeTexto(m)}
            </text>
          </g>
        ))}
        {serie.map((p, i) => {
          const x0 = M.izq + i * banda + (banda - grupo) / 2
          const tenue = destacarUltimo && i !== ult && activo !== i
          return (
            <g key={p.etiqueta + i} onMouseEnter={() => setActivo(i)} onTouchStart={() => setActivo(i)}>
              <rect x={M.izq + i * banda} y={M.arriba} width={banda} height={h - M.arriba - M.abajo} fill="transparent" />
              {activo === i && <rect x={M.izq + i * banda + 2} y={M.arriba} width={banda - 4} height={h - M.arriba - M.abajo} rx="6" className="v5-graf-banda" />}
              {series.map((s, k) => {
                const v = Math.max(0, p.valores[s.clave] ?? 0)
                const top = y(v)
                const alto = Math.max(v > 0 ? 2 : 0, y(0) - top)
                const r = Math.min(4, anchoBarra / 2, alto)
                const bx = x0 + k * (anchoBarra + hueco)
                // Extremo de datos redondeado; anclado plano a la base.
                const d = `M${bx} ${y(0)} V${top + r} Q${bx} ${top} ${bx + r} ${top} H${bx + anchoBarra - r} Q${bx + anchoBarra} ${top} ${bx + anchoBarra} ${top + r} V${y(0)} Z`
                return <path key={s.clave} d={d} fill={s.color} opacity={tenue ? 0.45 : 1} />
              })}
              <text x={M.izq + i * banda + banda / 2} y={h - 6} className={`v5-graf-eje ${i === ult ? 'fuerte' : ''}`} textAnchor="middle">
                {p.etiqueta}
              </text>
            </g>
          )
        })}
      </svg>
      {activo !== null && (
        <Tooltip x={M.izq + activo * banda + banda / 2} y={h / 2} ancho={w}>
          <span className="v5-tooltip-etq">{serie[activo].etiquetaLarga ?? serie[activo].etiqueta}</span>
          {series.map((s) => (
            <span key={s.clave} className="v5-tooltip-fila">
              <i style={{ background: s.color }} />
              {s.nombre}
              <b>{formato(serie[activo].valores[s.clave] ?? 0)}</b>
            </span>
          ))}
        </Tooltip>
      )}
      <TablaDatos titulo={titulo} cabecera={['', ...series.map((s) => s.nombre)]} filas={serie.map((p) => [p.etiquetaLarga ?? p.etiqueta, ...series.map((s) => formato(p.valores[s.clave] ?? 0))])} />
    </figure>
  )
}

// Leyenda (≥ 2 series): la identidad nunca va solo por color.
export function Leyenda({ series }) {
  return (
    <ul className="v5-leyenda">
      {series.map((s) => (
        <li key={s.clave ?? s.nombre}>
          <i style={{ background: s.color }} aria-hidden="true" />
          {s.nombre}
        </li>
      ))}
    </ul>
  )
}

// Los datos del gráfico como tabla, para lectores de pantalla.
function TablaDatos({ titulo, cabecera, filas }) {
  return (
    <table className="v5-solo-lector">
      {titulo && <caption>{titulo}</caption>}
      {cabecera && (
        <thead>
          <tr>{cabecera.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
      )}
      <tbody>
        {filas.map((f, i) => (
          <tr key={i}>{f.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

// Anillo de progreso (presupuesto, objetivos). pct 0–100+; más de 100 se marca.
export function Anillo({ pct, tam = 112, grosor = 10, color = 'var(--accent)', children, etiqueta }) {
  const r = (tam - grosor) / 2
  const c = 2 * Math.PI * r
  const lleno = Math.max(0, Math.min(100, pct))
  const pasado = pct > 100
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(lleno))
    return () => cancelAnimationFrame(t)
  }, [lleno])
  return (
    <div className="v5-anillo" style={{ width: tam, height: tam }} role="img" aria-label={etiqueta}>
      <svg width={tam} height={tam}>
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--superficie-3)" strokeWidth={grosor} />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          stroke={pasado ? 'var(--critico)' : color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - visible / 100)}
          transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
          className="v5-anillo-trazo"
        />
      </svg>
      <div className="v5-anillo-centro">{children}</div>
    </div>
  )
}

/**
 * Entra, sale y queda (flujo mensual). Cada mes: barra de lo que entró
 * (menta), barra de lo que salió (neutro) y un punto con lo que quedó; los
 * meses en que salió más de lo que entró llevan el punto en rojo, bajo el 0.
 * El mes en curso va atenuado y rotulado: aún no está cerrado.
 * serie: [{ etiqueta, etiquetaLarga, entra, sale, queda, enCurso }]
 */
export function GraficoFlujo({ serie, alto = 240, titulo }) {
  const [ref, ancho] = useAncho()
  const [activo, setActivo] = useState(null)
  const M = { arriba: 14, abajo: 28, izq: 48, der: 8 }
  const w = Math.max(220, ancho)
  const h = alto
  const lo = Math.min(0, ...serie.map((p) => p.queda))
  const hi = Math.max(1, ...serie.flatMap((p) => [p.entra, p.sale, p.queda]))
  const marcas = marcasEje(lo, hi, 4)
  const vMin = marcas[0]
  const vMax = marcas[marcas.length - 1]
  const y = (v) => M.arriba + (1 - (v - vMin) / (vMax - vMin || 1)) * (h - M.arriba - M.abajo)
  const banda = (w - M.izq - M.der) / serie.length
  const anchoBarra = Math.min(20, Math.max(5, banda * 0.26))
  const hueco = 3
  const cx = (i) => M.izq + i * banda + banda / 2
  const barra = (bx, v) => {
    const top = y(Math.max(0, v))
    const base = y(0)
    const alto2 = Math.max(v > 0 ? 2 : 0, base - top)
    const r = Math.min(3, anchoBarra / 2, alto2)
    return `M${bx} ${base} V${base - alto2 + r} Q${bx} ${base - alto2} ${bx + r} ${base - alto2} H${bx + anchoBarra - r} Q${bx + anchoBarra} ${base - alto2} ${bx + anchoBarra} ${base - alto2 + r} V${base} Z`
  }
  const lineaQueda = serie.map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${y(p.queda).toFixed(1)}`).join(' ')
  const sel = activo

  return (
    <figure className="v5-graf" ref={ref} aria-label={titulo} onMouseLeave={() => setActivo(null)}>
      <svg width={w} height={h} role="img" aria-label={titulo}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={M.izq} x2={w - M.der} y1={y(m)} y2={y(m)} className={m === 0 ? 'v5-graf-cero' : 'v5-graf-rejilla'} />
            <text x={M.izq - 10} y={y(m)} className="v5-graf-eje" textAnchor="end" dominantBaseline="middle">
              {ejeTexto(m)}
            </text>
          </g>
        ))}
        {serie.map((p, i) => {
          const x0 = cx(i) - anchoBarra - hueco / 2
          const op = p.enCurso ? 0.45 : sel !== null && sel !== i ? 0.55 : 1
          return (
            <g key={p.etiqueta + i} onMouseEnter={() => setActivo(i)} onTouchStart={() => setActivo(i)}>
              <rect x={M.izq + i * banda} y={M.arriba} width={banda} height={h - M.arriba - M.abajo} fill="transparent" />
              {sel === i && <rect x={M.izq + i * banda + 2} y={M.arriba} width={banda - 4} height={h - M.arriba - M.abajo} rx="6" className="v5-graf-banda" />}
              <path d={barra(x0, p.entra)} fill="var(--accent)" opacity={op} />
              <path d={barra(x0 + anchoBarra + hueco, p.sale)} fill="var(--gasto)" opacity={op * 0.85} />
              <text x={cx(i)} y={h - 8} className={`v5-graf-eje ${p.enCurso ? '' : i === serie.length - 1 ? 'fuerte' : ''}`} textAnchor="middle">
                {p.etiqueta}
                {p.enCurso ? '*' : ''}
              </text>
            </g>
          )
        })}
        <path d={lineaQueda} fill="none" stroke="var(--text-h)" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="3 3" />
        {serie.map((p, i) => (
          <circle key={'q' + i} cx={cx(i)} cy={y(p.queda)} r={sel === i ? 5 : 4} fill={p.queda < 0 ? 'var(--critico)' : 'var(--text-h)'} stroke="var(--card-bg)" strokeWidth="2" opacity={p.enCurso ? 0.6 : 1} pointerEvents="none" />
        ))}
      </svg>
      {sel !== null && (
        <Tooltip x={cx(sel)} y={h / 2} ancho={w}>
          <span className="v5-tooltip-etq">
            {serie[sel].etiquetaLarga ?? serie[sel].etiqueta}
            {serie[sel].enCurso ? ' (en curso)' : ''}
          </span>
          <span className="v5-tooltip-fila">
            <i style={{ background: 'var(--accent)' }} />
            Entró<b>{formatearEuros(serie[sel].entra)}</b>
          </span>
          <span className="v5-tooltip-fila">
            <i style={{ background: 'var(--gasto)' }} />
            Salió<b>{formatearEuros(serie[sel].sale)}</b>
          </span>
          <span className="v5-tooltip-fila">
            <i style={{ background: serie[sel].queda < 0 ? 'var(--critico)' : 'var(--text-h)', borderRadius: 99 }} />
            Quedó<b>{formatearEuros(serie[sel].queda)}</b>
          </span>
        </Tooltip>
      )}
      <TablaDatos titulo={titulo} cabecera={['', 'Entró', 'Salió', 'Quedó']} filas={serie.map((p) => [p.etiquetaLarga ?? p.etiqueta, formatearEuros(p.entra), formatearEuros(p.sale), formatearEuros(p.queda)])} />
    </figure>
  )
}

/**
 * Proyección: dos escenarios con la misma aportación. Línea neutra = dinero
 * sin invertir; área dorada = invertido. La franja entre ambas es lo que
 * aporta el interés compuesto.
 * puntos: [{ anio, parado, invertido }]
 */
export function GraficoProyeccion({ puntos, alto = 260, titulo }) {
  const [ref, ancho] = useAncho()
  const [activo, setActivo] = useState(null)
  const M = { arriba: 14, abajo: 26, izq: 52, der: 14 }
  const w = Math.max(220, ancho)
  const h = alto
  const marcas = marcasEje(0, Math.max(1, ...puntos.map((p) => p.invertido)), 4)
  const vMax = marcas[marcas.length - 1]
  const n = puntos.length - 1 || 1
  const x = (i) => M.izq + (i / n) * (w - M.izq - M.der)
  const y = (v) => M.arriba + (1 - v / vMax) * (h - M.arriba - M.abajo)
  const camino = (k) => puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(' ')
  const franja = `${camino('invertido')} ${[...puntos].reverse().map((p, j) => `L${x(n - j).toFixed(1)} ${y(p.parado).toFixed(1)}`).join(' ')} Z`
  const debajo = `${camino('parado')} L${x(n)} ${y(0)} L${x(0)} ${y(0)} Z`
  const cada = Math.ceil(puntos.length / Math.max(2, Math.floor((w - M.izq) / 56)))
  function mover(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.touches?.[0]?.clientX ?? e.clientX) - r.left
    setActivo(Math.max(0, Math.min(n, Math.round(((px - M.izq) / (w - M.izq - M.der)) * n))))
  }
  const sel = activo

  return (
    <figure className="v5-graf" ref={ref} aria-label={titulo}>
      <svg width={w} height={h} role="img" aria-label={titulo} onMouseMove={mover} onMouseLeave={() => setActivo(null)} onTouchStart={mover} onTouchMove={mover} onTouchEnd={() => setActivo(null)}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={M.izq} x2={w - M.der} y1={y(m)} y2={y(m)} className={m === 0 ? 'v5-graf-cero' : 'v5-graf-rejilla'} />
            <text x={M.izq - 10} y={y(m)} className="v5-graf-eje" textAnchor="end" dominantBaseline="middle">
              {ejeTexto(m)}
            </text>
          </g>
        ))}
        {puntos.map((p, i) =>
          i % cada === 0 || i === n ? (
            <text key={p.anio} x={x(i)} y={h - 6} className="v5-graf-eje" textAnchor={i === 0 ? 'start' : i === n ? 'end' : 'middle'}>
              {p.anio === 0 ? 'Hoy' : `${p.anio} a`}
            </text>
          ) : null,
        )}
        <path d={debajo} fill="var(--text-h)" opacity="0.05" />
        <path d={franja} fill="var(--inversion)" opacity="0.2" />
        <path d={camino('parado')} fill="none" stroke="var(--text)" strokeWidth="1.75" strokeLinejoin="round" />
        <path d={camino('invertido')} fill="none" stroke="var(--inversion)" strokeWidth="2.25" strokeLinejoin="round" />
        {sel !== null && <line x1={x(sel)} x2={x(sel)} y1={M.arriba} y2={h - M.abajo} className="v5-graf-guia" />}
        <circle cx={x(sel ?? n)} cy={y(puntos[sel ?? n].invertido)} r="5" fill="var(--inversion)" stroke="var(--card-bg)" strokeWidth="2.5" />
        <circle cx={x(sel ?? n)} cy={y(puntos[sel ?? n].parado)} r="4" fill="var(--text)" stroke="var(--card-bg)" strokeWidth="2" />
      </svg>
      {sel !== null && (
        <Tooltip x={x(sel)} y={y(puntos[sel].invertido)} ancho={w}>
          <span className="v5-tooltip-etq">{sel === 0 ? 'Hoy' : `Dentro de ${puntos[sel].anio} años`}</span>
          <span className="v5-tooltip-fila">
            <i style={{ background: 'var(--inversion)' }} />
            Invertido<b>{formatearEuros(Math.round(puntos[sel].invertido))}</b>
          </span>
          <span className="v5-tooltip-fila">
            <i style={{ background: 'var(--text)' }} />
            Sin invertir<b>{formatearEuros(Math.round(puntos[sel].parado))}</b>
          </span>
          <span className="v5-tooltip-fila">
            Diferencia<b>{formatearEuros(Math.round(puntos[sel].invertido - puntos[sel].parado))}</b>
          </span>
        </Tooltip>
      )}
      <TablaDatos titulo={titulo} cabecera={['Año', 'Sin invertir', 'Invertido']} filas={puntos.map((p) => [String(p.anio), formatearEuros(Math.round(p.parado)), formatearEuros(Math.round(p.invertido))])} />
    </figure>
  )
}
