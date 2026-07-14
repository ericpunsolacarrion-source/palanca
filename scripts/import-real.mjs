// Importa DATOS REALES (2023–2026) a un usuario separado (por defecto real2026)
// desde los CSV de scripts/data/. Repetible y reversible: borra y recarga sin
// duplicar. Al terminar verifica los agregados por año contra la referencia.
//
// Uso:
//   node scripts/import-real.mjs            → borra real2026 y reimporta
//   node scripts/import-real.mjs --clean    → solo borra
//   USUARIO_REAL=otro node scripts/import-real.mjs
//
// Lee credenciales de .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const DATA = join(AQUI, 'data')

function cargarEnv() {
  const env = {}
  try {
    const txt = readFileSync(join(RAIZ, '.env'), 'utf8')
    for (const linea of txt.split('\n')) {
      const m = linea.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // sin .env
  }
  return env
}

const env = cargarEnv()
const URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
const USUARIO = process.env.USUARIO_REAL || 'real2026'
const SOLO_LIMPIAR = process.argv.includes('--clean')

if (!URL || !KEY) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (revisa .env).')
  process.exit(1)
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

// --- Parser CSV mínimo con soporte de comillas ---
function parseCsv(texto) {
  const filas = []
  const lineas = texto.split(/\r?\n/).filter((l) => l.length > 0)
  const cabecera = splitLinea(lineas[0])
  for (let i = 1; i < lineas.length; i += 1) {
    const campos = splitLinea(lineas[i])
    const obj = {}
    cabecera.forEach((c, j) => {
      obj[c] = campos[j]
    })
    filas.push(obj)
  }
  return filas
}

function splitLinea(linea) {
  const campos = []
  let actual = ''
  let enComillas = false
  for (let i = 0; i < linea.length; i += 1) {
    const ch = linea[i]
    if (ch === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"'
        i += 1
      } else {
        enComillas = !enComillas
      }
    } else if (ch === ',' && !enComillas) {
      campos.push(actual)
      actual = ''
    } else {
      actual += ch
    }
  }
  campos.push(actual)
  return campos.map((c) => c.trim())
}

function leerCsv(nombre) {
  return parseCsv(readFileSync(join(DATA, nombre), 'utf8'))
}

async function limpiar() {
  for (const t of ['movimientos', 'fuentes', 'categorias', 'perfiles']) {
    const { error } = await supabase.from(t).delete().eq('usuario_id', USUARIO)
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
      console.error(`Error limpiando ${t}:`, error.message)
    }
  }
  console.log(`Datos de "${USUARIO}" borrados.`)
}

async function crearCategorias(gastos, ingresos, inversion) {
  const gastoNombres = new Set(['Inversion'])
  for (const g of [...gastos, ...inversion]) if (g.categoria) gastoNombres.add(g.categoria)
  const ingresoNombres = new Set()
  for (const i of ingresos) if (i.categoria) ingresoNombres.add(i.categoria)

  const filas = [
    ...[...gastoNombres].map((nombre) => ({ usuario_id: USUARIO, tipo: 'gasto', nombre })),
    ...[...ingresoNombres].map((nombre) => ({ usuario_id: USUARIO, tipo: 'ingreso', nombre })),
  ]
  const { data, error } = await supabase.from('categorias').insert(filas).select('id, tipo, nombre')
  if (error) throw new Error(`categorias: ${error.message}`)
  const mapa = {}
  for (const c of data) mapa[`${c.tipo}|${c.nombre}`] = c.id
  return mapa
}

async function crearFuentes(inversion) {
  const nombres = new Set()
  for (const inv of inversion) if (inv.plataforma) nombres.add(inv.plataforma)
  const filas = [...nombres].map((nombre) => ({ usuario_id: USUARIO, tipo: 'gasto', nombre }))
  const { data, error } = await supabase.from('fuentes').insert(filas).select('id, nombre')
  if (error) throw new Error(`fuentes: ${error.message}`)
  const mapa = {}
  for (const f of data) mapa[f.nombre] = f.id
  return mapa
}

async function insertarEnLotes(filas, tamano = 200) {
  for (let i = 0; i < filas.length; i += tamano) {
    const lote = filas.slice(i, i + tamano)
    const { error } = await supabase.from('movimientos').insert(lote)
    if (error) throw new Error(`movimientos: ${error.message}`)
  }
}

function fmt(n) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function verificar(gastos, ingresos, inversion) {
  const anios = ['2024', '2025', '2026']
  const ref = {
    2024: { ingresos: 11395.66, gastos: 4920.48 },
    2025: { ingresos: 15485.32, gastos: 4923.9 },
    2026: { ingresos: 7779.45, gastos: 2712.9 },
  }
  console.log('\n=== Verificación de agregados por año ===')
  for (const a of anios) {
    const ing = ingresos.filter((r) => r.fecha.startsWith(a)).reduce((s, r) => s + Number(r.importe), 0)
    const gas = gastos
      .filter((r) => r.fecha.startsWith(a) && r.categoria !== 'Inversion')
      .reduce((s, r) => s + Number(r.importe), 0)
    const gasJulio = gastos
      .filter(
        (r) => r.fecha.startsWith(a) && r.categoria !== 'Inversion' && Number(r.fecha.slice(5, 7)) <= 7,
      )
      .reduce((s, r) => s + Number(r.importe), 0)
    const ahorro = ing - gas
    const tasa = ing > 0 ? (ahorro / ing) * 100 : 0
    console.log(
      `${a}: ingresos ${fmt(ing)} (ref ${fmt(ref[a].ingresos)}) | gastos ${fmt(gas)} (ref ${fmt(
        ref[a].gastos,
      )})${a === '2026' ? ` | gastos ene-jul ${fmt(gasJulio)}` : ''} | ahorro ${fmt(ahorro)} | tasa ${tasa.toFixed(1)}%`,
    )
  }
  const porPlataforma = {}
  let invTotal = 0
  for (const inv of inversion) {
    invTotal += Number(inv.importe)
    porPlataforma[inv.plataforma] = (porPlataforma[inv.plataforma] ?? 0) + Number(inv.importe)
  }
  console.log(`\nInversión total: ${fmt(invTotal)} (ref 19.765,90 — solo Trade Republic)`)
  for (const [p, v] of Object.entries(porPlataforma)) console.log(`  ${p}: ${fmt(v)}`)
}

async function main() {
  console.log(`Usuario real: ${USUARIO}`)
  const gastos = leerCsv('gastos.csv')
  const ingresos = leerCsv('ingresos.csv')
  const inversion = leerCsv('inversion.csv')

  await limpiar()
  if (SOLO_LIMPIAR) {
    console.log('Solo limpieza. Hecho.')
    return
  }

  // Perfil (para saltar el onboarding).
  await supabase.from('perfiles').insert({ usuario_id: USUARIO, objetivo: 'ahorro' })

  const cat = await crearCategorias(gastos, ingresos, inversion)
  const fuentes = await crearFuentes(inversion)

  const movs = []
  for (const g of gastos) {
    movs.push({
      usuario_id: USUARIO,
      tipo: 'gasto',
      categoria_id: cat[`gasto|${g.categoria}`],
      fuente_id: null,
      importe: Number(g.importe),
      fecha: g.fecha,
      es_fijo: false,
      nota: g.concepto || null,
    })
  }
  for (const inv of inversion) {
    movs.push({
      usuario_id: USUARIO,
      tipo: 'gasto',
      categoria_id: cat['gasto|Inversion'],
      fuente_id: fuentes[inv.plataforma] ?? null,
      importe: Number(inv.importe),
      fecha: inv.fecha,
      es_fijo: false,
      nota: inv.concepto || null,
    })
  }
  for (const i of ingresos) {
    movs.push({
      usuario_id: USUARIO,
      tipo: 'ingreso',
      categoria_id: cat[`ingreso|${i.categoria}`],
      fuente_id: null,
      importe: Number(i.importe),
      fecha: i.fecha,
      es_fijo: false,
      nota: i.concepto || null,
    })
  }

  await insertarEnLotes(movs)
  console.log(
    `Insertados ${movs.length} movimientos (${gastos.length} gastos, ${inversion.length} inversiones, ${ingresos.length} ingresos).`,
  )

  verificar(gastos, ingresos, inversion)
  console.log(`\nListo. Entra en la app con el ID "${USUARIO}".`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
