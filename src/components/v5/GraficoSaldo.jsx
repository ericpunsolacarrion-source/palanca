import { useEffect, useMemo, useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import { formatearFecha } from '../../lib/movimientosUtils'
import { TEXTO_CLASE } from '../../lib/flujoCaja'
import { colocarEtiquetas } from '../../lib/etiquetasGrafico'
import { TablaDatos, ejeTexto, marcasEje, useDimensiones } from './Graficos'

// SALDO DEL MES (Base · vista Gráfico). Dibuja lo que da flujoDelMes():
//  - línea continua: saldo real (liquidez del motor) movimiento a movimiento;
//  - línea discontinua: saldo previsto desde el saldo de HOY con los
//    compromisos pendientes en su fecha;
//  - un marcador por día con movimientos relevantes (relleno = realizado,
//    hueco = previsto) y su etiqueta FUERA de la línea, unida con una guía;
//  - al tocar un marcador (o cualquier día con movimientos), una ficha con
//    cada movimiento: importe, fecha, tipo y saldo antes → después.
// Sin cálculos de saldo propios: solo posiciona los números de flujoDelMes.

const ESTADO = { realizado: 'Realizado', previsto: 'Previsto', 'por-confirmar': 'Por confirmar' }
const firma = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatearEuros(Math.abs(v))}`
const corto = (v) => {
  const a = Math.abs(v)
  const t = a >= 1000 ? `${(Math.round(a / 100) / 10).toLocaleString('es-ES')}k` : Math.round(a).toLocaleString('es-ES')
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${t} €`
}
const recorta = (s, n = 16) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
const colorDe = (e) => (e.clase === 'ingreso' || e.clase === 'retirada' ? 'var(--accent)' : e.clase === 'inversion' ? 'var(--inversion)' : 'var(--gasto)')

export default function GraficoSaldo({ flujo, alto = 300, onAbrirCompromiso }) {
  const { ref, w } = useDimensiones(alto)
  const h = alto
  const estrecho = w < 520
  const [sel, setSel] = useState(null) // clave del grupo seleccionado
  useEffect(() => setSel(null), [flujo.clave])

  const M = { izq: 46, der: 14, arriba: 30, abajo: 52 } // franjas de etiquetas arriba y abajo
  const ancho = w - M.izq - M.der
  const altoPlot = h - M.arriba - M.abajo
  const { dias, eventos, tramo } = flujo
  const diaHoy = tramo === 'actual' ? Number(flujo.hoyIso.slice(8, 10)) : null
  const x = (d) => M.izq + ((d - 0.5) / dias) * ancho
  const xIni = M.izq
  const xFin = M.izq + ancho

  // Dominio vertical con todos los saldos (con un poco de aire).
  const saldos = [flujo.saldoInicial, flujo.saldoFinal, ...(flujo.saldoHoy != null ? [flujo.saldoHoy] : []), ...eventos.flatMap((e) => [e.saldoAntes, e.saldoDespues])]
  const lo = Math.min(...saldos)
  const hi = Math.max(...saldos)
  const aire = (hi - lo || Math.abs(hi) || 100) * 0.12
  const marcas = marcasEje(lo - aire, hi + aire, 4)
  const vMin = marcas[0]
  const vMax = marcas[marcas.length - 1]
  const y = (v) => M.arriba + (1 - (v - vMin) / (vMax - vMin || 1)) * altoPlot

  // Grupos: un día y un tipo (realizado / previsto). El saldo tras el grupo es
  // el saldoDespues de su último evento (ya calculado por el motor).
  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const e of eventos) {
      const tipo = e.estado === 'realizado' ? 'real' : 'prev'
      const k = `${e.dia}-${tipo}`
      if (!mapa.has(k)) mapa.set(k, { clave: k, dia: e.dia, tipo, eventos: [] })
      mapa.get(k).eventos.push(e)
    }
    return [...mapa.values()].map((g) => {
      const total = g.eventos.reduce((s, e) => s + Math.round(e.delta * 100), 0) / 100
      const principal = [...g.eventos].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.importe - a.importe)[0]
      return { ...g, total, principal, antes: g.eventos[0].saldoAntes, despues: g.eventos[g.eventos.length - 1].saldoDespues }
    })
  }, [eventos])

  const rango = Math.max(1, hi - lo)
  const umbral = Math.max(15, rango * 0.04)
  // Marcador: todo lo previsto y lo realizado que mueve el saldo de verdad.
  const marcados = grupos.filter((g) => g.tipo === 'prev' || g.eventos.some((e) => Math.abs(e.delta) >= umbral))

  // Trazos (escalones: el saldo cambia el día del movimiento).
  const trazo = (inicio, gs, finX) => {
    let d = `M${inicio[0].toFixed(1)} ${y(inicio[1]).toFixed(1)}`
    for (const g of gs) d += ` H${x(g.dia).toFixed(1)} V${y(g.despues).toFixed(1)}`
    return `${d} H${finX.toFixed(1)}`
  }
  const reales = grupos.filter((g) => g.tipo === 'real')
  const previstos = grupos.filter((g) => g.tipo === 'prev')
  const finReal = tramo === 'pasado' ? xFin : tramo === 'actual' ? x(diaHoy) : null
  const union = tramo === 'actual' ? [x(diaHoy), flujo.saldoHoy] : tramo === 'futuro' ? [xIni, flujo.saldoInicial] : null
  const lineaReal = finReal != null ? trazo([xIni, flujo.saldoInicial], reales, finReal) : null
  const lineaPrev = union ? trazo(union, previstos, xFin) : null

  // Etiquetas externas: ingresos arriba, gastos abajo; sin solapes.
  const etiquetas = useMemo(() => {
    const texto = (g) => `${recorta(g.principal.nombre, estrecho ? 11 : 16)}${g.eventos.length > 1 ? ` +${g.eventos.length - 1}` : ''}`
    const items = marcados.map((g) => {
      const t = texto(g)
      const imp = corto(g.total)
      return { id: g.clave, x: x(g.dia), ancho: Math.max(t.length, imp.length) * 6.3 + 10, prioridad: Math.abs(g.total) * (g.tipo === 'prev' ? 1.25 : 1), arriba: g.total > 0, texto: t, imp, g }
    })
    const colocar = (lista) => {
      const puestas = colocarEtiquetas(lista, { min: M.izq - 30, max: w - 2, separacion: 6, maxDesplazamiento: estrecho ? 40 : 60 })
      return puestas.map((p) => ({ ...lista.find((i) => i.id === p.id), lx: p.x }))
    }
    return [...colocar(items.filter((i) => i.arriba)), ...colocar(items.filter((i) => !i.arriba))]
  }, [marcados.map((g) => g.clave + g.total).join('|'), w, flujo.clave]) // eslint-disable-line react-hooks/exhaustive-deps

  const diasEje = [1, 5, 10, 15, 20, 25, dias].filter((d, i, a) => a.indexOf(d) === i && (d === dias || dias - d >= 3) && (diaHoy == null || Math.abs(d - diaHoy) >= (estrecho ? 3 : 2)))
  const grupoSel = grupos.find((g) => g.clave === sel) ?? null
  const elegirDia = (dia, tipo) => {
    const candidatos = grupos.filter((g) => g.dia === dia && (!tipo || g.tipo === tipo))
    const g = candidatos.find((c) => c.tipo === 'prev') ?? candidatos[0]
    setSel(g ? (sel === g.clave ? null : g.clave) : null)
  }
  function tocarFondo(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const dia = Math.max(1, Math.min(dias, Math.floor(((px - M.izq) / ancho) * dias) + 1))
    // El día con movimientos más cercano (±1).
    for (const d of [dia, dia - 1, dia + 1]) if (grupos.some((g) => g.dia === d)) return elegirDia(d)
    setSel(null)
  }

  const yRailArriba = 12
  const yRailAbajo = h - M.abajo + 18
  const ficha = grupoSel && (
    <div
      className={`v5-saldo-ficha ${estrecho ? 'estatica' : ''}`}
      style={estrecho ? undefined : { left: Math.min(Math.max(x(grupoSel.dia) - 150, 0), Math.max(0, w - 300)), top: y(grupoSel.despues) > h / 2 ? undefined : y(grupoSel.despues) + 14, bottom: y(grupoSel.despues) > h / 2 ? h - y(grupoSel.despues) + 14 : undefined }}
      role="dialog"
      aria-label={`Movimientos del ${formatearFecha(grupoSel.eventos[0].fecha)}`}
    >
      <div className="v5-saldo-ficha-cab">
        <span>{formatearFecha(grupoSel.eventos[0].fecha)} · {grupoSel.tipo === 'prev' ? 'previsto' : 'realizado'}</span>
        <button type="button" className="v5-boton fantasma icono-solo" onClick={() => setSel(null)} aria-label="Cerrar">×</button>
      </div>
      <ul>
        {grupoSel.eventos.map((e) => (
          <li key={e.id} className={e.estado !== 'realizado' ? 'previsto' : ''}>
            <div className="v5-saldo-ficha-fila">
              <b>{e.nombre}</b>
              <b className={`num ${e.delta > 0 ? 'v5-positivo' : ''}`}>{firma(e.tipo === 'ingreso' ? e.importe : -e.importe)}</b>
            </div>
            <small className="v5-tenue">
              {TEXTO_CLASE[e.clase]} · {ESTADO[e.estado]}
              {e.estado === 'por-confirmar' && e.fechaPrevista ? ` (tocaba el ${formatearFecha(e.fechaPrevista)})` : ''}
              {e.aproximado ? ' · importe aproximado' : ''}
            </small>
            <small className="num v5-saldo-ficha-saldo">
              Saldo {formatearEuros(e.saldoAntes)} → <b>{formatearEuros(e.saldoDespues)}</b>
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

  return (
    <figure className="v5-graf v5-saldo" ref={ref} aria-label="Evolución del saldo del mes">
      <svg width={w} height={h} role="img" aria-label="Saldo real y previsto del mes">
        <rect x={M.izq} y={M.arriba} width={ancho} height={altoPlot} fill="transparent" onClick={tocarFondo} style={{ cursor: 'pointer' }} />
        {marcas.map((m) => (
          <g key={m} pointerEvents="none">
            <line x1={M.izq} x2={xFin} y1={y(m)} y2={y(m)} className={m === 0 ? 'v5-graf-cero' : 'v5-graf-rejilla'} />
            <text x={M.izq - 10} y={y(m)} className="v5-graf-eje" textAnchor="end" dominantBaseline="middle">
              {ejeTexto(m)}
            </text>
          </g>
        ))}
        {diasEje.map((d) => (
          <text key={d} x={x(d)} y={h - 6} className="v5-graf-eje" textAnchor="middle" pointerEvents="none">
            {d}
          </text>
        ))}
        {diaHoy && (
          <g pointerEvents="none">
            <line x1={x(diaHoy)} x2={x(diaHoy)} y1={M.arriba} y2={M.arriba + altoPlot} className="v5-graf-guia" />
            <text x={x(diaHoy)} y={h - 6} className="v5-graf-eje fuerte" textAnchor="middle">
              Hoy
            </text>
          </g>
        )}
        {lineaPrev && <path d={lineaPrev} className="v5-saldo-prev" pointerEvents="none" />}
        {lineaReal && <path d={lineaReal} className="v5-saldo-real" pointerEvents="none" />}

        {/* Guías de las etiquetas (debajo de los marcadores). */}
        {etiquetas.map((t) => {
          const my = y(t.g.despues)
          const ry = t.arriba ? yRailArriba + 9 : yRailAbajo - 12
          return <path key={`l-${t.id}`} d={`M${x(t.g.dia).toFixed(1)} ${my.toFixed(1)} L${x(t.g.dia).toFixed(1)} ${(t.arriba ? Math.min(my - 6, M.arriba - 2) : Math.max(my + 6, M.arriba + altoPlot + 2)).toFixed(1)} L${t.lx.toFixed(1)} ${ry.toFixed(1)}`} className="v5-saldo-guia" pointerEvents="none" />
        })}
        {etiquetas.map((t) => (
          <g key={`t-${t.id}`} className={`v5-saldo-etq ${t.g.tipo === 'prev' ? 'previsto' : ''}`} onClick={() => setSel(sel === t.id ? null : t.id)} style={{ cursor: 'pointer' }}>
            <text x={t.lx} y={t.arriba ? yRailArriba : yRailAbajo} textAnchor="middle">
              {t.texto}
            </text>
            <text x={t.lx} y={(t.arriba ? yRailArriba : yRailAbajo) + 12} textAnchor="middle" className="num v5-saldo-etq-imp">
              {t.imp}
            </text>
          </g>
        ))}

        {marcados.map((g) => {
          const cx = x(g.dia)
          const cy = y(g.despues)
          const color = colorDe(g.principal)
          return (
            <g
              key={g.clave}
              className={`v5-saldo-punto ${g.tipo === 'prev' ? 'previsto' : ''} ${sel === g.clave ? 'sel' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${g.principal.nombre}${g.eventos.length > 1 ? ` y ${g.eventos.length - 1} más` : ''}, ${formatearFecha(g.eventos[0].fecha)}, ${g.tipo === 'prev' ? 'previsto' : 'realizado'}`}
              onClick={() => setSel(sel === g.clave ? null : g.clave)}
              onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), setSel(sel === g.clave ? null : g.clave))}
            >
              <circle cx={cx} cy={cy} r="11" fill="transparent" />
              <circle cx={cx} cy={cy} r={sel === g.clave ? 6 : 4.5} fill={g.tipo === 'prev' ? 'var(--card-bg)' : color} stroke={color} strokeWidth={g.tipo === 'prev' ? 2 : 2.5} />
            </g>
          )
        })}
        {union && tramo === 'actual' && <circle cx={union[0]} cy={y(union[1])} r="5" fill="var(--accent)" stroke="var(--card-bg)" strokeWidth="2.5" pointerEvents="none" />}
      </svg>
      {ficha}
      <TablaDatos
        titulo="Movimientos del mes y saldo"
        cabecera={['Fecha', 'Movimiento', 'Estado', 'Importe', 'Saldo después']}
        filas={eventos.map((e) => [formatearFecha(e.fecha), e.nombre, ESTADO[e.estado], firma(e.tipo === 'ingreso' ? e.importe : -e.importe), formatearEuros(e.saldoDespues)])}
      />
    </figure>
  )
}
