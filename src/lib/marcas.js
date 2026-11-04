// Identidad visual de comercios y servicios (v5): cada marca conocida lleva su
// color y su monograma, como un logo reconocible sin usar imágenes de terceros
// (nada sale a internet ni se reproduce un logotipo). Los comercios sin marca
// reciben un tono estable derivado del nombre. Lógica pura y testeable.
import { marcaDe, normalizarTexto } from './comercios'

// [fondo, texto, monograma]. Colores de marca aproximados (dato público).
const COLORES = {
  Netflix: ['#141414', '#E50914', 'N'],
  Spotify: ['#1DB954', '#04130A', 'S'],
  'Amazon Prime': ['#00A8E1', '#04131A', 'P'],
  Amazon: ['#FF9900', '#141414', 'a'],
  Mercadona: ['#00843D', '#FFFFFF', 'M'],
  Carrefour: ['#004E9F', '#FFFFFF', 'C'],
  Lidl: ['#0050AA', '#FFF000', 'L'],
  Aldi: ['#00005F', '#FFFFFF', 'A'],
  Dia: ['#E30613', '#FFFFFF', 'D'],
  Eroski: ['#E2001A', '#FFFFFF', 'E'],
  Alcampo: ['#E3001B', '#FFFFFF', 'A'],
  Consum: ['#F39200', '#1A0E00', 'C'],
  'El Corte Inglés': ['#00843D', '#FFFFFF', 'ECI'],
  Repsol: ['#FF8200', '#1A0D00', 'R'],
  'Repsol Luz': ['#FF8200', '#1A0D00', 'R'],
  Cepsa: ['#E30613', '#FFFFFF', 'C'],
  BP: ['#009B3A', '#FFE600', 'bp'],
  Galp: ['#F26722', '#FFFFFF', 'G'],
  Shell: ['#FFD500', '#DD1D21', 'S'],
  'HBO Max': ['#5822B4', '#FFFFFF', 'max'],
  'Disney+': ['#113CCF', '#FFFFFF', 'D+'],
  YouTube: ['#FF0000', '#FFFFFF', '▶'],
  Apple: ['#F5F5F7', '#111111', ''],
  Google: ['#FFFFFF', '#4285F4', 'G'],
  DAZN: ['#0C161C', '#F8F8F5', 'DA'],
  Filmin: ['#111111', '#FFFFFF', 'f'],
  Movistar: ['#019DF4', '#FFFFFF', 'M'],
  Vodafone: ['#E60000', '#FFFFFF', 'V'],
  Orange: ['#FF7900', '#111111', 'or'],
  Yoigo: ['#8B2D8F', '#FFFFFF', 'Y'],
  Digi: ['#1E3D8F', '#FFFFFF', 'D'],
  Iberdrola: ['#5BA829', '#FFFFFF', 'I'],
  Endesa: ['#00A1DE', '#FFFFFF', 'E'],
  Naturgy: ['#004571', '#F39200', 'N'],
  Holaluz: ['#FF5A5F', '#FFFFFF', 'H'],
  Mapfre: ['#D81E05', '#FFFFFF', 'M'],
  Allianz: ['#003781', '#FFFFFF', 'A'],
  AXA: ['#00008F', '#FFFFFF', 'AXA'],
  'Mutua Madrileña': ['#003B7A', '#FFFFFF', 'MM'],
  Sanitas: ['#0072CE', '#FFFFFF', 'S'],
  Adeslas: ['#00A0DF', '#FFFFFF', 'A'],
  'Basic-Fit': ['#FF7900', '#111111', 'BF'],
  Zara: ['#111111', '#FFFFFF', 'Z'],
  Primark: ['#00A9E0', '#FFFFFF', 'P'],
  IKEA: ['#0058A3', '#FFDA1A', 'IK'],
  Decathlon: ['#0082C3', '#FFFFFF', 'D'],
  'Leroy Merlin': ['#78BE20', '#111111', 'LM'],
  MediaMarkt: ['#DF0000', '#FFFFFF', 'MM'],
  AliExpress: ['#E62E04', '#FFFFFF', 'A'],
  Shein: ['#111111', '#FFFFFF', 'S'],
  Temu: ['#FB7701', '#FFFFFF', 'T'],
  Glovo: ['#FFC244', '#00A082', 'G'],
  'Just Eat': ['#FF8000', '#FFFFFF', 'JE'],
  'Uber Eats': ['#06C167', '#111111', 'UE'],
  Uber: ['#111111', '#FFFFFF', 'U'],
  Cabify: ['#7145D6', '#FFFFFF', 'C'],
  Renfe: ['#8A0F5A', '#FFFFFF', 'R'],
  Ryanair: ['#073590', '#F1C933', 'R'],
  Vueling: ['#FFCC00', '#333333', 'V'],
  Iberia: ['#D7192D', '#FFC20E', 'I'],
  Booking: ['#003580', '#FFFFFF', 'B.'],
  Airbnb: ['#FF5A5F', '#FFFFFF', 'A'],
  'Burger King': ['#D62300', '#F5EBDC', 'BK'],
  Starbucks: ['#00704A', '#FFFFFF', 'S'],
  Telepizza: ['#E30613', '#FFFFFF', 'T'],
  Bizum: ['#05C3DD', '#0A2540', 'b'],
}

// Tonos para comercios sin marca: oscuros y tranquilos (el color no compite
// con los datos), con la inicial en claro. Estables por nombre.
const TONOS = [
  ['#1F3A2E', '#9FE3C1'],
  ['#1E2E45', '#A9C8F2'],
  ['#3A2A18', '#F0C987'],
  ['#2E2346', '#C7B9F5'],
  ['#3A2222', '#F2B0A6'],
  ['#1D3838', '#93DCD3'],
  ['#36213A', '#E9B1E0'],
  ['#2A2F2C', '#C2CCC6'],
]

function hash(texto) {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

/**
 * Identidad visual de un nombre de comercio/servicio.
 * @returns {{ fondo, texto, monograma, marca: string|null }}
 */
export function identidadVisual(nombre) {
  const limpio = String(nombre ?? '').trim()
  const marca = limpio ? marcaDe(limpio) : null
  if (marca && COLORES[marca]) {
    const [fondo, texto, monograma] = COLORES[marca]
    return { fondo, texto, monograma: monograma || limpio.charAt(0).toUpperCase(), marca }
  }
  const base = normalizarTexto(limpio) || '?'
  const [fondo, texto] = TONOS[hash(base) % TONOS.length]
  const palabras = limpio.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p))
  const monograma = (palabras[0]?.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase()
  return { fondo, texto, monograma, marca: null }
}

export const esMarcaConocida = (nombre) => identidadVisual(nombre).marca !== null

// ── Logos oficiales (lib/logosMarcas.js, ~150 KB): se cargan aparte, tras el
// primer pintado. Mientras tanto se ve el monograma; nada cambia de sitio.
let logos = null
let cargando = null
const avisar = new Set()
export function cargarLogos() {
  if (logos) return Promise.resolve(logos)
  if (!cargando) {
    cargando = import('./logosMarcas.js').then((m) => {
      logos = m.LOGOS.map((l) => ({ ...l, rx: new RegExp(l.re) }))
      avisar.forEach((f) => f())
      return logos
    })
  }
  return cargando
}
export const logosCargados = () => logos
export function alCargarLogos(f) {
  avisar.add(f)
  return () => avisar.delete(f)
}

/**
 * Logo de una marca a partir del nombre (o del texto del banco). Primero los
 * patrones de cada logo; si no, la marca que reconoce el directorio de
 * comercios. Patrones (los más específicos antes: «youtube music» gana a «youtube»).
 * Los medios de pago (Visa, Apple Pay…) solo cuentan si son todo el texto.
 * @returns entrada de LOGOS o null
 */
export function logoDe(nombre, lista = logos) {
  if (!lista) return null
  const t = normalizarTexto(nombre)
  if (!t) return null
  const directo = lista.find((l) => l.rx.test(t))
  if (directo) return directo
  const marca = marcaDe(nombre)
  if (!marca) return null
  const m = normalizarTexto(marca)
  return lista.find((l) => normalizarTexto(l.n) === m) ?? lista.find((l) => l.rx.test(m)) ?? null
}
