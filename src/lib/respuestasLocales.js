// RESPUESTAS AL MOMENTO (sin IA). Las preguntas de DATOS ("¿cuánto he gastado
// en gasolina los tres últimos meses?", "¿cuánto he pagado de Spotify hasta
// ahora?", "¿cuándo me cobran el seguro?") se calculan aquí, en el móvil:
// gratis, instantáneas y exactas (mismas reglas que el motor). Solo las
// preguntas de CRITERIO ("¿me conviene…?", "¿cómo ahorro más?") van a la IA.
//
// Regla de oro: ante la duda, null → la pregunta va a Fulcro (IA). Mejor
// gastar 0,05 céntimos que contestar mal.

import { bolsas, categoriaDeDevolucion, centimosDe, esConsumo, etiquetaMes, formatearFecha, gastoPorCategoria, totalesDe } from './movimientosUtils'
import { esAjuste, esDevolucion, esInversion, esTraspaso, etiquetaCategoria, formatearEuros } from './categorias'
import { periodoDe, proximoCobro } from './periodicidad'
import { buscarParecido, nombreComercio } from './comercios'
import { detectarSuscripciones } from './suscripciones'
import { resumenDelMes } from './inicio'
import { PALANCAS, tipoNegociable } from './negociables'

const sinAcentos = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const eur = (cent) => formatearEuros(Math.round(cent) / 100)
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Preguntas que piden criterio, consejo o previsión → IA.
const COMPLEJA =
  /\b(por que|porque|deberia|deberiamos|tendria|me conviene|conviene|compensa|merece|consejo|recomiend|aconsej|como (puedo|podria|hago|consigo|reduzco|ahorro|mejoro|llego)|que (hago|me recomiendas|opinas|harias)|ayudame|estrategia|plan para|mejor|peor|invertir en|explica|que es|que significa|llegare|prevision|predic|futuro|puedo|podria|necesito|voy bien|es mucho|es poco|normal|aumentad\w*|subid\w*|crecid\w*|comparad\w*|diferencia|respecto|evolucion\w*)\b/

const NUMEROS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 }
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Temas habituales → cómo reconocerlos en el concepto del movimiento.
const TEMAS = [
  { palabras: ['gasolina', 'combustible', 'gasolinera', 'gasolineras', 'carburante', 'gasoil', 'diesel', 'repostar'], nombre: 'gasolina', patron: /repsol(?! (luz|electricidad|gas |vivit))|cepsa|\bbp\b|galp|shell|petronor|ballenoil|plenoil|gasolinera|carburante|combustible|gasolina|gasoil|diesel|esclatoil|\bavia\b|\bdisa\b|campsa/ },
  { palabras: ['supermercado', 'supermercados', 'super', 'supers'], nombre: 'supermercado', patron: /mercadona|carrefour|\blidl\b|\baldi\b|\bdia\b|eroski|alcampo|consum|hipercor|supercor|bonpreu|condis|caprabo|ahorramas|gadis|froiz|masymas|\bspar\b|supermercado/ },
  { palabras: ['luz', 'electricidad'], nombre: 'luz', patron: /iberdrola|endesa|naturgy|totalenergies|holaluz|octopus|lucera|som energia|\bedp\b|curenergia|repsol (luz|electricidad)|electricidad|\bluz\b/ },
  { palabras: ['telefono', 'movil', 'internet', 'fibra', 'telefonia'], nombre: 'teléfono e internet', patron: /movistar|telefonica|vodafone|orange|yoigo|masmovil|\bdigi\b|pepephone|simyo|lowi|\bo2\b|jazztel|finetwork|fibra|telefonia/ },
  { palabras: ['restaurante', 'restaurantes', 'cenas', 'comidas fuera', 'bares'], nombre: 'restaurantes', patron: /restaurante|\bbar\b|cafeteria|burger|mcdonald|\bkfc\b|telepizza|domino|just eat|glovo|uber ?eats|deliveroo|starbucks|\bvips\b|goiko|pizzeria|sushi|kebab/ },
  { palabras: ['taxi', 'taxis', 'uber', 'cabify'], nombre: 'taxi y VTC', patron: /taxi|cabify|\buber\b(?! ?eats)|\bbolt\b|free ?now/ },
  { palabras: ['parking', 'aparcamiento', 'peaje', 'peajes'], nombre: 'parking y peajes', patron: /parking|aparcamiento|peaje|autopista|via ?t/ },
  { palabras: ['gimnasio', 'gym'], nombre: 'gimnasio', patron: /basic ?fit|mcfit|altafit|viva ?gym|dreamfit|anytime fitness|synergym|go fit|gimnasio|\bgym\b|crossfit|fitness/ },
  { palabras: ['farmacia'], nombre: 'farmacia', patron: /farmacia/ },
  { palabras: ['ropa', 'moda'], nombre: 'ropa', patron: /zara|primark|h&m|\bhm\b|mango|pull ?(&|and)? ?bear|bershka|stradivarius|massimo dutti|uniqlo|shein|vinted|lefties|oysho|springfield|cortefiel|decathlon/ },
]

// Palabras que NO son el "qué" de la pregunta (verbos, periodo, relleno).
const VACIAS = new Set(
  `cuanto cuanta cuantos cuantas cuando que cual cuales donde como total totales suma dinero euros euro
  he has ha hemos habeis han llevo llevas lleva llevamos me te se nos mi mis tu tus su sus yo
  gastado gastados gaste gasto gastos gastar gastamos gastaste pagado pagados pague pago pagos pagar pagamos pagaste
  ingresado ingrese ingreso ingresos cobrado cobre cobro cobros ganado gane ahorrado ahorre ahorro invertido inverti invierto aportado aporte
  cuesta cuestan costado sale salen salido dejado deja dejo va van ido llevado
  en de del la el los las lo un una unos unas al a con por para y o e u es son fue fueron esta este estos estas
  hasta ahora desde siempre principio nunca historico historia hoy ayer semana semanas mes meses ano anos dia dias
  ultimo ultima ultimos ultimas pasado pasada anterior actual llevo va lo que en total cada al
  uno dos tres cuatro cinco seis siete ocho nueve diez once doce
  enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre
  mas menos todo toda todos todas fijo fijos suscripcion suscripciones recibo recibos compromisos cargo cargan cobran pasan toca vez
  proximo proxima siguiente le les
  media promedio normalmente habitualmente suele suelo suelen tengo tienes tiene tenemos uso usar usando app aplicacion palanca empece
  trimestre ejercicio doce semanal mensual anual diario
  incluido incluida incluidos incluidas incluyendo contando sumando curso actual ademas tambien compre fui entre veces ido vamos
  mucho poco demasiado bastante compensa conviene renegociar negociar quitar cancelar dar baja podria puedo permitir merece pena cambiar reducir bajar recortar ahorrar`.split(/\s+/),
)

// ── Periodo ──────────────────────────────────────────────────────────────────
const INCLUYE_ACTUAL = /\b(incluid[oa]s?|incluyendo|contando|sumando|con este mes|y este mes|mas este mes|mes en curso|mes actual|hasta hoy)\b/
// "del 01/04/2026 al 30/09/2026": las fechas exactas de cualquier periodo.
const rangoDe = (p, primera, hoyIso) => {
  const desde = p.tipo === 'todo' ? primera : p.desde
  const hasta = p.tipo === 'todo' || p.hasta > hoyIso ? hoyIso : p.hasta
  if (!desde) return ''
  return desde === hasta ? `el ${formatearFecha(desde)}` : `del ${formatearFecha(desde)} al ${formatearFecha(hasta)}`
}
function periodo(t, hoy) {
  const h = iso(hoy)
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  const primeroDe = (yy, mm) => iso(new Date(yy, mm, 1))
  const ultimoDe = (yy, mm) => iso(new Date(yy, mm + 1, 0))
  const restarDias = (n) => iso(new Date(y, m, hoy.getDate() - n + 1))

  if (/\b(hasta ahora|en total|desde siempre|desde el principio|desde el inicio|historico|desde que (empece|uso|tengo|use|estoy))\b/.test(t)) return { tipo: 'todo', etiqueta: 'desde el principio' }
  // "Los últimos 6 meses", "estos seis meses", "6 últimos meses", "en 6 meses".
  const n = t.match(/\b(?:(?:ultim[oa]s?|estos|estas|los|las|en|durante)\s+(\d+|[a-z]+)\s+(?:ultim[oa]s\s+)?(dias|semanas|meses|anos)|(\d+|[a-z]+)\s+ultim[oa]s\s+(dias|semanas|meses|anos))\b/)
  if (n) {
    const cantidad = Number(n[1] ?? n[3]) || NUMEROS[n[1] ?? n[3]]
    const unidad = n[2] ?? n[4]
    if (cantidad > 0 && cantidad <= 120) {
      // Meses COMPLETOS (comparables entre sí); con "incluido este mes / el mes
      // en curso" se suma también lo que va del actual, hasta hoy.
      if (unidad === 'meses' && INCLUYE_ACTUAL.test(t)) return { desde: primeroDe(y, m - cantidad), hasta: h, meses: cantidad + 1, conActual: true, etiqueta: `en los últimos ${cantidad} meses y lo que va de este` }
      if (unidad === 'meses') return { desde: primeroDe(y, m - cantidad), hasta: ultimoDe(y, m - 1), meses: cantidad, completos: true, etiqueta: `en los últimos ${cantidad} meses completos` }
      if (unidad === 'anos') return { desde: primeroDe(y - cantidad, m), hasta: h, etiqueta: `en los últimos ${cantidad} años` }
      const dias = unidad === 'semanas' ? cantidad * 7 : cantidad
      return { desde: restarDias(dias), hasta: h, etiqueta: `en los últimos ${dias} días` }
    }
  }
  // "del 1 al 15 de agosto", "entre el 3 de julio y el 20 de agosto de 2025",
  // "del 01/08/2025 al 15/08/2025".
  const r = rangoExplicito(t, hoy)
  if (r) return r
  if (/\bhoy\b/.test(t)) return { desde: h, hasta: h, etiqueta: 'hoy' }
  if (/\bayer\b/.test(t)) {
    const a = iso(new Date(y, m, hoy.getDate() - 1))
    return { desde: a, hasta: a, etiqueta: 'ayer' }
  }
  if (/\b(esta semana)\b/.test(t)) {
    const lunes = new Date(y, m, hoy.getDate() - ((hoy.getDay() + 6) % 7))
    return { desde: iso(lunes), hasta: h, etiqueta: 'esta semana' }
  }
  if (/\b(mes pasado|mes anterior)\b/.test(t)) return { desde: primeroDe(y, m - 1), hasta: ultimoDe(y, m - 1), etiqueta: `en ${etiquetaMes(primeroDe(y, m - 1).slice(0, 7), { month: 'long' }).toLowerCase()}` }
  if (/\bultimo mes\b/.test(t)) return { desde: restarDias(30), hasta: h, etiqueta: 'en los últimos 30 días' }
  // "El último año" / "este último año": los 12 meses que acaban hoy.
  if (/\b(ultimo ano|ultimos doce meses|ultimo ejercicio)\b/.test(t)) return { desde: iso(new Date(y - 1, m, hoy.getDate() + 1)), hasta: h, etiqueta: 'en el último año' }
  const trim = m - (m % 3) // primer mes del trimestre actual (0, 3, 6, 9)
  if (/\b(este trimestre)\b/.test(t)) return { desde: primeroDe(y, trim), hasta: h, etiqueta: 'este trimestre' }
  if (/\b(trimestre pasado|trimestre anterior|ultimo trimestre)\b/.test(t)) return { desde: primeroDe(y, trim - 3), hasta: ultimoDe(y, trim - 1), etiqueta: 'el trimestre pasado' }
  if (/\b(semana pasada|semana anterior)\b/.test(t)) {
    const lunes = new Date(y, m, hoy.getDate() - ((hoy.getDay() + 6) % 7) - 7)
    return { desde: iso(lunes), hasta: iso(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6)), etiqueta: 'la semana pasada' }
  }
  if (/\b(ano pasado)\b/.test(t)) return { desde: `${y - 1}-01-01`, hasta: `${y - 1}-12-31`, etiqueta: `en ${y - 1}` }
  if (/\b(este ano|lo que va de ano|en el ano)\b/.test(t)) return { desde: `${y}-01-01`, hasta: h, etiqueta: `en lo que va de ${y}` }
  if (/\b(este mes|lo que va de mes|mes en curso|mes actual)\b/.test(t)) return { desde: primeroDe(y, m), hasta: h, etiqueta: 'este mes' }
  const anio = t.match(/\b(20\d\d)\b/)
  const mes = MESES.findIndex((nombre) => new RegExp(`\\b${nombre}\\b`).test(t))
  if (mes >= 0) {
    const yy = anio ? Number(anio[1]) : mes > m ? y - 1 : y
    return { desde: primeroDe(yy, mes), hasta: ultimoDe(yy, mes), etiqueta: `en ${MESES[mes]}${yy !== y ? ` de ${yy}` : ''}` }
  }
  if (anio) return { desde: `${anio[1]}-01-01`, hasta: `${anio[1]}-12-31`, etiqueta: `en ${anio[1]}` }
  return null
}

function rangoExplicito(t, hoy) {
  const mesN = (x) => (x ? (/^\d+$/.test(x) ? Number(x) - 1 : MESES.indexOf(x)) : -1)
  const num = t.match(/\b(?:del|desde el|entre el)\s+(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s+(?:al|hasta el|y el)\s+(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  const txt = t.match(/\b(?:del|desde el|entre el)\s+(\d{1,2})(?:\s+de\s+([a-z]+))?(?:\s+(?:de\s+)?(20\d\d))?\s+(?:al|hasta el|y el)\s+(\d{1,2})\s+de\s+([a-z]+)(?:\s+(?:de\s+)?(20\d\d))?\b/)
  let d1, m1, y1, d2, m2, y2
  if (num) [, d1, m1, y1, d2, m2, y2] = num
  else if (txt) [, d1, m1, y1, d2, m2, y2] = txt
  else return null
  const M2 = mesN(m2)
  const M1 = m1 ? mesN(m1) : M2
  if (M1 < 0 || M2 < 0) return null
  const anioDe = (y) => (y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : null)
  let Y2 = anioDe(y2) ?? anioDe(y1)
  if (Y2 == null) Y2 = new Date(hoy.getFullYear(), M2, Number(d2)) > hoy ? hoy.getFullYear() - 1 : hoy.getFullYear()
  const Y1 = anioDe(y1) ?? (M1 > M2 ? Y2 - 1 : Y2)
  const desde = iso(new Date(Y1, M1, Number(d1)))
  const hasta = iso(new Date(Y2, M2, Number(d2)))
  if (desde > hasta) return null
  return { desde, hasta, etiqueta: `del ${formatearFecha(desde)} al ${formatearFecha(hasta)}`, explicito: true }
}

const enPeriodo = (p, hoyIso) => (m) => (p.tipo === 'todo' ? m.fecha <= hoyIso : m.fecha >= p.desde && m.fecha <= p.hasta && m.fecha <= hoyIso)

// "¿Cuánto he ahorrado este mes?" cuando la nómina llega a final de mes: se
// dice lo que va de mes y, para que la respuesta sirva, cómo cerró el anterior.
function sinIngresoAun(per, tot, movimientos, hoy, hoyIso) {
  const base = `${capital(per.etiqueta)} aún no han entrado ingresos (gastos hasta hoy: ${formatearEuros(tot.gastos)}).`
  if (per.etiqueta !== 'este mes') return base.replace('aún no han', 'no han')
  const ant = totalesDe(movimientos.filter(enPeriodo(periodo('el mes pasado', hoy), hoyIso)))
  if (ant.ingresos <= 0) return base
  return `${base} El mes pasado ahorraste **${formatearEuros(ant.ahorro)}**, el ${Math.round(ant.ratioAhorro)} % de tus ingresos.`
}

// ── El "qué": tema, categoría o comercio ──────────────────────────────────────
// Texto en el que buscar: el comercio REAL (memoria/marca) + lo del banco + categoría.
const textoMov = (m) => sinAcentos(`${nombreComercio(m)} ${m.nota ?? ''} ${m.fuente?.nombre ?? ''} ${m.categoria?.nombre ?? ''}`).replace(/[-_*.]+/g, ' ')
const tieneToken = (texto, tok) => new RegExp(`\\b${tok.replace(/s$/, '')}s?\\b`).test(texto)

function resolverObjetivo(t, movimientos) {
  const tokens = t.split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 2 && !VACIAS.has(w) && !/^\d+$/.test(w))
  if (tokens.length === 0) return { sin: true }

  // Categorías del usuario ("comida", "ocio", "transporte").
  const cats = new Map()
  for (const m of movimientos) {
    const c = m.categoria?.nombre
    if (c) cats.set(sinAcentos(c), c)
  }
  const deCategoria = (tok) => {
    const cat = cats.get(tok) ?? cats.get(tok.replace(/s$/, '')) ?? cats.get(`${tok}s`)
    if (!cat) return null
    return {
      nombre: etiquetaCategoria(cat),
      esCategoria: true,
      filtro: (m) => m.categoria?.nombre === cat,
      // Las devoluciones van a la categoría del comercio que devuelve.
      filtroDevolucion: (d) => categoriaDeDevolucion(d, movimientos) === cat,
    }
  }
  const deTema = (tok) => {
    const tema = TEMAS.find((x) => x.palabras.includes(tok))
    return tema ? { nombre: tema.nombre, filtro: (m) => tema.patron.test(textoMov(m)) } : null
  }

  // 1. Una palabra que es una categoría tuya.
  if (tokens.length === 1) {
    const cat = deCategoria(tokens[0])
    if (cat) return cat
  }

  // 2. Todas las palabras en el concepto ("seguro de moto", "la tagliatella").
  const todas = (m) => tokens.every((tok) => tieneToken(textoMov(m), tok))
  const encontrados = movimientos.filter(todas)
  // Una palabra que además es un tema ("gasolina"): lo apuntado con esa palabra
  // ("Gasolina moto") Y las gasolineras que conocemos (Repsol, Cepsa…).
  const temaUnico = tokens.length === 1 ? deTema(tokens[0]) : null
  if (encontrados.length && temaUnico) return { nombre: temaUnico.nombre, filtro: (m) => todas(m) || temaUnico.filtro(m) }
  if (encontrados.length) {
    // Si todos son del mismo comercio, con su nombre de verdad ("Bar Paco").
    const nombres = new Set(encontrados.map(nombreComercio).filter(Boolean))
    return { nombre: nombres.size === 1 ? [...nombres][0] : capital(tokens.join(' ')), filtro: todas }
  }

  // 3. Tema conocido ("gasolina" → Repsol, Cepsa, BP…).
  if (tokens.length === 1) {
    const tema = deTema(tokens[0])
    if (tema) return tema
  }

  // 4. Varias cosas a la vez ("ropa y compras"): cada palabra es una categoría
  //    o un tema; se suman sin contar dos veces el mismo movimiento.
  if (tokens.length > 1) {
    const partes = tokens.map((tok) => deCategoria(tok) ?? deTema(tok))
    if (partes.every(Boolean)) {
      return {
        nombre: capital(partes.map((x) => x.nombre.toLowerCase()).join(' y ')),
        filtro: (m) => partes.some((x) => x.filtro(m)),
        filtroDevolucion: (d) => partes.some((x) => (x.filtroDevolucion ?? x.filtro)(d)),
      }
    }
  }

  // 5. Un comercio tuyo escrito con errata ("mercadoma" → Mercadona).
  const texto = tokens.join(' ')
  const comercios = [...new Set(movimientos.filter(esConsumo).map(nombreComercio).filter(Boolean))]
  const parecido = buscarParecido(texto, comercios, (x) => x)
  if (parecido) return { nombre: parecido.item, filtro: (m) => nombreComercio(m) === parecido.item }

  return { nombre: capital(texto), filtro: null } // no encontrado
}

// ── Piezas de respuesta ──────────────────────────────────────────────────────
function porMeses(movs) {
  const mapa = new Map()
  for (const m of movs) mapa.set(m.fecha.slice(0, 7), (mapa.get(m.fecha.slice(0, 7)) ?? 0) + centimosDe(m))
  return [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

// Más de 12 meses: por años ("2024 155,88 € · 2025 164,88 €").
function lineaAnios(movs) {
  const mapa = new Map()
  for (const m of movs) mapa.set(m.fecha.slice(0, 4), (mapa.get(m.fecha.slice(0, 4)) ?? 0) + centimosDe(m))
  const filas = [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return filas.length >= 2 ? filas.map(([a, c]) => `${a} ${eur(c)}`).join(' · ') : null
}

function lineaMeses(movs, p) {
  if (!movs.length || (p.desde && p.desde.slice(0, 7) === p.hasta.slice(0, 7))) return null
  const filas = porMeses(movs)
  if (filas.length > 12) return null
  if (filas.length < 2) return null
  // Lo mismo cada mes (una suscripción): una línea, no doce iguales.
  const consecutivos = filas.every(([k], i) => i === 0 || mesesEntre(filas[i - 1][0], k) === 2)
  if (filas.length >= 3 && consecutivos && filas.every(([, c]) => c === filas[0][1])) {
    const nom = (k) => `${MESES[Number(k.slice(5, 7)) - 1]}${filas[0][0].slice(0, 4) !== filas.at(-1)[0].slice(0, 4) ? ` de ${k.slice(0, 4)}` : ''}`
    return `${eur(filas[0][1])} cada mes (de ${nom(filas[0][0])} a ${nom(filas.at(-1)[0])})`
  }
  // Si el periodo cruza de año, cada mes con su año ("dic 2025 · ene 2026").
  const variosAnios = new Set(filas.map(([k]) => k.slice(0, 4))).size > 1
  return filas
    .map(([k, c]) => `${variosAnios ? `${MESES[Number(k.slice(5, 7)) - 1].slice(0, 3)} ${k.slice(0, 4)}` : etiquetaMes(k, { month: 'long' }).toLowerCase()} ${eur(c)}`)
    .join(' · ')
}

const mesesEntre = (desde, hasta) => {
  const [y1, m1] = desde.split('-').map(Number)
  const [y2, m2] = hasta.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1) + 1
}

// Desglose por concepto ("gasolina" → Gasolina moto, Gasolina coche, Repsol).
// Agrupa por el comercio REAL (memoria/marca) o, si no hay, por lo apuntado.
function desglosePorConcepto(movs, devoluciones = []) {
  const grupos = new Map()
  for (const m of movs) {
    const k = nombreComercio(m) || m.categoria?.nombre || 'Sin concepto'
    const g = grupos.get(k) ?? { nombre: k, cent: 0, n: 0 }
    g.cent += centimosDe(m)
    g.n += 1
    grupos.set(k, g)
  }
  for (const d of devoluciones) {
    const g = grupos.get(nombreComercio(d))
    if (g) g.cent -= centimosDe(d)
  }
  return [...grupos.values()].sort((a, b) => b.cent - a.cent)
}

// Una CATEGORÍA agrupa varias cosas: qué tiene dentro (último año), para que
// se entienda la cifra ("Transporte = Repsol + ITV").
function queIncluye(objetivo, movimientos, hoyIso) {
  if (!objetivo?.esCategoria) return null
  const haceUnAnio = `${Number(hoyIso.slice(0, 4)) - 1}${hoyIso.slice(4)}`
  const grupos = desglosePorConcepto(movimientos.filter((m) => esConsumo(m) && objetivo.filtro(m) && m.fecha > haceUnAnio && m.fecha <= hoyIso))
  if (!grupos.length) return null
  const lista = grupos.slice(0, 5).map((g) => `${g.nombre} ${eur(g.cent)}`).join(' · ')
  return `- Qué entra en ${objetivo.nombre} (último año): ${lista}${grupos.length > 5 ? ` y ${grupos.length - 5} más` : ''}.`
}

// Recibos que se pueden NEGOCIAR (seguros, luz, móvil): cuándo renueva y qué
// hacer, con los plazos de verdad. Seguros: para no renovar hay que avisar
// por escrito al menos 1 mes antes del vencimiento (Ley de Contrato de
// Seguro, art. 22); la mejor ventana para comparar, de 45 a 30 días antes.
function consejoNegociable(objetivo, suyos, hoyIso) {
  if (!objetivo || !suyos.length) return null
  const orden = [...suyos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  const [u, prev] = orden
  const tipo = tipoNegociable({ nombre: nombreComercio(u) || objetivo.nombre, categoriaNombre: u.categoria?.nombre ?? '' }) ?? (/luz|electric/i.test(objetivo.nombre) ? 'energia' : null)
  if (!tipo || tipo === 'digital' || tipo === 'gimnasio' || tipo === 'agua') return null
  const DIA = 86400000
  const dias = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / DIA)
  const lineas = []
  if (tipo === 'seguro') {
    const anual = !prev || dias(u.fecha, prev.fecha) > 300
    if (!anual) return null
    const renov = `${Number(u.fecha.slice(0, 4)) + 1}${u.fecha.slice(4)}`
    const faltan = dias(renov, hoyIso)
    const menos = (d) => iso(new Date(Date.parse(`${renov}T12:00:00`) - d * DIA))
    // Lo que ha subido en los últimos años ("+11 % en 2 años").
    const anios = orden.filter((m, i) => i === 0 || dias(orden[i - 1].fecha, m.fecha) > 300).slice(0, 3)
    const subida = anios.length >= 2 && centimosDe(anios.at(-1)) > 0 ? Math.round((centimosDe(anios[0]) / centimosDe(anios.at(-1)) - 1) * 100) : 0
    if (faltan <= 0 || faltan > 400) return null
    if (faltan <= 45) {
      lineas.push(`- **Renueva el ${formatearFecha(renov)}, en ${faltan} días.** Pide ahora 2 o 3 presupuestos con las mismas coberturas y llama a tu aseguradora para que lo igualen.`)
      lineas.push(`- Si decides cambiar, comunícale por escrito que no renuevas **antes del ${formatearFecha(menos(30))}** (al menos 1 mes antes del vencimiento).`)
    } else {
      lineas.push(`- Renueva hacia el **${formatearFecha(renov)}** (en ${Math.round(faltan / 30)} ${Math.round(faltan / 30) === 1 ? 'mes' : 'meses'}). El mejor momento para comparar: del ${formatearFecha(menos(45))} al ${formatearFecha(menos(30))}; para no renovar, avisa por escrito al menos 1 mes antes.`)
    }
    if (subida >= 5) lineas.push(`- Te ha subido un **${subida} %** en ${anios.length - 1} ${anios.length === 2 ? 'año' : 'años'}: buen motivo para comparar.`)
    lineas.push('- Guárdalo en **Fijos** y te avisamos en el Inicio cuando llegue el momento; en "Tu plan de ahorro" tienes el guion de la llamada.')
    return { lineas, accion: 'fijos', urgente: faltan <= 45 }
  }
  // Luz, gas, móvil, internet: sin fecha de renovación; lo que cuenta es si
  // ha subido y revisar la tarifa cada 6–12 meses (cambiar es gratis).
  const haceUnAnio = `${Number(hoyIso.slice(0, 4)) - 1}${hoyIso.slice(4)}`
  const haceDos = `${Number(hoyIso.slice(0, 4)) - 2}${hoyIso.slice(4)}`
  const sum = (l) => l.reduce((s2, m) => s2 + centimosDe(m), 0)
  const ultimoAnio = sum(suyos.filter((m) => m.fecha > haceUnAnio))
  const anterior = suyos.filter((m) => m.fecha > haceDos && m.fecha <= haceUnAnio)
  const dif = anterior.length && sum(anterior) > 0 ? Math.round((ultimoAnio / sum(anterior) - 1) * 100) : null
  if (dif != null && Math.abs(dif) >= 3) lineas.push(`- En el último año has pagado ${eur(ultimoAnio)}: un **${Math.abs(dif)} % ${dif > 0 ? 'más' : 'menos'}** que el año anterior.`)
  lineas.push(
    tipo === 'energia'
      ? '- Revisa tu tarifa cada 6–12 meses: compara con tu potencia y consumo en el comparador de la CNMC; cambiar de compañía es gratis y no te cortan la luz.'
      : '- Revisa tu tarifa una vez al año: llama al departamento de bajas con una oferta delante; si no tienes permanencia, cambiar es gratis.',
  )
  lineas.push('- En **Fijos → Tu plan de ahorro** te guía paso a paso.')
  return { lineas, accion: 'fijos', urgente: dif != null && dif >= 10 }
}

// Cuando en el periodo no hay nada: cuándo fue la última vez y cuánto en el
// último año (mejor que un "no veo nada" a secas).
function sinGastosEn(objetivo, p, movimientos, filtro, hoyIso) {
  const todos = movimientos.filter((m) => esConsumo(m) && filtro(m) && m.fecha <= hoyIso)
  if (!todos.length) return `No veo ningún gasto en **${objetivo.nombre}** en tus movimientos. Si lo apuntaste con otro nombre, pregúntame por ese nombre.`
  const u = todos.reduce((a, m) => (m.fecha > a.fecha ? m : a), todos[0])
  const haceUnAnio = `${Number(hoyIso.slice(0, 4)) - 1}${hoyIso.slice(4)}`
  const anio = todos.filter((m) => m.fecha > haceUnAnio)
  const totalAnio = anio.reduce((s, m) => s + centimosDe(m), 0)
  return [
    `${capital(p.etiqueta)} no veo gastos en **${objetivo.nombre}**.`,
    `- El último fue el ${formatearFecha(u.fecha)}: ${eur(centimosDe(u))}.`,
    ...(anio.length ? [`- En el último año: **${eur(totalAnio)}** (${anio.length} ${anio.length === 1 ? 'pago' : 'pagos'}).`] : []),
  ].join('\n')
}

// Historial de precio de un cargo que se repite (Netflix 12,99 → 13,99 €):
// solo si casi todos los pagos son importes repetidos (es una cuota, no compras).
function historialDePrecio(movs) {
  if (movs.length < 4 || new Set(movs.map(nombreComercio)).size !== 1) return null
  const orden = [...movs].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  const tramos = []
  for (const m of orden) {
    const c = centimosDe(m)
    if (tramos.at(-1)?.cent === c) tramos.at(-1).n += 1
    else tramos.push({ cent: c, desde: m.fecha, n: 1 })
  }
  if (tramos.length < 2 || tramos.length > 4 || tramos.some((x) => x.n < 2)) return null
  return tramos.slice(1).map((x, i) => {
    const antes = tramos[i].cent
    const dif = Math.round((x.cent / antes - 1) * 1000) / 10
    return `${x.cent > antes ? 'Subió' : 'Bajó'} de ${eur(antes)} a **${eur(x.cent)}** el ${formatearFecha(x.desde)} (${dif > 0 ? '+' : ''}${String(dif).replace('.', ',')} %)`
  })
}

function respuestaGasto({ objetivo, movs, devoluciones = [], p, hoyIso, verboPago, movimientos = [], filtro, pideMedia = false, veces = false }) {
  const devuelto = devoluciones.reduce((s, m) => s + centimosDe(m), 0)
  // Neto de devoluciones: mismo número que el resto de la app (MOTOR.md E6).
  const total = movs.reduce((s, m) => s + centimosDe(m), 0) - devuelto
  const que = objetivo ? ` en **${objetivo.nombre}**` : ''
  if (movs.length === 0) {
    return objetivo ? sinGastosEn(objetivo, p, movimientos, filtro, hoyIso) : `No has apuntado gastos ${p.etiqueta}.`
  }
  const verbo = verboPago ? 'has pagado' : 'has gastado'
  const primera = movs.reduce((a, m) => (m.fecha < a ? m.fecha : a), movs[0].fecha)
  const rango = rangoDe(p, primera, hoyIso)
  const cuando = p.tipo === 'todo' ? `Desde el ${formatearFecha(primera)} hasta hoy` : (p.explicito ? capital(p.etiqueta) : `${capital(p.etiqueta)} (${rango})`)
  const nMeses = p.tipo === 'todo' ? mesesEntre(primera, hoyIso) : mesesEntre(p.desde, p.hasta > hoyIso ? hoyIso : p.hasta)
  // Con el mes en curso a medias, una media al mes engañaría: no se da.
  const media = nMeses >= 2 && !p.conActual ? total / nMeses : null
  const lineas =
    pideMedia && media != null
      ? [`De media ${objetivo ? `gastas${que}` : 'gastas'} **${eur(media)} al mes**: ${eur(total)} ${p.tipo === 'todo' ? `desde el ${formatearFecha(primera)}` : rango} (${nMeses} meses, ${movs.length} ${movs.length === 1 ? 'pago' : 'pagos'}).`]
      : veces && objetivo
        ? [`${cuando} has ido **${movs.length} ${movs.length === 1 ? 'vez' : 'veces'}**${que.replace(' en ', ' a ')} y has gastado **${eur(total)}** (${eur(total / movs.length)} de media cada vez).`]
        : [`${cuando} ${verbo} **${eur(total)}**${que} (${movs.length} ${movs.length === 1 ? 'pago' : 'pagos'}).`]

  // El desglose: por concepto si preguntas por algo concreto; por categoría si es el total.
  let filas = []
  if (objetivo) {
    const grupos = desglosePorConcepto(movs, devoluciones)
    if (grupos.length >= 2) filas = grupos.slice(0, 6).map((g) => ({ nombre: g.nombre, cent: g.cent, extra: `${g.n} ${g.n === 1 ? 'pago' : 'pagos'}` }))
  } else {
    const mapa = gastoPorCategoria([...movs, ...devoluciones])
    filas = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, v]) => ({ nombre: etiquetaCategoria(c), cent: Math.round(v * 100) }))
  }
  for (const f of filas) lineas.push(`- ${f.nombre}: **${eur(f.cent)}**${f.extra ? ` (${f.extra})` : ''}`)
  if (filas.length && objetivo) lineas.push(`- **Total: ${eur(total)}**`)
  // Viajes: agrupados por viaje (pagos a menos de 45 días entre sí: el vuelo
  // que reservas en julio y el hotel de agosto son el mismo viaje).
  if (objetivo && /viaje|vacacion/i.test(sinAcentos(objetivo.nombre))) {
    const orden = [...movs].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    const viajes = []
    for (const m of orden) {
      const v = viajes.at(-1)
      if (v && (Date.parse(m.fecha) - Date.parse(v.hasta)) / 86400000 <= 45) {
        v.hasta = m.fecha
        v.movs.push(m)
      } else viajes.push({ desde: m.fecha, hasta: m.fecha, movs: [m] })
    }
    if (viajes.length) {
      lineas.push(`- ${viajes.length === 1 ? 'Es 1 viaje' : `Son ${viajes.length} viajes`}: ${viajes.map((v) => `${formatearFecha(v.desde)}${v.hasta !== v.desde ? `–${formatearFecha(v.hasta)}` : ''} (${eur(v.movs.reduce((s2, m) => s2 + centimosDe(m), 0))})`).join(' · ')}.`)
      lineas.push('- Para el viaje entero (coche de alquiler, comidas allí…), pregúntame por esas fechas: «¿cuánto gasté del 1 al 15 de agosto?».')
    }
  }
  if (!filas.length) {
    const inc = queIncluye(objetivo, movimientos, hoyIso)
    if (inc) lineas.push(inc)
  }

  // Con desglose, la fila de meses solo en periodos cortos (claridad antes que volumen).
  const meses = !filas.length || porMeses(movs).length <= 4 ? lineaMeses(movs, p) : null
  const anios = !meses && porMeses(movs).length > 12 ? lineaAnios(movs) : null
  if (meses) lineas.push(`- Por meses: ${meses}`)
  if (anios) lineas.push(`- Por años: ${anios}`)
  if (devuelto > 0) lineas.push(`- Ya descontadas las devoluciones: ${eur(devuelto)}.`)
  if (media != null && !pideMedia) lineas.push(`- De media, **${eur(media)} al mes**.`)
  // Meses completos: también lo que va del mes en curso (y la suma con él).
  if (p.completos && !pideMedia) {
    const desdeMes = `${hoyIso.slice(0, 7)}-01`
    const actual = movimientos.filter((m) => esConsumo(m) && (filtro ?? (() => true))(m) && m.fecha >= desdeMes && m.fecha <= hoyIso)
    const devActual = movimientos.filter((m) => esDevolucion(m) && m.fecha >= desdeMes && m.fecha <= hoyIso && (!objetivo || (objetivo.filtroDevolucion ?? objetivo.filtro)(m)))
    const cActual = actual.reduce((s, m) => s + centimosDe(m), 0) - devActual.reduce((s, m) => s + centimosDe(m), 0)
    lineas.push(`- Con lo que va de ${MESES[Number(hoyIso.slice(5, 7)) - 1]} (${eur(cActual)} hasta el ${formatearFecha(hoyIso)}): **${eur(total + cActual)}**.`)
  }
  // Más valor con lo mismo: frente al mismo tramo del año anterior, y el
  // ticket medio y la frecuencia (si son compras sueltas, no una cuota).
  if (objetivo && p.desde && !pideMedia) {
    const menosUnAnio = (f) => `${Number(f.slice(0, 4)) - 1}${f.slice(4)}`
    const hasta = p.hasta > hoyIso ? hoyIso : p.hasta
    const antes = movimientos.filter((m) => esConsumo(m) && filtro?.(m) && m.fecha >= menosUnAnio(p.desde) && m.fecha <= menosUnAnio(hasta))
    const primeraDeTodas = movimientos.reduce((a, m) => (m.fecha < a ? m.fecha : a), hoyIso)
    if (antes.length && primeraDeTodas <= menosUnAnio(p.desde)) {
      const cAntes = antes.reduce((s2, m) => s2 + centimosDe(m), 0)
      const dif = cAntes > 0 ? Math.round((total / cAntes - 1) * 100) : null
      if (dif != null) lineas.push(`- Mismo periodo del año anterior: ${eur(cAntes)} (${dif === 0 ? 'igual' : `${dif > 0 ? '+' : '−'}${Math.abs(dif)} %`}).`)
    }
    if (movs.length >= 4 && new Set(movs.map(centimosDe)).size > 2) {
      const porMes = nMeses >= 2 ? movs.length / nMeses : null
      lineas.push(`- Ticket medio: ${eur(total / movs.length)}${porMes ? ` · unas ${String(Math.round(porMes * 10) / 10).replace('.', ',')} veces al mes` : ''}.`)
    }
  }
  let ultimo = null
  const reciente = p.tipo === 'todo' || !p.hasta || Date.parse(hoyIso) - Date.parse(p.hasta) < 45 * 86400000
  if (objetivo && reciente) {
    // El último de verdad (aunque sea de después del periodo preguntado).
    const suyos = movimientos.filter((m) => esConsumo(m) && filtro?.(m) && m.fecha <= hoyIso)
    ultimo = [...suyos, ...movs].reduce((a, m) => (m.fecha > a.fecha ? m : a), movs[0])
    lineas.push(`- Último: ${formatearFecha(ultimo.fecha)}, ${eur(centimosDe(ultimo))}.`)
    for (const cambio of historialDePrecio(suyos) ?? []) lineas.push(`- ${cambio}.`)
  }
  return {
    texto: lineas.join('\n'),
    tarjeta: {
      etiqueta: `${objetivo ? capital(objetivo.nombre) : 'Gasto'}${pideMedia && media != null ? ' · media al mes' : ''} · ${p.tipo === 'todo' ? 'desde el principio' : p.etiqueta.replace(/^en /, '')}`,
      cifra: pideMedia && media != null ? Math.round(media) / 100 : total / 100,
      detalle: [
        rango,
        pideMedia && media != null ? `total ${eur(total)}` : `${movs.length} ${movs.length === 1 ? 'pago' : 'pagos'}`,
        media != null && !pideMedia ? `${eur(media)}/mes de media` : null,
        ultimo ? `último ${formatearFecha(ultimo.fecha)}` : null,
      ].filter(Boolean).join(' · '),
      filas: filas.map((f) => ({ nombre: f.nombre, valor: f.cent / 100, extra: f.extra ?? null, pct: total > 0 ? Math.round((f.cent / total) * 100) : null })),
    },
  }
}

const mensualDe = (rec) => Number(rec.importe) / (periodoDe(rec).meses || 1)

// Cargos que se repiten en los movimientos (cuando aún no hay fijos guardados).
// Solo lo que es un compromiso de verdad: vivienda, recibos, seguros,
// suscripciones, gimnasio… Ir a la misma pizzería cada mes no es un fijo.
const CATEGORIAS_FIJAS = /vivienda|suministro|seguro|suscrip|deporte|educaci|impuesto|comision|prestamo|hipoteca|cuota/i
function cargosPeriodicos(movimientos, hoyIso) {
  return detectarSuscripciones(movimientos, [], { hoy: hoyIso })
    .map((d) => ({ ...d, categoriaNombre: d.categoriaNombre ?? '' }))
    .filter((d) => CATEGORIAS_FIJAS.test(sinAcentos(d.categoriaNombre)))
}


// ── Ingresos: cuánto, cuántos y de dónde ──────────────────────────────────────
// Misma regla que totalesDe: no son ingreso el saldo inicial/ajustes, traer
// dinero de tu ahorro, las devoluciones ni lo que sacas de una inversión.
// Se dicen aparte para que la cifra se entienda.
const tipoDeIngreso = (m) => {
  const c = sinAcentos(m.categoria?.nombre ?? '')
  const n = sinAcentos(m.nota ?? '')
  if (/nomina|salario|sueldo/.test(c + ' ' + n)) return /extra/.test(n) ? 'Pagas extra' : 'Nómina'
  return etiquetaCategoria(m.categoria?.nombre ?? 'Otros ingresos')
}
function respuestaIngresos(per, movimientos, hoyIso) {
  const dentro = movimientos.filter((m) => m.tipo === 'ingreso' && enPeriodo(per, hoyIso)(m))
  const reales = dentro.filter((m) => !esAjuste(m) && !esTraspaso(m) && !esDevolucion(m) && !esInversion(m))
  const primera = dentro.reduce((a, m) => (m.fecha < a ? m.fecha : a), hoyIso)
  const rango = rangoDe(per, primera, hoyIso)
  const cuando = per.tipo === 'todo' ? `Desde el ${formatearFecha(primera)} hasta hoy` : (per.explicito ? capital(per.etiqueta) : `${capital(per.etiqueta)} (${rango})`)
  if (!reales.length) {
    if (per.etiqueta !== 'este mes') return `${cuando} no han entrado ingresos.`
    // Este mes aún nada: cuándo suele llegar y cuánto entró el mes pasado.
    const ant = respuestaIngresos(periodo('el mes pasado', new Date(`${hoyIso}T12:00:00`)), movimientos, hoyIso)
    const dias = movimientos.filter((m) => m.tipo === 'ingreso' && /nomina|salario|sueldo/i.test(sinAcentos(`${m.categoria?.nombre} ${m.nota}`))).map((m) => Number(m.fecha.slice(8, 10)))
    const dia = dias.length ? dias.sort((a, b) => a - b)[Math.floor(dias.length / 2)] : null
    return `${cuando} aún no han entrado ingresos.${dia ? ` Tu nómina suele llegar hacia el día **${dia}**.` : ''}${typeof ant === 'object' ? ` El mes pasado entraron **${formatearEuros(ant.tarjeta.cifra)}**.` : ''}`
  }
  const total = reales.reduce((s, m) => s + centimosDe(m), 0)
  const grupos = new Map()
  for (const m of reales) {
    const k = tipoDeIngreso(m)
    const g = grupos.get(k) ?? { nombre: k, cent: 0, n: 0, de: new Set() }
    g.cent += centimosDe(m)
    g.n += 1
    // Quién paga, sin el concepto delante ("Nomina Consultora Levante" → "Consultora Levante").
    const quien = (nombreComercio(m) ?? '').replace(/^(nomina|paga extra|intereses|transferencia( de)?|abono|ingreso)\s+/i, '').trim()
    if (quien) g.de.add(quien)
    grupos.set(k, g)
  }
  const filas = [...grupos.values()].sort((a, b) => b.cent - a.cent)
  const nMeses = per.tipo === 'todo' ? mesesEntre(primera, hoyIso) : mesesEntre(per.desde, per.hasta > hoyIso ? hoyIso : per.hasta)
  const fuera = [
    ['saldo inicial y ajustes', dentro.filter(esAjuste)],
    ['dinero traído de tu ahorro', dentro.filter(esTraspaso)],
    ['devoluciones', dentro.filter(esDevolucion)],
    ['lo retirado de inversiones', dentro.filter(esInversion)],
  ].filter(([, l]) => l.length)
  const lineas = [
    `${cuando} han entrado **${eur(total)}** en ${reales.length} ${reales.length === 1 ? 'ingreso' : 'ingresos'}.`,
    ...filas.map((g) => `- ${g.nombre}: **${eur(g.cent)}** (${g.n} ${g.n === 1 ? 'vez' : 'veces'}${g.de.size === 1 ? `, de ${[...g.de][0]}` : ''})`),
    ...(nMeses >= 2 ? [`- De media, **${eur(total / nMeses)} al mes**.`] : []),
    ...(fuera.length ? [`- No cuentan como ingreso: ${fuera.map(([q, l]) => `${q} (${eur(l.reduce((s, m) => s + centimosDe(m), 0))})`).join(', ')}.`] : []),
  ]
  return {
    texto: lineas.join('\n'),
    tarjeta: {
      etiqueta: `Ingresos · ${per.tipo === 'todo' ? 'desde el principio' : per.etiqueta.replace(/^en /, '')}`,
      cifra: total / 100,
      detalle: [rango, `${reales.length} ${reales.length === 1 ? 'ingreso' : 'ingresos'}`, nMeses >= 2 ? `${eur(total / nMeses)}/mes de media` : null].filter(Boolean).join(' · '),
      filas: filas.map((g) => ({ nombre: g.nombre, valor: g.cent / 100, extra: `${g.n} ${g.n === 1 ? 'vez' : 'veces'}${g.de.size === 1 ? ` · ${[...g.de][0]}` : ''}`, pct: Math.round((g.cent / total) * 100) })),
      accion: 'analisis',
    },
  }
}

// ── Preguntas sobre el conjunto (sin IA) ──────────────────────────────────────
// Meses COMPLETOS con datos (sin el actual), con sus totales del motor.
function mesesCompletos(movimientos, hoyIso) {
  const actual = hoyIso.slice(0, 7)
  const porMes = new Map()
  for (const m of movimientos) {
    const k = m.fecha.slice(0, 7)
    if (k >= actual) continue
    if (!porMes.has(k)) porMes.set(k, [])
    porMes.get(k).push(m)
  }
  return [...porMes.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([clave, movs]) => ({ clave, ...totalesDe(movs) }))
}
const nombreMes = (clave) => {
  const [y, m] = clave.split('-').map(Number)
  return `${MESES[m - 1]} de ${y}`
}
const pct = (x) => `${Math.round(x)} %`
const signo = (dif) => (dif >= 0 ? '+' : '−')

// "¿Cómo voy este mes?" / "¿voy bien?": lo mismo que dice el inicio, con cifras.
function estadoDelMes(movimientos, hoy, presupuesto) {
  const r = resumenDelMes(movimientos, hoy)
  const t = r.totales
  const lineas = [`Llevas **${formatearEuros(t.gastos)}** gastados este mes (día ${r.dia} de ${r.diasMes}).`]
  if (r.ritmo) {
    const d = Math.round(r.ritmo.difPct)
    lineas.push(Math.abs(d) <= 5
      ? `- Vas **como siempre** a estas alturas (lo habitual: ${formatearEuros(r.ritmo.habitual)}).`
      : `- Vas un **${Math.abs(d)} % ${d > 0 ? 'por encima' : 'por debajo'}** de lo habitual a estas alturas (${formatearEuros(r.ritmo.habitual)}).`)
  }
  if (r.ingresoPendiente) lineas.push(`- Tu ingreso principal suele llegar hacia el **día ${r.diaIngresoHabitual}**: aún no ha entrado, así que el mes no está cerrado.`)
  else if (t.ingresos > 0) lineas.push(`- Han entrado ${formatearEuros(t.ingresos)}: llevas **${formatearEuros(t.ahorro)} ahorrados** (${pct(t.ratioAhorro)}).`)
  if (r.categorias.length) lineas.push(`- Donde más: ${r.categorias.filter((c) => !c.resto).map((c) => `${etiquetaCategoria(c.nombre)} ${formatearEuros(c.total)}`).join(' · ')}.`)
  if (presupuesto?.configurado) {
    lineas.push(presupuesto.restante >= 0
      ? `- Presupuesto: te quedan **${formatearEuros(presupuesto.restante)}** (≈ ${formatearEuros(presupuesto.puedeGastarAlDia)} al día).`
      : `- Presupuesto: te has pasado **${formatearEuros(-presupuesto.restante)}** de tu límite de ${formatearEuros(presupuesto.limiteGastoMes)}.`)
  }
  return {
    texto: lineas.join('\n'),
    tarjeta: {
      etiqueta: `Este mes · día ${r.dia} de ${r.diasMes}`,
      cifra: t.gastos,
      detalle: r.ritmo ? `${signo(r.ritmo.difPct)}${Math.abs(Math.round(r.ritmo.difPct))} % frente a lo habitual` : 'gastado hasta hoy',
      filas: r.categorias.filter((c) => !c.resto).map((c) => ({ nombre: etiquetaCategoria(c.nombre), valor: c.total, pct: Math.round(c.pct) })),
    },
  }
}

function respuestaPresupuesto(movimientos, hoy, presupuesto) {
  if (!presupuesto?.configurado) {
    // Sin presupuesto: una referencia con su propio gasto habitual (media de los 3 últimos meses completos).
    const hoyIso = iso(hoy)
    const ult = mesesCompletos(movimientos, hoyIso).filter((x) => x.gastos > 0).slice(-3)
    const r = resumenDelMes(movimientos, hoy)
    if (!ult.length) return 'Aún no tienes presupuesto. Créalo en **Plan → Presupuesto** y te digo cada día cuánto te queda.'
    const habitual = ult.reduce((s, x) => s + x.gastos, 0) / ult.length
    const queda = habitual - r.totales.gastos
    const porDia = queda > 0 ? queda / r.diasRestantes : 0
    return {
      texto: [
        queda > 0
          ? `Para gastar como un mes normal (${formatearEuros(Math.round(habitual))}), te quedan **${formatearEuros(Math.round(queda))}**: unos **${formatearEuros(Math.round(porDia))} al día** durante ${r.diasRestantes} días.`
          : `Ya llevas **${formatearEuros(r.totales.gastos)}**, más de lo que gastas en un mes normal (${formatearEuros(Math.round(habitual))}).`,
        '- Es una referencia con tu gasto habitual. Con un presupuesto en **Plan → Presupuesto** te lo digo según lo que quieras ahorrar.',
      ].join('\n'),
      tarjeta: { etiqueta: 'Puedes gastar al día · referencia', cifra: queda > 0 ? Math.round(porDia) : 0, detalle: `quedan ${formatearEuros(Math.max(0, Math.round(queda)))} para ${r.diasRestantes} días`, filas: [] },
    }
  }
  const p = presupuesto
  const lineas = p.restante >= 0
    ? [`Te quedan **${formatearEuros(p.restante)}** de tu límite de ${formatearEuros(p.limiteGastoMes)} este mes: unos **${formatearEuros(p.puedeGastarAlDia)} al día** durante ${p.diasRestantesMes} días.`]
    : [`Te has pasado **${formatearEuros(-p.restante)}** de tu límite de ${formatearEuros(p.limiteGastoMes)} (llevas ${formatearEuros(p.gastadoMes)}).`, `- Si el límite no cubre tus gastos fijos (alquiler, recibos), ajústalo en **Plan → Presupuesto**.`]
  lineas.push(`- Método: ${p.metodo}.`)
  return {
    texto: lineas.join('\n'),
    tarjeta: { etiqueta: 'Presupuesto · este mes', cifra: p.restante, detalle: `${formatearEuros(p.gastadoMes)} de ${formatearEuros(p.limiteGastoMes)} · ${p.restante >= 0 ? `${formatearEuros(p.puedeGastarAlDia)}/día` : 'límite superado'}`, filas: [] },
  }
}

function tasaDeAhorro(movimientos, hoyIso) {
  const completos = mesesCompletos(movimientos, hoyIso).filter((m) => m.ingresos > 0)
  if (!completos.length) return 'Aún no tengo un mes completo con ingresos para calcular tu tasa de ahorro.'
  const ult = completos.slice(-12)
  const ing = ult.reduce((s, m) => s + m.ingresos, 0)
  const aho = ult.reduce((s, m) => s + m.ahorro, 0)
  const ultimo = completos.at(-1)
  return {
    texto: [
      `En los últimos ${ult.length} meses ahorras el **${pct((aho / ing) * 100)}** de lo que ingresas: ${formatearEuros(Math.round(aho))} de ${formatearEuros(Math.round(ing))}.`,
      `- ${capital(nombreMes(ultimo.clave))}: ${pct(ultimo.ratioAhorro)} (${formatearEuros(ultimo.ahorro)}).`,
      '- Como referencia, ahorrar un 20 % ya es un buen ritmo. Invertir no resta: cuenta como ahorro.',
    ].join('\n'),
    tarjeta: { etiqueta: `Tasa de ahorro · últimos ${ult.length} meses`, cifra: null, cifraTexto: pct((aho / ing) * 100), detalle: `${formatearEuros(Math.round(aho))} ahorrados de ${formatearEuros(Math.round(ing))}`, filas: [] },
  }
}

function mesRecord(t, movimientos, hoyIso) {
  const completos = mesesCompletos(movimientos, hoyIso).filter((m) => m.gastos > 0 || m.ingresos > 0)
  if (completos.length < 2) return 'Necesito al menos dos meses completos para compararlos.'
  const deAhorro = /ahorr/.test(t)
  const menos = /\b(menos|peor|mas barato)\b/.test(t) && !/mas caro/.test(t)
  const valor = (m) => (deAhorro ? m.ahorro : m.gastos)
  const elegido = completos.reduce((a, m) => ((menos ? valor(m) < valor(a) : valor(m) > valor(a)) ? m : a), completos[0])
  const media = completos.reduce((s, m) => s + valor(m), 0) / completos.length
  const que = deAhorro ? (menos ? 'el mes que menos ahorraste' : 'el mes que más ahorraste') : menos ? 'tu mes más barato' : 'tu mes más caro'
  const mejor = (lista) => lista.reduce((a, m) => ((menos ? valor(m) < valor(a) : valor(m) > valor(a)) ? m : a), lista[0])
  // El mejor (o peor) de cada año…
  const anios = [...new Set(completos.map((m) => m.clave.slice(0, 4)))].sort()
  const porAnio = anios.map((a) => ({ anio: a, m: mejor(completos.filter((x) => x.clave.startsWith(a))), n: completos.filter((x) => x.clave.startsWith(a)).length }))
  // …y el mes del calendario que suele serlo (media de ese mes en todos los años).
  const porMes = new Map()
  for (const m of completos) {
    const k = Number(m.clave.slice(5, 7)) - 1
    const x = porMes.get(k) ?? { s: 0, n: 0 }
    x.s += valor(m)
    x.n += 1
    porMes.set(k, x)
  }
  const habituales = [...porMes.entries()].filter(([, x]) => x.n >= 2).map(([k, x]) => ({ k, media: x.s / x.n })).sort((a, b) => (menos ? a.media - b.media : b.media - a.media))
  // Por qué: entró bastante más de lo normal (paga extra) o se gastó mucho más.
  const ingMedio = completos.reduce((s, m) => s + m.ingresos, 0) / completos.length
  const gasMedio = completos.reduce((s, m) => s + m.gastos, 0) / completos.length
  const porQue = (m) => (deAhorro && !menos && m.ingresos > ingMedio * 1.3 ? ', entró más dinero de lo normal' : !deAhorro && !menos && m.gastos > gasMedio * 1.15 ? '' : deAhorro && menos && m.gastos > gasMedio * 1.2 ? ', gastaste más de lo normal' : '')
  const linHab = habituales.length >= 2 ? `- Normalmente, ${menos ? 'el que menos' : 'el que más'}: **${MESES[habituales[0].k]}** (${formatearEuros(Math.round(habituales[0].media))} de media)${habituales[1] ? ` y después ${MESES[habituales[1].k]} (${formatearEuros(Math.round(habituales[1].media))})` : ''}.` : null
  return {
    texto: [
      `${capital(que)} fue **${nombreMes(elegido.clave)}**: ${formatearEuros(valor(elegido))} ${deAhorro ? 'ahorrados' : 'gastados'} (tu media: ${formatearEuros(Math.round(media))} al mes)${porQue(elegido) ? `: ${porQue(elegido).slice(2)}${deAhorro ? ' (paga extra o similar)' : ''}` : ''}.`,
      ...(anios.length > 1 ? porAnio.map((x) => `- En ${x.anio}: ${MESES[Number(x.m.clave.slice(5, 7)) - 1]}, ${formatearEuros(valor(x.m))}${x.n < 12 ? ` (${x.n} meses con datos)` : ''}`) : []),
      ...(linHab ? [linHab] : []),
    ].join('\n'),
    tarjeta: {
      etiqueta: capital(que),
      cifra: valor(elegido),
      detalle: `${capital(nombreMes(elegido.clave))} · media ${formatearEuros(Math.round(media))}/mes`,
      filas: porAnio.map((x) => ({ nombre: `${x.anio} · ${MESES[Number(x.m.clave.slice(5, 7)) - 1]}`, valor: valor(x.m) })),
    },
  }
}

// Comparar con el mismo tramo del año o del mes anterior (no un mes entero
// contra medio mes).
function comparativa(t, movimientos, hoy, hoyIso) {
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  const d = hoy.getDate()
  const esAnio = /\bano\b|anual/.test(t)
  const A = esAnio ? { desde: `${y}-01-01`, hasta: hoyIso } : { desde: iso(new Date(y, m, 1)), hasta: hoyIso }
  const B = esAnio
    ? { desde: `${y - 1}-01-01`, hasta: iso(new Date(y - 1, m, d)) }
    : { desde: iso(new Date(y, m - 1, 1)), hasta: iso(new Date(y, m - 1, Math.min(d, new Date(y, m, 0).getDate()))) }
  const en = (P) => movimientos.filter((x) => x.fecha >= P.desde && x.fecha <= P.hasta)
  const tA = totalesDe(en(A))
  const tB = totalesDe(en(B))
  if (tB.gastos <= 0) return null
  const dif = ((tA.gastos - tB.gastos) / tB.gastos) * 100
  const cA = gastoPorCategoria(en(A))
  const cB = gastoPorCategoria(en(B))
  const cambios = [...new Set([...cA.keys(), ...cB.keys()])]
    .map((c) => ({ c, dif: (cA.get(c) ?? 0) - (cB.get(c) ?? 0) }))
    .filter((x) => Math.abs(x.dif) >= 1)
    .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif))
    .slice(0, 3)
  const tramo = esAnio ? `del 1 de enero al ${d} de ${MESES[m]}` : `del 1 al ${d}`
  const ref = esAnio ? `${y - 1}` : MESES[(m + 11) % 12]
  const sube = cambios.filter((x) => x.dif > 0)[0]
  const cabeza = /categoria/.test(t) && sube
    ? [`Donde más ha subido tu gasto este año es **${etiquetaCategoria(sube.c)}**: ${formatearEuros(Math.round(sube.dif * 100) / 100)} más que en el mismo tramo de ${ref}.`]
    : []
  return {
    texto: [
      ...cabeza,
      `${tramo.charAt(0).toUpperCase() + tramo.slice(1)} has gastado **${formatearEuros(tA.gastos)}**, un **${Math.abs(Math.round(dif))} % ${dif >= 0 ? 'más' : 'menos'}** que en el mismo tramo de ${ref} (${formatearEuros(tB.gastos)}).`,
      ...cambios.map((x) => `- ${etiquetaCategoria(x.c)}: ${x.dif >= 0 ? '+' : '−'}${formatearEuros(Math.abs(Math.round(x.dif * 100) / 100))}`),
      ...(tA.ingresos > 0 && tB.ingresos > 0 ? [`- Ahorro: ${formatearEuros(tA.ahorro)} frente a ${formatearEuros(tB.ahorro)}.`] : []),
    ].join('\n'),
    tarjeta: { etiqueta: `Gasto · frente a ${ref}`, cifra: tA.gastos, detalle: `${signo(dif)}${Math.abs(Math.round(dif))} % · antes ${formatearEuros(tB.gastos)}`, filas: cambios.map((x) => ({ nombre: etiquetaCategoria(x.c), valor: Math.round(x.dif * 100) / 100, conSigno: true })) },
  }
}

// Evolución del sueldo: la nómina habitual de cada año (sin pagas extra).
function evolucionSueldo(movimientos, hoyIso) {
  const nominas = movimientos.filter((m) => m.tipo === 'ingreso' && m.fecha <= hoyIso && /nomina|salario|sueldo/.test(sinAcentos(`${m.categoria?.nombre ?? ''} ${m.nota ?? ''}`)) && !/extra|paga extra|atrasos/.test(sinAcentos(m.nota ?? '')))
  if (!nominas.length) return 'No veo nóminas en tus movimientos. Si apuntas tu sueldo como ingreso de categoría Nómina, te digo cómo evoluciona.'
  const porAnio = new Map()
  for (const m of nominas) {
    const a = m.fecha.slice(0, 4)
    const conteo = porAnio.get(a) ?? new Map()
    conteo.set(centimosDe(m), (conteo.get(centimosDe(m)) ?? 0) + 1)
    porAnio.set(a, conteo)
  }
  const anios = [...porAnio.entries()].sort().map(([a, conteo]) => ({ a, cent: [...conteo.entries()].sort((x, z) => z[1] - x[1])[0][0] }))
  const filas = anios.map((x, i) => {
    const prev = anios[i - 1]
    return { nombre: x.a, valor: x.cent / 100, extra: prev && prev.cent !== x.cent ? `${prev.cent < x.cent ? '+' : '−'}${Math.abs(((x.cent / prev.cent - 1) * 100)).toFixed(1).replace('.', ',')} %` : null }
  })
  const primero = anios[0]
  const ultimo = anios.at(-1)
  const total = ((ultimo.cent / primero.cent - 1) * 100).toFixed(1).replace('.', ',')
  return {
    texto: [
      anios.length > 1 && ultimo.cent !== primero.cent
        ? `Tu nómina ha pasado de **${eur(primero.cent)}** (${primero.a}) a **${eur(ultimo.cent)}** (${ultimo.a}): un ${total} % más.`
        : `Tu nómina habitual es de **${eur(ultimo.cent)}** al mes.`,
      ...filas.map((f) => `- ${f.nombre}: ${formatearEuros(f.valor)}${f.extra ? ` (${f.extra})` : ''}`),
    ].join('\n'),
    tarjeta: { etiqueta: 'Nómina habitual', cifra: ultimo.cent / 100, detalle: anios.length > 1 ? `${total.startsWith('-') ? '' : '+'}${total} % desde ${primero.a}` : ultimo.a, filas },
  }
}

// Qué ha subido de precio: cargos que se repiten, último importe frente al de
// hace un año (o el primero que conste).
function subidasDePrecio(movimientos, hoyIso, soloSuscripciones = false) {
  const periodicos = detectarSuscripciones(movimientos, [], { hoy: hoyIso }).filter((d) => CATEGORIAS_FIJAS.test(sinAcentos(d.categoriaNombre ?? '')))
  const subidas = []
  for (const d of periodicos) {
    const pagos = movimientos.filter((m) => esConsumo(m) && nombreComercio(m) === d.nombre && m.fecha <= hoyIso).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    if (pagos.length < 2) continue
    const a = centimosDe(pagos[0]) // desde que hay datos
    const b = centimosDe(pagos.at(-1))
    if (b > a * 1.01) {
      const cuando = pagos.find((m) => centimosDe(m) === b)?.fecha // desde cuándo paga el precio actual
      const tipo = tipoNegociable({ nombre: d.nombre, categoriaNombre: d.categoriaNombre ?? '' })
      const digital = tipo === 'digital' || /suscrip/i.test(sinAcentos(d.categoriaNombre ?? ''))
      const vecesAlAnio = 12 / (d.periodoMeses || 1)
      subidas.push({ nombre: d.nombre, a, b, cuando, digital, tipo, extraAnual: (b - a) * vecesAlAnio })
    }
  }
  const lista = soloSuscripciones ? subidas.filter((x) => x.digital) : subidas
  if (!lista.length) return `No veo subidas de precio en tus ${soloSuscripciones ? 'suscripciones' : 'cargos que se repiten'}.`
  const linea = (x) => `- ${x.nombre}: ${eur(x.a)} → **${eur(x.b)}** (+${Math.round((x.b / x.a - 1) * 100)} %${x.cuando ? `, desde ${formatearFecha(x.cuando)}` : ''})`
  const digitales = subidas.filter((x) => x.digital)
  const negociables = subidas.filter((x) => !x.digital && ['energia', 'telefonia', 'seguro', 'banco', 'gimnasio'].includes(x.tipo))
  const otros = subidas.filter((x) => !x.digital && !negociables.includes(x))
  const extra = (soloSuscripciones ? digitales : subidas).reduce((s2, x) => s2 + x.extraAnual, 0)
  const lineas = [`Te ${lista.length === 1 ? 'ha' : 'han'} subido **${lista.length} ${soloSuscripciones ? (lista.length === 1 ? 'suscripción' : 'suscripciones') : lista.length === 1 ? 'cargo' : 'cargos'}**: pagas **${eur(extra)} más al año** que al principio.`]
  // Las suscripciones digitales tienen precio fijo: no se negocian.
  if (digitales.length) {
    if (!soloSuscripciones) lineas.push('Suscripciones (precio fijo, no se negocian):')
    lineas.push(...digitales.map(linea))
    lineas.push('- Qué puedes hacer: pasar al plan con anuncios o al familiar compartido, o pausarla los meses que no la uses (se reactiva cuando quieras).')
  }
  // Los recibos SÍ se negocian (móvil, luz, seguros…).
  if (negociables.length) {
    lineas.push(soloSuscripciones ? 'También han subido estos recibos, y estos sí se pueden negociar:' : 'Recibos que sí se pueden negociar:')
    lineas.push(...negociables.map(linea))
    lineas.push('- Llama con una oferta de otra compañía delante (en seguros, entre 45 y 30 días antes de renovar). En **Fijos → Tu plan de ahorro** tienes el guion.')
  }
  // Alquiler, cuotas…: no se negocian llamando a otra compañía.
  if (otros.length && !soloSuscripciones) {
    lineas.push('Otros que han subido:')
    lineas.push(...otros.map(linea))
    if (otros.some((x) => /alquiler|vivienda/i.test(sinAcentos(x.nombre)))) lineas.push('- Alquiler: comprueba que la subida es la que permite tu contrato.')
  }
  return {
    texto: lineas.join('\n'),
    tarjeta: {
      etiqueta: 'Subidas de precio',
      cifra: extra / 100,
      detalle: 'más al año que al principio',
      filas: (soloSuscripciones ? [...digitales, ...negociables] : [...digitales, ...negociables, ...otros]).map((x) => ({ nombre: x.nombre, valor: x.b / 100, extra: `antes ${eur(x.a)} · ${x.digital ? 'no se negocia' : negociables.includes(x) ? 'negociable' : 'revisa el contrato'}` })),
      accion: 'fijos',
    },
  }
}

// Cuenta de ahorro: lo apartado (traspasos) menos lo que trajo de vuelta.
function cuentaDeAhorro(movimientos, hoyIso) {
  const ida = movimientos.filter((m) => m.tipo === 'gasto' && m.categoria?.nombre === 'Ahorro' && m.fecha <= hoyIso)
  const vuelta = movimientos.filter((m) => m.tipo === 'ingreso' && m.categoria?.nombre === 'Desde ahorro' && m.fecha <= hoyIso)
  if (!ida.length && !vuelta.length) return 'No veo traspasos a una cuenta de ahorro. Si apartas dinero, apúntalo como gasto de categoría **Ahorro** (no cuenta como gasto) y te llevo la cuenta.'
  const a = ida.reduce((s, m) => s + centimosDe(m), 0)
  const b = vuelta.reduce((s, m) => s + centimosDe(m), 0)
  return {
    texto: [
      `Has apartado **${eur(a)}** a tu cuenta de ahorro (${ida.length} ${ida.length === 1 ? 'traspaso' : 'traspasos'})${b ? ` y has traído ${eur(b)} de vuelta` : ''}: en neto, **${eur(a - b)}**.`,
      '- Sin contar los intereses que te pague esa cuenta. Para Palanca sigue siendo dinero tuyo y disponible: está dentro de tu patrimonio.',
    ].join('\n'),
    tarjeta: { etiqueta: 'Cuenta de ahorro · neto apartado', cifra: (a - b) / 100, detalle: `${eur(a)} apartados${b ? ` · ${eur(b)} de vuelta` : ''}`, filas: [] },
  }
}

// Cuánto ha cambiado el patrimonio en un periodo (mismas bolsas que el inicio).
function crecimientoPatrimonio(t, movimientos, hoy, hoyIso) {
  const p = periodo(t, hoy) ?? { desde: `${hoy.getFullYear()}-01-01`, hasta: hoyIso, etiqueta: `en lo que va de ${hoy.getFullYear()}` }
  if (p.tipo === 'todo' || !p.desde) return null
  const dia = new Date(`${p.desde}T12:00:00`)
  const antes = bolsas(movimientos, iso(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - 1))).patrimonio
  const ahora = bolsas(movimientos, p.hasta < hoyIso ? p.hasta : hoyIso).patrimonio
  const dif = ahora - antes
  return {
    texto: `${capital(p.etiqueta)} tu patrimonio ha ${dif >= 0 ? 'crecido' : 'bajado'} **${formatearEuros(Math.abs(Math.round(dif * 100) / 100))}**: de ${formatearEuros(antes)} a ${formatearEuros(ahora)}${antes > 0 ? ` (${dif >= 0 ? '+' : '−'}${Math.abs(Math.round((dif / antes) * 100))} %)` : ''}. Es lo que has ahorrado; las inversiones van a lo que aportaste, sin la rentabilidad.`,
    tarjeta: { etiqueta: `Patrimonio · ${p.etiqueta.replace(/^en /, '')}`, cifra: Math.round(dif * 100) / 100, conSigno: true, detalle: `${formatearEuros(antes)} → ${formatearEuros(ahora)}`, filas: [] },
  }
}

// Media de los últimos meses COMPLETOS (ingresos, gastos, ahorro).
function medias(movimientos, hoyIso, n = 3) {
  const ult = mesesCompletos(movimientos, hoyIso).filter((x) => x.ingresos > 0 || x.gastos > 0).slice(-n)
  if (!ult.length) return null
  const media = (k) => ult.reduce((s, x) => s + x[k], 0) / ult.length
  return { n: ult.length, ingresos: media('ingresos'), gastos: media('gastos'), ahorro: media('ahorro') }
}

// "¿Llegaré a fin de mes?": lo que suele entrar y gastar, frente a lo que lleva.
function finDeMes(movimientos, hoy) {
  const hoyIso = iso(hoy)
  const r = resumenDelMes(movimientos, hoy)
  const m = medias(movimientos, hoyIso, 3)
  if (!m) return null
  const ingresos = Math.max(r.totales.ingresos, r.ingresoPendiente ? m.ingresos : r.totales.ingresos)
  const gastoPrevisto = Math.max(r.totales.gastos, r.ritmo ? r.totales.gastos + (m.gastos - r.ritmo.habitual) : m.gastos)
  const final = ingresos - gastoPrevisto
  return {
    texto: [
      final >= 0
        ? `**Sí**, si el mes sigue como siempre: acabarías con unos **${formatearEuros(Math.round(final))} de ahorro**.`
        : `**Vas justo**: si el mes sigue como siempre, gastarías unos **${formatearEuros(Math.round(-final))} más** de lo que entra.`,
      `- Llevas ${formatearEuros(r.totales.gastos)} gastados; en lo que queda de mes sueles gastar unos ${formatearEuros(Math.max(0, Math.round(gastoPrevisto - r.totales.gastos)))} más.`,
      r.ingresoPendiente ? `- Tu ingreso (≈ ${formatearEuros(Math.round(m.ingresos))}) suele llegar hacia el día ${r.diaIngresoHabitual}.` : `- Este mes han entrado ${formatearEuros(r.totales.ingresos)}.`,
    ].join('\n'),
    tarjeta: { etiqueta: 'Fin de mes · previsión', cifra: Math.round(final), conSigno: true, detalle: `entra ≈ ${formatearEuros(Math.round(ingresos))} · gasto ≈ ${formatearEuros(Math.round(gastoPrevisto))}`, filas: [] },
  }
}

const cantidadDe = (t) => {
  const m = t.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,\d+)?\s*(mil|k)?\b/)
  if (!m) return null
  const n = Number(m[1].replace(/[.\s]/g, ''))
  return m[2] ? n * 1000 : n
}

// "¿Cuándo llegaré a 20.000 €?": con lo que tiene y lo que ahorra de media.
function cuandoLlegare(t, movimientos, hoy) {
  const meta = cantidadDe(t)
  if (!meta || meta < 10) return null
  const hoyIso = iso(hoy)
  const b = bolsas(movimientos, hoyIso)
  const m = medias(movimientos, hoyIso, 12)
  if (b.patrimonio >= meta) return `**Ya los tienes**: tu patrimonio es de ${formatearEuros(b.patrimonio)} (${formatearEuros(b.bolsaLiquidez)} disponibles y ${formatearEuros(b.bolsaInversion)} invertidos).`
  if (!m || m.ahorro <= 0) return `Te faltan **${formatearEuros(Math.round(meta - b.patrimonio))}**, pero ahora mismo no ahorras de media: primero hay que conseguir que cada mes sobre algo.`
  const meses = Math.ceil((meta - b.patrimonio) / m.ahorro)
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + meses, 1)
  return {
    texto: [
      `A tu ritmo, en **${meses} ${meses === 1 ? 'mes' : 'meses'}** (hacia **${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}**).`,
      `- Tienes ${formatearEuros(b.patrimonio)} y ahorras de media ${formatearEuros(Math.round(m.ahorro))} al mes (últimos ${m.n} meses).`,
      '- Supone que sigues ahorrando igual. En **Plan → Simuladores** puedes probar otras cantidades.',
    ].join('\n'),
    tarjeta: { etiqueta: `Llegar a ${formatearEuros(meta)}`, cifra: null, cifraTexto: `${meses} ${meses === 1 ? 'mes' : 'meses'}`, detalle: `hacia ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()} · faltan ${formatearEuros(Math.round(meta - b.patrimonio))}`, filas: [] },
  }
}

// "¿Cuánto tendré a final de año?": lo de hoy + su ahorro medio por los meses que quedan.
function finalDeAnio(movimientos, hoy) {
  const hoyIso = iso(hoy)
  const b = bolsas(movimientos, hoyIso)
  const m = medias(movimientos, hoyIso, 12)
  if (!m) return null
  const r = resumenDelMes(movimientos, hoy)
  const quedan = 11 - hoy.getMonth() // meses completos que quedan tras este
  const esteMes = Math.max(0, (r.ingresoPendiente ? m.ingresos : r.totales.ingresos) - Math.max(r.totales.gastos, m.gastos))
  const final = b.patrimonio + esteMes + m.ahorro * quedan
  return {
    texto: [
      `Si sigues como hasta ahora, acabarías el año con unos **${formatearEuros(Math.round(final))}** de patrimonio.`,
      `- Hoy: ${formatearEuros(b.patrimonio)}. Ahorras de media ${formatearEuros(Math.round(m.ahorro))} al mes${quedan > 0 ? `, y quedan ${MESES.slice(hoy.getMonth() + 1).join(' y ').replace(/ y (?=.* y )/g, ', ')} además de lo que queda de ${MESES[hoy.getMonth()]}` : ''}.`,
      '- Es una estimación: las pagas extra o un gasto grande la cambian.',
    ].join('\n'),
    tarjeta: { etiqueta: `Final de ${hoy.getFullYear()} · estimación`, cifra: Math.round(final), detalle: `hoy ${formatearEuros(b.patrimonio)} · ahorro medio ${formatearEuros(Math.round(m.ahorro))}/mes`, filas: [] },
  }
}

// Las preguntas "del conjunto": se miran ANTES que el filtro de criterio
// (palabras como "voy bien" o "subido" no siempre piden opinión).
function intencionGeneral(t, { movimientos, recurrentes = [], hoy, hoyIso, presupuesto, objetivos = [], objetivoUsuario = null }) {
  const consejo = consejoConDatos(t, { movimientos, recurrentes, hoy, hoyIso, presupuesto, objetivos, objetivoUsuario })
  if (consejo) return consejo
  const pideOpinion = /\b(deberia|conviene|compensa|recomiend|aconsej|como (puedo|podria|hago|consigo|reduzco|ahorro|mejoro)|que hago|por que|porque)\b/.test(t)
  if (pideOpinion) return null
  if (/\b(presupuesto|cuanto me queda|cuanto puedo gastar|me queda para gastar|limite de gasto)\b/.test(t)) return respuestaPresupuesto(movimientos, hoy, presupuesto)
  if (/\b(como voy|como va (el|este) mes|voy bien|como llevo el mes|que tal voy|como ando|como vamos)\b/.test(t)) return estadoDelMes(movimientos, hoy, presupuesto)
  if (/\btasa de ahorro\b|\b(que|cuanto) porcentaje\b.*\bahorr|\bque parte\b.*\bahorr/.test(t)) return tasaDeAhorro(movimientos, hoyIso)
  if (/\b(mes mas caro|mes mas barato|mejor mes|peor mes)\b|\b(que|cual|en que) mes\b.*\b(mas|menos)\b/.test(t)) return mesRecord(t, movimientos, hoyIso)
  if (/\b(sueldo|nomina|salario)\b/.test(t) && /\b(subido|subida|cuanto cobro|cuanto gano|evolucion|ha cambiado|aumentado)\b/.test(t)) return evolucionSueldo(movimientos, hoyIso)
  if (/\bpatrimonio\b/.test(t) && /\b(crecido|aumentado|subido|bajado|cambiado|evolucion|ganado)\b/.test(t)) return crecimientoPatrimonio(t, movimientos, hoy, hoyIso)
  if (/\b(subido|subida|suben|encarecido)\b/.test(t) && /\b(precio|precios|suscripcion|suscripciones|recibo|recibos|cargos|fijos|que me)\b/.test(t)) return subidasDePrecio(movimientos, hoyIso, /\bsuscripcion/.test(t))
  if (/\bcuenta (de )?ahorro\b/.test(t) && /\b(cuanto|tengo|llevo|hay)\b/.test(t)) return cuentaDeAhorro(movimientos, hoyIso)
  if (/\b(llegare|llego|llegamos)\b.*\bfin(al)? de mes\b/.test(t)) return finDeMes(movimientos, hoy)
  if (/\b(cuando|cuanto tiempo|cuantos meses)\b.*\b(llegare|llego|tendre|ahorrare|consigo|alcanzo|junto|juntare)\b/.test(t) && cantidadDe(t)) return cuandoLlegare(t, movimientos, hoy)
  if (/\b(cuanto|que)\b.*\b(tendre|habre ahorrado|acabare|terminare)\b.*\b(final|fin) de(l)? ano\b/.test(t)) return finalDeAnio(movimientos, hoy)
  if (/\b(voy|estoy|va|vamos)\b.*\b(mejor|peor)\b.*\b(pasado|anterior)\b/.test(t)) return comparativa(/\bano\b/.test(t) ? 'ano' : 'mes', movimientos, hoy, hoyIso)
  if (/\b(gasto|gastado|gastando|gasta)\b/.test(t) && /\b(mas|menos) que\b.*\b(ano|mes) (pasado|anterior)\b|\b(comparado|comparo|frente) (con|al)\b|\brespecto (al|a)\b/.test(t)) return comparativa(t, movimientos, hoy, hoyIso)
  if (/\b(categoria|en que)\b.*\b(aumentado|subido|crecido)\b/.test(t)) return comparativa('ano categoria', movimientos, hoy, hoyIso)
  return null
}


// ══ CONSEJO CON DATOS (sin IA) ══════════════════════════════════════════════
// Preguntas de criterio que se responden con SUS números y reglas claras
// (colchón de 3–6 meses, referencia de ahorro del 20 %, recibos negociables…).
// Lenguaje llano: "de cada 100 € que entran, apartas 36" mejor que "36 %".
// Siempre con la opción de "Que lo analice Fulcro" (IA) debajo.

const DISCRECIONAL = /restaurant|ocio|compras|ropa|caprichos|delivery|cuidado personal|regalos|bares|copas|tabaco|juegos/
const eurR = (x) => formatearEuros(Math.round(x))
const mesesTexto = (n) => `${String(Math.round(n * 10) / 10).replace('.', ',')} ${Math.round(n * 10) / 10 === 1 ? 'mes' : 'meses'}`
const enFecha = (hoy, meses) => {
  const f = new Date(hoy.getFullYear(), hoy.getMonth() + meses, 1)
  return `${MESES[f.getMonth()]} de ${f.getFullYear()}`
}

// Gasto medio por categoría (€/mes) en una lista de meses completos.
function porCategoriaMedia(movimientos, claves) {
  const set = new Set(claves)
  const mapa = gastoPorCategoria(movimientos.filter((m) => set.has(m.fecha.slice(0, 7))))
  return new Map([...mapa.entries()].map(([c, v]) => [c, v / Math.max(1, claves.length)]))
}

// Objetivos de ahorro: cuánto falta, si llega a tiempo y, con varios, que elija.
function lineasObjetivos(objetivos, ahorroMes, hoy) {
  const pendientes = (objetivos ?? []).filter((o) => o.faltan > 0)
  if (!pendientes.length) return []
  const lineas = pendientes.slice(0, 3).map((o) => {
    const meses = ahorroMes > 0 ? Math.ceil(o.faltan / ahorroMes) : null
    let fechaTxt = ''
    if (o.fecha && meses != null) {
      const [y, m] = String(o.fecha).split('-').map(Number)
      const hasta = (y - hoy.getFullYear()) * 12 + (m - 1 - hoy.getMonth())
      if (hasta > 0 && meses > hasta) fechaTxt = ` Para llegar a tu fecha harían falta ${eurR(o.faltan / hasta)} al mes.`
    }
    return `- «${o.nombre}»: te faltan **${eurR(o.faltan)}**${meses != null ? `; a tu ritmo, en ${meses} ${meses === 1 ? 'mes' : 'meses'} (hacia ${enFecha(hoy, meses)})` : ''}.${fechaTxt}`
  })
  if (pendientes.length >= 2 && ahorroMes > 0) {
    const total = pendientes.reduce((s2, o) => s2 + o.faltan, 0)
    lineas.push(`- Para todos a la vez necesitas ${eurR(total)}: ¿cuál va primero? Dímelo y te digo cuándo llegas si le dedicas todo tu ahorro.`)
  }
  return lineas
}

function ahorroSuficiente({ movimientos, hoy, hoyIso, objetivos, objetivoUsuario }) {
  const comp = mesesCompletos(movimientos, hoyIso).filter((x) => x.ingresos > 0 || x.gastos > 0)
  const ult = comp.slice(-12)
  if (ult.length < 3) return null
  const ing = ult.reduce((s2, x) => s2 + x.ingresos, 0)
  const aho = ult.reduce((s2, x) => s2 + x.ahorro, 0)
  if (ing <= 0) return null
  const tasa = (aho / ing) * 100
  const mediaMes = aho / ult.length
  const tres = comp.slice(-3)
  const aho3 = tres.reduce((s2, x) => s2 + x.ahorro, 0) / tres.length
  const veredicto = tasa >= 20 ? 'Sí, ahorras bien' : tasa >= 10 ? 'Vas bien, con margen para más' : tasa > 0 ? 'Ahorras poco' : 'Ahora mismo no: gastas lo que entra o más'
  const lineas = [
    `**${veredicto}**: de cada 100 € que entran, apartas **${Math.max(0, Math.round(tasa))}**. La referencia habitual es apartar 20.`,
    `- Son **${eurR(mediaMes)} al mes** de media (${eurR(aho)} en los últimos ${ult.length} meses).`,
  ]
  // Tendencia: los 3 últimos meses frente a la media, y por qué.
  if (tres.length === 3 && ult.length >= 6 && Math.abs(aho3 - mediaMes) > mediaMes * 0.2) {
    const antes = porCategoriaMedia(movimientos, ult.map((x) => x.clave))
    const ahora = porCategoriaMedia(movimientos, tres.map((x) => x.clave))
    const sube = [...ahora.entries()].map(([c, v]) => ({ c, dif: v - (antes.get(c) ?? 0) })).sort((a, b) => b.dif - a.dif)[0]
    lineas.push(
      aho3 < mediaMes
        ? `- Ojo: estos 3 últimos meses apartas menos, **${eurR(aho3)} al mes**${sube && sube.dif > 20 ? `; lo que más ha crecido es ${etiquetaCategoria(sube.c)} (unos ${eurR(sube.dif)} más al mes)` : ''}.`
        : `- Vas a más: estos 3 últimos meses, **${eurR(aho3)} al mes**.`,
    )
  }
  const obj = lineasObjetivos(objetivos, mediaMes, hoy)
  if (obj.length) lineas.push(...obj)
  else lineas.push('- Ponle nombre y cifra a lo que quieres (un piso, un viaje, jubilarte): con un objetivo te digo si llegas y cuándo. Créalo en **Plan → Simuladores**.')
  if (/jubil/.test(sinAcentos(objetivoUsuario ?? ''))) lineas.push('- Para tu jubilación: en **Simuladores → Independencia financiera** ves cuánto necesitarías y cuándo podrías dejar de trabajar.')
  return {
    texto: lineas.join('\n'),
    tarjeta: {
      etiqueta: `Tu ahorro · últimos ${ult.length} meses`,
      cifra: null,
      cifraTexto: `${Math.max(0, Math.round(tasa))} de cada 100 €`,
      detalle: `${eurR(mediaMes)}/mes de media · referencia: 20 de cada 100`,
      filas: [],
      accion: 'simuladores',
    },
  }
}

function colchon({ movimientos, hoyIso }) {
  const ult = mesesCompletos(movimientos, hoyIso).filter((x) => x.gastos > 0).slice(-12)
  if (ult.length < 2) return null
  const gasto = ult.reduce((s2, x) => s2 + x.gastos, 0) / ult.length
  const ahorro = ult.reduce((s2, x) => s2 + x.ahorro, 0) / ult.length
  const liq = bolsas(movimientos, hoyIso).bolsaLiquidez
  const cubre = gasto > 0 ? liq / gasto : 0
  const veredicto = cubre < 1 ? 'Muy justo' : cubre < 3 ? 'Todavía corto' : cubre <= 6 ? 'Sí, tienes un buen colchón' : 'Sí, y de sobra'
  const lineas = [
    `**${veredicto}**: tu dinero disponible (${eurR(liq)}) cubre **${mesesTexto(cubre)}** de tus gastos.`,
    `- Un buen colchón son de 3 a 6 meses de gastos: para ti, entre **${eurR(gasto * 3)} y ${eurR(gasto * 6)}** (gastas ${eurR(gasto)} al mes).`,
  ]
  if (cubre < 3) {
    const falta = gasto * 3 - liq
    lineas.push(ahorro > 0 ? `- Te faltan ${eurR(falta)} para el mínimo: apartando ${eurR(ahorro)} al mes, en unos ${Math.ceil(falta / ahorro)} meses.` : `- Te faltan ${eurR(falta)} para el mínimo. Primero, que cada mes sobre algo.`)
    lineas.push('- Hasta tenerlo, mejor no invertir lo que podrías necesitar.')
  } else if (cubre > 6) {
    lineas.push(`- Lo que pasa de 6 meses (unos ${eurR(liq - gasto * 6)}) podría ir a tus objetivos o a largo plazo. En **Simuladores → Interés compuesto** ves qué daría con el tiempo.`)
  }
  lineas.push('- Es lo que tienes registrado en Palanca: si no cuadra con tu banco, usa «Ajustar saldo» en el Inicio.')
  return {
    texto: lineas.join('\n'),
    tarjeta: { etiqueta: 'Colchón de emergencia', cifra: null, cifraTexto: mesesTexto(cubre), detalle: `${eurR(liq)} disponibles · objetivo ${eurR(gasto * 3)}–${eurR(gasto * 6)}`, filas: [], accion: 'simuladores' },
  }
}

// Suscripciones (precio fijo): de Fijos o, si no hay, las detectadas.
function suscripcionesDe(movimientos, recurrentes, hoyIso) {
  const activos = recurrentes.filter((r) => r.activo !== false && r.tipo !== 'ingreso' && (/suscrip|ocio|digital/i.test(r.categoriaNombre ?? '') || tipoNegociable(r) === 'digital'))
  if (activos.length) return activos.map((r) => ({ nombre: r.nombre, mensual: mensualDe(r), importe: Number(r.importe), meses: periodoDe(r).meses || 1 }))
  return detectarSuscripciones(movimientos, [], { hoy: hoyIso })
    .filter((d) => /suscrip/i.test(sinAcentos(d.categoriaNombre ?? '')))
    .map((d) => ({ nombre: d.nombre, mensual: d.importe / (d.periodoMeses || 1), importe: d.importe, meses: d.periodoMeses || 1 }))
}

function queSuscripcionQuitar({ movimientos, recurrentes, hoyIso }) {
  const subs = suscripcionesDe(movimientos, recurrentes, hoyIso).sort((a, b) => b.mensual - a.mensual)
  if (!subs.length) return 'No veo suscripciones en tus movimientos ni en Fijos. Si tienes alguna, añádela en **Fijos** y te digo cuánto te cuestan al año.'
  const anual = subs.reduce((s2, x) => s2 + x.mensual * 12, 0)
  return {
    texto: [
      `Tus suscripciones te cuestan **${eurR(anual)} al año**. La decisión es tuya; esto es lo que pesa cada una:`,
      ...subs.map((x) => `- ${x.nombre}: ${formatearEuros(x.importe)}${x.meses === 12 ? ' al año' : x.meses > 1 ? ` cada ${x.meses} meses` : ' al mes'} = **${eurR(x.mensual * 12)} al año**`),
      '- La pregunta clave: ¿cuál has usado menos este último mes? Esa es la candidata.',
      '- Sin quitarla del todo: plan con anuncios o familiar compartido, o pausarla y rotar (una plataforma cada mes).',
    ].join('\n'),
    tarjeta: { etiqueta: 'Suscripciones · al año', cifra: anual, detalle: `${subs.length} suscripciones · ${eurR(anual / 12)}/mes`, filas: subs.map((x) => ({ nombre: x.nombre, valor: Math.round(x.mensual * 1200) / 100, extra: 'al año' })), accion: 'fijos' },
  }
}

function renegociar(t, { movimientos, hoyIso }) {
  const obj = resolverObjetivo(t.replace(/\b(renegociar|negociar|cambiar|cambio|compania|compensa|conviene|merece|pena|tarifa|me|de|la|el)\b/g, ' ').replace(/\s+/g, ' ').trim(), movimientos)
  if (obj.sin || !obj.filtro) return null
  const suyos = movimientos.filter((m) => esConsumo(m) && obj.filtro(m) && m.fecha <= hoyIso)
  if (!suyos.length) return null
  const consejo = consejoNegociable(obj, suyos, hoyIso)
  if (!consejo) return null
  const tipo = tipoNegociable({ nombre: nombreComercio(suyos[0]) || obj.nombre, categoriaNombre: suyos[0].categoria?.nombre ?? '' }) ?? 'energia'
  const pal = PALANCAS[tipo]
  const anual = suyos.filter((m) => m.fecha > `${Number(hoyIso.slice(0, 4)) - 1}${hoyIso.slice(4)}`).reduce((s2, m) => s2 + centimosDe(m), 0) / 100
  const rango = pal?.ahorro && anual > 0 ? ` Suele poder rebajarse entre un ${Math.round(pal.ahorro[0] * 100)} y un ${Math.round(pal.ahorro[1] * 100)} %: de **${eurR(anual * pal.ahorro[0])} a ${eurR(anual * pal.ahorro[1])} al año** para ti (es orientativo).` : ''
  return {
    texto: [`**Merece la pena intentarlo**: llamar no cuesta nada y pagas ${eurR(anual)} al año en ${obj.nombre}.${rango}`, ...consejo.lineas].join('\n'),
    tarjeta: { etiqueta: `${capital(obj.nombre)} · renegociar`, cifra: anual, detalle: 'lo que pagas al año', filas: [], accion: 'fijos' },
  }
}

function puedoPermitirme(t, { movimientos, hoy, hoyIso }) {
  const cantidad = cantidadDe(t)
  if (!cantidad || cantidad < 20) return null
  const comp = mesesCompletos(movimientos, hoyIso).filter((x) => x.ingresos > 0 || x.gastos > 0)
  const ult = comp.slice(-12)
  if (ult.length < 2) return null
  const ahorro = ult.reduce((s2, x) => s2 + x.ahorro, 0) / ult.length
  const gasto = ult.reduce((s2, x) => s2 + x.gastos, 0) / ult.length
  const liq = bolsas(movimientos, hoyIso).bolsaLiquidez
  const mesIdx = MESES.findIndex((n) => new RegExp(`\\b${n}\\b`).test(t))
  const hasta = mesIdx < 0 ? 0 : (mesIdx - hoy.getMonth() + 12) % 12
  const cuando = mesIdx < 0 ? 'ahora' : `en ${MESES[mesIdx]}`
  const ahorroHasta = Math.max(0, ahorro) * hasta
  // Ese mes en tu historia: ¿suele costar o entrar más? (diciembre: regalos y paga extra)
  const mismos = mesIdx < 0 ? [] : comp.filter((x) => Number(x.clave.slice(5, 7)) - 1 === mesIdx)
  const extraGasto = mismos.length ? mismos.reduce((s2, x) => s2 + x.gastos, 0) / mismos.length - gasto : 0
  const extraIngreso = mismos.length ? mismos.reduce((s2, x) => s2 + x.ingresos, 0) / mismos.length - ult.reduce((s2, x) => s2 + x.ingresos, 0) / ult.length : 0
  const colchonMin = gasto * 3
  const quedaria = liq + ahorroHasta - cantidad
  const veredicto =
    ahorroHasta >= cantidad ? `**Sí**: de aquí a ${MESES[mesIdx] ?? 'entonces'} ahorras más que eso, sin tocar lo que ya tienes`
      : quedaria >= colchonMin ? `**Sí**: te quedaría un colchón de ${mesesTexto(quedaria / gasto)} de gastos`
        : liq + ahorroHasta >= cantidad ? '**Podrías, pero justo**: te quedarías con menos de 3 meses de colchón'
          : '**Ahora mismo no**: no te llega sin endeudarte'
  const lineas = [
    `${veredicto}.`,
    `- Tienes ${eurR(liq)} disponibles${hasta ? ` y, a tu ritmo (${eurR(ahorro)} al mes), sumarás unos ${eurR(ahorroHasta)} hasta ${MESES[mesIdx]}` : ''}.`,
    `- ${eurR(cantidad)} son ${ahorro > 0 ? `${mesesTexto(cantidad / ahorro)} de tu ahorro` : 'más de lo que te sobra al mes'}.`,
  ]
  if (mismos.length && Math.abs(extraGasto) > gasto * 0.1) lineas.push(`- Ojo: ${cuando} sueles gastar ${extraGasto > 0 ? 'más' : 'menos'} de lo normal (unos ${eurR(Math.abs(extraGasto))} ${extraGasto > 0 ? 'más' : 'menos'}).`)
  if (mismos.length && extraIngreso > gasto * 0.3) lineas.push(`- A favor: ${cuando} suele entrar más dinero (unos ${eurR(extraIngreso)} más; paga extra o similar).`)
  lineas.push(`- Después te quedarían unos ${eurR(Math.max(0, quedaria))}; tu colchón mínimo recomendado es ${eurR(colchonMin)} (3 meses de gastos).`)
  return {
    texto: lineas.join('\n'),
    tarjeta: { etiqueta: `${eurR(cantidad)} ${cuando}`, cifra: null, cifraTexto: veredicto.replace(/\*\*/g, '').split(':')[0], detalle: `te quedarían ${eurR(Math.max(0, quedaria))} · colchón mínimo ${eurR(colchonMin)}`, filas: [] },
  }
}

function comoAhorrarMas({ movimientos, recurrentes, hoyIso }) {
  const comp = mesesCompletos(movimientos, hoyIso).filter((x) => x.gastos > 0)
  const ult = comp.slice(-12)
  if (ult.length < 2) return null
  const palancas = []
  // 1) Recibos negociables (lo que pagas al año × lo que se suele rebajar).
  for (const d of cargosPeriodicos(movimientos, hoyIso)) {
    const tipo = tipoNegociable({ nombre: d.nombre, categoriaNombre: d.categoriaNombre ?? '' })
    const pal = PALANCAS[tipo]
    if (!pal?.negociable || tipo === 'digital' || tipo === 'gimnasio') continue
    const anual = (d.importe * 12) / (d.periodoMeses || 1)
    palancas.push({ texto: `Renegociar ${d.nombre} (${eurR(anual)} al año)`, min: anual * pal.ahorro[0], max: anual * pal.ahorro[1] })
  }
  // 2) Suscripciones: quitar o pausar la que menos uses.
  const subs = suscripcionesDe(movimientos, recurrentes, hoyIso).sort((a, b) => a.mensual - b.mensual)
  if (subs.length >= 2) palancas.push({ texto: `Quitar o pausar una suscripción (tienes ${subs.length})`, min: subs[0].mensual * 12, max: subs.at(-1).mensual * 12 })
  // 3) Gasto del día a día que depende de ti: recortar un 15–25 %.
  const medias12 = porCategoriaMedia(movimientos, ult.map((x) => x.clave))
  const disc = [...medias12.entries()].filter(([c]) => DISCRECIONAL.test(sinAcentos(c))).sort((a, b) => b[1] - a[1]).slice(0, 2)
  for (const [c, v] of disc) palancas.push({ texto: `${etiquetaCategoria(c)}: ${eurR(v)} al mes; recortar un 20 %`, min: v * 12 * 0.15, max: v * 12 * 0.25 })
  if (!palancas.length) return null
  palancas.sort((a, b) => b.max - a.max)
  const top = palancas.slice(0, 5)
  const min = top.reduce((s2, x) => s2 + x.min, 0)
  const max = top.reduce((s2, x) => s2 + x.max, 0)
  return {
    texto: [
      `Con tus números, podrías ahorrar entre **${eurR(min)} y ${eurR(max)} más al año** (orientativo). Por dónde empezar:`,
      ...top.map((x) => `- ${x.texto}: ${eurR(x.min)}–${eurR(x.max)} al año`),
      '- Empieza por lo que menos te cueste: una llamada para renegociar un recibo no cambia tu día a día.',
    ].join('\n'),
    tarjeta: { etiqueta: 'Ahorro posible · al año', cifra: null, cifraTexto: `${eurR(min)}–${eurR(max)}`, detalle: 'orientativo, con tus gastos reales', filas: top.map((x) => ({ nombre: x.texto.split(' (')[0].split(':')[0], valor: Math.round(x.max), extra: `desde ${eurR(x.min)}` })), accion: 'fijos', accionTexto: 'Ver Tu plan de ahorro' },
  }
}

// Lo que Fulcro no hace (gratis y al momento, sin gastar una pregunta de IA).
function limites(t) {
  if (/\b(numero de (la )?cuenta|iban|contrasena|pin|numero de (la )?tarjeta|cvv|clave de acceso|codigo de seguridad)\b/.test(t))
    return 'No veo ni guardo tus datos bancarios (cuenta, tarjeta o claves): solo los movimientos que apuntas o importas. Nunca te los pediré. Tu número de cuenta lo tienes en la app de tu banco.'
  if (/\b(en que|que|cual(es)?)\b.*\b(acciones?|fondos?|etf|criptos?|criptomonedas?|bitcoin|valores?)\b.*\b(invierto|compro|meto|recomiendas?|me compro|comprar|invertir)\b|\b(recomiendame|recomiendas?)\b.*\b(acciones?|fondos?|etf|criptos?|bitcoin)\b/.test(t))
    return {
      texto: [
        'No te puedo recomendar acciones, fondos ni criptomonedas concretos: eso es asesoramiento financiero y depende de ti y de un profesional. Lo que sí te puedo dar es el criterio:',
        '- Primero, un colchón de 3–6 meses de gastos (pregúntame «¿tengo un buen fondo de emergencia?»).',
        '- Invierte solo dinero que no vayas a necesitar en años, y repartido (diversificado): mejor muchos valores que uno.',
        '- Fíjate en las comisiones: a largo plazo pesan mucho.',
        '- En **Simuladores → Interés compuesto** ves qué daría una aportación mensual con el tiempo.',
      ].join('\n'),
      tarjeta: { etiqueta: 'Invertir con criterio', cifra: null, cifraTexto: 'Sin recomendaciones concretas', detalle: 'orientación educativa', filas: [], accion: 'simuladores' },
    }
  if (/\b(que tiempo|el tiempo (que )?hara|tiempo hace|llovera|va a llover|futbol|partido|receta|chiste|horoscopo|quien gano|resultado del)\b/.test(t))
    return 'Eso se me escapa: solo sé de tu dinero y de Palanca. Pregúntame, por ejemplo, «¿cómo voy este mes?» o «¿en qué gasto más?».'
  return null
}


// ── Más preguntas habituales que el motor resuelve solo ──────────────────────
// Resumen de un periodo: entró, salió, ahorro (en lenguaje llano) y dónde.
function resumenPeriodo(per, { movimientos, hoyIso }) {
  const dentro = movimientos.filter(enPeriodo(per, hoyIso))
  const tot = totalesDe(dentro)
  if (!(tot.gastos > 0) && !(tot.ingresos > 0)) return `No hay movimientos ${per.etiqueta}.`
  const primera = dentro.reduce((a, m) => (m.fecha < a ? m.fecha : a), hoyIso)
  const rango = rangoDe(per, primera, hoyIso)
  const top = [...gastoPorCategoria(dentro).entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const de100 = tot.ingresos > 0 ? Math.round((tot.ahorro / tot.ingresos) * 100) : null
  return {
    texto: [
      `${per.explicito ? capital(per.etiqueta) : `${capital(per.etiqueta)} (${rango})`}: han entrado **${formatearEuros(tot.ingresos)}** y has gastado **${formatearEuros(tot.gastos)}**.`,
      tot.ingresos > 0 ? `- ${tot.ahorro >= 0 ? `Has ahorrado **${formatearEuros(tot.ahorro)}**: de cada 100 € que entraron, apartaste ${de100}` : `Has gastado **${formatearEuros(-tot.ahorro)} más** de lo que entró`}.` : `- Aún no ha entrado ningún ingreso en este periodo${diaNomina(movimientos) ? `: tu nómina suele llegar hacia el día ${diaNomina(movimientos)}` : ''}.`,
      ...(tot.invertido > 0 ? [`- Además invertiste ${formatearEuros(tot.invertido)} (cuenta como ahorro, no como gasto).`] : []),
      ...(top.length ? [`- Donde más: ${top.map(([c, v]) => `${etiquetaCategoria(c)} ${formatearEuros(v)}`).join(' · ')}.`] : []),
    ].join('\n'),
    tarjeta: { etiqueta: `Resumen · ${per.etiqueta.replace(/^en /, '')}`, cifra: tot.ahorro, conSigno: true, detalle: `${rango} · entra ${formatearEuros(tot.ingresos)} · sale ${formatearEuros(tot.gastos)}`, filas: top.map(([c, v]) => ({ nombre: etiquetaCategoria(c), valor: v, pct: tot.gastos > 0 ? Math.round((v / tot.gastos) * 100) : null })), accion: 'analisis' },
  }
}

const diaNomina = (movimientos) => {
  const dias = movimientos.filter((m) => m.tipo === 'ingreso' && /nomina|salario|sueldo/.test(sinAcentos(`${m.categoria?.nombre} ${m.nota}`))).map((m) => Number(m.fecha.slice(8, 10)))
  return dias.length ? dias.sort((a, b) => a - b)[Math.floor(dias.length / 2)] : null
}

// Los pagos más grandes (uno a uno) de un periodo.
function mayoresGastos(per, { movimientos, hoyIso }) {
  const dentro = movimientos.filter((m) => esConsumo(m) && enPeriodo(per, hoyIso)(m))
  // El alquiler de cada mes no es "una compra": los fijos se dicen aparte.
  const esFijo = (m) => CATEGORIAS_FIJAS.test(sinAcentos(m.categoria?.nombre ?? ''))
  const fijo = dentro.filter(esFijo).sort((a, b) => centimosDe(b) - centimosDe(a))[0]
  const movs = dentro.filter((m) => !esFijo(m)).sort((a, b) => centimosDe(b) - centimosDe(a)).slice(0, 5)
  if (!movs.length && !fijo) return `No has apuntado gastos ${per.etiqueta}.`
  if (!movs.length) return `${capital(per.etiqueta)} tu mayor pago es un fijo: ${nombreComercio(fijo) || 'sin concepto'}, ${eur(centimosDe(fijo))}.`
  return {
    texto: [`Tus compras más grandes ${per.etiqueta}${fijo ? ` (sin contar fijos; el mayor fijo es ${nombreComercio(fijo) || 'sin concepto'}, ${eur(centimosDe(fijo))})` : ''}:`, ...movs.map((m) => `- ${formatearFecha(m.fecha)} · ${nombreComercio(m) || etiquetaCategoria(m.categoria?.nombre ?? 'Sin categoría')}: **${eur(centimosDe(m))}**`)].join('\n'),
    tarjeta: { etiqueta: `Mayores pagos · ${per.etiqueta.replace(/^en /, '')}`, cifra: centimosDe(movs[0]) / 100, detalle: `el mayor: ${nombreComercio(movs[0]) || 'sin concepto'} · ${formatearFecha(movs[0].fecha)}`, filas: movs.map((m) => ({ nombre: nombreComercio(m) || 'Sin concepto', valor: centimosDe(m) / 100, extra: formatearFecha(m.fecha) })) },
  }
}

// Gastos hormiga: compras pequeñas (menos de 15 €) que se repiten.
function gastosHormiga({ movimientos, hoy, hoyIso }) {
  const tres = periodo('ultimos 3 meses', hoy)
  const peq = movimientos.filter((m) => esConsumo(m) && enPeriodo(tres, hoyIso)(m) && centimosDe(m) < 1500 && !CATEGORIAS_FIJAS.test(sinAcentos(m.categoria?.nombre ?? '')))
  if (peq.length < 3) return 'Apenas veo compras pequeñas (menos de 15 €) en los últimos 3 meses: no tienes gastos hormiga que preocupen.'
  const grupos = desglosePorConcepto(peq).slice(0, 5)
  const total = peq.reduce((s2, m) => s2 + centimosDe(m), 0)
  return {
    texto: [
      `En los últimos 3 meses has hecho **${peq.length} compras de menos de 15 €**: suman **${eur(total)}**, unos ${eur(total / 3)} al mes (${eurR((total / 300) * 12)} al año).`,
      ...grupos.map((g) => `- ${g.nombre}: ${eur(g.cent)} (${g.n} ${g.n === 1 ? 'vez' : 'veces'})`),
      '- Si recortas la mitad, son unos ' + eurR((total / 300) * 6) + ' al año.',
    ].join('\n'),
    tarjeta: { etiqueta: 'Gastos hormiga · 3 meses', cifra: total / 100, detalle: `${peq.length} compras de menos de 15 €`, filas: grupos.map((g) => ({ nombre: g.nombre, valor: g.cent / 100, extra: `${g.n} veces` })) },
  }
}

// Lo que necesitas al mes para vivir: lo imprescindible (casa, recibos,
// comida, transporte, seguros, salud), media de 12 meses.
const ESENCIAL = /vivienda|alquiler|hipoteca|suministro|comida|supermercado|alimenta|transporte|seguro|salud|farmacia|educaci|prestamo|impuesto|comunidad/
function necesitoParaVivir({ movimientos, hoyIso }) {
  const ult = mesesCompletos(movimientos, hoyIso).filter((x) => x.gastos > 0).slice(-12)
  if (ult.length < 2) return null
  const medias = porCategoriaMedia(movimientos, ult.map((x) => x.clave))
  const esen = [...medias.entries()].filter(([c]) => ESENCIAL.test(sinAcentos(c))).sort((a, b) => b[1] - a[1])
  const totalEsen = esen.reduce((s2, [, v]) => s2 + v, 0)
  const gasto = ult.reduce((s2, x) => s2 + x.gastos, 0) / ult.length
  return {
    texto: [
      `Para lo imprescindible necesitas unos **${eurR(totalEsen)} al mes** (media de ${ult.length} meses). Con todo lo demás, gastas ${eurR(gasto)}.`,
      ...esen.slice(0, 6).map(([c, v]) => `- ${etiquetaCategoria(c)}: ${eurR(v)} al mes`),
      `- Tu colchón de emergencia debería cubrir, como mínimo, 3 meses de esto: ${eurR(totalEsen * 3)}.`,
    ].join('\n'),
    tarjeta: { etiqueta: 'Lo imprescindible · al mes', cifra: Math.round(totalEsen), detalle: `con todo, ${eurR(gasto)}/mes`, filas: esen.slice(0, 6).map(([c, v]) => ({ nombre: etiquetaCategoria(c), valor: Math.round(v) })) },
  }
}

// Próximos cobros (resto del mes o 30 días): de Fijos o, si no, detectados.
function proximosCobros(t, { movimientos, recurrentes, hoy, hoyIso }) {
  const finMes = /\beste mes\b|\bquedan?\b/.test(t)
  const limite = finMes ? iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) : iso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 30))
  const activos = recurrentes.filter((r) => r.activo !== false && r.tipo !== 'ingreso')
  const lista = activos.length
    ? activos.map((r) => ({ nombre: r.nombre, importe: Number(r.importe), p: proximoCobro(r, hoy) })).filter((x) => x.p && !x.p.sinDia).map((x) => ({ nombre: x.nombre, importe: x.importe, fecha: x.p.fecha }))
    : cargosPeriodicos(movimientos, hoyIso).map((d) => ({ nombre: d.nombre, importe: d.importe, fecha: d.proximaFecha }))
  const prox = lista.filter((x) => x.fecha >= hoyIso && x.fecha <= limite).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  const cuando = finMes ? 'de aquí a fin de mes' : 'en los próximos 30 días'
  if (!prox.length) {
    const sig = lista.filter((x) => x.fecha >= hoyIso).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0]
    return `No te queda ningún cobro fijo ${cuando}${activos.length ? '' : ' (según los cargos que se repiten en tus movimientos)'}.${sig ? ` El siguiente: **${sig.nombre}**, ${formatearEuros(sig.importe)} el ${formatearFecha(sig.fecha)}.` : ''}`
  }
  const total = prox.reduce((s2, x) => s2 + x.importe, 0)
  return {
    texto: [
      `${capital(cuando)} te cobran **${formatearEuros(total)}** en ${prox.length} ${prox.length === 1 ? 'recibo' : 'recibos'}${activos.length ? '' : ' (deducidos de tus movimientos)'}:`,
      ...prox.map((x) => `- ${formatearFecha(x.fecha)} · ${x.nombre}: ${formatearEuros(x.importe)}`),
      ...(activos.length ? [] : ['- Añádelos en **Fijos** y te aviso el día de cada cobro.']),
    ].join('\n'),
    tarjeta: { etiqueta: `Próximos cobros · ${cuando.replace(/^en los |^de aquí a /, '')}`, cifra: total, detalle: `${prox.length} recibos`, filas: prox.map((x) => ({ nombre: x.nombre, valor: x.importe, extra: formatearFecha(x.fecha) })), accion: 'fijos' },
  }
}

// Inversiones: Palanca las cuenta a coste (lo aportado), no a valor de mercado.
function comoVanInversiones({ movimientos, hoyIso }) {
  const b = bolsas(movimientos, hoyIso)
  const inv = movimientos.filter((m) => esInversion(m) && m.fecha <= hoyIso)
  if (!inv.length) return 'No tienes inversiones apuntadas. Si inviertes, apunta cada aportación como «Inversión» y te digo cuánto llevas.'
  const porPlat = new Map()
  for (const m of inv) {
    const k = m.fuente?.nombre || 'Sin plataforma'
    porPlat.set(k, (porPlat.get(k) ?? 0) + (m.tipo === 'ingreso' ? -centimosDe(m) : centimosDe(m)))
  }
  const ult = mesesCompletos(movimientos, hoyIso).slice(-12)
  const aport12 = ult.reduce((s2, x) => s2 + Math.max(0, x.invertido), 0) / Math.max(1, ult.length)
  return {
    texto: [
      `Llevas **${formatearEuros(b.bolsaInversion)} aportados** en neto (lo que metiste menos lo que sacaste).`,
      ...[...porPlat.entries()].map(([k, c]) => `- ${k}: ${eur(c)}`),
      `- De media inviertes ${eurR(aport12)} al mes (último año).`,
      '- Lo que has ganado o perdido no lo sé: Palanca no conoce el valor de mercado. Míralo en tu plataforma; la diferencia con lo aportado es tu rentabilidad.',
    ].join('\n'),
    tarjeta: { etiqueta: 'Inversión · aportado neto', cifra: b.bolsaInversion, detalle: `${eurR(aport12)}/mes de media · a coste, sin rentabilidad`, filas: [...porPlat.entries()].map(([k, c]) => ({ nombre: k, valor: c / 100 })), accion: 'inversion' },
  }
}

function devoluciones(per, { movimientos, hoyIso }) {
  const devs = movimientos.filter((m) => esDevolucion(m) && enPeriodo(per, hoyIso)(m)).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  if (!devs.length) return `No veo devoluciones ${per.etiqueta}.`
  const total = devs.reduce((s2, m) => s2 + centimosDe(m), 0)
  return {
    texto: [`${capital(per.etiqueta)} te han devuelto **${eur(total)}** en ${devs.length} ${devs.length === 1 ? 'devolución' : 'devoluciones'} (restan del gasto, no cuentan como ingreso):`, ...devs.slice(0, 6).map((m) => `- ${formatearFecha(m.fecha)} · ${nombreComercio(m) || 'Devolución'}: ${eur(centimosDe(m))}`)].join('\n'),
    tarjeta: { etiqueta: `Devoluciones · ${per.etiqueta.replace(/^en /, '')}`, cifra: total / 100, detalle: `${devs.length} devoluciones`, filas: devs.slice(0, 6).map((m) => ({ nombre: nombreComercio(m) || 'Devolución', valor: centimosDe(m) / 100, extra: formatearFecha(m.fecha) })) },
  }
}

// Independencia financiera: la regla del 4 % (25 veces tu gasto de un año).
function jubilacion({ movimientos, hoyIso }) {
  const ult = mesesCompletos(movimientos, hoyIso).filter((x) => x.gastos > 0).slice(-12)
  if (ult.length < 2) return null
  const gasto = ult.reduce((s2, x) => s2 + x.gastos, 0) / ult.length
  const ahorro = ult.reduce((s2, x) => s2 + x.ahorro, 0) / ult.length
  const necesitas = gasto * 12 * 25
  const b = bolsas(movimientos, hoyIso)
  return {
    texto: [
      `Una referencia muy usada (la regla del 4 %): para vivir de tus ahorros necesitarías unas **25 veces lo que gastas en un año**: con tu gasto (${eurR(gasto)} al mes), unos **${eurR(necesitas)}**.`,
      `- Hoy tienes ${eurR(b.patrimonio)}: el ${Math.round((b.patrimonio / necesitas) * 100)} % del camino.`,
      `- Cuánto tardarías depende de cuánto ahorres (${eurR(ahorro)} al mes ahora) y de lo que rinda lo invertido: calcúlalo con tus cifras en **Simuladores → Independencia financiera**.`,
      '- La pensión pública reduciría lo que necesitas; tu estimación oficial la ves en la web de la Seguridad Social.',
    ].join('\n'),
    tarjeta: { etiqueta: 'Independencia financiera', cifra: Math.round(necesitas), detalle: `25 × tu gasto anual · llevas ${eurR(b.patrimonio)}`, filas: [], accion: 'simuladores' },
  }
}

// "¿Cuánto tendré en 10 años?": sin rentabilidad (lo seguro) y remite al simulador.
function enNAnios(t, { movimientos, hoyIso }) {
  const n = t.match(/\ben (\d+|[a-z]+) anos\b/)
  const anios = n ? Number(n[1]) || NUMEROS[n[1]] : null
  if (!anios || anios > 60) return null
  const ult = mesesCompletos(movimientos, hoyIso).filter((x) => x.ingresos > 0 || x.gastos > 0).slice(-12)
  if (ult.length < 2) return null
  const ahorro = ult.reduce((s2, x) => s2 + x.ahorro, 0) / ult.length
  const b = bolsas(movimientos, hoyIso)
  const final = b.patrimonio + ahorro * 12 * anios
  return {
    texto: [
      `Si sigues ahorrando como ahora (${eurR(ahorro)} al mes), en ${anios} ${anios === 1 ? 'año' : 'años'} tendrías unos **${eurR(final)}**, sin contar lo que rinda lo invertido.`,
      `- Hoy tienes ${eurR(b.patrimonio)}; sumarías ${eurR(ahorro * 12 * anios)}.`,
      '- Invertido a largo plazo podría ser bastante más (interés compuesto): pruébalo en **Simuladores → Interés compuesto**.',
    ].join('\n'),
    tarjeta: { etiqueta: `Dentro de ${anios} ${anios === 1 ? 'año' : 'años'}`, cifra: Math.round(final), detalle: `a tu ritmo · sin rentabilidad`, filas: [], accion: 'simuladores' },
  }
}

function cuantoDeberiaAhorrar(ctx) {
  const ult = mesesCompletos(ctx.movimientos, ctx.hoyIso).filter((x) => x.ingresos > 0).slice(-12)
  if (ult.length < 2) return null
  const ing = ult.reduce((s2, x) => s2 + x.ingresos, 0) / ult.length
  const aho = ult.reduce((s2, x) => s2 + x.ahorro, 0) / ult.length
  const ref = ing * 0.2
  return {
    texto: [
      `Una referencia sencilla: apartar **20 de cada 100 €** que entran. Para ti, unos **${eurR(ref)} al mes**.`,
      `- Ahora apartas ${eurR(aho)} al mes: ${aho >= ref ? 'ya estás por encima' : `te faltan ${eurR(ref - aho)} al mes`}.`,
      ...lineasObjetivos(ctx.objetivos, aho, ctx.hoy),
      ...(ctx.objetivos?.some((o) => o.faltan > 0) ? [] : ['- Con un objetivo concreto (cuánto y para cuándo) te digo la cifra exacta: créalo en **Plan → Simuladores**.']),
    ].join('\n'),
    tarjeta: { etiqueta: 'Cuánto ahorrar · al mes', cifra: Math.round(ref), detalle: `referencia 20 % · hoy apartas ${eurR(aho)}`, filas: [], accion: 'simuladores' },
  }
}

function datosDeLaCuenta({ movimientos, hoyIso }) {
  const movs = movimientos.filter((m) => m.fecha <= hoyIso)
  if (!movs.length) return 'Aún no tienes movimientos. Apunta el primero o importa el extracto de tu banco en **Movimientos → Importar**.'
  const primera = movs.reduce((a, m) => (m.fecha < a ? m.fecha : a), hoyIso)
  return `Tienes **${movs.length} movimientos** desde el **${formatearFecha(primera)}** (${mesesEntre(primera, hoyIso)} meses de historia).`
}

function preguntasHabituales(t, ctx) {
  const p = periodo(t, ctx.hoy)
  if (/\b(resumen|como (cerre|acabe|termine|fue|ha ido|va))\b/.test(t) && /\b(mes|ano|trimestre|semana|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|20\d\d)\b/.test(t)) {
    const per = p ?? (/\bano\b/.test(t) ? periodo('este ano', ctx.hoy) : /\b(cerre|acabe|termine|fue)\b/.test(t) ? periodo('mes pasado', ctx.hoy) : periodo('este mes', ctx.hoy))
    return resumenPeriodo(per, ctx)
  }
  if (/\b(mayor|mas grande|mas caro|mas cara)\b/.test(t) && /\b(gasto|compra|pago|cargo)\b/.test(t) && !/\bmes mas caro\b/.test(t)) return mayoresGastos(p ?? periodo('ultimos 12 meses', ctx.hoy), ctx)
  if (/\bgastos? hormiga\b|\bpequenos gastos\b|\bcompras pequenas\b/.test(t)) return gastosHormiga(ctx)
  if (/\b(necesito|me hace falta|minimo)\b.*\b(vivir|al mes)\b|\bcuanto me cuesta vivir\b/.test(t) && !/\bjubil|\bahorrar\b/.test(t)) return necesitoParaVivir(ctx)
  if (/\b(proximos? cobros?|que me (cobran|van a cobrar|pasan)|que recibos me quedan|recibos (pendientes|que quedan)|que me queda por pagar)\b/.test(t)) return proximosCobros(t, ctx)
  if (/\bcuanto (invierto|aporto|meto)\b/.test(t) && !p) return comoVanInversiones(ctx)
  if (/\b(como van|como va|cuanto (he )?ganado|rentabilidad|rinden|rentan|beneficio)\b.*\b(inversion|inversiones|fondo|fondos|invertido)\b/.test(t)) return comoVanInversiones(ctx)
  if (/\b(devolucion|devoluciones|devuelto|reembolso)\b/.test(t) && /\b(cuant[oa]s?|que|cuales)\b/.test(t)) return devoluciones(p ?? { tipo: 'todo', etiqueta: 'desde el principio' }, ctx)
  if (/\b(jubilar\w*|jubilacion|dejar de trabajar|independencia financiera|vivir de (mis )?(ahorros|rentas))\b/.test(t)) return jubilacion(ctx)
  if (/\b(cuanto|que) (tendre|habre ahorrado|tendria)\b.*\ben (\d+|[a-z]+) anos\b/.test(t)) return enNAnios(t, ctx)
  if (/\bcuanto (deberia|tendria que|tengo que|debo|necesito) ahorrar\b/.test(t)) return cuantoDeberiaAhorrar(ctx)
  if (/\bcuanto ahorro al mes\b|\bcuanto ahorro de media\b/.test(t)) return ahorroSuficiente(ctx)
  if (/\b(cuanto|cual es mi|cuanto es mi)\b.*\b(cobro al mes|cobro|sueldo|nomina|salario|gano al mes|gano)\b/.test(t) && !/\b(subido|subida|evolucion)\b/.test(t)) {
    const ev = evolucionSueldo(ctx.movimientos, ctx.hoyIso)
    if (typeof ev !== 'object') return ev
    const ult = mesesCompletos(ctx.movimientos, ctx.hoyIso).filter((x) => x.ingresos > 0).slice(-12)
    const medioMes = ult.reduce((s2, x) => s2 + x.ingresos, 0) / Math.max(1, ult.length)
    return {
      texto: [`Tu nómina es de **${formatearEuros(ev.tarjeta.cifra)} al mes**. Contando pagas extra y otros ingresos, te entran de media ${eurR(medioMes)} al mes (último año).`, ...ev.texto.split('\n').slice(1)].join('\n'),
      tarjeta: { ...ev.tarjeta, accion: 'analisis' },
    }
  }
  if (/\b(saldo|en el banco|en la cuenta|dinero disponible)\b/.test(t) && /\b(cuanto|cual|que)\b/.test(t)) {
    const b = bolsas(ctx.movimientos, ctx.hoyIso)
    return `Según lo registrado en Palanca, tienes **${formatearEuros(b.bolsaLiquidez)} disponibles** (y ${formatearEuros(b.bolsaInversion)} invertidos). Si no cuadra con tu banco, usa «Ajustar saldo» en el Inicio: Palanca no se conecta a tu banco.`
  }
  if (/\b(deuda|deudas|prestamo|prestamos|credito|hipoteca)\b/.test(t) && /\b(tengo|cuanto|debo|cuantas?)\b/.test(t)) {
    const deudas = cargosPeriodicos(ctx.movimientos, ctx.hoyIso).filter((d) => /prestamo|hipoteca|credito|financiac/.test(sinAcentos(`${d.categoriaNombre} ${d.nombre}`)))
    if (!deudas.length) return 'No veo préstamos ni deudas en tus movimientos (cuotas de préstamo, hipoteca o financiación). Si tienes alguna, apunta la cuota en **Fijos** como «Préstamo» y te digo cuánto pesa.'
    return `Veo ${deudas.length} ${deudas.length === 1 ? 'cuota' : 'cuotas'} de deuda: ${deudas.map((d) => `${d.nombre} ${formatearEuros(d.importe)}`).join(', ')}. El capital pendiente no lo sé: míralo en tu banco.`
  }
  if (/\b(estoy gastando|gasto|he gastado|voy gastando)\b.*\b(mas|menos) de lo (normal|habitual)\b|\b(gastado|gasto) (mas|menos) este mes que\b/.test(t)) return comparativa('mes', ctx.movimientos, ctx.hoy, ctx.hoyIso)
  if (/\b(cuantos movimientos|desde cuando (tengo|hay) datos|cuanta historia)\b/.test(t)) return datosDeLaCuenta(ctx)
  return null
}

function consejoConDatos(t, ctx) {
  const lim = limites(t)
  if (lim) return lim
  if (/\b(ahorr\w+)\b.*\b(suficiente|bastante|lo bastante|bien|poco|mucho)\b|\bestoy ahorrando\b/.test(t) && !/\bcuanto\b/.test(t)) return ahorroSuficiente(ctx)
  if (/\b(fondo de emergencia|colchon|imprevistos?)\b/.test(t)) return colchon(ctx)
  if (/\b(suscripcion\w*|plataformas?)\b/.test(t) && /\b(quitar|quito|cancelar|cancelo|dar de baja|sobra|sobran|eliminar|prescindir|recortar|dejar)\b/.test(t)) return queSuscripcionQuitar(ctx)
  if (/\b(renegociar|negociar|cambiar de compania|cambio de compania|compensa cambiar|conviene cambiar)\b|\b(compensa|conviene|merece)\b.*\b(seguro|luz|movil|telefono|fibra|internet|gas|tarifa)\b/.test(t)) {
    const r = renegociar(t, ctx)
    if (r) return r
  }
  if (/\b(puedo permitir|me puedo permitir|permitirme|me llega para|puedo (gastar|pagar|comprar|gastarme))\b/.test(t)) return puedoPermitirme(t, ctx)
  const habitual = preguntasHabituales(t, ctx)
  if (habitual) return habitual
  if (/\bcomo (puedo |podria )?(ahorrar|ahorro) mas\b|\b(quiero|necesito) ahorrar mas\b|\bdonde (puedo )?recortar\b|\b(gastar|gasto) menos\b.*\bcomo\b|\bcomo (gasto|gastar) menos\b/.test(t)) return comoAhorrarMas(ctx)
  return null
}

/**
 * Respuesta local o null (→ IA).
 * datos: { movimientos, recurrentes, hoy: Date }
 */
export function respuestaLocal(pregunta, datos = {}) {
  return consultaLocal(pregunta, datos)?.texto ?? null
}

/**
 * Igual que respuestaLocal, con la tarjeta para el panel:
 * { texto, tarjeta?: { etiqueta, cifra, cifraTexto?, detalle, filas: [{ nombre, valor, extra?, pct? }] } }
 */
export function consultaLocal(pregunta, datos = {}) {
  const r = consultar(pregunta, datos)
  return r == null ? null : typeof r === 'string' ? { texto: r } : r
}

function consultar(pregunta, { movimientos = [], recurrentes = [], hoy = new Date(), presupuesto = null, objetivos = [], objetivoUsuario = null } = {}) {
  const t = sinAcentos(pregunta).replace(/[¿?¡!.,;:()"«»]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 160) return null
  const hoyIso = iso(hoy)
  const general = intencionGeneral(t, { movimientos, recurrentes, hoy, hoyIso, presupuesto, objetivos, objetivoUsuario })
  if (general) return general
  if (COMPLEJA.test(t)) return null
  const activos = recurrentes.filter((r) => r.activo !== false && r.tipo !== 'ingreso')

  // Fijos y suscripciones: "¿cuánto pago en fijos/suscripciones al mes?"
  if (/\b(cuanto|que)\b/.test(t) && /\b(fijos|suscripciones|recibos|compromisos)\b/.test(t) && resolverObjetivo(t, movimientos).sin) {
    // Sin fijos guardados: los cargos que se repiten en sus movimientos.
    const detectados = activos.length ? [] : cargosPeriodicos(movimientos, hoyIso)
    if (activos.length === 0 && detectados.length === 0) return 'Aún no tienes gastos fijos guardados. Añádelos en **Fijos** y te digo cuánto suman.'
    const base = activos.length ? activos : detectados
    const soloDigitales = /\bsuscripciones\b/.test(t)
    const lista = soloDigitales
      ? base.filter((r) => /suscrip|ocio|digital/i.test(r.categoriaNombre ?? '') || (activos.length > 0 && mensualDe(r) < 25))
      : base
    const usados = lista.length ? lista : base
    const mensual = usados.reduce((s, r) => s + mensualDe(r), 0)
    const top = [...usados].sort((a, b) => mensualDe(b) - mensualDe(a)).slice(0, 8)
    const que = soloDigitales && lista.length ? 'suscripciones' : 'gastos fijos'
    const cabecera = activos.length
      ? `Tus ${que} suman **${formatearEuros(Math.round(mensual * 100) / 100)} al mes** (≈ ${formatearEuros(Math.round(mensual * 12))} al año) en ${usados.length} ${usados.length === 1 ? 'compromiso' : 'compromisos'}.`
      : `No tienes fijos guardados, pero en tus movimientos veo ${usados.length} ${soloDigitales ? 'suscripciones' : 'cargos que se repiten'}: suman **${formatearEuros(Math.round(mensual * 100) / 100)} al mes** (≈ ${formatearEuros(Math.round(mensual * 12))} al año).`
    const cada = (r) => ((periodoDe(r).meses || 1) === 12 ? 'al año' : (periodoDe(r).meses || 1) > 1 ? `cada ${periodoDe(r).meses} meses` : 'al mes')
    const texto = [
      cabecera,
      ...top.map((r) => `- ${r.nombre}: ${formatearEuros(Number(r.importe))} ${cada(r)}`),
      ...(activos.length ? [] : ['Añádelos en **Fijos** con un toque y te aviso de cada cobro.']),
    ].join('\n')
    return {
      texto,
      tarjeta: {
        etiqueta: `${que === 'suscripciones' ? 'Suscripciones' : 'Gastos fijos'} · al mes`,
        cifra: Math.round(mensual * 100) / 100,
        detalle: `≈ ${formatearEuros(Math.round(mensual * 12))} al año · ${usados.length} ${usados.length === 1 ? 'compromiso' : 'compromisos'}`,
        accion: 'fijos',
        ...(activos.length ? {} : { accionTexto: 'Añadirlos en Fijos' }),
        // Cada fila, prorrateada al mes (la barra compara lo que pesa cada una).
        filas: top.map((r) => ({ nombre: r.nombre, valor: Math.round(mensualDe(r) * 100) / 100, extra: cada(r) === 'al mes' ? null : `${formatearEuros(Number(r.importe))} ${cada(r)}` })),
      },
    }
  }

  // Próximo cobro: "¿cuándo me cobran el seguro?"
  if (/\b(cuando|que dia)\b/.test(t) && /\b(cobran|cobra|cargan|carga|pasan|pasa|toca|pago|renueva|renovacion)\b/.test(t) && !/\bultim|\bpague\b|\bpagado\b/.test(t)) {
    const obj = resolverObjetivo(t, [])
    if (obj.sin) return null
    const toks = sinAcentos(obj.nombre).split(' ')
    const rec = activos.find((r) => toks.every((tok) => tieneToken(sinAcentos(r.nombre), tok)))
    if (!rec) {
      // Sin fijo guardado: se deduce de los pagos anteriores (mismo comercio, cada mes o cada año).
      const obj = resolverObjetivo(t, movimientos)
      if (obj.sin || !obj.filtro) return null
      const suyos = new Set(movimientos.filter((m) => esConsumo(m) && obj.filtro(m)).map(nombreComercio))
      const d = cargosPeriodicos(movimientos, hoyIso).find((x) => suyos.has(x.nombre))
      if (!d) return null
      const cada = d.periodoMeses === 12 ? 'una vez al año' : d.periodoMeses === 1 ? 'cada mes' : `cada ${d.periodoMeses} meses`
      // Si se puede negociar (seguro, luz…), lo importante es llamar ANTES del cobro.
      const consejo = consejoNegociable({ nombre: d.nombre }, movimientos.filter((m) => esConsumo(m) && suyos.has(nombreComercio(m)) && m.fecha <= hoyIso), hoyIso)
      return {
        texto: [
          `**${d.nombre}** se cobra ${cada}. El último cargo fue el ${formatearFecha(d.ultimaFecha)} (${formatearEuros(d.importe)}), así que el próximo será hacia el **${formatearFecha(d.proximaFecha)}**.`,
          ...(consejo?.lineas ?? ['- Añádelo en **Fijos** y te aviso ese día.']),
        ].join('\n'),
        tarjeta: { etiqueta: `${d.nombre} · próximo cobro`, cifra: null, cifraTexto: formatearFecha(d.proximaFecha), detalle: `${formatearEuros(d.importe)} · ${cada}`, filas: [], accion: 'fijos' },
      }
    }
    const prox = proximoCobro(rec, hoy)
    if (!prox) return null
    if (prox.sinDia) return `**${rec.nombre}** (${formatearEuros(Number(rec.importe))}) toca ${prox.texto}, pero no sé qué día. Ponle el día de cobro en **Fijos** y te aviso.`
    return `**${rec.nombre}**: el próximo cobro es el **${formatearFecha(prox.fecha)}** (${prox.texto}), ${formatearEuros(Number(rec.importe))}.`
  }

  // Último pago: "¿cuándo pagué el gimnasio por última vez?"
  if (/\b(ultimo (pago|cargo|recibo|gasto)|ultima (vez|compra)|cuando pague|cuando compre|cuando fui|cuando fue (el|la) ultim[oa])\b/.test(t)) {
    // "compra/compré/fui" no son el qué ("última compra en Mercadona").
    const obj = resolverObjetivo(t.replace(/\b(compra|compras|compre|fui|ultim[oa]s?|cargo|recibo)\b/g, ' ').replace(/\s+/g, ' ').trim(), movimientos)
    if (obj.sin || !obj.filtro) return null
    const movs = movimientos.filter((m) => esConsumo(m) && obj.filtro(m) && m.fecha <= hoyIso).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    if (!movs.length) return `No veo pagos de **${obj.nombre}** en tus movimientos.`
    const [u, ...antes] = movs
    const dias = Math.round((Date.parse(hoyIso) - Date.parse(u.fecha)) / 86400000)
    const hace = dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`
    const previos = antes.slice(0, 3).map((m) => `${formatearFecha(m.fecha)} (${eur(centimosDe(m))})`)
    return [
      `El último pago de **${obj.nombre}** fue el **${formatearFecha(u.fecha)}** (${hace}): **${eur(centimosDe(u))}**.`,
      ...(previos.length ? [`- Antes: ${previos.join(' · ')}.`] : []),
    ].join('\n')
  }

  // "¿Cuánto dinero tengo?" → patrimonio de hoy (mismas bolsas que el inicio).
  if (/\bcuant[oa]\b/.test(t) && /\b(dinero|patrimonio)\b/.test(t) && /\b(tengo|tienes|mi|hay)\b/.test(t) && resolverObjetivo(t, movimientos).sin) {
    const b = bolsas(movimientos, hoyIso)
    return `Tu patrimonio hoy es de **${formatearEuros(b.patrimonio)}**: ${formatearEuros(b.bolsaLiquidez)} disponibles y ${formatearEuros(b.bolsaInversion)} invertidos (a lo que aportaste, sin la rentabilidad).`
  }

  // Sin "cuánto" pero con un comercio, categoría o tema ("gasolina últimos 3
  // meses", "spotify"): se entiende como "¿cuánto gasto en…?".
  let implicita = false
  if (!/\bcuant[oa]s?\b|\ben que\b|\bdonde\b/.test(t)) {
    if (t.split(' ').length > 6 || !resolverObjetivo(t, movimientos).filtro) return null
    implicita = true
  }
  const p = periodo(t, hoy)

  // ¿En qué gasto más?
  if (/\b(en que|donde|a que)\b/.test(t) && /\b(mas|se me va|se va|se me fue|se fue|se me ha ido|se ha ido)\b/.test(t)) {
    // Sin periodo y en presente ("¿en qué gasto más?") = lo habitual: los
    // últimos 12 meses completos. En pasado ("¿en qué se me fue?") = este mes.
    const habitual = !p && /\b(gasto|se me va|se va|suelo)\b/.test(t)
    const nCompletos = Math.min(12, mesesCompletos(movimientos, hoyIso).filter((x) => x.gastos > 0).length)
    const per = p ?? (habitual && nCompletos >= 2 ? periodo(`ultimos ${nCompletos} meses`, hoy) : periodo('este mes', hoy))
    // Mismas funciones del motor que Inicio y Presupuesto (neto de devoluciones).
    const dentro = movimientos.filter(enPeriodo(per, hoyIso))
    const mapa = gastoPorCategoria(dentro)
    const total = totalesDe(dentro).gastos
    if (!(total > 0) || mapa.size === 0) return `No has apuntado gastos ${per.etiqueta}.`
    const top = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const primera = dentro.reduce((a, m) => (m.fecha < a ? m.fecha : a), hoyIso)
    const rango = rangoDe(per, primera, hoyIso)
    const nM = per.meses && per.completos ? per.meses : null
    return {
      texto: [
        `${per.explicito ? capital(per.etiqueta) : `${capital(per.etiqueta)} (${rango})`} has gastado **${formatearEuros(total)}**${nM ? `, ${formatearEuros(Math.round((total / nM) * 100) / 100)} al mes` : ''}. Donde más:`,
        ...top.map(([c, v]) => `- **${etiquetaCategoria(c)}**: ${formatearEuros(v)}${nM ? ` (${formatearEuros(Math.round((v / nM) * 100) / 100)}/mes)` : ''} · ${Math.round((v / total) * 100)} %`),
        ...(habitual ? ['- Para un mes concreto, pregúntame «¿en qué gasto más este mes?».'] : []),
      ].join('\n'),
      tarjeta: {
        etiqueta: `En qué gastas más · ${per.etiqueta.replace(/^en /, '')}`,
        cifra: total,
        detalle: rango,
        filas: top.map(([c, v]) => ({ nombre: etiquetaCategoria(c), valor: v, extra: nM ? `${formatearEuros(Math.round((v / nM) * 100) / 100)}/mes` : null, pct: Math.round((v / total) * 100) })),
        accion: 'analisis',
      },
    }
  }

  const esIngreso = /\b(ingresado|ingrese|ingresos|cobrado|cobre|ganado|gane)\b/.test(t)
  const esAhorro = /\b(ahorrado|ahorre)\b/.test(t)
  const esInv = /\b(invertido|inverti|aportado)\b/.test(t)
  const esGasto = implicita || /\b(gastado|gaste|gastos|pagado|pague|pagos|costado|dejado|gasto|pago|cuesta|cuestan|llevo|costar|vale|veces)\b/.test(t)
  if (!esIngreso && !esAhorro && !esInv && !esGasto) return null

  const objetivo = resolverObjetivo(t, movimientos)
  const presente = implicita || (/\b(gasto|pago|cuesta|cuestan)\b/.test(t) && !/\b(he|has|hemos|llevo)\b/.test(t))
  // Sin "qué", la media solo si se pide ("¿cuánto gasto al mes de media?").
  const mediaTotal = objetivo.sin && /\b(media|promedio|al mes|normalmente|suelo|habitualmente)\b/.test(t)
  // Sin periodo: "he pagado de X" → desde el principio; presente → media; si no, este mes.
  // "¿Cuánto gasto al mes de media?": los últimos 12 meses completos (o los que haya).
  if (mediaTotal && !p && esGasto && !esIngreso && !esAhorro && !esInv) {
    const completos = mesesCompletos(movimientos, hoyIso).filter((x) => x.gastos > 0)
    const n = Math.min(12, completos.length)
    if (n >= 2) {
      const per12 = periodo(`ultimos ${n} meses`, hoy)
      const movs = movimientos.filter((m) => esConsumo(m) && enPeriodo(per12, hoyIso)(m))
      const r = respuestaGasto({ objetivo: null, movs, devoluciones: movimientos.filter((m) => esDevolucion(m) && enPeriodo(per12, hoyIso)(m)), p: per12, hoyIso, movimientos, pideMedia: true })
      if (typeof r === 'object' && n >= 6) {
        const tres = completos.slice(-3).reduce((s, x) => s + x.gastos, 0) / 3
        r.texto += `\n- Los 3 últimos meses, ${formatearEuros(Math.round(tres * 100) / 100)} al mes.`
      }
      return r
    }
  }
  const per = p ?? ((presente && !objetivo.sin) || mediaTotal ? null : /\bpagad/.test(t) && !objetivo.sin ? { tipo: 'todo', etiqueta: 'desde el principio' } : periodo('este mes', hoy))

  if (esAhorro || esIngreso || esInv) {
    if (!objetivo.sin && !esInv) return null // "¿cuánto he cobrado de X?" → IA (raro)
    const perUsado = per ?? periodo('este mes', hoy)
    const dentro = movimientos.filter(enPeriodo(perUsado, hoyIso))
    // La regla única del motor (totalesDe): sin ajustes, traspasos ni devoluciones como ingreso.
    const tot = totalesDe(dentro)
    if (esIngreso) return respuestaIngresos(perUsado, movimientos, hoyIso)
    if (esAhorro) {
      return tot.ingresos > 0
        ? `${capital(perUsado.etiqueta)} has ahorrado **${formatearEuros(tot.ahorro)}**: el ${Math.round(tot.ratioAhorro)} % de lo que ha entrado (${formatearEuros(tot.ingresos)} de ingresos y ${formatearEuros(tot.gastos)} de gastos).`
        : sinIngresoAun(perUsado, tot, movimientos, hoy, hoyIso)
    }
    const inv = dentro.filter((m) => esInversion(m) && (objetivo.sin || !objetivo.filtro || objetivo.filtro(m)))
    const aport = inv.filter((m) => m.tipo !== 'ingreso')
    const retir = inv.filter((m) => m.tipo === 'ingreso')
    const totalAport = aport.reduce((s, m) => s + centimosDe(m), 0)
    const donde = objetivo.sin ? '' : ` en **${objetivo.nombre}**`
    if (perUsado.tipo === 'todo' && objetivo.sin) {
      const b = bolsas(movimientos, hoyIso)
      const totalRetir = retir.reduce((s, m) => s + centimosDe(m), 0)
      return `Tienes invertidos **${formatearEuros(b.bolsaInversion)}** (lo que aportaste, sin la rentabilidad): ${eur(totalAport)} en ${aport.length} ${aport.length === 1 ? 'aportación' : 'aportaciones'}${totalRetir ? ` menos ${eur(totalRetir)} que retiraste` : ''}.`
    }
    const base = `${capital(perUsado.etiqueta)} has invertido **${eur(totalAport)}**${donde} (${aport.length} ${aport.length === 1 ? 'aportación' : 'aportaciones'})`
    if (!retir.length) return `${base}.`
    const totalRetir = retir.reduce((s, m) => s + centimosDe(m), 0)
    return `${base} y has retirado **${eur(totalRetir)}**: en neto, ${totalAport >= totalRetir ? `**${eur(totalAport - totalRetir)}** más invertido` : `**${eur(totalRetir - totalAport)}** menos invertido`}.`
  }

  // Gasto (con o sin "qué").
  if (!objetivo.sin && !objetivo.filtro) {
    return `No veo gastos de **${objetivo.nombre}** en tus movimientos. Si lo apuntaste con otro nombre, prueba con ese (por ejemplo, el nombre del comercio).`
  }
  const filtro = objetivo.sin ? () => true : objetivo.filtro
  const filtroDev = objetivo.sin ? () => true : (objetivo.filtroDevolucion ?? objetivo.filtro)
  const devolucionesEn = (periodoX) => movimientos.filter((m) => esDevolucion(m) && filtroDev(m) && enPeriodo(periodoX, hoyIso)(m))
  if (!per) {
    // Presente sin periodo ("¿cuánto gasto en gasolina?"): media de los 3
    // últimos meses completos. Lo que NO se paga cada mes (luz cada 2 meses,
    // agua cada 3) se promedia sobre 12 meses; lo anual, con su pago anual.
    const doce = periodo('ultimos 12 meses', hoy)
    const en12 = objetivo.sin ? [] : movimientos.filter((m) => esConsumo(m) && filtro(m) && enPeriodo(doce, hoyIso)(m))
    const suyosDesc = objetivo.sin ? [] : movimientos.filter((m) => esConsumo(m) && filtro(m) && m.fecha <= hoyIso).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    const espaciado = suyosDesc.length >= 2 && (Date.parse(suyosDesc[0].fecha) - Date.parse(suyosDesc[1].fecha)) / 86400000 > 150
    // Solo con un año de historia se puede saber que algo no es mensual.
    const conAnio = movimientos.some((m) => m.fecha <= doce.desde)
    const anual = !objetivo.sin && en12.length <= 2 && espaciado
    const salteado = !objetivo.sin && conAnio && en12.length >= 3 && en12.length <= 9
    const tres = salteado ? doce : periodo('ultimos 3 meses', hoy)
    const nRef = salteado ? 12 : 3
    const movs = anual ? [] : movimientos.filter((m) => esConsumo(m) && filtro(m) && enPeriodo(tres, hoyIso)(m))
    const total = movs.reduce((s, m) => s + centimosDe(m), 0) - devolucionesEn(tres).reduce((s, m) => s + centimosDe(m), 0)
    if (!movs.length) {
      // Algo que se paga de vez en cuando (un seguro anual): el último pago y el de antes.
      const anteriores = movimientos.filter((m) => esConsumo(m) && filtro(m) && m.fecha <= hoyIso).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      if (!anteriores.length) return `No veo gastos en **${objetivo.nombre}** en tus movimientos.`
      const [u, prev] = anteriores
      const anual = prev && Math.abs(Date.parse(u.fecha) - Date.parse(prev.fecha)) / 86400000 > 300
      const cambio = prev && centimosDe(prev) !== centimosDe(u) ? ` (antes, ${eur(centimosDe(prev))}: ${centimosDe(u) > centimosDe(prev) ? 'ha subido' : 'ha bajado'} un ${Math.abs(Math.round((centimosDe(u) / centimosDe(prev) - 1) * 100))} %)` : ''
      const consejo = consejoNegociable(objetivo, anteriores, hoyIso)
      // Lo pagado cada año ("2024 410 € · 2025 432 € · 2026 455 €").
      const porAnio = lineaAnios(anteriores)
      return {
        texto: [
          `**${objetivo.nombre}** no es un gasto de cada mes${anual ? ': lo pagas una vez al año' : ''}. El último pago fue el ${formatearFecha(u.fecha)}: **${eur(centimosDe(u))}**${cambio}.`,
          ...(porAnio ? [`- Por años: ${porAnio}`] : []),
          ...(anual ? [`- Equivale a ${eur(centimosDe(u) / 12)} al mes.`] : []),
          ...(consejo?.lineas ?? []),
        ].join('\n'),
        tarjeta: {
          etiqueta: `${capital(objetivo.nombre)} · ${anual ? 'pago anual' : 'último pago'}`,
          cifra: centimosDe(u) / 100,
          detalle: [`pagado el ${formatearFecha(u.fecha)}`, anual ? `≈ ${eur(centimosDe(u) / 12)}/mes` : null].filter(Boolean).join(' · '),
          filas: [],
          ...(consejo ? { accion: consejo.accion } : {}),
        },
      }
    }
    const linea = lineaMeses(movs, tres)
    const consejoMedia = objetivo.sin ? null : consejoNegociable(objetivo, movimientos.filter((m) => esConsumo(m) && filtro(m) && m.fecha <= hoyIso), hoyIso)
    const sujeto = objetivo.sin ? 'En total' : `En **${objetivo.nombre}**`
    const grupos = objetivo.sin ? [] : desglosePorConcepto(movs, devolucionesEn(tres))
    const filas = grupos.length >= 2 ? grupos.slice(0, 6) : []
    return {
      texto: [
        `${sujeto} gastas de media **${eur(total / nRef)} al mes** (últimos ${nRef} meses, ${rangoDe(tres, null, hoyIso)}: ${eur(total)}).`,
        ...(salteado ? [`- No es cada mes: ${en12.length} pagos al año (uno cada ${Math.round(12 / en12.length)} meses, de unos ${eur(total / en12.length)}).`] : []),
        ...filas.map((g) => `- ${g.nombre}: **${eur(g.cent / nRef)}/mes** (${eur(g.cent)} en ${nRef} meses)`),
        ...(linea ? [`- Por meses: ${linea}`] : []),
        ...(!filas.length && queIncluye(objetivo, movimientos, hoyIso) ? [queIncluye(objetivo, movimientos, hoyIso)] : []),
        ...(consejoMedia?.lineas ?? []),
      ].join('\n'),
      tarjeta: {
        etiqueta: `${objetivo.sin ? 'Gasto' : capital(objetivo.nombre)} · media mensual`,
        cifra: Math.round(total / nRef) / 100,
        detalle: `${rangoDe(tres, null, hoyIso)} · total ${eur(total)}`,
        filas: filas.map((g) => ({ nombre: g.nombre, valor: Math.round(g.cent / nRef) / 100, extra: '/mes', pct: total > 0 ? Math.round((g.cent / total) * 100) : null })),
        ...(consejoMedia ? { accion: consejoMedia.accion } : {}),
      },
    }
  }
  const movs = movimientos.filter((m) => esConsumo(m) && filtro(m) && enPeriodo(per, hoyIso)(m))
  return respuestaGasto({ objetivo: objetivo.sin ? null : objetivo, movs, devoluciones: devolucionesEn(per), p: per, hoyIso, verboPago: /\bpag/.test(t), movimientos, filtro, pideMedia: /\b(media|promedio|al mes|mensual)\b/.test(t), veces: /\bcuantas veces\b/.test(t) })
}

// ══ PARA LA IA: el motor calcula, la IA solo redacta ═══════════════════════
// Fulcro (IA) NUNCA debe calcular ni suponer cifras. Estas dos funciones le dan
// los números ya hechos con las mismas reglas que el resto de la app.

const r2 = (x) => Math.round(x * 100) / 100

/**
 * Panorama general (va en el resumen, cacheado): años, últimos 12 meses,
 * medias, colchón, sueldo, subidas de precio, cuenta de ahorro y récords.
 */
export function panoramaParaIA(movimientos, { hoy = new Date() } = {}) {
  const hoyIso = iso(hoy)
  if (!movimientos.length) return null
  const anios = [...new Set(movimientos.map((m) => m.fecha.slice(0, 4)))].sort().slice(-4)
  const porAnio = anios.map((a) => {
    const t = totalesDe(movimientos.filter((m) => m.fecha.slice(0, 4) === a && m.fecha <= hoyIso))
    return { anio: Number(a), hastaHoy: a === hoyIso.slice(0, 4), ingresos: r2(t.ingresos), gastos: r2(t.gastos), ahorro: r2(t.ahorro), tasaAhorroPct: Math.round(t.ratioAhorro) }
  })
  const completos = mesesCompletos(movimientos, hoyIso).filter((x) => x.ingresos > 0 || x.gastos > 0)
  const ult12 = completos.slice(-12)
  const suma = (xs, k) => r2(xs.reduce((s, x) => s + x[k], 0))
  const m3 = medias(movimientos, hoyIso, 3)
  const b = bolsas(movimientos, hoyIso)
  const res = {
    calculadoEl: hoyIso,
    porAnio,
    ultimos12MesesCompletos: ult12.length
      ? { meses: ult12.length, ingresos: suma(ult12, 'ingresos'), gastos: suma(ult12, 'gastos'), ahorro: suma(ult12, 'ahorro'), tasaAhorroPct: Math.round((suma(ult12, 'ahorro') / Math.max(1, suma(ult12, 'ingresos'))) * 100) }
      : null,
    mediaMensual3Meses: m3 ? { ingresos: r2(m3.ingresos), gastos: r2(m3.gastos), ahorro: r2(m3.ahorro) } : null,
    colchonMesesDeGasto: m3 && m3.gastos > 0 ? Math.round((b.bolsaLiquidez / m3.gastos) * 10) / 10 : null,
  }
  if (completos.length >= 2) {
    const caro = completos.reduce((a, x) => (x.gastos > a.gastos ? x : a))
    const ahorro = completos.reduce((a, x) => (x.ahorro > a.ahorro ? x : a))
    res.records = { mesMasCaro: { mes: caro.clave, gastos: r2(caro.gastos) }, mesConMasAhorro: { mes: ahorro.clave, ahorro: r2(ahorro.ahorro) } }
  }
  const sueldo = evolucionSueldo(movimientos, hoyIso)
  if (typeof sueldo === 'object') res.nominaHabitualPorAnio = sueldo.tarjeta.filas.map((f) => ({ anio: f.nombre, importe: f.valor }))
  const subidas = subidasDePrecio(movimientos, hoyIso)
  if (typeof subidas === 'object') res.subidasDePrecio = subidas.tarjeta.filas.map((f) => ({ cargo: f.nombre, ahora: f.valor, [f.extra.split(' ')[0]]: f.extra.replace(/^antes /, '') }))
  const ahorroCuenta = cuentaDeAhorro(movimientos, hoyIso)
  if (typeof ahorroCuenta === 'object') res.cuentaDeAhorroNetoApartado = ahorroCuenta.tarjeta.cifra
  return res
}

/**
 * Hechos de LA PREGUNTA (va en el detalle): si menciona algo concreto
 * (gasolina, restaurantes, el seguro…), sus cifras exactas: total del periodo,
 * desglose por concepto, año a año, último pago. Y la respuesta que daría el
 * motor a la parte de datos de la pregunta.
 */
export function hechosParaIA(pregunta, { movimientos = [], recurrentes = [], hoy = new Date(), presupuesto = null } = {}) {
  const t = sinAcentos(pregunta).replace(/[¿?¡!.,;:()"«»]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t || !movimientos.length) return null
  const hoyIso = iso(hoy)
  const hechos = {}
  const objetivo = resolverObjetivo(t, movimientos)
  if (!objetivo.sin && objetivo.filtro) {
    const filtro = objetivo.filtro
    const consumo = movimientos.filter((m) => esConsumo(m) && filtro(m) && m.fecha <= hoyIso)
    if (consumo.length) {
      // Preguntas sobre el futuro ("¿me puedo permitir… en diciembre?"): el último año de referencia.
      const futuro = /\b(permitir|podre|tendre|voy a|quiero|pienso|planeo)\b/.test(t)
      const pPregunta = futuro ? null : periodo(t, hoy)
      const p = pPregunta && pPregunta.tipo !== 'todo' ? pPregunta : periodo('ultimo ano', hoy)
      const enP = consumo.filter(enPeriodo(p, hoyIso))
      const totalP = enP.reduce((s, m) => s + centimosDe(m), 0)
      const porAnio = {}
      for (const m of consumo) porAnio[m.fecha.slice(0, 4)] = r2((porAnio[m.fecha.slice(0, 4)] ?? 0) + centimosDe(m) / 100)
      const u = consumo.reduce((a, m) => (m.fecha > a.fecha ? m : a), consumo[0])
      hechos.sobre = {
        que: objetivo.nombre,
        periodo: p.etiqueta,
        total: totalP / 100,
        pagos: enP.length,
        mediaMensual: p.desde ? r2(totalP / 100 / Math.max(1, mesesEntre(p.desde, p.hasta))) : null,
        desglosePorConcepto: desglosePorConcepto(enP).slice(0, 8).map((g) => ({ concepto: g.nombre, total: g.cent / 100, pagos: g.n })),
        totalPorAnio: porAnio,
        ultimoPago: { fecha: u.fecha, importe: centimosDe(u) / 100, concepto: nombreComercio(u) },
      }
    }
  }
  // Lo que el motor contestaría a la parte de datos (si la hay).
  const datos = consultaLocal(pregunta.replace(/\b(me compensa|me conviene|deberia|debería|es mucho|es poco)\b/gi, ''), { movimientos, recurrentes, hoy, presupuesto })
  if (datos?.texto) hechos.respuestaDelMotor = datos.texto.replace(/\*\*/g, '')
  const cantidad = cantidadDe(t)
  if (cantidad && /\b(permitir|comprar|gastar|viaje|capricho|pagar)\b/.test(t)) {
    const b = bolsas(movimientos, hoyIso)
    const m = medias(movimientos, hoyIso, 3)
    hechos.capacidad = { importePreguntado: cantidad, disponibleHoy: b.bolsaLiquidez, ahorroMedioMensual: m ? r2(m.ahorro) : null, gastoMedioMensual: m ? r2(m.gastos) : null }
  }
  return Object.keys(hechos).length ? hechos : null
}
