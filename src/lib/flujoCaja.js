// ── FLUJO DE CAJA DEL MES (Base: vista Gráfico y vista Calendario) ──────────
// Una sola fuente de datos para las dos vistas. Sin reglas propias:
//  - Saldo = liquidez de bolsas() (motor): mismo número que «Liquidez» en
//    Inicio/Patrimonio. Antes y después de cada movimiento real se calcula con
//    bolsas() sobre el histórico hasta ese movimiento (no se suma a mano).
//  - Previsto = compromisos de Base (periodicidad.js: tocaEnMes,
//    fechaCobroEnMes; calendarioBase.js: estadoEnMes) que aún no están pagados,
//    en SU fecha, y los movimientos ya apuntados con fecha futura. Su efecto en
//    el saldo también lo da bolsas() (un traspaso a ahorro no baja la liquidez;
//    una aportación a inversión sí). Nada se guarda ni se inventa.
// Rango: el mes NATURAL (vista Calendario) o, con `periodo: true`, el PERIODO
// financiero del usuario (vista Gráfico: si cobra el 28, del 28 al 27; con
// día de inicio 1 es exactamente el mes natural). `dia` = posición del día
// dentro del rango (1…); `diaMes` = el día real del calendario.
import { esAjuste, esDevolucion, esInversion, esTraspaso } from './categorias'
import { estadoEnMes } from './calendarioBase'
import { conceptoDe } from './inicio'
import { bolsas, centimosDe, esConsumo } from './movimientosUtils'
import { esDelFijo } from './conciliarFijos'
import { fechaCobroEnMes, tocaEnMes } from './periodicidad'
import { diaEnPeriodo, diasDelPeriodo, isoDe, mesNatural, periodoActual, periodoDe, rangoPeriodo, sumarMeses } from './periodo'

const pad = (n) => String(n).padStart(2, '0')
const diasDe = (clave) => {
  const [y, m] = clave.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
const diaAntes = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDe(new Date(y, m - 1, d - 1))
}
const cent = (euros) => Math.round(euros * 100)
const liquidezCent = (movs, hasta = null) => cent(bolsas(movs, hasta).bolsaLiquidez)

// Orden estable dentro de un día: por momento de registro y luego por id.
const orden = (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')) || String(a.id).localeCompare(String(b.id)))

export function clase(m) {
  if (esAjuste(m)) return 'ajuste'
  if (esTraspaso(m)) return 'traspaso'
  if (esInversion(m)) return m.tipo === 'ingreso' ? 'retirada' : 'inversion'
  if (esDevolucion(m)) return 'devolucion'
  return m.tipo === 'ingreso' ? 'ingreso' : 'gasto'
}
export const TEXTO_CLASE = { ajuste: 'Ajuste de saldo', traspaso: 'Traspaso a ahorro', inversion: 'Inversión', retirada: 'Retirada de inversión', devolucion: 'Devolución', ingreso: 'Ingreso', gasto: 'Gasto' }

/**
 * @returns {
 *   clave, desde, hasta, hoyIso, dias, tramo: 'pasado'|'actual'|'futuro',
 *   saldoInicial, saldoHoy|null, saldoFinal, finPrevisto: bool,
 *   eventos: [{ id, fecha, dia, nombre, importe, delta, clase, tipo, estado:
 *     'realizado'|'previsto'|'por-confirmar', origen: 'movimiento'|'compromiso',
 *     aproximado, saldoAntes, saldoDespues, rec?, mov? }],
 *   sinDia: [rec]
 * }  (importes en euros, exactos al céntimo; delta = efecto en la liquidez)
 */
export function flujoDelMes({ movimientos = [], recurrentes = [], clave, hoy = new Date(), periodo = false }) {
  const hoyIso = isoDe(hoy)
  const mesHoy = hoyIso.slice(0, 7)
  const desde = periodo ? rangoPeriodo(clave).desde : `${clave}-01`
  const dias = periodo ? diasDelPeriodo(clave) : diasDe(clave)
  const hasta = periodo ? rangoPeriodo(clave).hasta : `${clave}-${pad(dias)}`
  const claveHoy = periodo ? periodoActual(hoy) : mesHoy
  const tramo = clave < claveHoy ? 'pasado' : clave > claveHoy ? 'futuro' : 'actual'
  const diaDe = (f) => (periodo ? diaEnPeriodo(f) : Number(f.slice(8, 10)))
  const eventos = []

  // 1) Real: movimientos con fecha en el mes y no posterior a hoy.
  const corteReal = tramo === 'pasado' ? hasta : hoyIso
  const previos = movimientos.filter((m) => m.fecha < desde)
  const reales = tramo === 'futuro' ? [] : movimientos.filter((m) => m.fecha >= desde && m.fecha <= corteReal).sort(orden)
  let saldo = liquidezCent(movimientos, diaAntes(desde))
  const saldoInicialReal = saldo
  const acumulados = [...previos]
  for (const m of reales) {
    acumulados.push(m)
    const despues = liquidezCent(acumulados)
    eventos.push({ id: `m-${m.id}`, fecha: m.fecha, dia: diaDe(m.fecha), diaMes: Number(m.fecha.slice(8, 10)), nombre: conceptoDe(m), importe: Number(m.importe), delta: (despues - saldo) / 100, clase: clase(m), tipo: m.tipo, estado: 'realizado', origen: 'movimiento', aproximado: false, saldoAntes: saldo / 100, saldoDespues: despues / 100, mov: m })
    saldo = despues
  }
  if (tramo === 'pasado') {
    return { clave, desde, hasta, hoyIso, dias, diaHoy: null, tramo, saldoInicial: saldoInicialReal / 100, saldoHoy: null, saldoFinal: saldo / 100, finPrevisto: false, eventos, sinDia: [] }
  }

  // 2) Previsto: desde hoy hasta el fin del mes elegido (encadenando los meses
  //    intermedios si se mira un mes futuro). Parte del saldo real de HOY.
  const saldoHoy = liquidezCent(movimientos, hoyIso)
  const previstos = []
  // Movimientos ya apuntados con fecha futura (programados): son previsión.
  for (const m of movimientos) if (m.fecha > hoyIso && m.fecha <= hasta) previstos.push({ fecha: m.fecha, mov: m, efecto: liquidezCent([m]), nombre: conceptoDe(m), importe: Number(m.importe), clase: clase(m), tipo: m.tipo, estado: 'previsto', origen: 'movimiento', aproximado: false, id: `f-${m.id}` })
  const sinDia = []
  // Los fijos son calendario: se recorren los meses NATURALES desde hoy hasta
  // el último que toca el rango, y se queda lo que cae dentro (fecha ≤ hasta).
  const mesIniRango = mesNatural(desde)
  for (let k = mesHoy; k <= mesNatural(hasta); k = sumarMeses(k, 1)) {
    for (const rec of recurrentes) {
      if (!rec.activo || !tocaEnMes(rec, k)) continue
      const fecha = fechaCobroEnMes(rec, k)
      if (!fecha) {
        if (k >= mesIniRango && !sinDia.includes(rec)) sinDia.push(rec)
        continue
      }
      if (fecha > hasta) continue
      const estado = estadoEnMes(rec, k, mesHoy, hoy)
      if (estado === 'pagado') continue // ya es un movimiento real
      // Cobro de este mes que ya tocaba y no está confirmado: pendiente, hoy.
      const porConfirmar = estado === 'confirmar'
      const sintetico = { tipo: rec.tipo, importe: rec.importe, categoria: { nombre: rec.categoriaNombre ?? null } }
      previstos.push({ fecha: porConfirmar ? hoyIso : fecha, fechaPrevista: fecha, rec, efecto: liquidezCent([sintetico]), nombre: rec.nombre, importe: Number(rec.importe) || 0, clase: clase(sintetico), tipo: rec.tipo, estado: porConfirmar ? 'por-confirmar' : 'previsto', origen: 'compromiso', aproximado: Boolean(rec.confirmar), id: `c-${rec.id}-${k}` })
    }
  }
  // Mismo día: primero lo que sale (prudente), luego lo que entra.
  previstos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.efecto - b.efecto || a.nombre.localeCompare(b.nombre)))
  saldo = saldoHoy
  let saldoInicial = tramo === 'futuro' ? null : saldoInicialReal
  for (const p of previstos) {
    if (tramo === 'futuro' && saldoInicial == null && p.fecha >= desde) saldoInicial = saldo
    const antes = saldo
    saldo += p.efecto
    if (p.fecha < desde) continue // meses intermedios: solo encadenan el saldo
    const { efecto, ...resto } = p
    eventos.push({ ...resto, dia: diaDe(p.fecha), diaMes: Number(p.fecha.slice(8, 10)), delta: efecto / 100, saldoAntes: antes / 100, saldoDespues: saldo / 100 })
  }
  if (saldoInicial == null) saldoInicial = saldo
  return { clave, desde, hasta, hoyIso, dias, diaHoy: tramo === 'actual' ? diaDe(hoyIso) : null, tramo, saldoInicial: saldoInicial / 100, saldoHoy: tramo === 'actual' ? saldoHoy / 100 : null, saldoFinal: saldo / 100, finPrevisto: true, eventos, sinDia }
}

// ── Ritmo variable habitual (opcional en el gráfico) ────────────────────────
// Lo que sueles gastar AL DÍA en lo que no es fijo: consumo (esConsumo, neto
// de devoluciones con centimosDe) de los 3 periodos completos anteriores con
// datos, quitando los movimientos que son de algún compromiso de Base
// (esDelFijo, la misma regla que concilia los fijos). Así no se cuenta dos
// veces lo que ya está en la previsión. null si hay menos de 2 periodos.
export function ritmoVariableDiario(movimientos = [], recurrentes = [], hoy = new Date()) {
  const actual = periodoActual(hoy)
  const fijos = recurrentes.filter((r) => r.activo !== false && r.tipo === 'gasto')
  const usados = []
  for (let k = 1; k <= 12 && usados.length < 3; k++) {
    const c = sumarMeses(actual, -k)
    const del = movimientos.filter((m) => periodoDe(m.fecha) === c)
    if (!del.some((m) => esConsumo(m))) continue
    let cent = 0
    for (const m of del) {
      if (fijos.some((r) => esDelFijo(r, m))) continue
      if (esConsumo(m)) cent += centimosDe(m)
      else if (esDevolucion(m)) cent -= centimosDe(m)
    }
    usados.push({ clave: c, cent: Math.max(0, cent), dias: diasDelPeriodo(c) })
  }
  if (usados.length < 2) return null
  const dias = usados.reduce((s, u) => s + u.dias, 0)
  return { diario: Math.round(usados.reduce((s, u) => s + u.cent, 0) / dias) / 100, periodos: usados.length }
}
