import { useMemo, useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import { costeAnual, fechaCobroEnMes, tocaEnMes } from '../../lib/periodicidad'
import { TEXTO_ESTADO, estadoEnMes } from '../../lib/calendarioBase'
import { etiquetaMes } from '../../lib/movimientosUtils'
import Icono from '../Icono'
import Avatar from './Avatar'

// CALENDARIO DE BASE (v5): qué días se cobra cada compromiso y cuánto está
// comprometido. Usa SOLO las reglas de periodicidad.js (qué meses toca, qué
// día, si está confirmado): no crea ni borra nada. Tocar un cobro abre su
// ficha, donde se confirma o se deshace como siempre (1:1, sin duplicados).

const pad = (n) => String(n).padStart(2, '0')
const claveDe = (y, m) => `${y}-${pad(m)}`
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarioBase({ items, onAbrir }) {
  const hoy = new Date()
  const claveHoy = claveDe(hoy.getFullYear(), hoy.getMonth() + 1)
  const [desfase, setDesfase] = useState(0)
  const ref = new Date(hoy.getFullYear(), hoy.getMonth() + desfase, 1)
  const y = ref.getFullYear()
  const m = ref.getMonth() + 1
  const clave = claveDe(y, m)
  const [diaSel, setDiaSel] = useState(null)

  const cobros = useMemo(() => {
    const lista = []
    for (const rec of items) {
      if (!rec.activo || !tocaEnMes(rec, clave)) continue
      const fecha = fechaCobroEnMes(rec, clave)
      if (!fecha) continue
      lista.push({ rec, dia: Number(fecha.slice(8, 10)), importe: Number(rec.importe) || 0, estado: estadoEnMes(rec, clave, claveHoy, hoy) })
    }
    return lista.sort((a, b) => a.dia - b.dia || b.importe - a.importe)
  }, [items, clave]) // eslint-disable-line react-hooks/exhaustive-deps
  const sinDia = items.filter((r) => r.activo && tocaEnMes(r, clave) && !fechaCobroEnMes(r, clave))

  const cent = (v) => Math.round(v * 100)
  // Totales con TODO lo que toca este mes, tenga día o no (igual que las
  // cifras de arriba de Base): lo que no tiene día se avisa debajo.
  const gastos = items
    .filter((r) => r.activo && r.tipo === 'gasto' && tocaEnMes(r, clave))
    .map((rec) => ({ rec, importe: Number(rec.importe) || 0, estado: estadoEnMes(rec, clave, claveHoy, hoy) }))
  const total = gastos.reduce((s, c) => s + cent(c.importe), 0) / 100
  const pagado = gastos.filter((c) => c.estado === 'pagado').reduce((s, c) => s + cent(c.importe), 0) / 100
  const porDia = new Map()
  for (const c of cobros) {
    if (!porDia.has(c.dia)) porDia.set(c.dia, [])
    porDia.get(c.dia).push(c)
  }

  const diasMes = new Date(y, m, 0).getDate()
  const hueco = (new Date(y, m - 1, 1).getDay() + 6) % 7 // lunes = 0
  const celdas = [...Array(hueco).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)]
  while (celdas.length % 7) celdas.push(null)
  const esMesHoy = clave === claveHoy
  const seleccion = diaSel != null ? porDia.get(diaSel) ?? [] : null

  return (
    <section className="v5-tarjeta v5-cal" aria-label="Calendario de cobros">
      <header className="v5-tarjeta-cab">
        <div className="v5-cal-mes">
          <button type="button" className="v5-boton fantasma icono-solo" onClick={() => { setDesfase((d) => d - 1); setDiaSel(null) }} aria-label="Mes anterior">
            <Icono nombre="chevron" tam={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h2>{etiquetaMes(clave)}</h2>
          <button type="button" className="v5-boton fantasma icono-solo" onClick={() => { setDesfase((d) => d + 1); setDiaSel(null) }} aria-label="Mes siguiente">
            <Icono nombre="chevron" tam={16} />
          </button>
          {!esMesHoy && (
            <button type="button" className="v5-enlace" onClick={() => { setDesfase(0); setDiaSel(null) }}>
              Hoy
            </button>
          )}
        </div>
        <div className="v5-cal-totales">
          <span>
            <small className="v5-tenue">Comprometido</small>
            <b className="num">{formatearEuros(total)}</b>
          </span>
          {esMesHoy && total > 0 && (
            <span>
              <small className="v5-tenue">Pagado</small>
              <b className="num v5-positivo">{formatearEuros(pagado)}</b>
            </span>
          )}
          {esMesHoy && total > 0 && (
            <span>
              <small className="v5-tenue">Falta</small>
              <b className="num">{formatearEuros(Math.round((total - pagado) * 100) / 100)}</b>
            </span>
          )}
        </div>
      </header>

      {esMesHoy && total > 0 && (
        <div className="v5-cal-progreso" role="img" aria-label={`Pagado ${formatearEuros(pagado)} de ${formatearEuros(total)}`}>
          <span style={{ width: `${(pagado / total) * 100}%` }} />
        </div>
      )}

      <div className="v5-cal-rejilla" role="grid" aria-label={`Cobros de ${etiquetaMes(clave)}`}>
        {DIAS.map((d) => (
          <span key={d} className="v5-cal-dsem" role="columnheader">
            {d}
          </span>
        ))}
        {celdas.map((dia, i) => {
          if (dia == null) return <span key={`h${i}`} className="v5-cal-vacio" aria-hidden="true" />
          const del = porDia.get(dia) ?? []
          const gastoDia = del.filter((c) => c.rec.tipo === 'gasto').reduce((s, c) => s + cent(c.importe), 0) / 100
          const esHoy = esMesHoy && dia === hoy.getDate()
          const pendienteHoy = del.some((c) => c.estado === 'confirmar')
          const nombres = del.map((c) => `${c.rec.nombre} ${formatearEuros(c.importe)} (${TEXTO_ESTADO[c.estado].texto})`).join(', ')
          return (
            <button
              key={dia}
              type="button"
              role="gridcell"
              className={`v5-cal-dia ${esHoy ? 'hoy' : ''} ${del.length ? 'con-cobros' : ''} ${diaSel === dia ? 'sel' : ''} ${pendienteHoy ? 'atencion' : ''}`}
              onClick={() => setDiaSel(diaSel === dia ? null : dia)}
              aria-label={`${dia} de ${etiquetaMes(clave, { month: 'long' }).toLowerCase()}${del.length ? `: ${nombres}` : ', sin cobros'}`}
              aria-pressed={diaSel === dia}
            >
              <span className="v5-cal-num">{dia}</span>
              {del.length > 0 && (
                <span className="v5-cal-logos">
                  {del.slice(0, 3).map((c) => (
                    <span key={c.rec.id} className={`v5-cal-logo ${c.estado === 'pagado' ? 'pagado' : ''}`}>
                      <Avatar nombre={c.rec.nombre} tam={22} />
                    </span>
                  ))}
                  {del.length > 3 && <span className="v5-cal-mas">+{del.length - 3}</span>}
                </span>
              )}
              {gastoDia > 0 && <span className="v5-cal-importe num">{formatearEuros(Math.round(gastoDia))}</span>}
            </button>
          )
        })}
      </div>

      {seleccion && (
        <div className="v5-cal-detalle">
          <h3>
            {diaSel} de {etiquetaMes(clave, { month: 'long' }).toLowerCase()}
          </h3>
          {seleccion.length === 0 ? (
            <p className="v5-tenue">Ese día no se cobra nada.</p>
          ) : (
            <ul className="v5-lista">
              {seleccion.map((c) => (
                <li key={c.rec.id}>
                  <button type="button" className="v5-fila v5-fila-boton" onClick={() => onAbrir(c.rec)}>
                    <Avatar nombre={c.rec.nombre} tam={34} />
                    <span className="v5-fila-texto">
                      <b>{c.rec.nombre}</b>
                      <small>{c.rec.tipo === 'ingreso' ? 'Ingreso' : 'Cobro'} · toca para ver o confirmar</small>
                    </span>
                    <span className="v5-fila-dcha">
                      <b className={`num ${c.rec.tipo === 'ingreso' ? 'v5-positivo' : ''}`}>
                        {c.rec.tipo === 'ingreso' ? '+' : ''}
                        {formatearEuros(c.importe)}
                      </b>
                      <span className={`v5-insignia ${TEXTO_ESTADO[c.estado].clase}`}>{TEXTO_ESTADO[c.estado].texto}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sinDia.length > 0 && (
        <p className="v5-aviso-texto v5-pie-nota">
          {sinDia.length === 1 ? `${sinDia[0].nombre} toca este mes pero no tiene día de cobro.` : `${sinDia.length} compromisos tocan este mes sin día de cobro.`} Pónselo en su ficha para verlo aquí.
        </p>
      )}
    </section>
  )
}

// En qué se va tu año: el peso anual de cada compromiso (barra apilada).
export function RepartoAnual({ items }) {
  const filas = useMemo(
    () =>
      items
        .filter((r) => r.activo && r.tipo === 'gasto')
        .map((r) => ({ rec: r, anual: costeAnual(r) }))
        .filter((x) => x.anual > 0)
        .sort((a, b) => b.anual - a.anual),
    [items],
  )
  const total = filas.reduce((s, x) => s + x.anual, 0)
  if (filas.length < 2) return null
  const top = filas.slice(0, 6)
  const resto = filas.slice(6).reduce((s, x) => s + x.anual, 0)
  const colores = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)']
  return (
    <section className="v5-tarjeta v5-reparto-anual" aria-label="En qué se va tu año">
      <header className="v5-tarjeta-cab">
        <h2>En qué se va tu año</h2>
        <b className="num">{formatearEuros(Math.round(total))}</b>
      </header>
      <div className="v5-reparto grande" aria-hidden="true">
        {top.map((x, i) => (
          <span key={x.rec.id} style={{ flexGrow: x.anual, background: colores[i] }} />
        ))}
        {resto > 0 && <span style={{ flexGrow: resto, background: 'var(--cat-otros)' }} />}
      </div>
      <ul className="v5-reparto-lista">
        {top.map((x, i) => (
          <li key={x.rec.id}>
            <i style={{ background: colores[i] }} aria-hidden="true" />
            <span>{x.rec.nombre}</span>
            <b className="num">{formatearEuros(Math.round(x.anual))}</b>
            <small className="v5-tenue num">{Math.round((x.anual / total) * 100)} %</small>
          </li>
        ))}
        {resto > 0 && (
          <li>
            <i style={{ background: 'var(--cat-otros)' }} aria-hidden="true" />
            <span>Otros</span>
            <b className="num">{formatearEuros(Math.round(resto))}</b>
            <small className="v5-tenue num">{Math.round((resto / total) * 100)} %</small>
          </li>
        )}
      </ul>
    </section>
  )
}
