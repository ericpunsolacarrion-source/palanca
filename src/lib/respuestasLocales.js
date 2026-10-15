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
  media promedio normalmente habitualmente suele suelo suelen tengo tienes tiene tenemos uso usar usando app aplicacion palanca empece`.split(/\s+/),
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
  return filas.map(([k, c]) => `${etiquetaMes(k, { month: 'long' }).toLowerCase()} ${eur(c)}`).join(' · ')
}

const mesesEntre = (desde, hasta) => {
  const [y1, m1] = desde.split('-').map(Number)
  const [y2, m2] = hasta.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1) + 1
}

function respuestaGasto({ objetivo, movs, devoluciones = [], p, hoyIso, verboPago }) {
  const devuelto = devoluciones.reduce((s, m) => s + centimosDe(m), 0)
  // Neto de devoluciones: mismo número que el resto de la app (MOTOR.md E6).
  const total = movs.reduce((s, m) => s + centimosDe(m), 0) - devuelto
  const que = objetivo ? ` en **${objetivo.nombre}**` : ''
  if (movs.length === 0) {
    return objetivo
      ? `No veo ningún gasto${que} ${p.etiqueta}.`
      : `No has apuntado gastos ${p.etiqueta}.`
  }
  const verbo = verboPago ? 'has pagado' : 'has gastado'
  const primera = movs.reduce((a, m) => (m.fecha < a ? m.fecha : a), movs[0].fecha)
  const cuando = p.tipo === 'todo' ? `Desde el ${formatearFecha(primera)}` : capital(p.etiqueta)
  const lineas = [`${cuando} ${verbo} **${eur(total)}**${que} (${movs.length} ${movs.length === 1 ? 'pago' : 'pagos'}).`]
  const meses = lineaMeses(movs, p)
  if (meses) lineas.push(`- Por meses: ${meses}`)
  if (devuelto > 0) lineas.push(`- Ya descontadas las devoluciones: ${eur(devuelto)}.`)
  const nMeses = p.tipo === 'todo' ? mesesEntre(primera, hoyIso) : mesesEntre(p.desde, p.hasta)
  if (nMeses >= 2) lineas.push(`- De media, **${eur(total / nMeses)} al mes**.`)
  if (objetivo) {
    const ultimo = movs.reduce((a, m) => (m.fecha > a.fecha ? m : a), movs[0])
    lineas.push(`- Último: ${formatearFecha(ultimo.fecha)}, ${eur(centimosDe(ultimo))}.`)
  }
  return lineas.join('\n')
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

/**
 * Respuesta local o null (→ IA).
 * datos: { movimientos, recurrentes, hoy: Date }
 */
export function respuestaLocal(pregunta, { movimientos = [], recurrentes = [], hoy = new Date() } = {}) {
  const t = sinAcentos(pregunta).replace(/[¿?¡!.,;:()"«»]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 160 || COMPLEJA.test(t)) return null
  const hoyIso = iso(hoy)
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
    return [
      cabecera,
      ...top.map((r) => `- ${r.nombre}: ${formatearEuros(Number(r.importe))}${(periodoDe(r).meses || 1) === 12 ? ' al año' : (periodoDe(r).meses || 1) > 1 ? ` cada ${periodoDe(r).meses} meses` : ' al mes'}`),
      ...(activos.length ? [] : ['Añádelos en **Fijos** con un toque y te aviso de cada cobro.']),
    ].join('\n')
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
  if (/\b(en que|donde|a que)\b/.test(t) && /\b(mas|se me va|se va)\b/.test(t)) {
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
    return [`${sujeto} gastas de media **${eur(total / 3)} al mes** (últimos 3 meses: ${eur(total)}).`, ...(linea ? [`- ${linea}`] : [])].join('\n')
  }
  const movs = movimientos.filter((m) => esConsumo(m) && filtro(m) && enPeriodo(per, hoyIso)(m))
  return respuestaGasto({ objetivo: objetivo.sin ? null : objetivo, movs, devoluciones: devolucionesEn(per), p: per, hoyIso, verboPago: /\bpag/.test(t) })
}
