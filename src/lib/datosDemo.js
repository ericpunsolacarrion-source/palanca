// Datos de EJEMPLO para quien acaba de llegar: 6 meses de una persona
// realista (nómina, alquiler, súper, suscripciones, inversión mensual…) para
// que la app se entienda llena antes de meter nada. Viven SOLO en memoria:
// nunca se escriben en la base de datos. Los ids empiezan por "demo-" y
// cualquier intento de editarlos o borrarlos se bloquea (esDemo).
//
// Fechas relativas a hoy y sin futuros: siempre parece "tu mes en curso".

import { aCentimos } from './importe'

export const PREFIJO_DEMO = 'demo-'
export const esDemo = (id) => typeof id === 'string' && id.startsWith(PREFIJO_DEMO)
export const AVISO_DEMO = 'Esto es un ejemplo. Empieza con tus datos para poder cambiarlo.'

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Pseudoaleatorio con semilla: los mismos datos en cada visita.
function aleatorio(semilla) {
  let s = semilla
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const CATS = {
  Nomina: 'ingreso',
  Ajuste: 'ingreso',
  Vivienda: 'gasto',
  Comida: 'gasto',
  Ocio: 'gasto',
  Transporte: 'gasto',
  Suscripciones: 'gasto',
  Inversion: 'gasto',
}

export function generarDemo(hoy = new Date()) {
  const azar = aleatorio(20261014)
  const hoyIso = iso(hoy)
  const movimientos = []
  let n = 0
  const mov = (tipo, cat, importe, fecha, nota, fuente = null) => {
    if (fecha > hoyIso) return
    n += 1
    const id = `${PREFIJO_DEMO}m${n}`
    movimientos.push({
      id,
      tipo,
      importe,
      importe_centimos: aCentimos(importe),
      fecha,
      nota,
      created_at: `${fecha}T12:00:00Z`,
      fuente_id: fuente ? `${PREFIJO_DEMO}f-${fuente}` : null,
      categoria_id: `${PREFIJO_DEMO}c-${cat}`,
      es_fijo: false,
      categoria: { id: `${PREFIJO_DEMO}c-${cat}`, nombre: cat },
      fuente: fuente ? { id: `${PREFIJO_DEMO}f-${fuente}`, nombre: fuente } : null,
    })
  }
  const dia = (y, m, d) => iso(new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate())))
  const importe = (base, var_) => Math.round((base + (azar() - 0.5) * 2 * var_) * 100) / 100

  const hoyDia = hoy.getDate()
  // Día de cobro de Spotify = hoy: así el ejemplo enseña "Hoy se cobra…".
  const diaSpotify = hoyDia

  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1)
  mov('ingreso', 'Ajuste', 3500, iso(inicio), 'Saldo inicial')

  for (let k = 5; k >= 0; k -= 1) {
    const y = hoy.getFullYear()
    const m = hoy.getMonth() - k
    mov('ingreso', 'Nomina', 1850, dia(y, m, 1), 'Nómina')
    mov('gasto', 'Inversion', 150, dia(y, m, 2), 'Aportación mensual', 'Fondo indexado')
    mov('gasto', 'Vivienda', 750, dia(y, m, 3), 'Alquiler')
    mov('gasto', 'Ocio', 39.9, dia(y, m, 5), 'Gimnasio')
    mov('gasto', 'Suscripciones', k >= 3 ? 12.99 : 13.99, dia(y, m, 8), 'Netflix')
    if (k > 0) mov('gasto', 'Suscripciones', 11.99, dia(y, m, diaSpotify), 'Spotify')
    for (const d of [4, 11, 18, 25]) mov('gasto', 'Comida', importe(62, 18), dia(y, m, d), 'Mercadona')
    mov('gasto', 'Comida', importe(24, 8), dia(y, m, 14), 'Lidl')
    mov('gasto', 'Ocio', importe(38, 14), dia(y, m, 9), 'Restaurante')
    mov('gasto', 'Ocio', importe(26, 10), dia(y, m, 22), 'Cine y cena')
    mov('gasto', 'Transporte', importe(55, 8), dia(y, m, 6), 'Gasolina')
    mov('gasto', 'Transporte', importe(52, 8), dia(y, m, 21), 'Gasolina')
    if ((m + 12) % 2 === 0) mov('gasto', 'Vivienda', importe(68, 12), dia(y, m, 20), 'Luz')
    if (k % 2 === 1) mov('gasto', 'Ocio', importe(35, 15), dia(y, m, 16), 'Amazon')
  }
  movimientos.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))

  // Compromisos fijos (forma de useRecurrentes). Los meses ya pagados salen de
  // los propios movimientos de ejemplo.
  const mesesCon = (nota) => [...new Set(movimientos.filter((x) => x.nota === nota).map((x) => x.fecha.slice(0, 7)))]
  const rec = (id, datos) => {
    const meses = mesesCon(datos.nota ?? datos.nombre)
    const mesActual = hoyIso.slice(0, 7)
    return {
      id: `${PREFIJO_DEMO}r-${id}`,
      tipo: 'gasto',
      categoriaId: `${PREFIJO_DEMO}c-${datos.categoriaNombre}`,
      fuenteId: null,
      periodoMeses: 1,
      mesInicio: null,
      confirmar: false,
      activo: true,
      desde: `${iso(inicio)}T12:00:00Z`,
      mesesAplicados: meses,
      totalCentimos: meses.length * aCentimos(datos.importe),
      aplicadoEn: meses.includes(mesActual) ? mesActual : null,
      ...datos,
    }
  }
  // Renovación anual dentro de 10 días: enseña el aviso de renovación.
  const seguro = new Date(hoy.getFullYear(), hoy.getMonth(), hoyDia + 10)
  const recurrentes = [
    rec('nomina', { tipo: 'ingreso', nombre: 'Nómina', importe: 1850, categoriaNombre: 'Nomina', diaMes: 1, confirmar: true }),
    rec('alquiler', { nombre: 'Alquiler', importe: 750, categoriaNombre: 'Vivienda', diaMes: 3 }),
    rec('gimnasio', { nombre: 'Gimnasio', importe: 39.9, categoriaNombre: 'Ocio', diaMes: 5 }),
    rec('netflix', { nombre: 'Netflix', importe: 13.99, categoriaNombre: 'Suscripciones', diaMes: 8 }),
    rec('spotify', { nombre: 'Spotify', importe: 11.99, categoriaNombre: 'Suscripciones', diaMes: diaSpotify }),
    rec('luz', { nombre: 'Luz', importe: 68, categoriaNombre: 'Vivienda', diaMes: 20, periodoMeses: 2, mesInicio: 1, confirmar: true }),
    rec('seguro', {
      nombre: 'Seguro del coche',
      importe: 386.4,
      categoriaNombre: 'Transporte',
      diaMes: seguro.getDate(),
      periodoMeses: 12,
      mesInicio: seguro.getMonth() + 1,
      mesesAplicados: [],
      totalCentimos: aCentimos(386.4),
    }),
  ]

  return { movimientos, recurrentes, categorias: CATS }
}
