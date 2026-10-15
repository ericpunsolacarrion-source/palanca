// IDENTIDAD DE COMERCIOS: saber SIEMPRE quién es quién, escriba como escriba el
// banco o el usuario. Base de todo lo "conectado" (listas, búsqueda,
// importación, fijos, suscripciones, Fulcro). Lógica pura y testeable.
//
//   "COMPRA TARJ. MERCADONA VALENCIA 03/10"  ─┐
//   "mercadona"  ·  "MERCADONA S.A."          ├─→ Mercadona
//   "Mercadoma" (errata)                      │
//   "PAGO TARJETA ALIPAM23" (el usuario dijo  │
//    una vez que es Mercadona: memoria)      ─┘
//
// Orden de resolución de un concepto:
//   1. MEMORIA del usuario (alias): lo que él ha dicho que es ("ALIPAM23" → Mercadona).
//   2. Errata de un alias conocido (distancia de edición pequeña).
//   3. MARCA conocida (diccionario de comercios habituales en España).
//   4. El concepto/cuenta que el usuario eligió al apuntarlo.
//   5. El propio texto, limpio y presentable.

// ── Texto ────────────────────────────────────────────────────────────────────
export function normalizarTexto(t) {
  return String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}

// Singular/plural y mayúsculas/acentos no distinguen: "Seguros" = "seguro",
// "Restaurantes" = "restaurante", "camiones" = "camión".
const raiz = (palabra) => (palabra.length > 3 ? palabra.replace(/s$/, '').replace(/e$/, '') : palabra)
const forma = (t) => normalizarTexto(t).split(' ').filter(Boolean).map(raiz).join(' ')
/** Forma canónica de una etiqueta (para comparar: misma forma = misma etiqueta). */
export const formaEtiqueta = forma

/** ¿Son la misma etiqueta? ("Comida" = "comida" = "Cómida " = "COMIDAS"). */
export function mismaEtiqueta(a, b) {
  const x = forma(a)
  return x !== '' && x === forma(b)
}

/** Distancia de edición (Damerau, transposiciones incluidas): "mercadnoa" → 1. */
export function distancia(a, b) {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j += 1) d[0][j] = j
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + coste)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[m][n]
}

// Cuánta errata se tolera según la longitud: nada en palabras cortas
// ("cine"/"vino" son cosas distintas), 1 letra desde 5, 2 desde 9.
const tolerancia = (len) => (len >= 9 ? 2 : len >= 5 ? 1 : 0)

/**
 * Busca en `lista` una etiqueta igual o casi igual a `nombre`.
 * Devuelve { item, exacto } o null. `nombreDe` saca el texto de cada item.
 */
export function buscarParecido(nombre, lista, nombreDe = (x) => x.nombre) {
  const objetivo = forma(nombre)
  if (!objetivo) return null
  let mejor = null
  for (const item of lista) {
    const f = forma(nombreDe(item))
    if (!f) continue
    if (f === objetivo) return { item, exacto: true }
    const tol = tolerancia(Math.min(f.length, objetivo.length))
    if (!tol) continue
    const dist = distancia(f, objetivo)
    if (dist <= tol && (!mejor || dist < mejor.dist)) mejor = { item, dist }
  }
  return mejor ? { item: mejor.item, exacto: false } : null
}

// ── Concepto bancario → clave estable del comercio ───────────────────────────
// Ruido de los extractos que no identifica a nadie (incluye pasarelas de pago:
// "PAYPAL *NETFLIX" es Netflix; "SUMUP *BAR PACO" es el bar).
const RUIDO = new Set(
  `compra compras pago pagos tarjeta tarj tarjetas tj tjt card visa mastercard debito credito recibo recibos adeudo adeudos
  cargo cargos domiciliacion domiciliado domic transaccion operacion contactless apple google pay en de del la el los las
  con num ref www com es net org sl sa slu sau sl inc ltd eu europe payments payment bv sarl gmbh ab srl llc co
  paypal sumup zettle izettle stripe sq redsys tpv pos xxxx xxx fecha valor oficina suc
  devolucion devoluciones reembolso reembolsos abono anulacion anulada refund`.split(/\s+/),
)

/** "COMPRA TARJ. NETFLIX.COM 12/03" → "netflix"; "PAGO TARJETA ALIPAM23" → "alipam". */
export function claveComercio(texto) {
  const palabras = normalizarTexto(texto)
    .split(' ')
    .map((p) => p.replace(/\d+/g, '')) // "alipam23" → "alipam" (antes se perdía entera)
    .filter((p) => p.length > 1 && !RUIDO.has(p))
  return palabras.slice(0, 3).join(' ')
}

// Prefijos del banco que no forman parte del nombre (para presentar).
const PREFIJOS = new Set(`compra compras pago pagos tarjeta tarj tj tjt recibo adeudo cargo domiciliacion transaccion operacion contactless paypal sumup zettle izettle stripe sq redsys tpv xxxx devolucion devoluciones reembolso reembolsos abono anulacion anulada refund`.split(' '))

function presentable(texto) {
  const palabras = normalizarTexto(texto)
    .split(' ')
    .map((p) => p.replace(/\d+/g, ''))
    .filter((p) => p && !PREFIJOS.has(p))
  return bonito(palabras.slice(0, 5).join(' '))
}

const bonito = (t) =>
  String(t)
    .toLowerCase()
    .replace(/(^|[\s(/&.-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())

// ── Marcas conocidas (lo específico antes que lo genérico) ────────────────────
const MARCAS = [
  ['Amazon Prime', /amazon prime|prime video|primevideo/],
  ['Amazon', /amazon|amzn/],
  ['Mercadona', /mercadona/],
  ['Carrefour', /carrefour/],
  ['Lidl', /\blidl\b/],
  ['Aldi', /\baldi\b/],
  ['Dia', /supermercados? dia\b|\bdia retail\b|^dia supermercado|(^|\btarj |\bcompra )dia\b(?! \d)/],
  ['Eroski', /eroski/],
  ['Alcampo', /alcampo/],
  ['Consum', /\bconsum\b/],
  ['Hipercor', /hipercor/],
  ['El Corte Inglés', /corte ingles/],
  ['Bonpreu', /bonpreu/],
  ['Condis', /condis/],
  ['Caprabo', /caprabo/],
  ['Ahorramas', /ahorramas/],
  ['Repsol Luz', /repsol (luz|electricidad|vivit)/],
  ['Repsol', /repsol/],
  ['Cepsa', /cepsa|moeve/],
  ['BP', /\bbp\b/],
  ['Galp', /\bgalp\b/],
  ['Shell', /\bshell\b/],
  ['Petronor', /petronor/],
  ['Ballenoil', /ballenoil/],
  ['Plenoil', /plenoil/],
  ['Netflix', /netflix/],
  ['Spotify', /spotify/],
  ['HBO Max', /\bhbo\b|\bmax\.com/],
  ['Disney+', /disney/],
  ['YouTube', /youtube/],
  ['Apple', /apple\.com|itunes|icloud|apple services/],
  ['Google', /google (one|storage|play)|google \*/],
  ['DAZN', /\bdazn\b/],
  ['Filmin', /filmin/],
  ['Movistar', /movistar|telefonica/],
  ['Vodafone', /vodafone/],
  ['Orange', /\borange\b/],
  ['Yoigo', /yoigo/],
  ['MásMóvil', /masmovil/],
  ['Digi', /\bdigi\b/],
  ['Pepephone', /pepephone/],
  ['Simyo', /simyo/],
  ['Lowi', /\blowi\b/],
  ['O2', /\bo2\b/],
  ['Jazztel', /jazztel/],
  ['Iberdrola', /iberdrola/],
  ['Endesa', /endesa/],
  ['Naturgy', /naturgy/],
  ['Holaluz', /holaluz/],
  ['Octopus Energy', /octopus/],
  ['Mapfre', /mapfre/],
  ['Allianz', /allianz/],
  ['AXA', /\baxa\b/],
  ['Mutua Madrileña', /mutua madrilena/],
  ['Línea Directa', /linea directa/],
  ['Sanitas', /sanitas/],
  ['Adeslas', /adeslas/],
  ['DKV', /\bdkv\b/],
  ['Basic-Fit', /basic ?fit/],
  ['McFit', /mcfit/],
  ['Zara', /\bzara\b/],
  ['Primark', /primark/],
  ['IKEA', /\bikea\b/],
  ['Decathlon', /decathlon/],
  ['Leroy Merlin', /leroy merlin/],
  ['MediaMarkt', /media ?markt/],
  ['AliExpress', /aliexpress/],
  ['Shein', /\bshein\b/],
  ['Temu', /\btemu\b/],
  ['Glovo', /glovo/],
  ['Just Eat', /just ?eat/],
  ['Uber Eats', /uber ?eats/],
  ['Uber', /\buber\b/],
  ['Cabify', /cabify/],
  ['Renfe', /renfe/],
  ['Ryanair', /ryanair/],
  ['Vueling', /vueling/],
  ['Iberia', /\biberia\b/],
  ['Booking', /booking/],
  ['Airbnb', /airbnb/],
  ["McDonald's", /mcdonald/],
  ['Burger King', /burger king/],
  ['Starbucks', /starbucks/],
  ['Telepizza', /telepizza/],
  ['Shopify', /shopify/],
  ['Bizum', /^bizum$/], // solo si no hay nadie más en el concepto
]

export function marcaDe(texto) {
  const t = normalizarTexto(texto)
  const conPuntos = String(texto ?? '').toLowerCase()
  for (const [nombre, patron] of MARCAS) if (patron.test(t) || patron.test(conPuntos)) return nombre
  return null
}

// ── Directorio: memoria del usuario + marcas + lo apuntado ───────────────────
/**
 * alias: [{ clave, nombre, categoria? }] — lo que el usuario ha dicho que es cada
 * concepto (clave = claveComercio del texto bancario).
 */
export function crearDirectorio(alias = []) {
  const porClave = new Map()
  for (const a of alias) if (a?.clave && a?.nombre) porClave.set(a.clave, a)
  const claves = [...porClave.keys()]

  function aliasPara(clave) {
    if (!clave) return null
    const exacto = porClave.get(clave)
    if (exacto) return { alias: exacto, origen: 'memoria' }
    // Errata o variante de un concepto ya conocido ("alipan" ≈ "alipam").
    const tol = tolerancia(clave.length)
    if (!tol) return null
    let mejor = null
    for (const k of claves) {
      const d = distancia(k, clave)
      if (d <= tol && (!mejor || d < mejor.d)) mejor = { k, d }
    }
    return mejor ? { alias: porClave.get(mejor.k), origen: 'memoria-aprox' } : null
  }

  /**
   * Quién es: { nombre, clave, categoria, origen } para un texto o un movimiento.
   * `clave` es la del texto ORIGINAL (para guardar memoria); `nombre` el real.
   */
  function identificar(entrada) {
    const esMov = entrada && typeof entrada === 'object'
    const nota = esMov ? entrada.nota : entrada
    const cuenta = esMov ? entrada.fuente?.nombre : null
    const texto = (nota && String(nota).trim()) || cuenta || ''
    const clave = claveComercio(texto)

    const recordado = aliasPara(clave) ?? (cuenta ? aliasPara(claveComercio(cuenta)) : null)
    if (recordado) return { nombre: recordado.alias.nombre, clave, categoria: recordado.alias.categoria ?? null, origen: recordado.origen }

    // Lo que el usuario eligió al apuntarlo manda sobre la marca deducida.
    if (cuenta && !nota) return { nombre: cuenta, clave, categoria: null, origen: 'apuntado' }
    const marca = marcaDe(texto)
    if (marca && marca !== 'Bizum') return { nombre: marca, clave, categoria: null, origen: 'marca' }
    if (cuenta) return { nombre: cuenta, clave, categoria: null, origen: 'apuntado' }
    if (!texto) return { nombre: '', clave: '', categoria: null, origen: 'vacio' }
    // Texto libre: si viene EN MAYÚSCULAS del banco, presentable.
    const enMayusculas = /[A-ZÁÉÍÓÚÑ]/.test(texto) && texto === texto.toUpperCase()
    return { nombre: (enMayusculas && presentable(texto)) || texto, clave, categoria: null, origen: 'texto' }
  }

  return {
    identificar,
    nombreDe: (entrada) => identificar(entrada).nombre,
    /** Clave de agrupación del comercio REAL (dos textos del mismo sitio → igual). */
    grupoDe: (entrada) => forma(identificar(entrada).nombre),
    alias: () => [...porClave.values()],
    tamano: porClave.size,
  }
}

// ── Directorio activo de la app (lo fija App con la memoria del usuario) ─────
let activo = crearDirectorio([])
export function establecerDirectorio(alias) {
  activo = crearDirectorio(alias)
  return activo
}
export const directorio = () => activo
export const nombreComercio = (entrada) => activo.nombreDe(entrada)
export const grupoComercio = (entrada) => activo.grupoDe(entrada)
