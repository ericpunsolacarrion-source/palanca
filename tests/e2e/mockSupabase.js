import metricasLlenas from './metricas.json'
import metricasVacias from './metricas_vacias.json'
// Supabase falso en memoria para el recorrido y la auditoría en el navegador
// (tests/e2e). Datos de ejemplo: nada personal ni claves.
const UID = 'demo-user'
const hoy = new Date()
const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => {
  const f = new Date(y, m, d)
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`
}
const Y = hoy.getFullYear()
const M = hoy.getMonth()
const mesClave = (k) => {
  const f = new Date(Y, M - k, 1)
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}`
}

const cats = {
  nomina: { id: 'c-nom', nombre: 'Nomina', tipo: 'ingreso' },
  vivienda: { id: 'c-viv', nombre: 'Vivienda', tipo: 'gasto' },
  comida: { id: 'c-com', nombre: 'Comida', tipo: 'gasto' },
  ocio: { id: 'c-oci', nombre: 'Ocio', tipo: 'gasto' },
  transporte: { id: 'c-tra', nombre: 'Transporte', tipo: 'gasto' },
  inversion: { id: 'c-inv', nombre: 'Inversion', tipo: 'gasto' },
  ajuste: { id: 'c-aju', nombre: 'Ajuste', tipo: 'ingreso' },
}
let n = 0
const mov = (tipo, cat, importe, fecha, nota = null) => ({
  id: `m${++n}`,
  tipo,
  importe,
  importe_centimos: Math.round(importe * 100),
  fecha,
  nota,
  created_at: `${fecha}T10:00:00Z`,
  fuente_id: null,
  categoria_id: cat.id,
  es_fijo: false,
  categoria: { id: cat.id, nombre: cat.nombre },
  fuente: null,
  usuario_id: UID,
})

const movimientos = [mov('ingreso', cats.ajuste, 4200, iso(Y, M - 6, 1), 'Saldo inicial')]
for (let k = 6; k >= 0; k -= 1) {
  const d = (dia) => iso(Y, M - k, dia)
  const pasado = (dia) => k > 0 || dia <= hoy.getDate()
  if (pasado(1)) movimientos.push(mov('ingreso', cats.nomina, 2150, d(1), 'NOMINA EMPRESA SL'))
  if (pasado(2)) movimientos.push(mov('gasto', cats.vivienda, 750, d(2), 'RECIBO ALQUILER'))
  if (pasado(3)) movimientos.push(mov('gasto', cats.ocio, k > 2 ? 12.99 : 13.99, d(3), 'COMPRA TARJ. NETFLIX.COM'))
  if (pasado(5)) movimientos.push(mov('gasto', cats.ocio, 10.99, d(5), 'SPOTIFY AB'))
  if (pasado(7)) movimientos.push(mov('gasto', cats.ocio, 39.9, d(7), 'GIMNASIO BASICFIT'))
  if (pasado(9)) movimientos.push(mov('gasto', cats.comida, 64.2 + k * 3, d(9), 'MERCADONA'))
  if (pasado(12)) movimientos.push(mov('gasto', cats.comida, 41.35 + k, d(12), 'MERCADONA'))
  if (pasado(11)) movimientos.push(mov('gasto', cats.transporte, 54.6, d(11), 'REPSOL'))
  if (pasado(10)) movimientos.push(mov('gasto', cats.inversion, 200, d(10), 'Indexado MSCI World'))
}
movimientos.push(mov('gasto', cats.ocio, 49.9, iso(Y - 1, M + 1, 3), 'AMAZON PRIME'))
movimientos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

const recurrentes = [
  { id: 'r1', usuario_id: UID, tipo: 'gasto', nombre: 'Alquiler', importe: 750, importe_centimos: 75000, categoria_id: cats.vivienda.id, categoria_nombre: 'Vivienda', fuente_id: null, dia_mes: 2, confirmar: false, activo: true, created_at: `${iso(Y, M - 8, 1)}T10:00:00Z`, periodo_meses: 1, mes_inicio: null },
  { id: 'r2', usuario_id: UID, tipo: 'gasto', nombre: 'Movistar fibra', importe: 45, importe_centimos: 4500, categoria_id: cats.vivienda.id, categoria_nombre: 'Vivienda', fuente_id: null, dia_mes: hoy.getDate() + 1, confirmar: false, activo: true, created_at: `${iso(Y, M - 14, 1)}T10:00:00Z`, periodo_meses: 1, mes_inicio: null },
  { id: 'r3', usuario_id: UID, tipo: 'gasto', nombre: 'Seguro del coche', importe: 386.4, importe_centimos: 38640, categoria_id: cats.transporte.id, categoria_nombre: 'Transporte', fuente_id: null, dia_mes: Math.min(28, hoy.getDate() + 9), confirmar: false, activo: true, created_at: `${iso(Y - 2, M, 1)}T10:00:00Z`, periodo_meses: 12, mes_inicio: M + 1 },
  { id: 'r4', usuario_id: UID, tipo: 'gasto', nombre: 'Agua (Canal)', importe: 38.2, importe_centimos: 3820, categoria_id: cats.vivienda.id, categoria_nombre: 'Vivienda', fuente_id: null, dia_mes: 20, confirmar: true, activo: true, created_at: `${iso(Y - 1, M, 1)}T10:00:00Z`, periodo_meses: 2, mes_inicio: M + 1 },
  { id: 'r5', usuario_id: UID, tipo: 'gasto', nombre: 'IBI', importe: 212, importe_centimos: 21200, categoria_id: cats.vivienda.id, categoria_nombre: 'Vivienda', fuente_id: null, dia_mes: 5, confirmar: false, activo: true, created_at: `${iso(Y - 1, M, 1)}T10:00:00Z`, periodo_meses: 6, mes_inicio: ((M + 2) % 12) + 1 },
  { id: 'r7', usuario_id: UID, tipo: 'gasto', nombre: 'Spotify', importe: 10.99, importe_centimos: 1099, categoria_id: cats.ocio.id, categoria_nombre: 'Ocio', fuente_id: null, dia_mes: hoy.getDate(), confirmar: false, activo: true, created_at: `${iso(Y - 1, M, 1)}T10:00:00Z`, periodo_meses: 1, mes_inicio: null },
  { id: 'r8', usuario_id: UID, tipo: 'gasto', nombre: 'Gimnasio', importe: 39.9, importe_centimos: 3990, categoria_id: cats.ocio.id, categoria_nombre: 'Ocio', fuente_id: null, dia_mes: null, confirmar: false, activo: true, created_at: `${iso(Y - 1, M, 1)}T10:00:00Z`, periodo_meses: 1, mes_inicio: null },
  { id: 'r9', usuario_id: UID, tipo: 'gasto', nombre: 'Disney+', importe: 8.99, importe_centimos: 899, categoria_id: cats.ocio.id, categoria_nombre: 'Ocio', fuente_id: null, dia_mes: 3, confirmar: false, activo: false, created_at: `${iso(Y - 1, M, 1)}T10:00:00Z`, periodo_meses: 1, mes_inicio: null },
  { id: 'r6', usuario_id: UID, tipo: 'ingreso', nombre: 'Nómina', importe: 2150, importe_centimos: 215000, categoria_id: cats.nomina.id, categoria_nombre: 'Nomina', fuente_id: null, dia_mes: 1, confirmar: true, activo: true, created_at: `${iso(Y - 1, M, 1)}T10:00:00Z`, periodo_meses: 1, mes_inicio: null },
]
const recurrentes_confirmaciones = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ id: `cf${k}`, usuario_id: UID, recurrente_id: 'r1', mes: mesClave(k), importe_centimos: 75000, movimiento_id: null })),
  ...[1, 2, 3].map((k) => ({ id: `cg${k}`, usuario_id: UID, recurrente_id: 'r2', mes: mesClave(k), importe_centimos: 4500, movimiento_id: null })),
  ...[0, 1, 2].map((k) => ({ id: `cn${k}`, usuario_id: UID, recurrente_id: 'r6', mes: mesClave(k), importe_centimos: 215000, movimiento_id: null })),
]


// ── Personas extremas (localStorage mock_persona) ─────────────────────────
const PERSONA = typeof localStorage !== 'undefined' ? localStorage.getItem('mock_persona') : null
let semilla = 7
const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646 }
const extra = {
  farmacia: { id: 'c-far', nombre: 'Farmacia', tipo: 'gasto' },
  pension: { id: 'c-pen', nombre: 'Pensión', tipo: 'ingreso' },
  ninos: { id: 'c-nin', nombre: 'Hijos y colegio', tipo: 'gasto' },
  viajes: { id: 'c-via', nombre: 'Viajes', tipo: 'gasto' },
  ropa: { id: 'c-rop', nombre: 'Ropa', tipo: 'gasto' },
  salud: { id: 'c-sal', nombre: 'Salud', tipo: 'gasto' },
  freelance: { id: 'c-fre', nombre: 'Freelance', tipo: 'ingreso' },
  mascotas: { id: 'c-mas', nombre: 'Mascotas', tipo: 'gasto' },
  regalos: { id: 'c-reg', nombre: 'Regalos y celebraciones familiares de todo el año', tipo: 'gasto' },
  bizum: { id: 'c-biz', nombre: 'Bizum amigos', tipo: 'ingreso' },
}
Object.assign(cats, extra)
function reemplazar(lista) { movimientos.length = 0; movimientos.push(...lista); movimientos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) }
if (PERSONA && PERSONA !== 'normal') {
  const L = []
  const mes = (k, d) => iso(Y, M - k, d)
  const hasta = (k, d) => k > 0 || d <= hoy.getDate()
  recurrentes.length = 0; recurrentes_confirmaciones.length = 0
  if (PERSONA === 'diezanios') {
    L.push(mov('ingreso', cats.ajuste, 3000, mes(120, 1), 'Saldo inicial'))
    for (let k = 119; k >= 0; k--) {
      const inf = 1 + (119 - k) * 0.002
      if (hasta(k, 1)) L.push(mov('ingreso', cats.nomina, Math.round(1600 * inf * 100) / 100, mes(k, 1), 'NOMINA'))
      if (k % 12 === 6 && hasta(k, 20)) L.push(mov('ingreso', cats.nomina, 1600, mes(k, 20), 'PAGA EXTRA'))
      if (k % 3 === 0 && hasta(k, 15)) L.push(mov('ingreso', cats.freelance, 300 + Math.round(azar() * 700), mes(k, 15), 'Factura cliente'))
      if (hasta(k, 3)) L.push(mov('gasto', cats.vivienda, Math.round(650 * inf), mes(k, 3), 'Hipoteca'))
      for (let d = 2; d <= 28; d += 3) if (hasta(k, d)) L.push(mov('gasto', cats.comida, Math.round((20 + azar() * 60) * 100) / 100, mes(k, d), ['MERCADONA', 'LIDL', 'CARREFOUR', 'Panadería'][d % 4]))
      for (const d of [5, 18]) if (hasta(k, d)) L.push(mov('gasto', cats.transporte, Math.round((40 + azar() * 30) * 100) / 100, mes(k, d), 'REPSOL'))
      for (const c of [cats.ocio, cats.ropa, cats.salud, cats.mascotas, cats.ninos, cats.regalos]) { const d = 1 + Math.floor(azar() * 27); if (hasta(k, d)) L.push(mov('gasto', c, Math.round((10 + azar() * 120) * 100) / 100, mes(k, d), null)) }
      if (k % 12 === 4 && hasta(k, 10)) L.push(mov('gasto', cats.viajes, 900 + Math.round(azar() * 900), mes(k, 10), 'Vacaciones'))
      if (hasta(k, 8)) L.push(mov('gasto', cats.ocio, k > 30 ? 9.99 : k > 10 ? 12.99 : 13.99, mes(k, 8), 'NETFLIX.COM'))
      if (k < 80 && hasta(k, 10)) L.push(mov('gasto', cats.inversion, 150, mes(k, 10), 'Indexado'))
    }
    for (let i = 0; i < 20; i++) recurrentes.push({ id: 'p' + i, usuario_id: UID, tipo: 'gasto', nombre: ['Netflix', 'Spotify', 'HBO', 'Gimnasio', 'Seguro hogar', 'Seguro coche', 'Luz', 'Agua', 'Gas', 'Móvil', 'Fibra', 'Comunidad', 'IBI', 'Colegio', 'Academia inglés', 'iCloud', 'Prime', 'Patreon', 'Periódico', 'ONG'][i], importe: 5 + i * 7.5, importe_centimos: Math.round((5 + i * 7.5) * 100), categoria_id: cats.ocio.id, categoria_nombre: 'Ocio', fuente_id: null, dia_mes: 1 + (i * 3) % 28, confirmar: i % 5 === 0, activo: i !== 7, created_at: `${iso(Y - 3, M, 1)}T10:00:00Z`, periodo_meses: [1, 1, 1, 2, 3, 6, 12][i % 7], mes_inicio: 1 + (i % 12) })
  }
  if (PERSONA === 'jubilado') {
    L.push(mov('ingreso', cats.ajuste, 18500, mes(8, 1), 'Saldo inicial'))
    for (let k = 7; k >= 0; k--) {
      if (hasta(k, 25)) L.push(mov('ingreso', cats.pension, 1312.4, mes(k, 25), 'PENSION SEGURIDAD SOCIAL'))
      if (hasta(k, 5)) L.push(mov('gasto', cats.vivienda, 95, mes(k, 5), 'Comunidad'))
      for (const d of [3, 10, 17, 24]) if (hasta(k, d)) L.push(mov('gasto', cats.comida, Math.round((35 + azar() * 25) * 100) / 100, mes(k, d), 'Mercado'))
      for (const d of [7, 21]) if (hasta(k, d)) L.push(mov('gasto', cats.farmacia, Math.round((8 + azar() * 30) * 100) / 100, mes(k, d), 'Farmacia'))
      if (hasta(k, 12)) L.push(mov('gasto', cats.regalos, 50, mes(k, 12), 'Nietos'))
    }
  }
  if (PERSONA === 'estudiante') {
    for (let k = 5; k >= 0; k--) {
      const d1 = 1 + Math.floor(azar() * 20)
      if (hasta(k, d1)) L.push(mov('ingreso', cats.bizum, Math.round(150 + azar() * 400), mes(k, d1), 'Bizum de mamá'))
      for (let d = 2; d <= 28; d += 2) if (hasta(k, d)) L.push(mov('gasto', d % 4 ? cats.ocio : cats.comida, Math.round((3 + azar() * 25) * 100) / 100, mes(k, d), ['Cañas', 'Kebab', 'Uber', 'Glovo', 'Cine'][d % 5]))
    }
  }
  if (PERSONA === 'ricos') {
    L.push(mov('ingreso', cats.ajuste, 1250000, mes(12, 1), 'Saldo inicial'))
    for (let k = 11; k >= 0; k--) {
      if (hasta(k, 1)) L.push(mov('ingreso', cats.nomina, 18750.55, mes(k, 1), 'Dividendos y nómina'))
      if (hasta(k, 2)) L.push(mov('gasto', cats.vivienda, 4800, mes(k, 2), 'Alquiler ático'))
      if (hasta(k, 5)) L.push(mov('gasto', cats.inversion, 10000, mes(k, 5), 'Cartera'))
      if (k === 3 && hasta(k, 9)) L.push(mov('gasto', cats.viajes, 999999.99, mes(k, 9), 'Velero'))
    }
  }
  if (PERSONA === 'endeudado') {
    for (let k = 5; k >= 0; k--) {
      if (hasta(k, 1)) L.push(mov('ingreso', cats.nomina, 1100, mes(k, 1), 'Nómina'))
      if (hasta(k, 2)) L.push(mov('gasto', cats.vivienda, 850, mes(k, 2), 'Alquiler'))
      if (hasta(k, 6)) L.push(mov('gasto', cats.ocio, 420, mes(k, 6), 'Préstamo personal'))
      for (const d of [4, 11, 18, 25]) if (hasta(k, d)) L.push(mov('gasto', cats.comida, 70, mes(k, d), 'Súper'))
    }
  }
  if (PERSONA === 'caotico') {
    L.push(mov('ingreso', cats.nomina, 0.01, mes(0, 1), '💸💸 primer céntimo'))
    L.push(mov('gasto', cats.regalos, 1234567.89, mes(1, 3), 'Un concepto larguísimo que alguien ha escrito sin pensar en que esto tiene que caber en una pantalla de móvil pequeña'))
    L.push(mov('gasto', cats.comida, 12.5, iso(Y, M + 2, 15), 'Movimiento con fecha futura'))
    for (let i = 0; i < 50; i++) L.push(mov('gasto', cats.comida, 0.99, mes(0, 1), 'Chicles ' + i))
    L.push(mov('ingreso', { id: 'c-x', nombre: 'Categoría con nombre muy muy largo para ver si rompe el diseño' }, 3000, mes(0, 1), null))
  }
  reemplazar(L)
}

const VACIO = typeof localStorage !== 'undefined' && localStorage.getItem('mock_vacio') === '1'
if (VACIO) { movimientos.length = 0; if (localStorage.getItem('mock_sin_perfil') !== '1') movimientos.push(mov('ingreso', cats.ajuste, 1200, iso(Y, M, 1), 'Saldo inicial')); recurrentes.length = 0; recurrentes_confirmaciones.length = 0 }
const db = {
  perfiles: [{ usuario_id: UID, objetivo: 'Ahorrar para la entrada de un piso', nombre: PERSONA === 'caotico' ? 'Maximiliano Alejandro de la Santísima Trinidad' : 'Eric', anio_nacimiento: PERSONA === 'jubilado' ? 1948 : PERSONA === 'estudiante' ? 2006 : 1990, email: 'demo@palanca.app', analitica: true, recordatorios: true, ultima_reconciliacion: new Date(Date.now() - 6 * 864e5).toISOString() }],
  categorias: Object.values(cats).map((c) => ({ ...c, usuario_id: UID })),
  fuentes: [],
  movimientos,
  recurrentes,
  recurrentes_confirmaciones,
}

const CLAVES = { comercios_alias: 'usuario_id,clave', presupuestos: 'usuario_id', recurrentes_confirmaciones: 'recurrente_id,mes', ahorros_negociados: 'usuario_id,rec_id', planificaciones: 'usuario_id,mes', perfiles: 'usuario_id' }
class Q {
  constructor(tabla) {
    this.tabla = tabla
    this.filtros = []
    this.op = 'select'
    this.unico = null
    this.rango = null
  }
  select() { return this }
  eq(c, v) { this.filtros.push((r) => r[c] === v); return this }
  in(c, vs) { this.filtros.push((r) => vs.includes(r[c])); return this }
  order() { return this }
  limit() { return this }
  range(a, b) { this.rango = [a, b]; return this }
  maybeSingle() { this.unico = 'maybe'; return this }
  single() { this.unico = 'single'; return this }
  insert(f) { this.op = 'insert'; this.datos = Array.isArray(f) ? f : [f]; return this }
  upsert(f, o = {}) { this.op = 'upsert'; this.datos = Array.isArray(f) ? f : [f]; this.conflicto = (o.onConflict || CLAVES[this.tabla] || 'id').split(','); this.ignorar = o.ignoreDuplicates; return this }
  update(f) { this.op = 'update'; this.datos = f; return this }
  delete() { this.op = 'delete'; return this }
  ejecutar() {
    const t = (db[this.tabla] ||= [])
    let filas
    if (this.op === 'upsert') {
      filas = []
      for (const f of this.datos) {
        const ya = t.find((r) => this.conflicto.every((c) => f[c] !== undefined && r[c] === f[c]))
        if (ya) { if (!this.ignorar) Object.assign(ya, f); filas.push(ya) }
        else { const nueva = { id: `n${Math.random().toString(36).slice(2)}`, created_at: new Date().toISOString(), ...f }; t.push(nueva); filas.push(nueva) }
      }
    } else if (this.op === 'insert') {
      filas = this.datos.map((f) => ({ id: `n${Math.random().toString(36).slice(2)}`, created_at: new Date().toISOString(), ...f }))
      if (this.tabla === 'movimientos') filas.forEach((f) => { const c = (db.categorias || []).find((x) => x.id === f.categoria_id); if (c && !f.categoria) f.categoria = { id: c.id, nombre: c.nombre } })
      t.push(...filas)
    } else {
      filas = t.filter((r) => this.filtros.every((f) => f(r)))
      if (this.op === 'update') filas.forEach((r) => Object.assign(r, this.datos))
      if (this.op === 'delete') db[this.tabla] = t.filter((r) => !filas.includes(r))
    }
    if (this.tabla === 'movimientos' && this.op !== 'delete') for (const f of filas) {
      const c = (db.categorias || []).find((x) => x.id === f.categoria_id); f.categoria = c ? { id: c.id, nombre: c.nombre } : f.categoria ?? null
      const fu = (db.fuentes || []).find((x) => x.id === f.fuente_id); f.fuente = fu ? { id: fu.id, nombre: fu.nombre } : null
    }
    if (this.rango) filas = filas.slice(this.rango[0], this.rango[1] + 1)
    if (this.unico) return { data: filas[0] ?? null, error: null }
    return { data: filas, error: null }
  }
  then(res, rej) { return Promise.resolve(this.ejecutar()).then(res, rej) }
}

const LS = (k) => typeof localStorage !== 'undefined' && localStorage.getItem(k) === '1'
if (LS('mock_sin_perfil')) db.perfiles.length = 0
const session = LS('mock_sin_sesion') ? null : { user: { id: UID, email: 'demo@palanca.app' } }
if (LS('mock_inactivo')) { const t = new Date(Date.now() - 4 * 864e5).toISOString(); for (const m of db.movimientos || []) m.created_at = t }
const metricas = LS('mock_metricas_vacias') ? metricasVacias : metricasLlenas
export const supabase = {
  from: (t) => new Q(t),
  rpc: async (fn, args) => {
    if (fn === 'soy_admin') return { data: !LS('mock_no_admin'), error: null }
    if (fn === 'palanca_metricas') return LS('mock_sin_sql') ? { data: null, error: { message: 'function palanca_metricas does not exist' } } : { data: metricas, error: null }
    if (fn === 'admin_cambiar_plan') {
      const u = metricas.lista.find((x) => x.uid === args.p_usuario_id)
      if (!u) return { data: null, error: { message: 'Usuario no encontrado' } }
      const vigente = args.p_plan === 'premium' && (!args.p_hasta || args.p_hasta >= metricas.hoy)
      u.plan = args.p_plan === 'gratis' ? 'gratis' : !vigente ? 'caducado' : args.p_origen === 'prueba' ? 'prueba' : 'premium'
      u.plan_origen = args.p_origen; u.importe_mensual = args.p_importe; u.plan_hasta = args.p_hasta
      metricas.cambios_plan.unshift({ email: u.email, plan: args.p_plan, origen: args.p_origen, importe_mensual: args.p_importe, hasta: args.p_hasta, nota: args.p_nota, fecha: new Date().toISOString() })
      globalThis.__ultimoPlan = args
      return { data: {}, error: null }
    }
    if (fn === 'registrar_evento') { (globalThis.__eventos ||= []).push(args.p_tipo); return { data: null, error: null } }
    return { data: null, error: null }
  },
  auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({}),
    signUp: async () => ({ data: { user: { id: UID }, session: null }, error: null }),
    signInWithPassword: async () => ({ data: {}, error: { message: 'Invalid login credentials' } }),
    resetPasswordForEmail: async () => ({ error: null }),
  },
}
