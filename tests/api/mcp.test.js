import { describe, expect, it, beforeEach, vi } from 'vitest'
import { manejarMensaje, HERRAMIENTAS, idImportacion } from '../../api/_mcpNucleo.js'

// Supabase simulado con RLS: cada consulta solo ve las filas de `uid` (como
// las políticas usuario_id = auth.uid()), aunque la consulta no filtre.
function supabaseFalso(uid, tablas) {
  let reloj = 0
  const ahora = () => new Date(Date.UTC(2026, 10, 20, 10, 0, reloj++)).toISOString()
  const relacion = (fila, tabla, nombre) => {
    const t = tablas[tabla] ?? []
    const r = t.find((x) => x.id === fila[`${nombre}_id`])
    return r ? { id: r.id, nombre: r.nombre } : null
  }
  class Q {
    constructor(t) {
      this.t = t
      this.f = [(r) => r.usuario_id === uid] // RLS
      this.op = 'select'
    }
    select() { return this }
    eq(c, v) { this.f.push((r) => r[c] === v); return this }
    in(c, vs) { this.f.push((r) => vs.includes(r[c])); return this }
    gte(c, v) { this.f.push((r) => r[c] >= v); return this }
    lte(c, v) { this.f.push((r) => r[c] <= v); return this }
    order() { return this }
    range(a, b) { this.r = [a, b]; return this }
    maybeSingle() { this.u = true; return this }
    single() { this.u = true; return this }
    insert(d) { this.op = 'insert'; this.d = Array.isArray(d) ? d : [d]; return this }
    delete() { this.op = 'delete'; return this }
    update(d) { this.op = 'update'; this.d = d; return this }
    then(ok, ko) {
      const t = (tablas[this.t] ||= [])
      let filas
      if (this.op === 'insert') {
        if (this.d.some((x) => x.usuario_id !== uid)) return Promise.resolve({ data: null, error: { message: 'RLS' } }).then(ok, ko)
        filas = this.d.map((x) => ({ id: `id${Math.random().toString(36).slice(2)}`, created_at: ahora(), ...x }))
        t.push(...filas)
      } else {
        filas = t.filter((r) => this.f.every((f) => f(r)))
        if (this.op === 'delete') tablas[this.t] = t.filter((r) => !filas.includes(r))
        if (this.op === 'update') filas.forEach((r) => Object.assign(r, this.d))
      }
      if (this.t === 'movimientos') filas = filas.map((x) => ({ ...x, categoria: relacion(x, 'categorias', 'categoria'), fuente: relacion(x, 'fuentes', 'fuente') }))
      if (this.r) filas = filas.slice(this.r[0], this.r[1] + 1)
      return Promise.resolve({ data: this.u ? filas[0] ?? null : filas, error: null }).then(ok, ko)
    }
  }
  return { from: (t) => new Q(t) }
}

const YO = 'u-yo'
const OTRO = 'u-otro'
let tablas
let ctx
const llamar = async (name, args = {}) => (await manejarMensaje({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, ctx)).result

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T12:00:00Z'))
  tablas = {
    categorias: [
      { id: 'c1', usuario_id: YO, tipo: 'gasto', nombre: 'Comida' },
      { id: 'c2', usuario_id: YO, tipo: 'ingreso', nombre: 'Nomina' },
      { id: 'cx', usuario_id: OTRO, tipo: 'gasto', nombre: 'Secreta' },
    ],
    fuentes: [],
    perfiles: [{ usuario_id: YO }],
    recurrentes: [
      { id: '00000000-0000-4000-8000-0000000000a1', usuario_id: YO, tipo: 'gasto', nombre: 'Spotify', importe: 10.99, periodo_meses: 1, dia_mes: 4, categoria_nombre: 'Suscripciones', activo: true },
      { id: '00000000-0000-4000-8000-0000000000a2', usuario_id: YO, tipo: 'gasto', nombre: 'Seguro moto', importe: 240, periodo_meses: 12, dia_mes: 11, activo: true },
      { id: '00000000-0000-4000-8000-0000000000af', usuario_id: OTRO, tipo: 'gasto', nombre: 'Del otro', importe: 999, periodo_meses: 1, activo: true },
    ],
    movimientos: [
      { id: '00000000-0000-4000-8000-000000000001', usuario_id: YO, tipo: 'ingreso', importe: 1500, fecha: '2026-10-28', nota: 'Nómina', categoria_id: 'c2' },
      { id: '00000000-0000-4000-8000-000000000002', usuario_id: YO, tipo: 'gasto', importe: 40, fecha: '2026-11-02', nota: 'Mercadona', categoria_id: 'c1' },
      { id: '00000000-0000-4000-8000-0000000000ff', usuario_id: OTRO, tipo: 'ingreso', importe: 99999, fecha: '2026-11-01', nota: 'Del otro', categoria_id: null },
    ],
  }
  ctx = { sb: supabaseFalso(YO, tablas), usuario: { id: YO } }
})

describe('protocolo MCP', () => {
  it('initialize negocia versión y anuncia herramientas', async () => {
    const r = await manejarMensaje({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, ctx)
    expect(r.result.protocolVersion).toBe('2025-06-18')
    expect(r.result.capabilities.tools).toBeTruthy()
    expect(r.result.serverInfo.name).toBe('palanca')
    const v = await manejarMensaje({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, ctx)
    expect(v.result.protocolVersion).toBe('2025-06-18')
  })

  it('las notificaciones no tienen respuesta; métodos desconocidos dan error', async () => {
    expect(await manejarMensaje({ jsonrpc: '2.0', method: 'notifications/initialized' }, ctx)).toBeNull()
    expect((await manejarMensaje({ jsonrpc: '2.0', id: 3, method: 'nada' }, ctx)).error.code).toBe(-32601)
    expect((await manejarMensaje({ foo: 1 }, ctx)).error.code).toBe(-32600)
  })

  it('tools/list: todas con esquema; las de escritura no son de solo lectura y las de borrar son destructivas', async () => {
    const { tools } = (await manejarMensaje({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, ctx)).result
    expect(tools.map((t) => t.name)).toEqual(HERRAMIENTAS.map((h) => h.name))
    for (const t of tools) {
      expect(t.inputSchema.type).toBe('object')
      expect(t.ejecutar).toBeUndefined()
    }
    expect(tools.find((t) => t.name === 'borrar_movimientos').annotations.destructiveHint).toBe(true)
    expect(tools.find((t) => t.name === 'resumen').annotations.readOnlyHint).toBe(true)
  })
})

describe('solo los datos del usuario', () => {
  it('resumen y listar no ven filas de otro usuario', async () => {
    const r = await llamar('resumen')
    expect(r.structuredContent.patrimonio).toBe(1460)
    expect(r.structuredContent.movimientos_totales).toBe(2)
    const l = await llamar('listar_movimientos', { limite: 500 })
    expect(l.structuredContent.movimientos.map((m) => m.id)).toEqual(['00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'])
    const c = await llamar('listar_categorias')
    expect(c.structuredContent.categorias.map((x) => x.nombre)).not.toContain('Secreta')
  })

  it('no puede borrar un movimiento ajeno aunque conozca su id', async () => {
    const r = await llamar('borrar_movimientos', { ids: ['00000000-0000-4000-8000-0000000000ff'], confirmar: true })
    expect(r.structuredContent.borrados).toBe(0)
    expect(tablas.movimientos.some((m) => m.id === '00000000-0000-4000-8000-0000000000ff')).toBe(true)
  })
})

describe('importar_movimientos', () => {
  const filas = [
    { fecha: '30/10/2026', tipo: 'Aportación al bróker', concepto: 'Transferencia TR', importe: 500, plataforma: 'Trade Republic' },
    { fecha: '31/10/2026', tipo: 'Compra inversión', concepto: 'Compra', importe: 251, plataforma: 'Trade Republic', activo: 'NVIDIA' },
    { fecha: '2026-11-01', tipo: 'Dividendo', concepto: 'Dividendo NVIDIA', importe: 1.5, plataforma: 'Trade Republic' },
    { fecha: '02/11/2026', tipo: 'Gasto', concepto: 'Mercadona', categoria: 'Comida', importe: 40 },
    { fecha: '', tipo: 'Gasto', concepto: 'Sin fecha', importe: 5 },
  ]

  it('sin confirmar: vista previa con duplicados, errores y cómo contará; no guarda nada', async () => {
    const antes = tablas.movimientos.length
    const r = await llamar('importar_movimientos', { filas })
    expect(r.isError).toBe(false)
    expect(r.structuredContent.guardado).toBe(false)
    expect(r.structuredContent.nuevos).toBe(3)
    expect(r.structuredContent.ya_estaban).toBe(1) // Mercadona 02/11 40 € ya estaba
    expect(r.structuredContent.con_errores).toBe(1)
    expect(r.structuredContent.asi_lo_contara_palanca).toMatchObject({ invertido: 251, traspasos: 1, ingresos: 1.5 })
    expect(tablas.movimientos.length).toBe(antes)
  })

  it('confirmando: guarda con las reglas del motor, crea categorías y plataforma, y se puede deshacer', async () => {
    const r = await llamar('importar_movimientos', { filas, confirmar: true })
    expect(r.structuredContent.guardados).toBe(3)
    const res = (await llamar('resumen')).structuredContent
    expect(res.invertido_a_precio_de_compra).toBe(251)
    expect(res.disponible).toBeCloseTo(1500 - 40 - 251 + 1.5, 2) // la aportación es neutra
    expect(tablas.fuentes.map((f) => f.nombre)).toEqual(['Trade Republic'])
    expect(tablas.categorias.filter((c) => c.usuario_id === YO).map((c) => c.nombre)).toEqual(expect.arrayContaining(['Ahorro', 'Inversion', 'Dividendos']))
    // Repetir no duplica.
    const otra = await llamar('importar_movimientos', { filas, confirmar: true })
    expect(otra.structuredContent.nuevos).toBe(0)
    // Deshacer: primero vista previa, luego de verdad.
    const id = r.structuredContent.id_importacion
    expect((await llamar('deshacer_importacion', { id_importacion: id })).structuredContent.borraria).toBe(3)
    expect((await llamar('deshacer_importacion', { id_importacion: id, confirmar: true })).structuredContent.borrados).toBe(3)
    expect(tablas.movimientos.filter((m) => m.usuario_id === YO)).toHaveLength(2)
  })

  it('argumentos inválidos devuelven un error claro (no una excepción)', async () => {
    const r = await llamar('importar_movimientos', { filas: [] })
    expect(r.isError).toBe(true)
    expect(r.content[0].text).toMatch(/al menos un movimiento/)
    const d = await llamar('deshacer_importacion', { id_importacion: 'basura' })
    expect(d.isError).toBe(true)
    const v = await llamar('deshacer_importacion', { id_importacion: idImportacion('2020-01-01', '2020-01-02', 5) })
    expect(v.isError).toBe(true)
  })
})

describe('cuadrar_saldo', () => {
  it('vista previa y ajuste visible que deja el disponible como el banco', async () => {
    const p = await llamar('cuadrar_saldo', { banco: 1000, broker: 0.29 })
    expect(p.structuredContent).toMatchObject({ disponible_segun_palanca: 1460, disponible_real: 1000.29, guardado: false })
    const r = await llamar('cuadrar_saldo', { banco: 1000, broker: 0.29, confirmar: true })
    expect(r.structuredContent.guardado).toBe(true)
    expect((await llamar('resumen')).structuredContent.disponible).toBeCloseTo(1000.29, 2)
    const ajuste = tablas.movimientos.find((m) => /Ajuste de saldo/.test(m.nota ?? ''))
    expect(ajuste).toMatchObject({ tipo: 'gasto', importe: 459.71 })
  })

  it('rechaza fechas futuras', async () => {
    expect((await llamar('cuadrar_saldo', { banco: 1, fecha: '2099-01-01' })).isError).toBe(true)
  })
})

describe('gastos fijos y corregir movimientos', () => {
  it('listar_gastos_fijos: solo los míos, con coste anual', async () => {
    const r = await llamar('listar_gastos_fijos')
    expect(r.structuredContent.fijos.map((f) => f.nombre)).toEqual(['Spotify', 'Seguro moto'])
    expect(r.structuredContent.gasto_fijo_anual).toBeCloseTo(10.99 * 12 + 240, 2)
  })

  it('editar_movimiento: vista previa, cambio de categoría (creándola) e importe', async () => {
    const p = await llamar('editar_movimiento', { id: '00000000-0000-4000-8000-000000000002', categoria: 'Supermercado', importe: 42.5 })
    expect(p.structuredContent.guardado).toBe(false)
    expect(tablas.movimientos.find((m) => m.id === '00000000-0000-4000-8000-000000000002').importe).toBe(40)
    const r = await llamar('editar_movimiento', { id: '00000000-0000-4000-8000-000000000002', categoria: 'Supermercado', importe: 42.5, confirmar: true })
    expect(r.structuredContent.despues).toMatchObject({ categoria: 'Supermercado', importe: 42.5 })
    const m = tablas.movimientos.find((x) => x.id === '00000000-0000-4000-8000-000000000002')
    expect(m).toMatchObject({ importe: 42.5, importe_centimos: 4250 })
    expect(tablas.categorias.find((c) => c.id === m.categoria_id).nombre).toBe('Supermercado')
  })

  it('editar_movimiento: no toca movimientos ajenos ni convierte en inversión', async () => {
    const r = await llamar('editar_movimiento', { id: '00000000-0000-4000-8000-0000000000ff', importe: 1, confirmar: true })
    expect(r.isError).toBe(true)
    expect(tablas.movimientos.find((x) => x.id === '00000000-0000-4000-8000-0000000000ff').importe).toBe(99999)
    const i = await llamar('editar_movimiento', { id: '00000000-0000-4000-8000-000000000002', categoria: 'Inversión', confirmar: true })
    expect(i.isError).toBe(true)
    expect((await llamar('editar_movimiento', { id: '00000000-0000-4000-8000-000000000002', fecha: '2099-01-01' })).isError).toBe(true)
  })
})

it('ids con formato raro: «no existe», sin error de base de datos', async () => {
  const r = await llamar('editar_movimiento', { id: 'no-existe', importe: 1 })
  expect(r.isError).toBe(true)
  expect(r.content[0].text).toMatch(/No existe ese movimiento/)
  expect((await llamar('borrar_movimientos', { ids: ['basura'] })).content[0].text).toMatch(/entre 1 y 500/)
})

describe('crear y cambiar gastos fijos', () => {
  const R1 = '00000000-0000-4000-8000-0000000000a1'
  const RX = '00000000-0000-4000-8000-0000000000af'
  it('crear: vista previa avisa si ya existe; confirmando lo guarda con su categoría', async () => {
    const p = await llamar('crear_gasto_fijo', { nombre: 'spotify', importe: 11.99, dia_del_mes: 4 })
    expect(p.structuredContent.ya_existe?.id).toBe(R1)
    expect(tablas.recurrentes).toHaveLength(3)
    const r = await llamar('crear_gasto_fijo', { nombre: 'Seguro coche', importe: 592.39, cada_meses: 12, mes_inicio: 1, categoria: 'Seguros', confirmar: true })
    expect(r.structuredContent.guardado).toBe(true)
    const nuevo = tablas.recurrentes.find((x) => x.nombre === 'Seguro coche')
    expect(nuevo).toMatchObject({ usuario_id: YO, tipo: 'gasto', periodo_meses: 12, mes_inicio: 1, importe_centimos: 59239, activo: true, categoria_nombre: 'Seguros' })
  })

  it('validaciones: periodicidad, día e importe', async () => {
    expect((await llamar('crear_gasto_fijo', { nombre: 'X', importe: 5, cada_meses: 5 })).isError).toBe(true)
    expect((await llamar('crear_gasto_fijo', { nombre: 'X', importe: -5 })).isError).toBe(true)
    expect((await llamar('crear_gasto_fijo', { nombre: 'X', importe: 5, dia_del_mes: 40 })).isError).toBe(true)
  })

  it('cambiar: subir precio y dar de baja; no toca los de otro usuario', async () => {
    await llamar('cambiar_gasto_fijo', { id: R1, importe: 11.99, confirmar: true })
    expect(tablas.recurrentes.find((x) => x.id === R1)).toMatchObject({ importe: 11.99, importe_centimos: 1199 })
    await llamar('cambiar_gasto_fijo', { id: R1, activo: false, confirmar: true })
    expect(tablas.recurrentes.find((x) => x.id === R1).activo).toBe(false)
    const ajeno = await llamar('cambiar_gasto_fijo', { id: RX, importe: 1, confirmar: true })
    expect(ajeno.isError).toBe(true)
    expect(tablas.recurrentes.find((x) => x.id === RX).importe).toBe(999)
  })
})

it('«hoy» es el de España: a las 00:30 de Madrid ya se acepta un movimiento de ese día', async () => {
  vi.setSystemTime(new Date('2026-11-20T23:30:00Z')) // 21/11 00:30 en Madrid
  const r = await llamar('importar_movimientos', { filas: [{ fecha: '21/11/2026', tipo: 'Gasto', concepto: 'Churros', categoria: 'Comida', importe: 3 }] })
  expect(r.structuredContent.nuevos).toBe(1)
})
