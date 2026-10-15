// Categorización automática de movimientos importados (extracto o capturas).
// Orden de confianza:
//   1. TU HISTORIAL: si ya has categorizado ese comercio, se usa tu categoría
//      (la más frecuente). Aprende de ti, no al revés.
//   2. REGLAS: diccionario de comercios y empresas habituales en España.
//   3. Por defecto: "Otros" (gasto) / "Otros ingresos" (ingreso).
// Además marca qué es una suscripción o un recibo y si se puede NEGOCIAR
// (luz, telefonía, seguros, banco, gimnasio…): base del plan de ahorro.
// Lógica pura y testeable.

import { normalizarComercio } from './suscripciones'

// negociable: tipo de palanca de ahorro (ver lib/negociables.js).
// fijo: 'suscripcion' | 'recibo' → candidato a compromiso en Fijos.
const R = (patron, categoria, extra = {}) => ({ patron, categoria, ...extra })

// El orden importa: lo específico antes que lo genérico ("amazon prime" antes
// que "amazon", "repsol luz" antes que "repsol").
const REGLAS_GASTO = [
  // Ahorro e inversión (no son consumo)
  R(/traspaso|transferencia (a|entre) (mi|cuentas propias)|a cuenta ahorro|hucha/, 'Ahorro'),
  R(/myinvestor|indexa|trade republic|degiro|interactive brokers|finizens|inbestme|openbank broker|fondo indexado|aportacion plan|plan de pensiones|bitpanda|coinbase|binance|revolut invest/, 'Inversion'),
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
  R(/nomina|salario|\bpaga\b|haberes/, 'Nomina'),
  R(/pension|jubilacion|seguridad social|\binss\b/, 'Pensión'),
  R(/desempleo|\bsepe\b|prestacion/, 'Prestaciones'),
  R(/devolucion|reembolso|abono compra|refund/, 'Devoluciones'),
  R(/intereses|dividendo|remuneracion cuenta/, 'Intereses'),
  R(/bizum|transferencia|traspaso/, 'Transferencias'),
]

const sinAcentos = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

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
 * usuario. Devuelve fn({ nota, tipo }) → { categoria, origen, fijo?, negociable? }.
 */
export function crearCategorizador(movimientosExistentes = []) {
  // comercio normalizado + tipo → categoría más frecuente en su historial.
  const conteo = new Map()
  for (const m of movimientosExistentes) {
    const nombre = m.categoria?.nombre
    const clave = normalizarComercio(m.fuente?.nombre || m.nota || '')
    if (!nombre || !clave || nombre === 'Ajuste') continue
    const k = `${m.tipo}|${clave}`
    const porCat = conteo.get(k) ?? new Map()
    porCat.set(nombre, (porCat.get(nombre) ?? 0) + 1)
    conteo.set(k, porCat)
  }
  const aprendido = new Map()
  for (const [k, porCat] of conteo) {
    aprendido.set(k, [...porCat.entries()].sort((a, b) => b[1] - a[1])[0][0])
  }

  return function categorizar({ nota, tipo = 'gasto' }) {
    const regla = reglaPara(nota, tipo)
    const extra = regla ? { fijo: regla.fijo, negociable: regla.negociable } : {}
    const clave = normalizarComercio(nota || '')
    const tuya = clave ? aprendido.get(`${tipo}|${clave}`) : null
    if (tuya) return { categoria: tuya, origen: 'historial', ...extra }
    if (regla) return { categoria: regla.categoria, origen: 'regla', ...extra }
    return { categoria: tipo === 'ingreso' ? 'Otros ingresos' : 'Otros', origen: 'defecto' }
  }
}

// Atajo sin historial.
export const categorizar = (mov) => crearCategorizador([])(mov)
