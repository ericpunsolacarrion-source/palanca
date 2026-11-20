// Importa las hojas de Eric («Finanzas Eric 2023-2027» y «Road to 60k») a SU
// cuenta de Palanca, usando SOLO tablas y campos que ya existen
// (movimientos, categorias, fuentes). Sin service key: entra con la sesión del
// propio usuario, así que la RLS impide tocar filas de nadie más.
//
// Los CSV están en data/import/ (ignorado por git: son datos reales).
//
// Uso (Node 22+):
//   node --experimental-strip-types scripts/import-sheets.ts            → EN SECO: no se conecta a nada,
//                                                                          escribe data/import/SECO.md
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… EMAIL=… \
//   node --experimental-strip-types scripts/import-sheets.ts --pedir-enlace  → envía el correo de acceso de un solo uso
//   … ENLACE='<enlace del correo>' node … scripts/import-sheets.ts --importar   → importa y compara
//   … ENLACE='<enlace del correo>' node … scripts/import-sheets.ts --comparar   → solo compara (lee la BD)
//
// Repetible sin duplicar: clave fecha + importe + concepto (+ tipo). Si en la
// hoja hay N filas con la misma clave y en Palanca ya hay M, inserta N − M.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATOS = join(RAIZ, 'data', 'import')
// La cuenta destino se identifica por su correo (EMAIL); el user_id sale de la sesión.

// ---------------------------------------------------------------------------
// Decisiones pendientes de Eric (valores provisionales para la prueba en seco)
// ---------------------------------------------------------------------------
const DECISION = {
  // Filas sin fecha: se fechan el día 1 de su «Mes» ('dia1') o se descartan ('descartar').
  sinFecha: 'dia1' as 'dia1' | 'descartar',
  // Ingresos «No sumado»: fuera (como en tu hoja).
  importarNoSumado: false,
  // Copias marcadas «⚠ El original lo suma dos veces»: se importa una sola vez.
  quitarCopias: true,
  // «Ajuste nómina» negativo: se resta de la nómina del mismo día ('netear') o se deja fuera ('dudosa').
  ajusteNegativo: 'dudosa' as 'netear' | 'dudosa',
  // Aportaciones: 'finanzas' (Inversión O:R, netas) o 'road60k' (APORTACIONES, con pagos de tarjeta en negativo).
  aportaciones: 'finanzas' as 'finanzas' | 'road60k',
  // Ingresos: la nota es «Fuente · Concepto» (si no, solo Concepto).
  notaConFuente: true,
}

// ---------------------------------------------------------------------------
// Utilidades de formato español
// ---------------------------------------------------------------------------
type Fila = string[]
type Mov = {
  tipo: 'gasto' | 'ingreso'
  fecha: string // AAAA-MM-DD
  centimos: number // > 0
  nota: string
  categoria: string
  fuente?: string // plataforma (solo inversión)
  origen: string // pestaña y fila, para el informe
  mesHoja: string // AAAA-MM según la columna «Mes» de la hoja
}
type Fuera = { origen: string; motivo: string; texto: string }

function leerCsv(ruta: string): Fila[] {
  const t = readFileSync(ruta, 'utf8')
  const filas: Fila[] = []
  let fila: string[] = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === ',') { fila.push(campo); campo = '' }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = '' }
    else if (c !== '\r') campo += c
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila) }
  return filas
}

// «1.234,56 €» / «-342,00 €» → céntimos (entero). null si no es un importe.
export function centimosEs(txt: string | undefined): number | null {
  const s = String(txt ?? '').replace(/€/g, '').replace(/\s/g, '').replace(/ /g, '')
  if (!/^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$|^-?\d+(,\d{1,2})?$/.test(s)) return null
  const [ent, dec = ''] = s.replace(/\./g, '').split(',')
  const neg = ent.startsWith('-')
  const c = Math.abs(Number(ent)) * 100 + Number((dec + '00').slice(0, 2))
  return neg ? -c : c
}

// «dd/mm/aaaa» → «aaaa-mm-dd». null si no es fecha válida.
export function fechaEs(txt: string | undefined): string | null {
  const m = String(txt ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mes, a] = m.map(Number) as unknown as number[]
  const f = new Date(Date.UTC(a, mes - 1, d))
  if (f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const MESES: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sept: 9, sep: 9, oct: 10, nov: 11, dic: 12 }
// «sept 2023» → «2023-09».
export function mesEs(txt: string | undefined): string | null {
  const m = String(txt ?? '').trim().toLowerCase().match(/^([a-z]+)\.?\s+(\d{4})$/)
  if (!m || !MESES[m[1]]) return null
  return `${m[2]}-${String(MESES[m[1]]).padStart(2, '0')}`
}

const euros = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' } as any) + ' €'
export const clave = (m: Pick<Mov, 'tipo' | 'fecha' | 'centimos' | 'nota'>) => `${m.tipo}|${m.fecha}|${m.centimos}|${m.nota.trim().toLowerCase()}`
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// ---------------------------------------------------------------------------
// Lectura de las pestañas
// ---------------------------------------------------------------------------
function cabecera(filas: Fila[], primera: string): number {
  return filas.findIndex((f) => f[0] === primera)
}

function leerGastos(anio: number, movs: Mov[], fuera: Fuera[], dudas: Fuera[]) {
  const ruta = join(DATOS, 'finanzas', `gastos-${anio}.csv`)
  if (!existsSync(ruta)) return
  const filas = leerCsv(ruta)
  let previstos = false
  for (let i = cabecera(filas, 'Fecha') + 1; i < filas.length; i++) {
    const [fTxt, mesTxt, concepto = '', categoria = '', impTxt, nota = ''] = filas[i]
    const origen = `Gastos ${anio} · fila ${i + 1}`
    if (filas[i].some((c) => c.includes('▼ GASTOS PREVISTOS'))) { previstos = true; continue }
    if (!filas[i].some((c) => c.trim())) continue
    const texto = `${fTxt || '(sin fecha)'} · ${concepto} · ${impTxt}`
    const c = centimosEs(impTxt)
    const mesHoja = mesEs(mesTxt) ?? ''
    if (previstos) { fuera.push({ origen, motivo: 'Gasto previsto (futuro): en Palanca contaría ya como gastado', texto }); continue }
    if (c === null || c <= 0) { dudas.push({ origen, motivo: 'Importe no válido', texto }); continue }
    let fecha = fechaEs(fTxt)
    if (!fecha) {
      if (DECISION.sinFecha === 'descartar' || !mesHoja) { fuera.push({ origen, motivo: 'Sin fecha', texto }); continue }
      fecha = `${mesHoja}-01`
      dudas.push({ origen, motivo: `Sin fecha → se pone el 01/${mesHoja.slice(5)}/${mesHoja.slice(0, 4)}`, texto })
    }
    movs.push({ tipo: 'gasto', fecha, centimos: c, nota: concepto.trim(), categoria: categoria.trim() || 'Otros', origen, mesHoja: mesHoja || fecha.slice(0, 7) })
  }
}

export function esCopia(concepto: string, nota: string): boolean {
  if (!nota.includes('suma dos veces')) return false
  return /\(repetido\)|\(del \d|sumados en/i.test(concepto) || /misma celda de junio/i.test(nota)
}

function leerIngresos(anio: number, movs: Mov[], fuera: Fuera[], dudas: Fuera[]) {
  const ruta = join(DATOS, 'finanzas', `ingresos-${anio}.csv`)
  if (!existsSync(ruta)) return
  const filas = leerCsv(ruta)
  const pendientesAjuste: { mov: Mov; c: number }[] = []
  for (let i = cabecera(filas, 'Fecha') + 1; i < filas.length; i++) {
    const [fTxt, mesTxt, fuente = '', concepto = '', tipoIng = '', , , netoTxt, estado = '', nota = ''] = filas[i]
    if (!filas[i].some((c) => c.trim())) continue
    const origen = `Ingresos ${anio} · fila ${i + 1}`
    const texto = `${fTxt || '(sin fecha)'} · ${fuente} · ${concepto} · ${netoTxt} · ${estado}`
    const mesHoja = mesEs(mesTxt) ?? ''
    if (estado === 'Previsión') { fuera.push({ origen, motivo: 'Previsión (aún no cobrado)', texto }); continue }
    if (estado === 'No sumado' && !DECISION.importarNoSumado) { fuera.push({ origen, motivo: '«No sumado» en tu hoja', texto }); continue }
    if (DECISION.quitarCopias && esCopia(concepto, nota)) { fuera.push({ origen, motivo: 'Copia: tu hoja lo sumaba dos veces (se importa una vez)', texto }); continue }
    const c = centimosEs(netoTxt)
    if (c === null || c === 0) { dudas.push({ origen, motivo: 'Importe neto vacío o no válido', texto }); continue }
    let fecha = fechaEs(fTxt)
    if (!fecha) {
      if (DECISION.sinFecha === 'descartar' || !mesHoja) { fuera.push({ origen, motivo: 'Sin fecha', texto }); continue }
      fecha = `${mesHoja}-01`
      dudas.push({ origen, motivo: `Sin fecha → se pone el 01/${mesHoja.slice(5)}/${mesHoja.slice(0, 4)}`, texto })
    }
    const notaMov = (DECISION.notaConFuente && fuente.trim() ? `${fuente.trim()} · ${concepto.trim()}` : concepto.trim())
    const mov: Mov = { tipo: 'ingreso', fecha, centimos: Math.abs(c), nota: notaMov, categoria: tipoIng.trim() || 'Otros', origen, mesHoja: mesHoja || fecha.slice(0, 7) }
    if (c < 0) { pendientesAjuste.push({ mov, c }); continue }
    if (nota.includes('suma dos veces')) dudas.push({ origen, motivo: 'Tu hoja lo marca «suma dos veces»: se importa ESTA fila (la buena)', texto })
    movs.push(mov)
  }
  for (const { mov, c } of pendientesAjuste) {
    const texto = `${mov.fecha} · ${mov.nota} · ${euros(c)}`
    const nomina = movs.find((m) => m.tipo === 'ingreso' && m.fecha === mov.fecha && /sueldo/i.test(m.nota))
    if (DECISION.ajusteNegativo === 'netear' && nomina) {
      nomina.centimos += c
      dudas.push({ origen: mov.origen, motivo: `Ajuste negativo restado de «${nomina.nota}» (queda ${euros(nomina.centimos)})`, texto })
    } else {
      dudas.push({ origen: mov.origen, motivo: 'Ingreso NEGATIVO («Ajuste nómina»): Palanca solo admite importes positivos', texto })
    }
  }
}

function leerAportaciones(movs: Mov[], fuera: Fuera[]) {
  if (DECISION.aportaciones === 'finanzas') {
    const filas = leerCsv(join(DATOS, 'finanzas', 'inversion-aportaciones.csv'))
    for (let i = cabecera(filas, 'Fecha') + 1; i < filas.length; i++) {
      const [fTxt, plataforma = '', impTxt, nota = ''] = filas[i]
      const fecha = fechaEs(fTxt)
      const c = centimosEs(impTxt)
      const origen = `Inversión (aportaciones) · fila ${i + 1}`
      if (!fecha || c === null || c === 0) { if (filas[i].some((x) => x.trim())) fuera.push({ origen, motivo: 'Fila sin fecha o importe', texto: filas[i].join(' · ') }); continue }
      movs.push({ tipo: c > 0 ? 'gasto' : 'ingreso', fecha, centimos: Math.abs(c), nota: nota.trim() || 'Aportación', categoria: 'Inversion', fuente: plataforma.trim() || 'Trade Republic', origen, mesHoja: fecha.slice(0, 7) })
    }
  } else {
    const filas = leerCsv(join(DATOS, 'road60k', 'aportaciones.csv'))
    for (let i = cabecera(filas, 'Fecha') + 1; i < filas.length; i++) {
      const [fTxt, impTxt, , nota = ''] = filas[i]
      const fecha = fechaEs(fTxt)
      const c = centimosEs(impTxt)
      const origen = `APORTACIONES · fila ${i + 1}`
      if (!fecha || c === null || c === 0) continue
      movs.push({ tipo: c > 0 ? 'gasto' : 'ingreso', fecha, centimos: Math.abs(c), nota: nota.trim() || 'Aportación', categoria: 'Inversion', fuente: 'Trade Republic', origen, mesHoja: fecha.slice(0, 7) })
    }
  }
}

// Totales de la hoja tal cual (por su columna «Mes»; ingresos solo «Real»), para comparar.
function totalesHoja() {
  const t: Record<string, { g: number; i: number; inv: number }> = {}
  const sumar = (mes: string | null, k: 'g' | 'i' | 'inv', c: number | null) => {
    if (!mes || c === null) return
    t[mes] ??= { g: 0, i: 0, inv: 0 }
    t[mes][k] += c
  }
  for (const anio of [2023, 2024, 2025, 2026, 2027]) {
    const g = join(DATOS, 'finanzas', `gastos-${anio}.csv`)
    if (existsSync(g)) { const f = leerCsv(g); for (let i = cabecera(f, 'Fecha') + 1; i < f.length; i++) sumar(mesEs(f[i][1]), 'g', centimosEs(f[i][4])) }
    const r = join(DATOS, 'finanzas', `ingresos-${anio}.csv`)
    if (existsSync(r)) { const f = leerCsv(r); for (let i = cabecera(f, 'Fecha') + 1; i < f.length; i++) if (f[i][8] === 'Real') sumar(mesEs(f[i][1]), 'i', centimosEs(f[i][7])) }
  }
  const a = leerCsv(join(DATOS, 'finanzas', 'inversion-aportaciones.csv'))
  for (let i = cabecera(a, 'Fecha') + 1; i < a.length; i++) { const f = fechaEs(a[i][0]); sumar(f ? f.slice(0, 7) : null, 'inv', centimosEs(a[i][2])) }
  return t
}

// Totales con las reglas de Palanca (por FECHA; gasto = consumo, sin Inversion; invertido neto de retiradas).
function totalesPalanca(lista: Pick<Mov, 'tipo' | 'fecha' | 'centimos' | 'categoria'>[]) {
  const t: Record<string, { g: number; i: number; inv: number }> = {}
  for (const m of lista) {
    const mes = m.fecha.slice(0, 7)
    t[mes] ??= { g: 0, i: 0, inv: 0 }
    if (m.categoria === 'Inversion') t[mes].inv += m.tipo === 'gasto' ? m.centimos : -m.centimos
    else if (m.tipo === 'gasto') t[mes].g += m.centimos
    else t[mes].i += m.centimos
  }
  return t
}

function tablaComparacion(hoja: ReturnType<typeof totalesHoja>, pal: ReturnType<typeof totalesPalanca>, titulo: string) {
  const meses = [...new Set([...Object.keys(hoja), ...Object.keys(pal)])].sort()
  const l = [`| Mes | Gastos hoja | Gastos ${titulo} | Ingresos hoja | Ingresos ${titulo} | Invertido hoja | Invertido ${titulo} | |`, '|---|--:|--:|--:|--:|--:|--:|---|']
  const tot = { hg: 0, pg: 0, hi: 0, pi: 0, hv: 0, pv: 0 }
  for (const m of meses) {
    const h = hoja[m] ?? { g: 0, i: 0, inv: 0 }
    const p = pal[m] ?? { g: 0, i: 0, inv: 0 }
    tot.hg += h.g; tot.pg += p.g; tot.hi += h.i; tot.pi += p.i; tot.hv += h.inv; tot.pv += p.inv
    const igual = h.g === p.g && h.i === p.i && h.inv === p.inv
    l.push(`| ${m} | ${euros(h.g)} | ${euros(p.g)} | ${euros(h.i)} | ${euros(p.i)} | ${euros(h.inv)} | ${euros(p.inv)} | ${igual ? '✓' : '≠'} |`)
  }
  l.push(`| **Total** | **${euros(tot.hg)}** | **${euros(tot.pg)}** | **${euros(tot.hi)}** | **${euros(tot.pi)}** | **${euros(tot.hv)}** | **${euros(tot.pv)}** | |`)
  return l.join('\n')
}

// ---------------------------------------------------------------------------
// Preparación (común a seco e importación)
// ---------------------------------------------------------------------------
function preparar() {
  const movs: Mov[] = []
  const fuera: Fuera[] = []
  const dudas: Fuera[] = []
  for (const a of [2023, 2024, 2025, 2026, 2027]) leerGastos(a, movs, fuera, dudas)
  for (const a of [2023, 2024, 2025, 2026, 2027]) leerIngresos(a, movs, fuera, dudas)
  leerAportaciones(movs, fuera)
  return { movs, fuera, dudas }
}

function informeSeco() {
  const { movs, fuera, dudas } = preparar()
  const gastos = movs.filter((m) => m.tipo === 'gasto' && m.categoria !== 'Inversion')
  const ingresos = movs.filter((m) => m.tipo === 'ingreso' && m.categoria !== 'Inversion')
  const inv = movs.filter((m) => m.categoria === 'Inversion')
  const catG = [...new Set(gastos.map((m) => m.categoria))].sort()
  const catI = [...new Set(ingresos.map((m) => m.categoria))].sort()
  const distintoMes = movs.filter((m) => m.categoria !== 'Inversion' && m.mesHoja && m.fecha.slice(0, 7) !== m.mesHoja && !m.fecha.endsWith('-01'))
  const grupos = new Map<string, number>()
  for (const m of movs) grupos.set(clave(m), (grupos.get(clave(m)) ?? 0) + 1)
  const repetidas = [...grupos.entries()].filter(([, n]) => n > 1)
  const agrupar = (l: Fuera[]) => {
    const p = new Map<string, Fuera[]>()
    for (const x of l) p.set(x.motivo.replace(/→ se pone el .*/, '→ día 1 de su mes'), [...(p.get(x.motivo.replace(/→ se pone el .*/, '→ día 1 de su mes')) ?? []), x])
    return [...p.entries()].map(([mot, xs]) => `**${mot}** (${xs.length})\n${xs.map((x) => `- ${x.origen}: ${x.texto}`).join('\n')}`).join('\n\n')
  }
  const md = `# Prueba en seco · importación de tus hojas a Palanca

> Generado ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · NO se ha escrito nada en Supabase.
> Cuenta destino: la del correo EMAIL (se comprueba al iniciar sesión).

## Lo que se importaría

| Tabla | Filas | Detalle |
|---|--:|---|
| movimientos · gasto | ${gastos.length} | ${euros(gastos.reduce((s, m) => s + m.centimos, 0))} |
| movimientos · ingreso | ${ingresos.length} | ${euros(ingresos.reduce((s, m) => s + m.centimos, 0))} |
| movimientos · inversión (gasto «Inversion», Trade Republic) | ${inv.length} | ${euros(inv.reduce((s, m) => s + (m.tipo === 'gasto' ? m.centimos : -m.centimos), 0))} |
| categorias (las que falten en tu cuenta) | hasta ${catG.length + catI.length} | gasto: ${catG.join(', ')} · ingreso: ${catI.join(', ')} |
| fuentes | 1 | Trade Republic (si no existe) |
| **Total movimientos** | **${movs.length}** | |

Fuera de la importación: **${fuera.length}** filas · Dudosas: **${dudas.length}** filas.
Filas con la misma clave (fecha + importe + concepto) que son gastos repetidos de verdad: ${repetidas.length} grupos (se importan todas).

## Comparación por mes (hoja vs lo que vería Palanca)

Hoja = sus filas por la columna «Mes» (ingresos solo «Real», gastos incluidos los previstos). Palanca = por la fecha de cada movimiento, con sus reglas.

${tablaComparacion(totalesHoja(), totalesPalanca(movs), 'Palanca')}

Movimientos cuya fecha cae en otro mes que su «Mes» de la hoja: ${distintoMes.length}
${distintoMes.map((m) => `- ${m.origen}: ${m.fecha} (hoja: ${m.mesHoja}) · ${m.nota} · ${euros(m.centimos)}`).join('\n')}

## Fuera de la importación (con motivo)

${agrupar(fuera)}

## Dudosas

${agrupar(dudas)}
`
  writeFileSync(join(DATOS, 'SECO.md'), md)
  console.log(`En seco: ${movs.length} movimientos (${gastos.length} gastos, ${ingresos.length} ingresos, ${inv.length} inversión) · fuera ${fuera.length} · dudosas ${dudas.length}`)
  console.log('Informe: data/import/SECO.md')
}

// ---------------------------------------------------------------------------
// Conexión con la sesión de Eric (sin service key)
// ---------------------------------------------------------------------------
async function cliente() {
  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_ANON_KEY (clave pública)')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function sesion() {
  const sb = await cliente()
  const enlace = process.env.ENLACE ?? ''
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/auth\/v1\/verify\?/.test(enlace)) throw new Error('Falta ENLACE (el enlace del correo de acceso, sin abrirlo)')
  // Igual que el navegador al pulsar el enlace: Supabase responde con una
  // redirección que lleva la sesión en el fragmento (#access_token=…).
  const r = await fetch(enlace, { redirect: 'manual' })
  const destino = new URL(r.headers.get('location') ?? 'about:blank')
  const p = new URLSearchParams(destino.hash.slice(1))
  if (p.get('error')) throw new Error('No se pudo iniciar sesión con el enlace: ' + (p.get('error_description') ?? p.get('error')))
  const { data, error } = await sb.auth.setSession({ access_token: p.get('access_token') ?? '', refresh_token: p.get('refresh_token') ?? '' })
  if (error || !data.user) throw new Error('No se pudo iniciar sesión con el enlace: ' + (error?.message ?? 'sin usuario'))
  const email = (process.env.EMAIL ?? '').trim().toLowerCase()
  if (!email || (data.user.email ?? '').toLowerCase() !== email) throw new Error(`La sesión es de otra cuenta (${data.user.email}). No se toca nada.`)
  console.log(`Sesión: ${data.user.email} · user_id ${data.user.id}`)
  return { sb, uid: data.user.id }
}

async function leerTodo(sb: any, uid: string) {
  const filas: any[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await sb.from('movimientos').select('tipo, fecha, importe_centimos, importe, nota, categoria:categorias(nombre)').eq('usuario_id', uid).range(desde, desde + 999)
    if (error) throw error
    filas.push(...data)
    if (data.length < 1000) break
  }
  return filas.map((r) => ({ tipo: r.tipo, fecha: r.fecha, centimos: r.importe_centimos ?? Math.round(Number(r.importe) * 100), nota: r.nota ?? '', categoria: r.categoria?.nombre ?? '' }))
}

async function importar(soloComparar: boolean, dada?: { sb: any; uid: string }) {
  const { sb, uid } = dada ?? (await sesion())
  // Comprobación de RLS en la práctica: con tu sesión no debe verse NINGUNA fila
  // de otro usuario, y sin sesión no debe verse nada. Si falla, no se escribe nada.
  const anon = await cliente()
  for (const t of ['movimientos', 'categorias', 'fuentes']) {
    const ajenas = await sb.from(t).select('usuario_id', { count: 'exact', head: true }).neq('usuario_id', uid)
    const sinSesion = await anon.from(t).select('usuario_id', { count: 'exact', head: true })
    if (ajenas.error) throw new Error(`RLS ${t}: ${ajenas.error.message}`)
    if ((ajenas.count ?? 0) > 0 || (sinSesion.count ?? 0) > 0) throw new Error(`RLS ${t}: se ven filas ajenas (${ajenas.count}) o sin sesión (${sinSesion.count}). No se importa nada.`)
    console.log(`RLS ${t}: ✓ solo tus filas · sin sesión 0`)
  }
  const { movs } = preparar()
  if (!soloComparar) {
    // Categorías: reutiliza las tuyas (sin distinguir tildes/mayúsculas); crea solo las que falten.
    const { data: cats, error: eCat } = await sb.from('categorias').select('id, tipo, nombre').eq('usuario_id', uid)
    if (eCat) throw eCat
    const idCat = new Map<string, string>()
    for (const c of cats) idCat.set(`${c.tipo}|${normal(c.nombre)}`, c.id)
    const faltan = [...new Set(movs.map((m) => `${m.tipo === 'ingreso' && m.categoria === 'Inversion' ? 'gasto' : m.tipo}|${m.categoria}`))]
      .filter((k) => !idCat.has(`${k.split('|')[0]}|${normal(k.split('|')[1])}`))
      .map((k) => ({ usuario_id: uid, tipo: k.split('|')[0], nombre: k.split('|')[1] }))
    if (faltan.length) {
      const { data, error } = await sb.from('categorias').insert(faltan).select('id, tipo, nombre')
      if (error) throw error
      for (const c of data) idCat.set(`${c.tipo}|${normal(c.nombre)}`, c.id)
      console.log(`Categorías creadas: ${faltan.length}`)
    }
    const catDe = (m: Mov) => idCat.get(`${m.categoria === 'Inversion' ? 'gasto' : m.tipo}|${normal(m.categoria)}`) ?? idCat.get(`${m.tipo}|${normal(m.categoria)}`)
    // Fuente (plataforma).
    const { data: fuentes, error: eF } = await sb.from('fuentes').select('id, nombre').eq('usuario_id', uid)
    if (eF) throw eF
    const idFuente = new Map<string, string>(fuentes.map((f: any) => [normal(f.nombre), f.id]))
    for (const n of new Set(movs.filter((m) => m.fuente).map((m) => m.fuente!))) {
      if (idFuente.has(normal(n))) continue
      const { data, error } = await sb.from('fuentes').insert({ usuario_id: uid, tipo: 'gasto', nombre: n }).select('id').single()
      if (error) throw error
      idFuente.set(normal(n), data.id)
    }
    // Idempotencia: inserta N − M por clave.
    const existentes = new Map<string, number>()
    for (const r of await leerTodo(sb, uid)) existentes.set(clave(r), (existentes.get(clave(r)) ?? 0) + 1)
    const nuevas: any[] = []
    let yaEstaban = 0
    for (const m of movs) {
      const k = clave(m)
      if ((existentes.get(k) ?? 0) > 0) { existentes.set(k, existentes.get(k)! - 1); yaEstaban++; continue }
      nuevas.push({ usuario_id: uid, tipo: m.tipo, categoria_id: catDe(m) ?? null, fuente_id: m.fuente ? idFuente.get(normal(m.fuente)) ?? null : null, importe: m.centimos / 100, importe_centimos: m.centimos, fecha: m.fecha, es_fijo: false, nota: m.nota || null })
    }
    for (let i = 0; i < nuevas.length; i += 200) {
      const { error } = await sb.from('movimientos').insert(nuevas.slice(i, i + 200))
      if (error) throw new Error(`Error en el lote ${i / 200 + 1}: ${error.message} (lo insertado antes se queda; vuelve a lanzar y no se duplica)`)
    }
    console.log(`Insertados ${nuevas.length} · ya estaban ${yaEstaban}`)
  }
  const enBD = await leerTodo(sb, uid)
  const md = `# Comparación tras importar\n\n> ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${enBD.length} movimientos en tu cuenta.\n\n${tablaComparacion(totalesHoja(), totalesPalanca(enBD), 'Palanca')}\n`
  writeFileSync(join(DATOS, 'COMPARACION.md'), md)
  console.log('Comparación: data/import/COMPARACION.md')
  await sb.auth.signOut()
}

// Deshace una importación: borra SOLO lo creado entre DESDE y HASTA (created_at,
// ISO) en tu cuenta. Se para si el número de movimientos no es ESPERADOS.
async function deshacer() {
  const { sb, uid } = await sesion()
  const desde = process.env.DESDE, hasta = process.env.HASTA, esperados = Number(process.env.ESPERADOS)
  if (!desde || !hasta || !esperados) throw new Error('Faltan DESDE, HASTA y ESPERADOS')
  const { data: movs, error } = await sb.from('movimientos').select('id').eq('usuario_id', uid).gte('created_at', desde).lte('created_at', hasta)
  if (error) throw error
  if (movs.length !== esperados) throw new Error(`Hay ${movs.length} movimientos en esa franja y se esperaban ${esperados}. No se borra nada.`)
  for (let i = 0; i < movs.length; i += 200) {
    const { error: e } = await sb.from('movimientos').delete().in('id', movs.slice(i, i + 200).map((m: any) => m.id))
    if (e) throw e
  }
  console.log(`Movimientos borrados: ${movs.length}`)
  for (const t of ['categorias', 'fuentes']) {
    const { data: nuevas, error: e } = await sb.from(t).select('id, nombre').eq('usuario_id', uid).gte('created_at', desde).lte('created_at', hasta)
    if (e) throw e
    let n = 0
    for (const x of nuevas) {
      const col = t === 'categorias' ? 'categoria_id' : 'fuente_id'
      const { count } = await sb.from('movimientos').select('id', { count: 'exact', head: true }).eq(col, x.id)
      if ((count ?? 0) > 0) { console.log(`  ${t} «${x.nombre}» se conserva: la usan ${count} movimientos`); continue }
      const { error: e2 } = await sb.from(t).delete().eq('id', x.id)
      if (e2) throw e2
      n++
    }
    console.log(`${t} borradas: ${n}`)
  }
  const quedan = await leerTodo(sb, uid)
  console.log(`Quedan ${quedan.length} movimientos en tu cuenta.`)
  writeFileSync(join(DATOS, 'COMPARACION-ANTES.md'), `# Tu cuenta tras deshacer (lo que ya tenías)\n\n> ${quedan.length} movimientos.\n\n${tablaComparacion(totalesHoja(), totalesPalanca(quedan), 'Palanca')}\n`)
  const mios = new Map<string, number>()
  for (const r of quedan) mios.set(clave(r), (mios.get(clave(r)) ?? 0) + 1)
  const hojas = preparar().movs
  const faltan = hojas.filter((m) => { const k = clave(m); const n = mios.get(k) ?? 0; if (n > 0) { mios.set(k, n - 1); return false } return true })
  const sobran = [...mios.values()].reduce((a, b) => a + b, 0)
  writeFileSync(join(DATOS, 'DIFERENCIAS.md'), `# Hojas vs tu cuenta\n\nEn tus hojas y NO en tu cuenta (misma fecha+importe+nota): ${faltan.length}\nEn tu cuenta y NO en tus hojas: ${sobran}\n\n${faltan.map((m) => `- ${m.fecha} · ${m.tipo} · ${m.categoria} · ${m.nota} · ${euros(m.centimos)}`).join('\n')}\n`)
  console.log(`Hojas que no están en tu cuenta: ${faltan.length} · en tu cuenta y no en las hojas: ${sobran}`)
  await sb.auth.signOut()
}

// Las hojas mandan: copia de seguridad de TODOS tus movimientos (data/import/,
// fuera de git), borra los tuyos y carga las hojas. Se para si la copia no
// tiene ESPERADOS movimientos.
async function reemplazar() {
  const s = await sesion()
  const { sb, uid } = s
  const todos: any[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await sb.from('movimientos').select('*').eq('usuario_id', uid).order('id').range(desde, desde + 999)
    if (error) throw error
    todos.push(...data)
    if (data.length < 1000) break
  }
  const esperados = Number(process.env.ESPERADOS)
  if (todos.length !== esperados) throw new Error(`Tu cuenta tiene ${todos.length} movimientos y se esperaban ${esperados}. No se borra nada.`)
  const ruta = join(DATOS, `copia-movimientos-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(ruta, JSON.stringify(todos, null, 1))
  if (JSON.parse(readFileSync(ruta, 'utf8')).length !== esperados) throw new Error('La copia no se ha guardado bien. No se borra nada.')
  console.log(`Copia guardada: ${todos.length} movimientos → ${ruta.replace(RAIZ + '/', '')}`)
  for (let i = 0; i < todos.length; i += 200) {
    const { error } = await sb.from('movimientos').delete().in('id', todos.slice(i, i + 200).map((m) => m.id))
    if (error) throw new Error(`Error borrando (lote ${i / 200 + 1}): ${error.message}. Lo borrado está en la copia.`)
  }
  console.log(`Borrados: ${todos.length}`)
  await importar(false, s)
}

async function pedirEnlace() {
  const sb = await cliente()
  const email = process.env.EMAIL
  if (!email) throw new Error('Falta EMAIL')
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
  if (error) throw error
  console.log('Correo de acceso enviado. Copia el enlace SIN abrirlo.')
}

const arg = process.argv.slice(2)
const accion = arg.includes('--reemplazar') ? reemplazar() : arg.includes('--deshacer') ? deshacer() : arg.includes('--importar') ? importar(false) : arg.includes('--comparar') ? importar(true) : arg.includes('--pedir-enlace') ? pedirEnlace() : Promise.resolve(informeSeco())
accion.catch((e) => { console.error('✗', e.message ?? e); process.exit(1) })
