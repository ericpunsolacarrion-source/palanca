// Seed de datos de DEMOSTRACIÓN para Palanca.
//
// Rellena 36 meses (3 años) de un usuario de demo separado (por defecto
// "demo2026") con una historia coherente de mejora económica, para poder ver
// la app llena e iluminar TODAS las funcionalidades. No toca datos reales ni
// el esquema (solo inserta filas; es aditivo y reversible).
//
// Uso:
//   node scripts/seed-demo.mjs            → borra el demo anterior y lo regenera
//   node scripts/seed-demo.mjs --clean    → solo borra los datos del usuario demo
//   USUARIO_DEMO=otro node scripts/seed-demo.mjs   → usa otro id de demo
//
// Lee las credenciales de .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')

// --- Cargar .env sin dependencias ---
function cargarEnv() {
  const env = {}
  try {
    const txt = readFileSync(join(RAIZ, '.env'), 'utf8')
    for (const linea of txt.split('\n')) {
      const m = linea.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // sin .env, se intentará con process.env
  }
  return env
}

const env = cargarEnv()
const URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
const USUARIO = process.env.USUARIO_DEMO || 'demo2026'
const SOLO_LIMPIAR = process.argv.includes('--clean')

if (!URL || !KEY) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (revisa .env).')
  process.exit(1)
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

// --- PRNG determinista (mulberry32): mismo seed => mismos datos ---
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260710)
const ruido = (amp) => Math.round((rnd() * 2 - 1) * amp)
const redondear = (v, paso = 1) => Math.round(v / paso) * paso

// --- Meses: últimos 36 terminando en el mes actual ---
function ultimosMeses(n) {
  const hoy = new Date()
  const meses = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push({ anio: d.getFullYear(), mes: d.getMonth() + 1 })
  }
  return meses
}
const fechaIso = (anio, mes, dia) =>
  `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

async function limpiar() {
  // Orden: primero las filas que referencian a categorias/fuentes.
  const tablas = [
    'movimientos',
    'objetivos_ahorro',
    'presupuestos',
    'simulaciones_guardadas',
    'fuentes',
    'categorias',
    'perfiles',
  ]
  for (const t of tablas) {
    const { error } = await supabase.from(t).delete().eq('usuario_id', USUARIO)
    if (error && error.code !== '42P01') {
      console.error(`Error limpiando ${t}:`, error.message)
    }
  }
  console.log(`Datos de "${USUARIO}" borrados.`)
}

async function insertarCategorias() {
  const filas = [
    { tipo: 'ingreso', nombre: 'Nomina' },
    { tipo: 'ingreso', nombre: 'Extra' },
    { tipo: 'gasto', nombre: 'Vivienda' },
    { tipo: 'gasto', nombre: 'Alimentación' },
    { tipo: 'gasto', nombre: 'Transporte' },
    { tipo: 'gasto', nombre: 'Ocio' },
    { tipo: 'gasto', nombre: 'Suscripciones' },
    { tipo: 'gasto', nombre: 'Ropa' },
    { tipo: 'gasto', nombre: 'Salud' },
    { tipo: 'gasto', nombre: 'Inversion' },
  ].map((c) => ({ ...c, usuario_id: USUARIO }))

  const { data, error } = await supabase.from('categorias').insert(filas).select('id, nombre')
  if (error) throw new Error(`categorias: ${error.message}`)
  const porNombre = {}
  for (const c of data) porNombre[c.nombre] = c.id
  return porNombre
}

async function insertarFuentes() {
  // Las inversiones son movimientos de tipo 'gasto'; sus plataformas son fuentes de gasto.
  const filas = ['Trade Republic', 'MyInvestor'].map((nombre) => ({
    usuario_id: USUARIO,
    tipo: 'gasto',
    nombre,
  }))
  const { data, error } = await supabase.from('fuentes').insert(filas).select('id, nombre')
  if (error) throw new Error(`fuentes: ${error.message}`)
  const porNombre = {}
  for (const f of data) porNombre[f.nombre] = f.id
  return porNombre
}

// Gastos puntuales grandes y creíbles a lo largo de los 3 años (por índice de mes).
const EVENTOS = {
  5: { categoria: 'Salud', importe: 340, nota: 'Dentista' },
  9: { categoria: 'Transporte', importe: 430, nota: 'Reparación del coche' },
  19: { categoria: 'Ocio', importe: 780, nota: 'Viaje de verano' },
  30: { categoria: 'Ocio', importe: 920, nota: 'Móvil nuevo' },
}

function generarMovimientos(meses, cat, fuentes) {
  const movs = []
  const add = (tipo, categoria, importe, anio, mes, dia, nota, esFijo = false, fuente = null) => {
    if (importe <= 0) return
    movs.push({
      usuario_id: USUARIO,
      tipo,
      categoria_id: cat[categoria],
      fuente_id: fuente ? fuentes[fuente] : null,
      importe: redondear(importe, 1),
      fecha: fechaIso(anio, mes, dia),
      es_fijo: esFijo,
      nota: nota ?? null,
    })
  }

  meses.forEach(({ anio, mes }, i) => {
    const banda = i < 12 ? 0 : i < 24 ? 1 : 2
    const enBanda = i - banda * 12 // 0..11 dentro del año

    // --- Ingresos ---
    const ingresoBase = [1300, 1600, 1800][banda] + enBanda * 8 + ruido(50)
    add('ingreso', 'Nomina', ingresoBase, anio, mes, 5, 'Nómina', true)
    if (mes === 12) {
      add('ingreso', 'Extra', [200, 300, 420][banda], anio, mes, 20, 'Paga extra de diciembre')
    }

    // --- Gastos de consumo ---
    add('gasto', 'Vivienda', [480, 510, 545][banda] + ruido(10), anio, mes, 2, 'Alquiler', true)
    add('gasto', 'Suscripciones', [22, 28, 34][banda] + ruido(4), anio, mes, 3, null, true)
    add('gasto', 'Alimentación', [235, 260, 285][banda] + ruido(35), anio, mes, 8)
    add('gasto', 'Transporte', [55, 65, 72][banda] + ruido(15), anio, mes, 12)

    let ocio = [70, 90, 110][banda] + ruido(30)
    if (mes === 7 || mes === 8) ocio += 60 // verano
    if (mes === 12) ocio += 80 // navidades
    add('gasto', 'Ocio', ocio, anio, mes, 16)

    // Ropa y Salud: gastos ocasionales (no todos los meses)
    if (rnd() < 0.5) add('gasto', 'Ropa', 40 + ruido(35) + 35, anio, mes, 18)
    if (rnd() < 0.35) add('gasto', 'Salud', 25 + ruido(15) + 20, anio, mes, 22)

    // Evento puntual grande de este mes, si lo hay
    const ev = EVENTOS[i]
    if (ev) add('gasto', ev.categoria, ev.importe, anio, mes, 14, ev.nota)

    // --- Inversión (crece a lo largo de los 3 años) ---
    // Rampa lineal ~0 → ~600 con variación por banda.
    const rampa = [
      10 + enBanda * 9, // año 1: ~10 → ~110
      120 + enBanda * 15, // año 2: ~120 → ~285
      320 + enBanda * 26, // año 3: ~320 → ~600
    ][banda]
    let inv = Math.max(0, redondear(rampa + ruido(25), 5))
    // Los dos primeros meses casi sin invertir (empieza de cero).
    if (i < 2) inv = i === 0 ? 0 : 25
    // Mes actual: aseguramos que supere el objetivo mensual (para ver >100%).
    if (i === meses.length - 1) inv = 600

    if (inv > 0) {
      if (inv >= 160) {
        const tr = redondear(inv * 0.6, 5)
        add('gasto', 'Inversion', tr, anio, mes, 10, 'Aportación', false, 'Trade Republic')
        add('gasto', 'Inversion', inv - tr, anio, mes, 20, 'Aportación', false, 'MyInvestor')
      } else {
        const plat = i % 2 === 0 ? 'Trade Republic' : 'MyInvestor'
        add('gasto', 'Inversion', inv, anio, mes, 10, 'Aportación', false, plat)
      }
    }
  })

  return movs
}

async function insertarEnLotes(filas, tamano = 200) {
  for (let i = 0; i < filas.length; i += tamano) {
    const lote = filas.slice(i, i + tamano)
    const { error } = await supabase.from('movimientos').insert(lote)
    if (error) throw new Error(`movimientos: ${error.message}`)
  }
}

async function insertarResto() {
  // Perfil
  const { error: e1 } = await supabase.from('perfiles').insert({ usuario_id: USUARIO, objetivo: 'ahorro' })
  if (e1) console.error('perfiles:', e1.message)

  // Presupuesto con objetivo de inversión mensual (400 €); el mes actual invierte 600 → 150%.
  const { error: e2 } = await supabase.from('presupuestos').insert({
    usuario_id: USUARIO,
    tasa_ahorro_objetivo: 25,
    objetivo_inversion_mensual: 400,
    metodo: 'tasa',
  })
  if (e2) console.error('presupuestos:', e2.message)

  // Objetivos de ahorro con distinto grado de progreso.
  const anioFuturo = new Date().getFullYear() + 3
  const objetivos = [
    { nombre: 'Fondo de emergencia', importe_objetivo: 6000, importe_actual: 4200, fecha_objetivo: null },
    {
      nombre: 'Entrada del piso',
      importe_objetivo: 20000,
      importe_actual: 5600,
      fecha_objetivo: `${anioFuturo}-06-01`,
    },
    { nombre: 'Viaje a Japón', importe_objetivo: 3000, importe_actual: 1850, fecha_objetivo: null },
  ].map((o) => ({ ...o, usuario_id: USUARIO }))
  const { error: e3 } = await supabase.from('objetivos_ahorro').insert(objetivos)
  if (e3 && e3.code !== '42P01') console.error('objetivos_ahorro:', e3.message)
}

async function main() {
  console.log(`Usuario demo: ${USUARIO}`)
  await limpiar()
  if (SOLO_LIMPIAR) {
    console.log('Solo limpieza. Hecho.')
    return
  }

  const meses = ultimosMeses(36)
  const cat = await insertarCategorias()
  const fuentes = await insertarFuentes()
  const movs = generarMovimientos(meses, cat, fuentes)
  await insertarEnLotes(movs)
  await insertarResto()

  console.log(`Insertados ${movs.length} movimientos en ${meses.length} meses.`)
  console.log(`Listo. Entra en la app con el ID "${USUARIO}" para ver la demo.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
