// Datos del INICIO (pantalla de resumen). Lógica pura y testeable sobre las
// reglas únicas de movimientosUtils: patrimonio con `bolsas`, flujos del mes
// con `totalesDe`, consumo con `gastoPorCategoria`. Ningún cálculo a mano.

import { nombreComercio } from './comercios'
import { esAjuste, etiquetaCategoria } from './categorias'
import { agregarPorMes, bolsas, gastoPorCategoria, totalesDe } from './movimientosUtils'
import { diaEnPeriodo, diasDelPeriodo, fechaEnPeriodo, isoDe, periodoDe, rangoPeriodo, sumarMeses } from './periodo'

// Día anterior a una fecha ISO.
const diaAntes = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDe(new Date(y, m - 1, d - 1))
}

/**
 * Patrimonio al cierre de cada uno de los últimos `n` meses (el último, a hoy).
 * Sirve para la línea del héroe y para "cuánto has ganado este mes".
 * @returns [{ mes: 'YYYY-MM', valor }] del más antiguo al actual.
 */
export function evolucionPatrimonio(movimientos, n = 6, hoy = new Date()) {
  // Cierre de cada periodo = su último día (con día de inicio 1, fin de mes).
  const actual = periodoDe(isoDe(hoy))
  const serie = []
  for (let k = n - 1; k >= 0; k -= 1) {
    const c = sumarMeses(actual, -k)
    const hasta = k === 0 ? isoDe(hoy) : rangoPeriodo(c).hasta
    serie.push({ mes: c, valor: bolsas(movimientos, hasta).patrimonio })
  }
  return serie
}

/**
 * Cambio del patrimonio en el mes en curso por lo que ha PASADO este mes: hoy
 * frente al cierre del mes anterior, sin contar los ajustes de saldo (el saldo
 * inicial o cuadrar con el banco son correcciones, no ganancias ni pérdidas).
 */
export function cambioPatrimonioMes(movimientos, hoy = new Date()) {
  const cierreAnterior = diaAntes(rangoPeriodo(periodoDe(isoDe(hoy))).desde)
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
  const hoyIso = isoDe(hoy)
  const clave = periodoDe(hoyIso)
  const delMes = movimientos.filter((m) => periodoDe(m.fecha) === clave && m.fecha <= hoyIso)
  const totales = totalesDe(delMes)

  // Día dentro del periodo (con día de inicio 1, el día del mes).
  const diasMes = diasDelPeriodo(clave)
  const dia = diaEnPeriodo(hoyIso)

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
    const c = sumarMeses(clave, -k)
    const tope = fechaEnPeriodo(c, dia)
    const delMesPrevio = movimientos.filter((m) => periodoDe(m.fecha) === c)
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
    const c = sumarMeses(clave, -k)
    let mayor = null
    for (const m of movimientos) {
      if (m.tipo !== 'ingreso' || esAjuste(m) || periodoDe(m.fecha) !== c) continue
      if (!mayor || Number(m.importe) > Number(mayor.importe)) mayor = m
    }
    // Se ordena por posición en el periodo; se muestra el día real del mes.
    if (mayor) dias.push({ indice: diaEnPeriodo(mayor.fecha), dia: Number(mayor.fecha.slice(8, 10)) })
  }
  dias.sort((a, b) => a.indice - b.indice)
  const habitual = dias.length ? dias[Math.floor(dias.length / 2)] : null
  const diaIngresoHabitual = habitual?.dia ?? null
  const ingresoPendiente = totales.ingresos === 0 && habitual != null && habitual.indice > dia

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

/**
 * BALANCE DE INICIO (v4). Qué mes se cuenta y contra qué se compara.
 *  - Días 1–3: se cierra el mes ANTERIOR («Octubre, cerrado»); el nuevo aún no
 *    dice nada y empezar de cero es el mejor momento para fijar una meta.
 *  - Del día 4 en adelante: el mes EN CURSO, comparado a estas alturas.
 * Cada cifra va contra la media de los meses anteriores con datos (hasta 5).
 * Categorías: se destaca la que MÁS sube frente a su media, no la más grande.
 */
export function balanceInicio(movimientos, hoy = new Date()) {
  const hoyIso = isoDe(hoy)
  // Primeros 3 días del periodo: se cierra el anterior.
  const cerrado = diaEnPeriodo(hoyIso) <= 3
  const clave = cerrado ? sumarMeses(periodoDe(hoyIso), -1) : periodoDe(hoyIso)
  const vivos = movimientos.filter((m) => m.fecha <= hoyIso)
  const serie = agregarPorMes(vivos, 6, clave)
  const actual = serie[serie.length - 1]
  const previos = serie.slice(0, -1).filter((m) => m.ingresos > 0 || m.gastos > 0)
  const media = (k) => (previos.length ? Math.round((previos.reduce((s, m) => s + m[k], 0) / previos.length) * 100) / 100 : null)
  const medias = { ingresos: media('ingresos'), gastos: media('gastos'), ahorro: media('ahorro'), ratio: media('ratioAhorro') }

  // ¿Es el mejor mes? (ratio de ahorro más alto de la serie con datos, y con ingresos)
  const conIngresos = serie.filter((m) => m.ingresos > 0)
  // Solo si SUPERA a todos (un empate no es «tu mejor mes»).
  const otros = conIngresos.filter((m) => m.clave !== actual.clave)
  const mejorMes = cerrado && actual.ingresos > 0 && otros.length >= 2 && otros.every((m) => actual.ratioAhorro > m.ratioAhorro + 0.5)

  // Categorías del mes frente a su media en los meses previos con datos.
  const delMes = vivos.filter((m) => periodoDe(m.fecha) === clave)
  const porMesPrevio = previos.map((p) => gastoPorCategoria(vivos.filter((m) => periodoDe(m.fecha) === p.clave)))
  const categorias = [...gastoPorCategoria(delMes).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, total]) => {
      const hist = porMesPrevio.map((mapa) => mapa.get(nombre) ?? 0)
      const med = hist.length ? hist.reduce((s, v) => s + v, 0) / hist.length : 0
      // Sin historia suficiente no se compara (evita «+∞ %»).
      const difPct = cerrado && med >= 10 ? Math.round(((total - med) / med) * 100) : null
      return { nombre, total: Math.round(total * 100) / 100, media: Math.round(med * 100) / 100, difPct }
    })
  const masSube = categorias.filter((c) => c.difPct != null && c.difPct > 5).sort((a, b) => b.difPct - a.difPct)[0]?.nombre ?? null

  return {
    clave,
    cerrado,
    dia: diaEnPeriodo(hoyIso),
    totales: actual,
    medias,
    mejorMes,
    serie: serie.map((m) => ({ clave: m.clave, etiqueta: m.etiqueta, ahorro: m.ahorro, ingresos: m.ingresos, gastos: m.gastos })),
    categorias,
    masSube,
  }
}
