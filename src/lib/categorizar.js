// Categorización automática de movimientos importados (extracto o capturas).
// Orden de confianza:
//   1. TU HISTORIAL: si ya has categorizado ese comercio, se usa tu categoría
//      (la más frecuente). Aprende de ti, no al revés.
//   2. REGLAS: diccionario de comercios y empresas habituales en España.
//   3. Por defecto: "Otros" (gasto) / "Otros ingresos" (ingreso).
// Además marca qué es una suscripción o un recibo y si se puede NEGOCIAR
// (luz, telefonía, seguros, banco, gimnasio…): base del plan de ahorro.
// Lógica pura y testeable.

import { directorio } from './comercios'

// negociable: tipo de palanca de ahorro (ver lib/negociables.js).
// fijo: 'suscripcion' | 'recibo' → candidato a compromiso en Fijos.
const R = (patron, categoria, extra = {}) => ({ patron, categoria, ...extra })

// El orden importa: lo específico antes que lo genérico ("amazon prime" antes
// que "amazon", "repsol luz" antes que "repsol").
// Movimientos entre tus propias cuentas (en cualquier sentido).
const TRASPASO_PROPIO = /traspaso|transferencia (a|entre) (mi|cuentas propias)|cuenta (de )?ahorro|cuenta naranja|\bsavings\b|\bvault\b|\bhucha\b|entre cuentas|cuentas propias/
const BROKERS = /myinvestor|indexa|trade republic|degiro|interactive brokers|finizens|inbestme|openbank broker|fondo indexado|aportacion plan|plan de pensiones|bitpanda|coinbase|binance|revolut invest/

const REGLAS_GASTO = [
  // Ahorro e inversión (no son consumo)
  R(TRASPASO_PROPIO, 'Ahorro'),
  R(BROKERS, 'Inversion'),
  // Energía (negociable)
  R(/repsol (luz|electricidad|gas|vivit)|iberdrola|endesa|naturgy|totalenergies|holaluz|octopus|lucera|som energia|\bedp\b|curenergia|baser|factor energia|energia xxi|\bpodo\b|imagina energia|electricidad|\bluz\b|gas natural|butano/, 'Suministros', { fijo: 'recibo', negociable: 'energia' }),
  // Agua (no se cambia de compañía)
  R(/canal de isabel|aigues|emasesa|aguas de|emaya|aqualia|agua\b|suministro agua/, 'Suministros', { fijo: 'recibo', negociable: 'agua' }),
  // Telefonía e internet (negociable)
  R(/movistar|telefonica|vodafone|orange|yoigo|masmovil|digi mobil|\bdigi\b|pepephone|simyo|lowi|\bo2\b|jazztel|finetwork|euskaltel|r cable|telecable|lebara|amena|fibra|telefonia/, 'Suministros', { fijo: 'recibo', negociable: 'telefonia' }),
  // Seguros (negociable)
  R(/mapfre|allianz|\baxa\b|mutua|linea directa|generali|sanitas|adeslas|\bdkv\b|asisa|catalana occidente|zurich|\breale\b|verti|genesis|ocaso|santalucia|caser|liberty|pelayo|seguro|poliza/, 'Seguros', { fijo: 'recibo', negociable: 'seguro' }),
  // Comisiones del banco (evitables)
  R(/comision|cuota (anual )?tarjeta|cuota mantenimiento|mantenimiento cuenta|gastos de mantenimiento|descubierto/, 'Comisiones', { fijo: 'recibo', negociable: 'banco' }),
  // Gimnasio (negociable / revisar uso)
  R(/basic ?fit|mcfit|altafit|viva ?gym|dreamfit|anytime fitness|synergym|holmes place|metropolitan|go fit|gimnasio|\bgym\b|crossfit|fitness/, 'Deporte', { fijo: 'suscripcion', negociable: 'gimnasio' }),
  // Suscripciones digitales (precio fijo: no se negocia, se revisa)
  R(/netflix|spotify|hbo|\bmax\b|disney|prime video|amazon prime|primevideo|apple\.com|itunes|icloud|youtube|dazn|filmin|audible|kindle unlimited|xbox|playstation|nintendo|openai|chatgpt|claude\.ai|anthropic|adobe|microsoft 365|office 365|google (one|storage)|patreon|twitch|tidal|deezer|crunchyroll|atresplayer|rakuten|movistar plus|skyshowtime/, 'Suscripciones', { fijo: 'suscripcion', negociable: 'digital' }),
  // Vivienda
  R(/alquiler|hipoteca|comunidad (de )?propietarios|\bcomunidad\b|\bibi\b|basuras|tasa residuos/, 'Vivienda', { fijo: 'recibo' }),
  // Supermercado y comida
  R(/mercadona|carrefour|\blidl\b|\baldi\b|\bdia\b|supermercados? dia|eroski|alcampo|consum|hipercor|supercor|bonpreu|condis|caprabo|ahorramas|gadis|froiz|masymas|\bspar\b|bm supermercados|simply|\blupa\b|family cash|hiperdino|coviran|la sirena|supermercado|fruteria|carniceria|panaderia|pescaderia|mercado/, 'Comida'),
  // Restaurantes y comida a domicilio
  R(/restaurante|\bbar\b|cafeteria|\bcafe\b|burger king|mcdonald|\bkfc\b|telepizza|domino|just eat|glovo|uber ?eats|deliveroo|starbucks|foster|\bvips\b|goiko|montaditos|taberna|tapas|pizzeria|cerveceria|kebab|sushi/, 'Restaurantes'),
  // Transporte
  R(/repsol|cepsa|\bbp\b|galp|shell|petronor|ballenoil|plenoil|gasolinera|carburante|renfe|\bmetro\b|\bemt\b|\btmb\b|cabify|\buber\b|\bbolt\b|free ?now|taxi|blablacar|\balsa\b|parking|aparcamiento|peaje|autopista|via ?t|\bitv\b|iryo|ouigo|bicing|recarga transporte/, 'Transporte'),
  // Salud
  R(/farmacia|clinica|dentist|dental|hospital|optica|fisioterap|quiron|vithas|hm hospitales|veterinari/, 'Salud'),
  // Viajes
  R(/ryanair|vueling|iberia|booking|airbnb|hotel|expedia|edreams|easyjet|air europa|volotea|trainline/, 'Viajes'),
  // Compras
  R(/amazon|amzn|aliexpress|shein|\btemu\b|zara|primark|el corte ingles|mediamarkt|decathlon|ikea|leroy merlin|\bfnac\b|pccomponentes|h&m|\bhm\b|mango|pull ?& ?bear|bershka|stradivarius|vinted|wallapop|apple store|sprinter|druni|primor|\baction\b/, 'Compras'),
  // Ocio
  R(/\bcine|yelmo|cinesa|ticketmaster|entradas|steam|teatro|museo|concierto|bolera|escape room/, 'Ocio'),
  // Educación
  R(/colegio|universidad|academia|matricula|udemy|coursera|escuela|guarderia|libreria/, 'Educación'),
  // Efectivo
  R(/cajero|retirada (de )?efectivo|reintegro/, 'Efectivo'),
  // Impuestos y tasas
  R(/agencia tributaria|\baeat\b|hacienda|ayuntamiento|\bdgt\b|multa|seguridad social|autonomo|cuota reta/, 'Impuestos'),
]

const REGLAS_INGRESO = [
  // Intereses y dividendos SÍ son ingreso, aunque vengan de tu cuenta de ahorro o del bróker.
  R(/intereses|dividendo|remuneracion cuenta|cupon/, 'Intereses'),
  // Luego lo que NO es ingreso: tu dinero que vuelve de tu ahorro o de una
  // inversión ("REEMBOLSO FONDO" no es una devolución de compra).
  R(TRASPASO_PROPIO, 'Desde ahorro'),
  R(BROKERS, 'Inversion'),
  R(/nomina|salario|\bpaga\b|haberes/, 'Nomina'),
  R(/pension|jubilacion|seguridad social|\binss\b/, 'Pensión'),
  R(/desempleo|\bsepe\b|prestacion/, 'Prestaciones'),
  R(/devolucion|reembolso|abono compra|refund/, 'Devoluciones'),
  R(/bizum|transferencia/, 'Transferencias'),
]

const sinAcentos = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

// Categorías que ponen los bancos (ING, BBVA, Revolut…) → las de Palanca. Se
// usan solo como pista cuando ni la memoria, ni tu historial, ni las reglas
// reconocen el comercio.
const CATEGORIAS_BANCO = [
  [/aliment|supermerc|groceries/, 'Comida'],
  [/restaura|bares|comida fuera|restaurants/, 'Restaurantes'],
  [/vehiculo|transporte|gasolin|combustible|transport/, 'Transporte'],
  [/hogar|vivienda|alquiler|hipoteca/, 'Vivienda'],
  [/recibos|suministro|utilities|telefon|internet/, 'Suministros'],
  [/seguro/, 'Seguros'],
  [/salud|farmacia|health|bienestar/, 'Salud'],
  [/viaje|travel|hotel/, 'Viajes'],
  [/ocio|entretenimiento|entertainment|cultura/, 'Ocio'],
  [/compras|shopping|ropa/, 'Compras'],
  [/educacion|formacion|education/, 'Educación'],
  [/impuesto|tasas|taxes/, 'Impuestos'],
  [/efectivo|cajero|cash/, 'Efectivo'],
  [/suscripcion|subscription/, 'Suscripciones'],
  [/inversion|investment/, 'Inversion'],
  [/excluido|traspaso|transfers? between|entre cuentas/, 'Ahorro'],
  [/nomina|salario|salary/, 'Nomina'],
]
export function categoriaDesdeBanco(nombre, tipo = 'gasto') {
  const t = sinAcentos(nombre).trim()
  if (!t) return null
  const hit = CATEGORIAS_BANCO.find(([re]) => re.test(t))?.[1]
  if (!hit) return String(nombre).trim()
  if (tipo === 'ingreso') {
    if (hit === 'Ahorro') return 'Desde ahorro'
    if (hit === 'Nomina' || hit === 'Inversion') return hit
    return null // "Compras" como ingreso de ING (una devolución) lo decide la regla
  }
  return hit === 'Nomina' ? null : hit
}

// Busca la primera regla que encaja con el concepto.
export function reglaPara(concepto, tipo = 'gasto') {
  const t = sinAcentos(concepto)
  if (!t.trim()) return null
  // También con guiones y asteriscos como espacios ("BASIC-FIT", "GLOVO*PEDIDO").
  const t2 = t.replace(/[-_*]+/g, ' ')
  const reglas = tipo === 'ingreso' ? REGLAS_INGRESO : REGLAS_GASTO
  return reglas.find((r) => r.patron.test(t) || r.patron.test(t2)) ?? null
}

/**
 * Crea un categorizador que aprende de los movimientos que ya tiene el
 * usuario. Devuelve fn({ nota, tipo }) → { categoria, origen, fijo?, negociable?, comercio }.
 * Orden: lo que el usuario dijo de ese comercio (memoria) → su historial con
 * ese comercio (aunque el banco lo escribiera distinto) → reglas → "Otros".
 */
export function crearCategorizador(movimientosExistentes = [], dir = directorio()) {
  // comercio REAL + tipo → categoría más frecuente en su historial.
  const conteo = new Map()
  for (const m of movimientosExistentes) {
    const nombre = m.categoria?.nombre
    const grupo = dir.grupoDe(m)
    if (!nombre || !grupo || nombre === 'Ajuste') continue
    const k = `${m.tipo}|${grupo}`
    const porCat = conteo.get(k) ?? new Map()
    porCat.set(nombre, (porCat.get(nombre) ?? 0) + 1)
    conteo.set(k, porCat)
  }
  const aprendido = new Map()
  for (const [k, porCat] of conteo) {
    aprendido.set(k, [...porCat.entries()].sort((a, b) => b[1] - a[1])[0][0])
  }

  return function categorizar({ nota, tipo = 'gasto' }) {
    const id = dir.identificar(nota || '')
    // La regla se prueba con el texto del banco y con el nombre real
    // ("ALIPAM23" que el usuario dijo que es Mercadona → regla de supermercado).
    const regla = reglaPara(nota, tipo) ?? (id.nombre ? reglaPara(id.nombre, tipo) : null)
    const extra = { ...(regla ? { fijo: regla.fijo, negociable: regla.negociable } : {}), comercio: id.nombre }
    if (id.categoria) return { categoria: id.categoria, origen: 'memoria', ...extra }
    const grupo = dir.grupoDe(nota || '')
    const tuya = grupo ? aprendido.get(`${tipo}|${grupo}`) : null
    if (tuya) return { categoria: tuya, origen: 'historial', ...extra }
    if (regla) return { categoria: regla.categoria, origen: 'regla', ...extra }
    return { categoria: tipo === 'ingreso' ? 'Otros ingresos' : 'Otros', origen: 'defecto', ...extra }
  }
}

// Atajo sin historial.
export const categorizar = (mov) => crearCategorizador([])(mov)
