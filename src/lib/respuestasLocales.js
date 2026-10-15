// RESPUESTAS AL MOMENTO (sin IA). Las preguntas de DATOS ("¿cuánto he gastado
// en gasolina los tres últimos meses?", "¿cuánto he pagado de Spotify hasta
// ahora?", "¿cuándo me cobran el seguro?") se calculan aquí, en el móvil:
// gratis, instantáneas y exactas (mismas reglas que el motor). Solo las
// preguntas de CRITERIO ("¿me conviene…?", "¿cómo ahorro más?") van a la IA.
//
// Regla de oro: ante la duda, null → la pregunta va a Fulcro (IA). Mejor
// gastar 0,05 céntimos que contestar mal.

import { bolsas, categoriaDeDevolucion, centimosDe, esConsumo, etiquetaMes, formatearFecha, gastoPorCategoria, totalesDe } from './movimientosUtils'
import { esDevolucion, esInversion, etiquetaCategoria, formatearEuros } from './categorias'
import { periodoDe, proximoCobro } from './periodicidad'
import { buscarParecido, nombreComercio } from './comercios'
import { detectarSuscripciones } from './suscripciones'
import { resumenDelMes } from './inicio'

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
  mucho poco demasiado bastante compensa conviene renegociar negociar quitar cancelar dar baja podria puedo permitir merece pena cambiar reducir bajar recortar ahorrar`.split(/\s+/),
)

// ── Periodo ──────────────────────────────────────────────────────────────────
function periodo(t, hoy) {
  const h = iso(hoy)
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  const primeroDe = (yy, mm) => iso(new Date(yy, mm, 1))
  const ultimoDe = (yy, mm) => iso(new Date(yy, mm + 1, 0))
  const restarDias = (n) => iso(new Date(y, m, hoy.getDate() - n + 1))

  if (/\b(hasta ahora|en total|desde siempre|desde el principio|desde el inicio|historico|desde que (empece|uso|tengo|use|estoy))\b/.test(t)) return { tipo: 'todo', etiqueta: 'desde el principio' }
  const n = t.match(/\b(?:ultim[oa]s?\s+(\d+|[a-z]+)\s+(dias|semanas|meses|anos)|(\d+|[a-z]+)\s+ultim[oa]s\s+(dias|semanas|meses|anos))\b/)
  if (n) {
    const cantidad = Number(n[1] ?? n[3]) || NUMEROS[n[1] ?? n[3]]
    const unidad = n[2] ?? n[4]
    if (cantidad > 0 && cantidad <= 120) {
      if (unidad === 'meses') return { desde: primeroDe(y, m - cantidad), hasta: ultimoDe(y, m - 1), meses: cantidad, etiqueta: `en los últimos ${cantidad} meses (sin contar este)` }
      if (unidad === 'anos') return { desde: primeroDe(y - cantidad, m), hasta: h, etiqueta: `en los últimos ${cantidad} años` }
      const dias = unidad === 'semanas' ? cantidad * 7 : cantidad
      return { desde: restarDias(dias), hasta: h, etiqueta: `en los últimos ${dias} días` }
    }
  }
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
  if (/\b(este mes|lo que va de mes)\b/.test(t)) return { desde: primeroDe(y, m), hasta: h, etiqueta: 'este mes' }
  const anio = t.match(/\b(20\d\d)\b/)
  const mes = MESES.findIndex((nombre) => new RegExp(`\\b${nombre}\\b`).test(t))
  if (mes >= 0) {
    const yy = anio ? Number(anio[1]) : mes > m ? y - 1 : y
    return { desde: primeroDe(yy, mes), hasta: ultimoDe(yy, mes), etiqueta: `en ${MESES[mes]}${yy !== y ? ` de ${yy}` : ''}` }
  }
  if (anio) return { desde: `${anio[1]}-01-01`, hasta: `${anio[1]}-12-31`, etiqueta: `en ${anio[1]}` }
  return null
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

function lineaMeses(movs, p) {
  if (p.tipo === 'todo' || !p.desde || p.desde.slice(0, 7) === p.hasta.slice(0, 7)) return null
  const filas = porMeses(movs)
  if (filas.length < 2 || filas.length > 12) return null
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

function respuestaGasto({ objetivo, movs, devoluciones = [], p, hoyIso, verboPago, movimientos = [], filtro }) {
  const devuelto = devoluciones.reduce((s, m) => s + centimosDe(m), 0)
  // Neto de devoluciones: mismo número que el resto de la app (MOTOR.md E6).
  const total = movs.reduce((s, m) => s + centimosDe(m), 0) - devuelto
  const que = objetivo ? ` en **${objetivo.nombre}**` : ''
  if (movs.length === 0) {
    return objetivo ? sinGastosEn(objetivo, p, movimientos, filtro, hoyIso) : `No has apuntado gastos ${p.etiqueta}.`
  }
  const verbo = verboPago ? 'has pagado' : 'has gastado'
  const primera = movs.reduce((a, m) => (m.fecha < a ? m.fecha : a), movs[0].fecha)
  const cuando = p.tipo === 'todo' ? `Desde el ${formatearFecha(primera)}` : capital(p.etiqueta)
  const lineas = [`${cuando} ${verbo} **${eur(total)}**${que} (${movs.length} ${movs.length === 1 ? 'pago' : 'pagos'}).`]

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

  // Con desglose, la fila de meses solo en periodos cortos (claridad antes que volumen).
  const meses = !filas.length || porMeses(movs).length <= 4 ? lineaMeses(movs, p) : null
  if (meses) lineas.push(`- Por meses: ${meses}`)
  if (devuelto > 0) lineas.push(`- Ya descontadas las devoluciones: ${eur(devuelto)}.`)
  const nMeses = p.tipo === 'todo' ? mesesEntre(primera, hoyIso) : mesesEntre(p.desde, p.hasta)
  const media = nMeses >= 2 ? total / nMeses : null
  if (media != null) lineas.push(`- De media, **${eur(media)} al mes**.`)
  let ultimo = null
  if (objetivo) {
    ultimo = movs.reduce((a, m) => (m.fecha > a.fecha ? m : a), movs[0])
    lineas.push(`- Último: ${formatearFecha(ultimo.fecha)}, ${eur(centimosDe(ultimo))}.`)
  }
  return {
    texto: lineas.join('\n'),
    tarjeta: {
      etiqueta: `${objetivo ? objetivo.nombre : 'Gasto'} · ${p.tipo === 'todo' ? 'desde el principio' : p.etiqueta.replace(/^en /, '')}`,
      cifra: total / 100,
      detalle: [`${movs.length} ${movs.length === 1 ? 'pago' : 'pagos'}`, media != null ? `${eur(media)}/mes de media` : null, ultimo ? `último ${formatearFecha(ultimo.fecha)}` : null].filter(Boolean).join(' · '),
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
  const top = [...completos].sort((a, b) => (menos ? valor(a) - valor(b) : valor(b) - valor(a))).slice(0, 3)
  return {
    texto: [
      `${capital(que)} fue **${nombreMes(elegido.clave)}**: ${formatearEuros(valor(elegido))} ${deAhorro ? 'ahorrados' : 'gastados'} (tu media: ${formatearEuros(Math.round(media))}).`,
      ...top.slice(1).map((m) => `- Después: ${nombreMes(m.clave)}, ${formatearEuros(valor(m))}.`),
    ].join('\n'),
    tarjeta: { etiqueta: capital(que), cifra: valor(elegido), detalle: `${capital(nombreMes(elegido.clave))} · media ${formatearEuros(Math.round(media))}`, filas: top.map((m) => ({ nombre: capital(nombreMes(m.clave)), valor: valor(m) })) },
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
  const periodicos = detectarSuscripciones(movimientos, [], { hoy: hoyIso })
    .filter((d) => CATEGORIAS_FIJAS.test(sinAcentos(d.categoriaNombre ?? '')))
    .filter((d) => !soloSuscripciones || /suscrip/i.test(sinAcentos(d.categoriaNombre ?? '')))
  const subidas = []
  for (const d of periodicos) {
    const pagos = movimientos.filter((m) => esConsumo(m) && nombreComercio(m) === d.nombre && m.fecha <= hoyIso).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    if (pagos.length < 2) continue
    const ultimo = pagos.at(-1)
    const antes = pagos[0] // desde que hay datos
    const a = centimosDe(antes)
    const b = centimosDe(ultimo)
    if (b > a * 1.01) {
      const cuando = pagos.find((m) => centimosDe(m) === b)?.fecha // desde cuándo paga el precio actual
      subidas.push({ nombre: d.nombre, a, b, cuando })
    }
  }
  if (!subidas.length) return `No veo subidas de precio en tus ${soloSuscripciones ? 'suscripciones' : 'cargos que se repiten'}.`
  subidas.sort((x, z) => (z.b - z.a) * 12 - (x.b - x.a) * 12)
  return {
    texto: [
      `Desde que tengo tus datos te han subido el precio de ${subidas.length} ${soloSuscripciones ? (subidas.length === 1 ? 'suscripción' : 'suscripciones') : subidas.length === 1 ? 'cargo' : 'cargos'}:`,
      ...subidas.map((x) => `- ${x.nombre}: ${eur(x.a)} → **${eur(x.b)}** (+${Math.round((x.b / x.a - 1) * 100)} %${x.cuando ? `, desde ${formatearFecha(x.cuando)}` : ''})`),
      'En **Fijos → Tu plan de ahorro** tienes cuáles se pueden negociar y cuándo.',
    ].join('\n'),
    tarjeta: { etiqueta: 'Subidas de precio', cifra: null, cifraTexto: `${subidas.length}`, detalle: subidas.length === 1 ? 'cargo más caro' : 'cargos más caros', filas: subidas.map((x) => ({ nombre: x.nombre, valor: x.b / 100, extra: `antes ${eur(x.a)}` })) },
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
function intencionGeneral(t, { movimientos, hoy, hoyIso, presupuesto }) {
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

function consultar(pregunta, { movimientos = [], recurrentes = [], hoy = new Date(), presupuesto = null } = {}) {
  const t = sinAcentos(pregunta).replace(/[¿?¡!.,;:()"«»]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 160) return null
  const hoyIso = iso(hoy)
  const general = intencionGeneral(t, { movimientos, hoy, hoyIso, presupuesto })
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
      return `**${d.nombre}** se cobra ${cada}. El último cargo fue el ${formatearFecha(d.ultimaFecha)} (${formatearEuros(d.importe)}), así que el próximo será hacia el **${formatearFecha(d.proximaFecha)}**. Añádelo en **Fijos** y te aviso ese día.`
    }
    const prox = proximoCobro(rec, hoy)
    if (!prox) return null
    if (prox.sinDia) return `**${rec.nombre}** (${formatearEuros(Number(rec.importe))}) toca ${prox.texto}, pero no sé qué día. Ponle el día de cobro en **Fijos** y te aviso.`
    return `**${rec.nombre}**: el próximo cobro es el **${formatearFecha(prox.fecha)}** (${prox.texto}), ${formatearEuros(Number(rec.importe))}.`
  }

  // Último pago: "¿cuándo pagué el gimnasio por última vez?"
  if (/\b(ultimo pago|ultima vez|cuando pague|cuando fue el ultimo)\b/.test(t)) {
    const obj = resolverObjetivo(t, movimientos)
    if (obj.sin || !obj.filtro) return null
    const movs = movimientos.filter((m) => esConsumo(m) && obj.filtro(m) && m.fecha <= hoyIso)
    if (!movs.length) return `No veo pagos de **${obj.nombre}** en tus movimientos.`
    const u = movs.reduce((a, m) => (m.fecha > a.fecha ? m : a), movs[0])
    return `El último pago de **${obj.nombre}** fue el **${formatearFecha(u.fecha)}**: ${eur(centimosDe(u))}.`
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
    const per = p ?? periodo('este mes', hoy)
    // Mismas funciones del motor que Inicio y Presupuesto (neto de devoluciones).
    const dentro = movimientos.filter(enPeriodo(per, hoyIso))
    const mapa = gastoPorCategoria(dentro)
    const total = totalesDe(dentro).gastos
    if (!(total > 0) || mapa.size === 0) return `No has apuntado gastos ${per.etiqueta}.`
    const top = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    return [`${capital(per.etiqueta)} has gastado **${formatearEuros(total)}**. Donde más:`, ...top.map(([c, v]) => `- **${etiquetaCategoria(c)}**: ${formatearEuros(v)} (${Math.round((v / total) * 100)} %)`)].join('\n')
  }

  const esIngreso = /\b(ingresado|ingrese|ingresos|cobrado|cobre|ganado|gane)\b/.test(t)
  const esAhorro = /\b(ahorrado|ahorre)\b/.test(t)
  const esInv = /\b(invertido|inverti|aportado)\b/.test(t)
  const esGasto = implicita || /\b(gastado|gaste|gastos|pagado|pague|pagos|costado|dejado|gasto|pago|cuesta|cuestan|llevo|costar|vale)\b/.test(t)
  if (!esIngreso && !esAhorro && !esInv && !esGasto) return null

  const objetivo = resolverObjetivo(t, movimientos)
  const presente = implicita || (/\b(gasto|pago|cuesta|cuestan)\b/.test(t) && !/\b(he|has|hemos|llevo)\b/.test(t))
  // Sin "qué", la media solo si se pide ("¿cuánto gasto al mes de media?").
  const mediaTotal = objetivo.sin && /\b(media|promedio|al mes|normalmente|suelo|habitualmente)\b/.test(t)
  // Sin periodo: "he pagado de X" → desde el principio; presente → media; si no, este mes.
  const per = p ?? ((presente && !objetivo.sin) || mediaTotal ? null : /\bpagad/.test(t) && !objetivo.sin ? { tipo: 'todo', etiqueta: 'desde el principio' } : periodo('este mes', hoy))

  if (esAhorro || esIngreso || esInv) {
    if (!objetivo.sin && !esInv) return null // "¿cuánto he cobrado de X?" → IA (raro)
    const perUsado = per ?? periodo('este mes', hoy)
    const dentro = movimientos.filter(enPeriodo(perUsado, hoyIso))
    // La regla única del motor (totalesDe): sin ajustes, traspasos ni devoluciones como ingreso.
    const tot = totalesDe(dentro)
    if (esIngreso) return `${capital(perUsado.etiqueta)} han entrado **${formatearEuros(tot.ingresos)}**.`
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
    // Presente sin periodo ("¿cuánto gasto en gasolina?"): media de los 3 últimos meses completos.
    const tres = periodo('ultimos 3 meses', hoy)
    const movs = movimientos.filter((m) => esConsumo(m) && filtro(m) && enPeriodo(tres, hoyIso)(m))
    const total = movs.reduce((s, m) => s + centimosDe(m), 0) - devolucionesEn(tres).reduce((s, m) => s + centimosDe(m), 0)
    if (!movs.length) {
      // Algo que se paga de vez en cuando (un seguro anual): el último pago y el de antes.
      const anteriores = movimientos.filter((m) => esConsumo(m) && filtro(m) && m.fecha <= hoyIso).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      if (!anteriores.length) return `No veo gastos en **${objetivo.nombre}** en tus movimientos.`
      const [u, prev] = anteriores
      const anual = prev && Math.abs(Date.parse(u.fecha) - Date.parse(prev.fecha)) / 86400000 > 300
      const cambio = prev && centimosDe(prev) !== centimosDe(u) ? ` (antes, ${eur(centimosDe(prev))}: ${centimosDe(u) > centimosDe(prev) ? 'ha subido' : 'ha bajado'} un ${Math.abs(Math.round((centimosDe(u) / centimosDe(prev) - 1) * 100))} %)` : ''
      return `**${objetivo.nombre}** no es un gasto de cada mes${anual ? ': lo pagas una vez al año' : ''}. El último pago fue el ${formatearFecha(u.fecha)}: **${eur(centimosDe(u))}**${cambio}.`
    }
    const linea = lineaMeses(movs, tres)
    const sujeto = objetivo.sin ? 'En total' : `En **${objetivo.nombre}**`
    const grupos = objetivo.sin ? [] : desglosePorConcepto(movs, devolucionesEn(tres))
    const filas = grupos.length >= 2 ? grupos.slice(0, 6) : []
    return {
      texto: [
        `${sujeto} gastas de media **${eur(total / 3)} al mes** (últimos 3 meses: ${eur(total)}).`,
        ...filas.map((g) => `- ${g.nombre}: **${eur(g.cent / 3)}/mes** (${eur(g.cent)} en 3 meses)`),
        ...(linea ? [`- Por meses: ${linea}`] : []),
      ].join('\n'),
      tarjeta: {
        etiqueta: `${objetivo.sin ? 'Gasto' : objetivo.nombre} · media mensual`,
        cifra: total / 300,
        detalle: `últimos 3 meses: ${eur(total)}`,
        filas: filas.map((g) => ({ nombre: g.nombre, valor: g.cent / 300, extra: '/mes', pct: total > 0 ? Math.round((g.cent / total) * 100) : null })),
      },
    }
  }
  const movs = movimientos.filter((m) => esConsumo(m) && filtro(m) && enPeriodo(per, hoyIso)(m))
  return respuestaGasto({ objetivo: objetivo.sin ? null : objetivo, movs, devoluciones: devolucionesEn(per), p: per, hoyIso, verboPago: /\bpag/.test(t), movimientos, filtro })
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
