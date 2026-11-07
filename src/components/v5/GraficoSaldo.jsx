import { useEffect, useId, useMemo, useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import { formatearFecha } from '../../lib/movimientosUtils'
import { TEXTO_CLASE } from '../../lib/flujoCaja'
import { colocarEtiquetas } from '../../lib/etiquetasGrafico'
import { TablaDatos, useDimensiones } from './Graficos'
import Avatar from './Avatar'

// SALDO DEL MES (Base · vista Gráfico), en limpio y visual. Escala: lo que te
// queda de lo cobrado ESTE MES (saldo − saldo al empezar el mes): empieza en 0,
// sube con lo que cobras y baja con lo que sale. Mismos números del motor
// (flujoDelMes/bolsas), solo medidos desde el inicio del mes.
//  - área suave = saldo real hasta hoy; línea discontinua = previsto, que baja
//    (o sube) en escalones redondeados en la fecha de cada cobro;
//  - el LOGO de cada cobro previsto flota sobre su escalón (sin textos: la
//    lista de compromisos ya está al lado);
//  - dos cifras: el saldo de hoy y, en una etiqueta, con cuánto te quedas
//    tras el último cobro (y su fecha);
//  - tocar un logo o cualquier punto abre la ficha con cada movimiento.
// Sin cálculos de saldo propios: solo posiciona los números de flujoDelMes.

const ESTADO = { realizado: 'Realizado', previsto: 'Previsto', 'por-confirmar': 'Por confirmar' }
const firma = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatearEuros(Math.abs(v))}`
const redondo = (v) => formatearEuros(Math.round(v))
const FMT_DIA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const diaCorto = (iso) => FMT_DIA.format(new Date(`${iso}T12:00:00`)).replace('.', '')

// Curva suave que no se pasa de los puntos (monótona, Fritsch–Carlson).
function curva(p) {
  if (p.length < 2) return p.length ? `M${p[0][0]} ${p[0][1]}` : ''
  const n = p.length
  const d = []
  const m = []
  for (let i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0] || 1))
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * b * d[i]
    }
  }
  let r = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const h = (p[i + 1][0] - p[i][0]) / 3
    r += ` C${(p[i][0] + h).toFixed(1)} ${(p[i][1] + m[i] * h).toFixed(1)} ${(p[i + 1][0] - h).toFixed(1)} ${(p[i + 1][1] - m[i + 1] * h).toFixed(1)} ${p[i + 1][0].toFixed(1)} ${p[i + 1][1].toFixed(1)}`
  }
  return r
}

export default function GraficoSaldo({ flujo, alto = 320, onAbrirCompromiso }) {
  const { ref, w } = useDimensiones(alto)
  const h = alto
  const estrecho = w < 520
  const idGrad = useId().replace(/:/g, '')
  const [sel, setSel] = useState(null)
  useEffect(() => setSel(null), [flujo.clave])

  const LOGO = estrecho ? 22 : 26
  const M = { izq: 8, der: 8, arriba: 92, abajo: 26 }
  const ancho = w - M.izq - M.der
  const altoPlot = h - M.arriba - M.abajo
  const { dias, eventos, tramo } = flujo
  const diaHoy = tramo === 'actual' ? Number(flujo.hoyIso.slice(8, 10)) : null
  const x = (d) => M.izq + ((d - 0.5) / dias) * ancho
  const xIni = M.izq
  const xFin = M.izq + ancho

  // Base de la escala: el saldo al empezar el mes (0 = nada cobrado aún).
  const base0 = flujo.saldoInicial
  const rel = (v) => Math.round((v - base0) * 100) / 100
  const saldos = [base0, flujo.saldoFinal, ...(flujo.saldoHoy != null ? [flujo.saldoHoy] : []), ...eventos.flatMap((e) => [e.saldoAntes, e.saldoDespues])]
  const lo = Math.min(...saldos)
  const hi = Math.max(...saldos)
  const aire = (hi - lo || Math.abs(hi) || 100) * 0.08
  const vMin = lo - aire
  const vMax = hi + aire
  const y = (v) => M.arriba + (1 - (v - vMin) / (vMax - vMin || 1)) * altoPlot
  const base = M.arriba + altoPlot

  // Grupos por día y tipo (realizado / previsto).
  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const e of eventos) {
      const tipo = e.estado === 'realizado' ? 'real' : 'prev'
      const k = `${e.dia}-${tipo}`
      if (!mapa.has(k)) mapa.set(k, { clave: k, dia: e.dia, tipo, eventos: [] })
      mapa.get(k).eventos.push(e)
    }
    return [...mapa.values()].map((g) => ({ ...g, antes: g.eventos[0].saldoAntes, despues: g.eventos[g.eventos.length - 1].saldoDespues }))
  }, [eventos])
  const reales = grupos.filter((g) => g.tipo === 'real')
  const previstos = grupos.filter((g) => g.tipo === 'prev')

  // Real: un punto por día con movimientos (saldo al cierre del día): curva + área.
  const diaFinReal = tramo === 'pasado' ? dias : tramo === 'actual' ? diaHoy : 0
  const puntosReal = []
  if (diaFinReal > 0) {
    let s = flujo.saldoInicial
    const porDia = new Map(reales.map((g) => [g.dia, g.despues]))
    // Si el día 1 ya entra dinero (la nómina), la línea arranca ahí: en lo cobrado.
    puntosReal.push([xIni, y(porDia.has(1) && porDia.get(1) > s ? porDia.get(1) : s)])
    for (let d = 1; d <= diaFinReal; d++) {
      if (porDia.has(d)) s = porDia.get(d)
      if (porDia.has(d) || d === diaFinReal) puntosReal.push([x(d), y(s)])
    }
    if (tramo === 'pasado') puntosReal.push([xFin, y(s)])
  }
  const lineaReal = curva(puntosReal)
  const areaReal = puntosReal.length > 1 ? `${lineaReal} L${puntosReal.at(-1)[0].toFixed(1)} ${base} L${puntosReal[0][0].toFixed(1)} ${base} Z` : null

  // Previsto: escalones redondeados desde el saldo de hoy.
  const union = tramo === 'actual' ? [x(diaHoy), flujo.saldoHoy] : tramo === 'futuro' ? [xIni, flujo.saldoInicial] : null
  let lineaPrev = null
  if (union) {
    const r = Math.min(10, ancho / dias / 2)
    let cx = union[0]
    let cy = y(union[1])
    lineaPrev = `M${cx.toFixed(1)} ${cy.toFixed(1)}`
    for (const g of previstos) {
      const gx = Math.max(x(g.dia), cx + 0.1)
      const ny = y(g.despues)
      if (Math.abs(ny - cy) < 0.5) continue
      const a = Math.max(cx, gx - r)
      const b = gx + r * 0.4
      lineaPrev += ` L${a.toFixed(1)} ${cy.toFixed(1)} C${(a + (b - a) * 0.6).toFixed(1)} ${cy.toFixed(1)} ${(b - (b - a) * 0.6).toFixed(1)} ${ny.toFixed(1)} ${b.toFixed(1)} ${ny.toFixed(1)}`
      cx = b
      cy = ny
    }
    lineaPrev += ` L${xFin.toFixed(1)} ${cy.toFixed(1)}`
  }

  // Logos de lo previsto: encima de su punto, a distintas alturas para no
  // pisarse, unidos al gráfico con un hilo fino (varios el mismo día: «+N»).
  const logos = useMemo(() => {
    const items = previstos
      .map((g) => {
        const principal = [...g.eventos].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.importe - a.importe)[0]
        return { id: g.clave, px: x(g.dia), py: y(g.despues), ancho: LOGO + (g.eventos.length > 1 ? 16 : 0), g, principal }
      })
      .sort((a, b) => a.px - b.px)
    const puestos = []
    for (const it of items) {
      let nivel = 0
      while (nivel < 4 && puestos.some((p) => p.nivel === nivel && Math.abs(p.px - it.px) < (p.ancho + it.ancho) / 2 + 4)) nivel++
      const cy = Math.max(M.arriba - 4 + LOGO / 2, it.py - 24 - nivel * (LOGO + 10))
      puestos.push({ ...it, nivel, lx: Math.min(Math.max(it.px, M.izq + it.ancho / 2), w - M.der - it.ancho / 2), cy })
    }
    return puestos
  }, [previstos.map((g) => g.clave + g.despues).join('|'), w, flujo.clave, vMin, vMax]) // eslint-disable-line react-hooks/exhaustive-deps

  // Días apuntados en la línea de abajo (sin pisarse; manda «Hoy»).
  const diasEje = useMemo(() => {
    const porDia = new Map()
    for (const g of grupos) {
      const prev = porDia.get(g.dia)
      const peso = Math.abs(g.despues - g.antes) + (g.tipo === 'prev' ? 1e6 : 0)
      if (!prev || peso > prev.peso) porDia.set(g.dia, { dia: g.dia, tipo: g.tipo, peso })
    }
    const sep = estrecho ? 15 : 18
    const puestos = diaHoy ? [{ dia: diaHoy, hoy: true }] : []
    for (const d of [...porDia.values()].sort((a, b) => b.peso - a.peso)) {
      if (puestos.some((p) => Math.abs(x(p.dia) - x(d.dia)) < sep + (p.hoy ? 8 : 0))) continue
      puestos.push(d)
    }
    return puestos.filter((p) => !p.hoy)
  }, [grupos, w, diaHoy]) // eslint-disable-line react-hooks/exhaustive-deps

  // Llevas gastado (todo lo que ha salido este mes hasta hoy) y cobrado.
  const realizados = eventos.filter((e) => e.estado === 'realizado')
  const gastado = realizados.reduce((s, e) => s + (e.delta < 0 ? Math.round(-e.delta * 100) : 0), 0) / 100

  // Cifra final: tras el último cobro previsto (o al cierre si el mes pasó).
  const ultimo = previstos.at(-1)
  const final = tramo === 'pasado' ? { x: xFin - 2, v: flujo.saldoFinal, etq: 'te quedó al cerrar' } : ultimo ? { x: x(ultimo.dia), v: ultimo.despues, etq: `te quedará · ${diaCorto(ultimo.eventos[0].fecha)}` } : null

  const grupoSel = grupos.find((g) => g.clave === sel) ?? null
  function tocarFondo(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const dia = Math.max(1, Math.min(dias, Math.floor(((e.clientX - r.left) / ancho) * dias) + 1))
    for (const d of [dia, dia - 1, dia + 1]) {
      const g = grupos.find((c) => c.dia === d && c.tipo === 'prev') ?? grupos.find((c) => c.dia === d)
      if (g) return setSel(sel === g.clave ? null : g.clave)
    }
    setSel(null)
  }

  const yFicha = grupoSel ? y(grupoSel.despues) : 0
  const ficha = grupoSel && (
    <div
      className={`v5-saldo-ficha ${estrecho ? 'estatica' : ''}`}
      style={estrecho ? undefined : { left: Math.min(Math.max(x(grupoSel.dia) - 150, 0), Math.max(0, w - 300)), top: yFicha > h / 2 ? undefined : yFicha + 14, bottom: yFicha > h / 2 ? h - yFicha + 14 : undefined }}
      role="dialog"
      aria-label={`Movimientos del ${formatearFecha(grupoSel.eventos[0].fecha)}`}
    >
      <div className="v5-saldo-ficha-cab">
        <span>
          {formatearFecha(grupoSel.eventos[0].fecha)} · {grupoSel.tipo === 'prev' ? 'previsto' : 'realizado'}
        </span>
        <button type="button" className="v5-boton fantasma icono-solo" onClick={() => setSel(null)} aria-label="Cerrar">
          ×
        </button>
      </div>
      <ul>
        {grupoSel.eventos.map((e) => (
          <li key={e.id} className={e.estado !== 'realizado' ? 'previsto' : ''}>
            <div className="v5-saldo-ficha-fila">
              <span className="v5-saldo-ficha-nombre">
                <Avatar nombre={e.nombre} tam={22} />
                <b>{e.nombre}</b>
              </span>
              <b className={`num ${e.delta > 0 ? 'v5-positivo' : ''}`}>{firma(e.tipo === 'ingreso' ? e.importe : -e.importe)}</b>
            </div>
            <small className="v5-tenue">
              {TEXTO_CLASE[e.clase]} · {ESTADO[e.estado]}
              {e.estado === 'por-confirmar' && e.fechaPrevista ? ` (tocaba el ${formatearFecha(e.fechaPrevista)})` : ''}
              {e.aproximado ? ' · importe aproximado' : ''}
            </small>
            <small className="num v5-saldo-ficha-saldo">
              Te queda del mes {formatearEuros(rel(e.saldoAntes))} → <b>{formatearEuros(rel(e.saldoDespues))}</b>
              {e.delta === 0 && e.clase === 'traspaso' ? ' (sigue siendo tuyo: no cambia)' : ''}
            </small>
            {e.rec && onAbrirCompromiso && (
              <button type="button" className="v5-enlace" onClick={() => onAbrirCompromiso(e.rec)}>
                Ver compromiso
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )

  const badgeW = estrecho ? 112 : 128
  const badgeCx = final ? Math.min(Math.max(final.x, M.izq + badgeW / 2), xFin - badgeW / 2) : 0
  return (
    <figure className="v5-graf v5-saldo" ref={ref} aria-label="Evolución del saldo del mes">
      <svg width={w} height={h} role="img" aria-label="Saldo hasta hoy y previsto del mes">
        <defs>
          <filter id={`${idGrad}-hilo`} x="-50%" y="-5%" width="200%" height="110%">
            <feGaussianBlur stdDeviation="0.45" />
          </filter>
          <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={M.izq} y={M.arriba - 40} width={ancho} height={altoPlot + 40} fill="transparent" onClick={tocarFondo} style={{ cursor: 'pointer' }} />
        <line x1={xIni} x2={xFin} y1={base} y2={base} className="v5-graf-cero" pointerEvents="none" />
        {areaReal && <path d={areaReal} fill={`url(#${idGrad})`} pointerEvents="none" />}
        {diaHoy && (
          <g pointerEvents="none">
            <line x1={x(diaHoy)} x2={x(diaHoy)} y1={M.arriba - 20} y2={base} className="v5-graf-guia" />
            <text x={Math.min(Math.max(x(diaHoy), M.izq + 60), xFin - 60)} y={M.arriba - 40} textAnchor="middle" className="v5-saldo-hoy num">
              {redondo(rel(flujo.saldoHoy))} <tspan className="v5-saldo-hoy-sub">te quedan</tspan>
            </text>
            <text x={Math.min(Math.max(x(diaHoy), M.izq + 60), xFin - 60)} y={M.arriba - 25} textAnchor="middle" className="v5-saldo-hoy-sub num">
              llevas gastado {redondo(gastado)}
            </text>
          </g>
        )}
        {lineaPrev && <path d={lineaPrev} className="v5-saldo-prev" pointerEvents="none" />}
        {lineaReal && <path d={lineaReal} className="v5-saldo-real" pointerEvents="none" />}
        {union && tramo === 'actual' && <circle cx={union[0]} cy={y(union[1])} r="5.5" fill="var(--accent)" stroke="var(--card-bg)" strokeWidth="2.5" pointerEvents="none" />}

        {final && (
          <g pointerEvents="none" className="v5-saldo-final">
            <line x1={final.x} x2={final.x} y1={48} y2={y(final.v)} className="v5-saldo-final-guia" />
            <rect x={badgeCx - badgeW / 2} y={6} width={badgeW} height={42} rx={10} />
            <text x={badgeCx} y={25} textAnchor="middle" className="v5-saldo-final-v num">
              {redondo(rel(final.v))}
            </text>
            <text x={badgeCx} y={40} textAnchor="middle" className="v5-saldo-final-f">
              {final.etq}
            </text>
            <circle cx={final.x} cy={y(final.v)} r="5.5" fill="var(--accent)" stroke="var(--card-bg)" strokeWidth="2.5" />
          </g>
        )}

        {logos.map((l) => (
          <g key={`h-${l.id}`} pointerEvents="none">
            <line x1={l.lx} x2={l.px} y1={l.cy + LOGO / 2} y2={l.py} className="v5-saldo-hilo" filter={`url(#${idGrad}-hilo)`} />
            <circle cx={l.px} cy={l.py} r="2.5" className="v5-saldo-pie" />
          </g>
        ))}
        {logos.map((l) => (
          <foreignObject key={l.id} x={l.lx - l.ancho / 2 - 1} y={l.cy - LOGO / 2 - 1} width={l.ancho + 2} height={LOGO + 2}>
            <button
              type="button"
              className={`v5-saldo-logo ${sel === l.id ? 'sel' : ''} ${l.principal.estado === 'por-confirmar' ? 'atencion' : ''}`}
              onClick={() => setSel(sel === l.id ? null : l.id)}
              aria-label={`${l.principal.nombre}${l.g.eventos.length > 1 ? ` y ${l.g.eventos.length - 1} más` : ''}, ${formatearFecha(l.g.eventos[0].fecha)}, ${firma(l.principal.tipo === 'ingreso' ? l.principal.importe : -l.principal.importe)}`}
            >
              <Avatar nombre={l.principal.nombre} tam={LOGO} />
              {l.g.eventos.length > 1 && <span className="v5-saldo-logo-mas">+{l.g.eventos.length - 1}</span>}
            </button>
          </foreignObject>
        ))}

        {diasEje.map((d) => (
          <g key={`d-${d.dia}`} pointerEvents="none">
            <line x1={x(d.dia)} x2={x(d.dia)} y1={base} y2={base + 4} className={`v5-saldo-marca ${d.tipo === 'prev' ? 'prev' : ''}`} />
            <text x={x(d.dia)} y={h - 6} className={`v5-graf-eje ${d.tipo === 'prev' ? 'v5-saldo-dia-prev' : ''}`} textAnchor="middle">
              {d.dia}
            </text>
          </g>
        ))}
        {diaHoy && (
          <text x={x(diaHoy)} y={h - 6} className="v5-graf-eje fuerte" textAnchor="middle" pointerEvents="none">
            Hoy
          </text>
        )}
      </svg>
      {ficha}
      <TablaDatos
        titulo="Movimientos del mes y saldo"
        cabecera={['Fecha', 'Movimiento', 'Estado', 'Importe', 'Te queda del mes']}
        filas={eventos.map((e) => [formatearFecha(e.fecha), e.nombre, ESTADO[e.estado], firma(e.tipo === 'ingreso' ? e.importe : -e.importe), formatearEuros(rel(e.saldoDespues))])}
      />
    </figure>
  )
}
