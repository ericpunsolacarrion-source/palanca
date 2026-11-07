import { useEffect, useMemo, useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import { costeAnual, fechaCobroEnMes, tocaEnMes } from '../../lib/periodicidad'
import { TEXTO_ESTADO, estadoEnMes } from '../../lib/calendarioBase'
import { etiquetaMes } from '../../lib/movimientosUtils'
import Icono from '../Icono'
import Avatar from './Avatar'
import GraficoSaldo from './GraficoSaldo'
import { TEXTO_CLASE, flujoDelMes } from '../../lib/flujoCaja'

// CALENDARIO DE BASE (v5): cuánto está comprometido este mes y, con dos vistas
// sobre los MISMOS datos (flujoDelMes, lib/flujoCaja.js):
//  - Gráfico: saldo real (continua) y previsto (discontinua) con marcadores;
//  - Calendario: cada movimiento real o previsto en su día.
// Usa SOLO las reglas del motor (bolsas) y de periodicidad.js: no crea ni borra
// nada. Tocar un compromiso abre su ficha, donde se confirma o se deshace como
// siempre (1:1, sin duplicados).
const ESTADO_EV = { realizado: { texto: 'Realizado', clase: 'bien' }, previsto: { texto: 'Previsto', clase: '' }, 'por-confirmar': { texto: 'Por confirmar', clase: 'aviso' } }
const firma = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatearEuros(Math.abs(v))}`
const LS_VISTA = 'palanca_base_vista'
function leerVista() {
  try {
    return localStorage.getItem(LS_VISTA) === 'calendario' ? 'calendario' : 'grafico'
  } catch {
    return 'grafico'
  }
}

const pad = (n) => String(n).padStart(2, '0')
const claveDe = (y, m) => `${y}-${pad(m)}`
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarioBase({ items, movimientos = [], onAbrir }) {
  const hoy = new Date()
  const claveHoy = claveDe(hoy.getFullYear(), hoy.getMonth() + 1)
  const [desfase, setDesfase] = useState(0)
  const ref = new Date(hoy.getFullYear(), hoy.getMonth() + desfase, 1)
  const y = ref.getFullYear()
  const m = ref.getMonth() + 1
  const clave = claveDe(y, m)
  const [diaSel, setDiaSel] = useState(null)
  const [vista, setVista] = useState(leerVista)
  useEffect(() => {
    try {
      localStorage.setItem(LS_VISTA, vista)
    } catch {
      /* preferencia de este dispositivo: si no se puede guardar, no pasa nada */
    }
  }, [vista])
  // Fuente única de las dos vistas.
  const flujo = useMemo(() => flujoDelMes({ movimientos, recurrentes: items, clave, hoy }), [movimientos, items, clave]) // eslint-disable-line react-hooks/exhaustive-deps
  const eventosDia = useMemo(() => {
    const m = new Map()
    for (const e of flujo.eventos) {
      if (!m.has(e.dia)) m.set(e.dia, [])
      m.get(e.dia).push(e)
    }
    return m
  }, [flujo])

  const sinDia = items.filter((r) => r.activo && tocaEnMes(r, clave) && !fechaCobroEnMes(r, clave))

  const cent = (v) => Math.round(v * 100)
  // Totales con TODO lo que toca este mes, tenga día o no (igual que las
  // cifras de arriba de Base): lo que no tiene día se avisa debajo.
  const gastos = items
    .filter((r) => r.activo && r.tipo === 'gasto' && tocaEnMes(r, clave))
    .map((rec) => ({ rec, importe: Number(rec.importe) || 0, estado: estadoEnMes(rec, clave, claveHoy, hoy) }))
  const total = gastos.reduce((s, c) => s + cent(c.importe), 0) / 100
  const pagado = gastos.filter((c) => c.estado === 'pagado').reduce((s, c) => s + cent(c.importe), 0) / 100
  const diasMes = new Date(y, m, 0).getDate()
  const hueco = (new Date(y, m - 1, 1).getDay() + 6) % 7 // lunes = 0
  const celdas = [...Array(hueco).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)]
  while (celdas.length % 7) celdas.push(null)
  const esMesHoy = clave === claveHoy
  const seleccion = diaSel != null ? eventosDia.get(diaSel) ?? [] : null

  // Frase del gráfico: qué queda por pagar (sin repetir importes de la lista).
  const pendientes = flujo.eventos.filter((e) => e.estado !== 'realizado' && e.origen === 'compromiso' && e.tipo === 'gasto').length
  const nombreMesTxt = etiquetaMes(clave, { month: 'long' }).toLowerCase()
  const titular =
    flujo.tramo === 'pasado'
      ? `Así se movió tu dinero en ${nombreMesTxt}.`
      : flujo.tramo === 'futuro'
        ? pendientes ? `En ${nombreMesTxt} te esperan ${pendientes} ${pendientes === 1 ? 'cobro' : 'cobros'}.` : `Sin cobros previstos en ${nombreMesTxt}.`
        : pendientes ? `Aún ${pendientes === 1 ? 'falta 1 cobro' : `faltan ${pendientes} cobros`} este mes.` : 'Este mes ya está todo pagado.'

  const selectorVista = (
    <div className="v5-seg" role="tablist" aria-label="Vista">
      {[['grafico', 'Gráfico'], ['calendario', 'Calendario']].map(([k, t]) => (
        <button key={k} type="button" role="tab" aria-selected={vista === k} className={vista === k ? 'activo' : ''} onClick={() => { setVista(k); setDiaSel(null) }}>
          {t}
        </button>
      ))}
    </div>
  )

  return (
    <section className="v5-tarjeta v5-cal" aria-label="Saldo y cobros del mes">
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

      {vista === 'grafico' ? (
        <>
          <div className="v5-saldo-leyenda">
            <div className="v5-cal-barra">{selectorVista}</div>
            <ul className="v5-leyenda">
              <li><i className="linea" aria-hidden="true" />Hasta hoy</li>
              {flujo.finPrevisto && <li><i className="linea discontinua" aria-hidden="true" />Previsto</li>}
            </ul>
          </div>
          <p className="v5-saldo-titular">{titular}</p>
          <GraficoSaldo flujo={flujo} onAbrirCompromiso={onAbrir} />
        </>
      ) : (
        <>
          <div className="v5-saldo-leyenda">
            <div className="v5-cal-barra">
              {selectorVista}
            </div>
          </div>
          <div className="v5-cal-rejilla" role="grid" aria-label={`Movimientos de ${etiquetaMes(clave)}`}>
            {DIAS.map((d) => (
              <span key={d} className="v5-cal-dsem" role="columnheader">
                {d}
              </span>
            ))}
            {celdas.map((dia, i) => {
              if (dia == null) return <span key={`h${i}`} className="v5-cal-vacio" aria-hidden="true" />
              const del = eventosDia.get(dia) ?? []
              const neto = del.reduce((s, e) => s + Math.round(e.delta * 100), 0) / 100
              const esHoy = esMesHoy && dia === hoy.getDate()
              const atencion = del.some((e) => e.estado === 'por-confirmar')
              const soloPrevisto = del.length > 0 && del.every((e) => e.estado !== 'realizado')
              const logos = [...del].sort((a, b) => (a.estado === 'realizado') - (b.estado === 'realizado') || Math.abs(b.delta) - Math.abs(a.delta) || b.importe - a.importe)
              const nombres = del.map((e) => `${e.nombre} ${firma(e.tipo === 'ingreso' ? e.importe : -e.importe)} (${ESTADO_EV[e.estado].texto})`).join(', ')
              return (
                <button
                  key={dia}
                  type="button"
                  role="gridcell"
                  className={`v5-cal-dia ${esHoy ? 'hoy' : ''} ${del.length ? 'con-cobros' : ''} ${soloPrevisto ? 'previsto' : ''} ${diaSel === dia ? 'sel' : ''} ${atencion ? 'atencion' : ''}`}
                  onClick={() => setDiaSel(diaSel === dia ? null : dia)}
                  aria-label={`${dia} de ${etiquetaMes(clave, { month: 'long' }).toLowerCase()}${del.length ? `: ${nombres}` : ', sin movimientos'}`}
                  aria-pressed={diaSel === dia}
                >
                  <span className="v5-cal-num">{dia}</span>
                  {del.length > 0 && (
                    <span className="v5-cal-logos">
                      {logos.slice(0, 3).map((e) => (
                        <span key={e.id} className={`v5-cal-logo ${e.estado !== 'realizado' ? 'previsto' : ''}`}>
                          <Avatar nombre={e.nombre} tam={22} />
                        </span>
                      ))}
                      {del.length > 3 && <span className="v5-cal-mas">+{del.length - 3}</span>}
                    </span>
                  )}
                  {neto !== 0 && <span className={`v5-cal-importe num ${neto > 0 ? 'v5-positivo' : ''}`}>{neto > 0 ? '+' : '−'}{formatearEuros(Math.round(Math.abs(neto)))}</span>}
                </button>
              )
            })}
          </div>
          <ul className="v5-leyenda v5-cal-leyenda">
            <li><span className="v5-cal-muestra" aria-hidden="true" />Realizado</li>
            <li><span className="v5-cal-muestra previsto" aria-hidden="true" />Previsto</li>
          </ul>
        </>
      )}

      {vista === 'calendario' && seleccion && (
        <div className="v5-cal-detalle">
          <h3>
            {diaSel} de {etiquetaMes(clave, { month: 'long' }).toLowerCase()}
          </h3>
          {seleccion.length === 0 ? (
            <p className="v5-tenue">Ese día no hay movimientos.</p>
          ) : (
            <ul className="v5-lista">
              {seleccion.map((e) => {
                const contenido = (
                  <>
                    <Avatar nombre={e.nombre} tam={34} />
                    <span className="v5-fila-texto">
                      <b>{e.nombre}</b>
                      <small>
                        {TEXTO_CLASE[e.clase]}
                        {e.aproximado ? ' · importe aproximado' : ''} · saldo {formatearEuros(e.saldoAntes)} → {formatearEuros(e.saldoDespues)}
                      </small>
                    </span>
                    <span className="v5-fila-dcha">
                      <b className={`num ${e.delta > 0 ? 'v5-positivo' : ''}`}>{firma(e.tipo === 'ingreso' ? e.importe : -e.importe)}</b>
                      <span className={`v5-insignia ${ESTADO_EV[e.estado].clase}`}>{ESTADO_EV[e.estado].texto}</span>
                    </span>
                  </>
                )
                return (
                  <li key={e.id} className={e.estado !== 'realizado' ? 'previsto' : ''}>
                    {e.rec ? (
                      <button type="button" className="v5-fila v5-fila-boton" onClick={() => onAbrir(e.rec)}>
                        {contenido}
                      </button>
                    ) : (
                      <div className="v5-fila">{contenido}</div>
                    )}
                  </li>
                )
              })}
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
