// Datos del INICIO (pantalla de resumen). Lógica pura y testeable sobre las
// reglas únicas de movimientosUtils: patrimonio con `bolsas`, flujos del mes
// con `totalesDe`, consumo con `gastoPorCategoria`. Ningún cálculo a mano.

import { nombreComercio } from './comercios'
import { esAjuste, etiquetaCategoria } from './categorias'
import { bolsas, gastoPorCategoria, totalesDe } from './movimientosUtils'

const pad = (n) => String(n).padStart(2, '0')
const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const claveDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

/**
 * Patrimonio al cierre de cada uno de los últimos `n` meses (el último, a hoy).
 * Sirve para la línea del héroe y para "cuánto has ganado este mes".
 * @returns [{ mes: 'YYYY-MM', valor }] del más antiguo al actual.
 */
export function evolucionPatrimonio(movimientos, n = 6, hoy = new Date()) {
  const serie = []
  for (let k = n - 1; k >= 0; k -= 1) {
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() - k + 1, 0)
    const hasta = k === 0 ? isoDe(hoy) : isoDe(finMes)
    serie.push({ mes: claveDe(finMes), valor: bolsas(movimientos, hasta).patrimonio })
  }
  return serie
}

/**
 * Cambio del patrimonio en el mes en curso por lo que ha PASADO este mes: hoy
 * frente al cierre del mes anterior, sin contar los ajustes de saldo (el saldo
 * inicial o cuadrar con el banco son correcciones, no ganancias ni pérdidas).
 */
export function cambioPatrimonioMes(movimientos, hoy = new Date()) {
  const cierreAnterior = isoDe(new Date(hoy.getFullYear(), hoy.getMonth(), 0))
  const antes = bolsas(movimientos, cierreAnterior)
  const ahora = bolsas(movimientos, isoDe(hoy))
  const cambio = ahora.patrimonio - ahora.ajusteTotal - (antes.patrimonio - antes.ajusteTotal)
  return Math.round(cambio * 100) / 100
}

/**
 * Todo lo que el inicio cuenta del mes en curso, ya calculado.
 *  - totales (ingresos, gastos de consumo, invertido, ahorro, ratio)
 *  - en qué se va: top 3 categorías de consumo + "resto"
 *  - ritmo: gasto de consumo hasta hoy frente a lo habitual A ESTAS ALTURAS
 *    (media de lo gastado hasta el mismo día en los 3 meses previos con datos).
 */
export function resumenDelMes(movimientos, hoy = new Date()) {
  const clave = claveDe(hoy)
  const hoyIso = isoDe(hoy)
  const delMes = movimientos.filter((m) => m.fecha.slice(0, 7) === clave && m.fecha <= hoyIso)
  const totales = totalesDe(delMes)

  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const dia = hoy.getDate()

  // En qué se va (consumo): top 3 + resto, con su peso sobre el gasto.
  const porCat = [...gastoPorCategoria(delMes).entries()].sort((a, b) => b[1] - a[1])
  const total = porCat.reduce((s, [, v]) => s + v, 0)
  const top = porCat.slice(0, 3).map(([nombre, v]) => ({ nombre, total: v, pct: total > 0 ? (v / total) * 100 : 0 }))
  const resto = Math.round(porCat.slice(3).reduce((s, [, v]) => s + v, 0) * 100) / 100
  if (resto > 0) top.push({ nombre: 'Resto', total: resto, pct: total > 0 ? (resto / total) * 100 : 0, resto: true })

  // Ritmo frente a lo habitual: lo gastado HASTA EL MISMO DÍA en los meses
  // anteriores (no una media prorrateada: el alquiler o los recibos de
  // principio de mes harían parecer que "vas rapidísimo" el día 3).
  const previos = []
  for (let k = 1; k <= 6 && previos.length < 3; k += 1) {
    const ref = new Date(hoy.getFullYear(), hoy.getMonth() - k, 1)
    const c = claveDe(ref)
    const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
    const tope = `${c}-${pad(Math.min(dia, ultimoDia))}`
    const delMesPrevio = movimientos.filter((m) => m.fecha.slice(0, 7) === c)
    if (totalesDe(delMesPrevio).gastos <= 0) continue // mes sin datos: no cuenta
    previos.push(totalesDe(delMesPrevio.filter((m) => m.fecha <= tope)).gastos)
  }
  let ritmo = null
  if (previos.length > 0) {
    const habitual = previos.reduce((s, g) => s + g, 0) / previos.length
    if (habitual > 0) {
      const difPct = ((totales.gastos - habitual) / habitual) * 100
      ritmo = { habitual: Math.round(habitual * 100) / 100, difPct }
    }
  }

  // ¿Cuándo suele llegar su ingreso principal? (día del mayor ingreso de cada
  // uno de los 3 meses previos con ingresos; la mediana). Si cobra a final de
  // mes y aún no ha llegado, el mes no va "en negativo": solo va por delante.
  const dias = []
  for (let k = 1; k <= 6 && dias.length < 3; k += 1) {
    const c = claveDe(new Date(hoy.getFullYear(), hoy.getMonth() - k, 1))
    let mayor = null
    for (const m of movimientos) {
      if (m.tipo !== 'ingreso' || esAjuste(m) || m.fecha.slice(0, 7) !== c) continue
      if (!mayor || Number(m.importe) > Number(mayor.importe)) mayor = m
    }
    if (mayor) dias.push(Number(mayor.fecha.slice(8, 10)))
  }
  dias.sort((a, b) => a - b)
  const diaIngresoHabitual = dias.length ? dias[Math.floor(dias.length / 2)] : null
  const ingresoPendiente = totales.ingresos === 0 && diaIngresoHabitual != null && diaIngresoHabitual > dia

  return { clave, dia, diasMes, diasRestantes: diasMes - dia + 1, totales, categorias: top, ritmo, diaIngresoHabitual, ingresoPendiente }
}

/** "Hoy", "Ayer" o "12 oct" (con año si no es el actual). */
export function fechaRelativa(fechaIso, hoy = new Date()) {
  const [y, m, d] = fechaIso.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const dias = Math.round((base - f) / 86400000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  const opciones = { day: 'numeric', month: 'short' }
  if (y !== hoy.getFullYear()) opciones.year = 'numeric'
  return new Intl.DateTimeFormat('es-ES', opciones).format(f).replace('.', '')
}

/** Texto principal de un movimiento en listas: el comercio REAL (memoria del
 * usuario, marca o lo apuntado; ver lib/comercios.js), o si no, la categoría. */
export function conceptoDe(m) {
  const texto = nombreComercio(m)
  if (texto) return texto.length > 40 ? `${texto.slice(0, 38)}…` : texto
  if (esAjuste(m)) return 'Ajuste de saldo'
  return m.categoria?.nombre ? etiquetaCategoria(m.categoria.nombre) : m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'
}
