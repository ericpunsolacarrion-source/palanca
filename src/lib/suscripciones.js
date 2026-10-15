// Detector de SUSCRIPCIONES y cargos periódicos a partir del histórico de
// movimientos (p. ej. un extracto bancario importado por CSV). Lógica pura y
// testeable: sin React ni BD. La UI vive en components/SuscripcionesDetectadas.
//
// Idea: el mismo comercio cobrando un importe estable a intervalos regulares
// (≈ mensual o ≈ anual) es, casi seguro, una suscripción o un recibo fijo.
// El usuario solo tiene que confirmarlo con un toque (procedencia "sugerido",
// ratificado por el usuario: contrato MOTOR.md F4).

import { centimosDe, esConsumo, hoyIso } from './movimientosUtils'
import { grupoComercio, nombreComercio } from './comercios'
import { esDelFijo } from './conciliarFijos'

const DIA_MS = 86400000

// Ruido típico de los conceptos bancarios que no identifica al comercio.
const RUIDO = new Set([
  'compra', 'compras', 'pago', 'pagos', 'tarjeta', 'tarj', 'tj', 'recibo', 'recibos', 'adeudo',
  'cargo', 'domiciliacion', 'domiciliado', 'transaccion', 'contactless', 'en', 'de', 'del', 'la',
  'el', 'con', 'num', 'nº', 'ref', 'www', 'com', 'es', 'sl', 'sa', 'slu', 'inc', 'ltd', 'eu',
  'europe', 'payments', 'bv', 'sarl', 'gmbh', 'ab', 'sau', 'srl', 'llc', 'ltd', 'co',
])

// Concepto bancario → clave de comercio estable ("COMPRA TARJ. NETFLIX.COM 12/03" → "netflix").
export function normalizarComercio(texto) {
  const palabras = String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .split(' ')
    .filter((p) => p && !RUIDO.has(p) && !/\d/.test(p) && p.length > 1)
  return palabras.slice(0, 3).join(' ')
}

// Nombre presentable: "netflix" → "Netflix", "spotify ab" → "Spotify Ab".
function nombreBonito(clave) {
  return clave.replace(/\b\w/g, (c) => c.toUpperCase())
}

const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / DIA_MS)

function mediana(nums) {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// Siguiente cobro sumando meses de calendario (el día se acota al último del mes).
function proximaPorMeses(fechaIso, meses) {
  const [y, m, d] = fechaIso.split('-').map(Number)
  const destino = new Date(y, m - 1 + meses, 1)
  const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  const pad = (n) => String(n).padStart(2, '0')
  return `${destino.getFullYear()}-${pad(destino.getMonth() + 1)}-${pad(Math.min(d, ultimo))}`
}

// Periodicidades reconocidas: [nombre, días típicos, rango aceptado, cargos/año].
// ¿La mayoría de los cargos caen a ±4 días del día habitual? (el 30 y el 2 están
// a 2 días: el mes da la vuelta; y un cargo del 31 en febrero cae el 28).
function mismoDiaDelMes(cargos) {
  const dias = cargos.map((m) => Number(m.fecha.slice(8, 10)))
  const ref = mediana(dias)
  const cerca = dias.filter((d) => Math.min(Math.abs(d - ref), 30 - Math.abs(d - ref)) <= 4).length
  return cerca / dias.length >= 0.75
}

const PERIODOS = [
  { id: 'mensual', meses: 1, dias: 30, min: 26, max: 35, porAnio: 12, minCargos: 3 },
  { id: 'bimestral', meses: 2, dias: 61, min: 55, max: 67, porAnio: 6, minCargos: 3 },
  { id: 'trimestral', meses: 3, dias: 91, min: 84, max: 100, porAnio: 4, minCargos: 2 },
  { id: 'semestral', meses: 6, dias: 182, min: 170, max: 196, porAnio: 2, minCargos: 2 },
  { id: 'anual', meses: 12, dias: 365, min: 330, max: 400, porAnio: 1, minCargos: 2 },
]

// Clave del comercio REAL de un movimiento (lib/comercios.js): el mismo sitio
// escrito de formas distintas por el banco ("NETFLIX.COM", "PAYPAL *NETFLIX")
// o con un alias del usuario cuenta como uno solo.
function claveDe(m) {
  return grupoComercio(m)
}

// ¿Ya lo sigue el usuario como compromiso en "Base"?
function yaSeguido(grupo, recurrentes) {
  return recurrentes.some(
    (r) =>
      (r.fuenteId && grupo.fuenteId && r.fuenteId === grupo.fuenteId) ||
      grupoComercio(r.nombre) === grupo.clave ||
      normalizarComercio(r.nombre) === grupo.clave ||
      // El fijo "Gimnasio" ya es el cargo "BASIC FIT" (mismo sitio e importe parecido).
      (grupo.ultimo && esDelFijo(r, grupo.ultimo) && importeParecido(r, grupo.ultimo)),
  )
}

const importeParecido = (r, m) => {
  const objetivo = Math.round(Number(r.importe) * 100)
  return objetivo > 0 && Math.abs(centimosDe(m) - objetivo) / objetivo <= 0.5
}

/**
 * Detecta cargos periódicos en `movimientos` que el usuario aún no sigue.
 * @param movimientos histórico completo (fuente única de App.jsx)
 * @param recurrentes compromisos ya creados en Base (para no repetirlos)
 * @param opciones { hoy: 'YYYY-MM-DD', descartadas: Set<clave> }
 * @returns [{ clave, nombre, periodicidad, importe, costeAnual, diaMes,
 *            ultimaFecha, proximaFecha, nCargos, subida, categoriaId,
 *            categoriaNombre, fuenteId }] ordenado por coste anual desc.
 */
export function detectarSuscripciones(movimientos, recurrentes = [], opciones = {}) {
  const hoy = opciones.hoy ?? hoyIso()
  const descartadas = opciones.descartadas ?? new Set()

  const grupos = new Map()
  for (const m of movimientos) {
    if (!esConsumo(m)) continue
    const clave = claveDe(m)
    if (!clave) continue
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave).push(m)
  }

  const resultado = []
  for (const [clave, movs] of grupos) {
    if (descartadas.has(clave)) continue
    const orden = [...movs].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))

    // Un cargo por día como máximo (dos compras el mismo día no son "periodo").
    const porDia = []
    for (const m of orden) if (porDia.at(-1)?.fecha !== m.fecha) porDia.push(m)
    if (porDia.length < 2) continue

    const intervalos = []
    for (let i = 1; i < porDia.length; i += 1) intervalos.push(diasEntre(porDia[i - 1].fecha, porDia[i].fecha))
    const intMed = mediana(intervalos)
    const periodo = PERIODOS.find((p) => intMed >= p.min && intMed <= p.max)
    if (!periodo || porDia.length < periodo.minCargos) continue
    // Regularidad: la gran mayoría de intervalos dentro del rango (tolera un
    // mes saltado o un cobro adelantado).
    const regulares = intervalos.filter((d) => d >= periodo.min * 0.75 && d <= periodo.max * 1.25).length
    if (regulares / intervalos.length < 0.75) continue
    // Un cargo periódico cae (casi) el mismo día del mes. Ir al bar o comprar en
    // Amazon una vez al mes en días distintos no es una suscripción.
    if (periodo.meses <= 3 && !mismoDiaDelMes(porDia.slice(-6))) continue

    // Importe estable (una suscripción no cambia mucho de un mes a otro). Se
    // miran los últimos cargos para tolerar subidas de precio antiguas.
    const recientes = porDia.slice(-6)
    const cent = recientes.map((m) => centimosDe(m))
    const centMed = mediana(cent)
    if (centMed <= 0) continue
    if (cent.some((c) => Math.abs(c - centMed) / centMed > 0.25)) continue

    // Sigue viva: el último cargo no es más antiguo que ~1,5 periodos.
    const ultimo = porDia.at(-1)
    if (diasEntre(ultimo.fecha, hoy) > periodo.dias * 1.5 + 5) continue

    const fuenteId = ultimo.fuente_id ?? ultimo.fuente?.id ?? null
    const grupo = { clave, fuenteId, ultimo }
    if (yaSeguido(grupo, recurrentes)) continue

    const importeCent = cent.at(-1)
    // Subida de precio: el último importe supera al anterior distinto en ≥1 %.
    const previoDistinto = [...cent].reverse().find((c) => c !== importeCent)
    // Fecha del PRIMER cargo con el precio actual: cuándo subió de verdad (no
    // el último cargo), para avisar una sola vez por subida.
    let inicioPrecio = recientes.length - 1
    while (inicioPrecio > 0 && cent[inicioPrecio - 1] === importeCent) inicioPrecio -= 1
    // Solo es "subida" si el precio anterior era ESTABLE (los dos cargos previos
    // al cambio, idénticos): así se comporta una suscripción. Un recibo variable
    // (luz, agua) cambia cada vez y no debe avisar de "ha subido" cada mes.
    const precioAnteriorEstable =
      inicioPrecio >= 2 && cent[inicioPrecio - 1] === previoDistinto && cent[inicioPrecio - 2] === previoDistinto
    const subida =
      previoDistinto != null &&
      precioAnteriorEstable &&
      importeCent > previoDistinto &&
      (importeCent - previoDistinto) / previoDistinto >= 0.01
        ? { antes: previoDistinto / 100, ahora: importeCent / 100, desde: recientes[inicioPrecio].fecha }
        : null

    resultado.push({
      clave,
      nombre: nombreComercio(ultimo) || nombreBonito(clave),
      periodicidad: periodo.id,
      periodoMeses: periodo.meses,
      // Un mes en que se cobra (para los no mensuales): el del último cargo.
      mesInicio: Number(ultimo.fecha.slice(5, 7)),
      importe: importeCent / 100,
      costeAnual: (importeCent * periodo.porAnio) / 100,
      diaMes: Number(ultimo.fecha.slice(8, 10)),
      ultimaFecha: ultimo.fecha,
      proximaFecha: proximaPorMeses(ultimo.fecha, periodo.meses),
      nCargos: porDia.length,
      subida,
      categoriaId: ultimo.categoria_id ?? ultimo.categoria?.id ?? null,
      categoriaNombre: ultimo.categoria?.nombre ?? null,
      fuenteId,
    })
  }

  return resultado.sort((a, b) => b.costeAnual - a.costeAnual)
}

// Total anual (exacto en céntimos) de una lista de detecciones.
export function costeAnualTotal(detectadas) {
  return detectadas.reduce((s, d) => s + Math.round(d.costeAnual * 100), 0) / 100
}

// ── Descartes ("No es una suscripción") ─────────────────────────────────────
// Comodidad de este dispositivo (localStorage), no un dato del motor. Los usan
// el detector, los avisos del inicio y el resumen de Fulcro. Al cambiar se
// emite EVENTO_DESCARTES para que las demás pantallas se actualicen.
export const EVENTO_DESCARTES = 'palanca-descartes'
const claveDescartes = (usuarioId) => `palanca_susc_descartadas_${usuarioId}`

export function leerDescartadas(usuarioId) {
  try {
    const arr = JSON.parse(localStorage.getItem(claveDescartes(usuarioId)) || '[]')
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function guardarDescartadas(usuarioId, set) {
  try {
    localStorage.setItem(claveDescartes(usuarioId), JSON.stringify([...set]))
  } catch {
    // sin persistencia: el descarte dura esta sesión
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_DESCARTES))
  } catch {
    // fuera del navegador (tests): nada que notificar
  }
}
