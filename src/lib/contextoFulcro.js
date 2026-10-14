// Contexto DIRIGIDO POR LA PREGUNTA para Fulcro. El resumen general
// (resumenParaIA.js) va siempre; esto añade, solo cuando la pregunta lo pide,
// el detalle exacto que hace falta para responder bien:
//   - una CATEGORÍA mencionada ("¿cuánto gasto en comida?") → evolución mensual
//     y en qué comercios se va;
//   - un COMERCIO mencionado ("¿y en Mercadona?") → evolución, nº de compras y
//     ticket medio;
//   - un MES mencionado ("¿qué pasó en agosto?") → totales y desglose de ese mes.
// Siempre AGREGADOS (sumas por mes/comercio), nunca movimientos uno a uno ni
// notas completas. Lógica pura y testeable; reglas de cálculo de
// movimientosUtils (consumo = esConsumo, sumas exactas en céntimos).

import {
  centimosDe,
  claveMesActual,
  esConsumo,
  filtrarPorMes,
  gastoPorCategoria,
  totalesDe,
  ultimosNMeses,
} from './movimientosUtils'
import { normalizarComercio } from './suscripciones'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const sinAcentos = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const euros = (cent) => Math.round(cent) / 100

// Palabras de la pregunta (sin acentos), para buscar coincidencias exactas de
// palabra y no falsos positivos dentro de otras palabras.
function palabrasDe(texto) {
  return new Set(sinAcentos(texto).split(/[^a-z0-9ñ]+/).filter(Boolean))
}

// Una etiqueta (categoría o comercio, puede tener varias palabras) aparece en
// la pregunta si TODAS sus palabras significativas están en ella.
function aparece(etiqueta, palabras) {
  const partes = sinAcentos(etiqueta).split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 3)
  return partes.length > 0 && partes.every((p) => palabras.has(p) || palabras.has(`${p}s`) || palabras.has(p.replace(/s$/, '')))
}

const comercioDe = (m) => normalizarComercio(m.fuente?.nombre || '') || normalizarComercio(m.nota || '')

// Serie de los últimos n meses (clave → céntimos) para un filtro de movimientos.
function serieMensual(movimientos, filtro, n = 6) {
  const meses = ultimosNMeses(n)
  const idx = new Map(meses.map((m) => [m.clave, 0]))
  for (const m of movimientos) {
    const clave = m.fecha.slice(0, 7)
    if (idx.has(clave) && filtro(m)) idx.set(clave, idx.get(clave) + centimosDe(m))
  }
  return meses.map((m) => ({ mes: m.clave, total: euros(idx.get(m.clave)) }))
}

function detalleCategoria(nombre, movimientos) {
  const deCat = (m) => esConsumo(m) && (m.categoria?.nombre ?? 'Sin categoría') === nombre
  const recientes = new Set(ultimosNMeses(3).map((m) => m.clave))
  const porComercio = new Map()
  for (const m of movimientos) {
    if (!deCat(m) || !recientes.has(m.fecha.slice(0, 7))) continue
    const c = comercioDe(m) || 'sin concepto'
    porComercio.set(c, (porComercio.get(c) ?? 0) + centimosDe(m))
  }
  const top = [...porComercio.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  return {
    categoria: nombre,
    ultimos6Meses: serieMensual(movimientos, deCat),
    principalesComerciosUltimos3Meses: top.map(([comercio, cent]) => ({ comercio, total: euros(cent) })),
  }
}

function detalleComercio(clave, movimientos) {
  const deCom = (m) => esConsumo(m) && comercioDe(m) === clave
  const doce = new Set(ultimosNMeses(12).map((m) => m.clave))
  let n = 0
  let cent = 0
  for (const m of movimientos) {
    if (!deCom(m) || !doce.has(m.fecha.slice(0, 7))) continue
    n += 1
    cent += centimosDe(m)
  }
  return {
    comercio: clave,
    ultimos6Meses: serieMensual(movimientos, deCom),
    compras12Meses: n,
    total12Meses: euros(cent),
    ticketMedio: n ? euros(cent / n) : 0,
  }
}

function detalleMes(indiceMes, movimientos) {
  // La ocurrencia más reciente de ese mes que no sea futura.
  const actual = claveMesActual()
  let y = Number(actual.slice(0, 4))
  if (indiceMes + 1 > Number(actual.slice(5, 7))) y -= 1
  const clave = `${y}-${String(indiceMes + 1).padStart(2, '0')}`
  const movs = filtrarPorMes(movimientos, clave)
  const t = totalesDe(movs)
  const porCat = [...gastoPorCategoria(movs).entries()].sort((a, b) => b[1] - a[1])
  return {
    mes: clave,
    ingresos: t.ingresos,
    gastos: t.gastos,
    invertido: t.invertido,
    ahorro: t.ahorro,
    tasaAhorroPct: Math.round(t.ratioAhorro),
    gastoPorCategoria: Object.fromEntries(porCat),
  }
}

/**
 * Detalle extra según la pregunta. Devuelve null si la pregunta no menciona
 * nada concreto (el resumen general basta).
 */
export function contextoParaPregunta(pregunta, movimientos = []) {
  const palabras = palabrasDe(pregunta)
  if (palabras.size === 0 || movimientos.length === 0) return null

  // Categorías de consumo del usuario mencionadas.
  const categorias = new Set()
  for (const m of movimientos) if (esConsumo(m)) categorias.add(m.categoria?.nombre ?? 'Sin categoría')
  const catMencionadas = [...categorias].filter((c) => aparece(c, palabras)).slice(0, 2)

  // Comercios (de los últimos 12 meses) mencionados.
  const doce = new Set(ultimosNMeses(12).map((m) => m.clave))
  const comercios = new Set()
  for (const m of movimientos) {
    if (!esConsumo(m) || !doce.has(m.fecha.slice(0, 7))) continue
    const c = comercioDe(m)
    if (c) comercios.add(c)
  }
  const comMencionados = [...comercios].filter((c) => aparece(c, palabras)).slice(0, 2)

  // Meses mencionados por nombre.
  const mesesMencionados = MESES.map((n, i) => (palabras.has(n) ? i : -1)).filter((i) => i >= 0).slice(0, 2)

  if (!catMencionadas.length && !comMencionados.length && !mesesMencionados.length) return null
  const detalle = {}
  if (catMencionadas.length) detalle.categorias = catMencionadas.map((c) => detalleCategoria(c, movimientos))
  if (comMencionados.length) detalle.comercios = comMencionados.map((c) => detalleComercio(c, movimientos))
  if (mesesMencionados.length) detalle.meses = mesesMencionados.map((i) => detalleMes(i, movimientos))
  return detalle
}

// Mensajes de cortesía que no necesitan la IA: se responden aquí, gratis y al
// instante, y no gastan preguntas del día. Solo si el mensaje es ÚNICAMENTE
// cortesía (todas sus palabras): "Hola, ¿voy bien?" lleva una pregunta → IA.
const CORTESIA = [
  {
    clave: ['hola', 'buenas', 'buenos', 'hey', 'ey', 'holi', 'saludos'],
    permitidas: ['hola', 'buenas', 'buenos', 'dias', 'tardes', 'noches', 'hey', 'ey', 'holi', 'saludos', 'fulcro', 'que', 'tal'],
    respuesta: '¡Hola! Pregúntame lo que quieras sobre tu dinero: cómo vas este mes, en qué se te va o cómo llegar a un objetivo.',
  },
  {
    clave: ['gracias', 'thanks', 'thx'],
    permitidas: ['gracias', 'muchas', 'mil', 'muchisimas', 'thanks', 'thx', 'fulcro', 'por', 'todo', 'de', 'nuevo', 'genial', 'perfecto', 'vale', 'ok'],
    respuesta: '¡A ti! Si te surge otra duda, aquí estoy.',
  },
  {
    // "vale/ok…" puede ser un SÍ a una oferta de Fulcro: ver `ultimaRespuesta`.
    esAsentimiento: true,
    clave: ['ok', 'okay', 'vale', 'genial', 'perfecto', 'entendido', 'acuerdo', 'guay', 'top', 'bien'],
    permitidas: ['ok', 'okay', 'vale', 'genial', 'perfecto', 'entendido', 'de', 'acuerdo', 'guay', 'top', 'muy', 'bien', 'fulcro'],
    respuesta: 'Perfecto. ¿Quieres que miremos algo más?',
  },
]
// `ultimaRespuesta`: el último mensaje de Fulcro. Si terminaba en pregunta
// ("¿Quieres que te lo explique?"), un "vale" es una respuesta a esa oferta y
// debe ir a la IA, no recibir un "Perfecto" genérico.
export function respuestaDeCortesia(texto, ultimaRespuesta = '') {
  const palabras = String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean)
  if (palabras.length === 0 || palabras.length > 5) return null
  const tipo = CORTESIA.find(
    (c) => palabras.some((p) => c.clave.includes(p)) && palabras.every((p) => c.permitidas.includes(p)),
  )
  if (tipo?.esAsentimiento && /\?\s*$/.test(String(ultimaRespuesta).trim())) return null
  return tipo?.respuesta ?? null
}
