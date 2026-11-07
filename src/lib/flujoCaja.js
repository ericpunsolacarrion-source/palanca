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
// Mes NATURAL (como el calendario de cobros de Base y sus cifras).
import { esAjuste, esDevolucion, esInversion, esTraspaso } from './categorias'
import { estadoEnMes } from './calendarioBase'
import { conceptoDe } from './inicio'
import { bolsas } from './movimientosUtils'
import { fechaCobroEnMes, tocaEnMes } from './periodicidad'
import { isoDe, sumarMeses } from './periodo'

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
export function flujoDelMes({ movimientos = [], recurrentes = [], clave, hoy = new Date() }) {
  const hoyIso = isoDe(hoy)
  const mesHoy = hoyIso.slice(0, 7)
  const desde = `${clave}-01`
  const dias = diasDe(clave)
  const hasta = `${clave}-${pad(dias)}`
  const tramo = clave < mesHoy ? 'pasado' : clave > mesHoy ? 'futuro' : 'actual'
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
    eventos.push({ id: `m-${m.id}`, fecha: m.fecha, dia: Number(m.fecha.slice(8, 10)), nombre: conceptoDe(m), importe: Number(m.importe), delta: (despues - saldo) / 100, clase: clase(m), tipo: m.tipo, estado: 'realizado', origen: 'movimiento', aproximado: false, saldoAntes: saldo / 100, saldoDespues: despues / 100, mov: m })
    saldo = despues
  }
  if (tramo === 'pasado') {
    return { clave, desde, hasta, hoyIso, dias, tramo, saldoInicial: saldoInicialReal / 100, saldoHoy: null, saldoFinal: saldo / 100, finPrevisto: false, eventos, sinDia: [] }
  }

  // 2) Previsto: desde hoy hasta el fin del mes elegido (encadenando los meses
  //    intermedios si se mira un mes futuro). Parte del saldo real de HOY.
  const saldoHoy = liquidezCent(movimientos, hoyIso)
  const previstos = []
  // Movimientos ya apuntados con fecha futura (programados): son previsión.
  for (const m of movimientos) if (m.fecha > hoyIso && m.fecha <= hasta) previstos.push({ fecha: m.fecha, mov: m, efecto: liquidezCent([m]), nombre: conceptoDe(m), importe: Number(m.importe), clase: clase(m), tipo: m.tipo, estado: 'previsto', origen: 'movimiento', aproximado: false, id: `f-${m.id}` })
  const sinDia = []
  for (let k = mesHoy; k <= clave; k = sumarMeses(k, 1)) {
    for (const rec of recurrentes) {
      if (!rec.activo || !tocaEnMes(rec, k)) continue
      const fecha = fechaCobroEnMes(rec, k)
      if (!fecha) {
        if (k === clave) sinDia.push(rec)
        continue
      }
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
    eventos.push({ ...resto, dia: Number(p.fecha.slice(8, 10)), delta: efecto / 100, saldoAntes: antes / 100, saldoDespues: saldo / 100 })
  }
  if (saldoInicial == null) saldoInicial = saldo
  return { clave, desde, hasta, hoyIso, dias, tramo, saldoInicial: saldoInicial / 100, saldoHoy: tramo === 'actual' ? saldoHoy / 100 : null, saldoFinal: saldo / 100, finPrevisto: true, eventos, sinDia }
}
