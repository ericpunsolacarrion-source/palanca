import { describe, expect, it } from 'vitest'
import { conciliarFijos } from './conciliarFijos'
import { estadoCobro } from './periodicidad'
import { crearDirectorio } from './comercios'

const HOY = new Date(2026, 9, 15) // 15/10/2026
const dir = crearDirectorio([{ clave: 'alipam', nombre: 'Gimnasio Barrio' }])
const rec = (o) => ({ id: o.id ?? 'r', tipo: 'gasto', nombre: 'Spotify', importe: 10.99, diaMes: 5, periodoMeses: 1, activo: true, mesesAplicados: [], ...o })
let n = 0
const mov = (fecha, importe, nota, extra = {}) => ({ id: `m${++n}`, tipo: 'gasto', fecha, importe, importe_centimos: Math.round(importe * 100), nota, fuente: null, categoria: { nombre: 'Ocio' }, ...extra })

describe('conciliarFijos: lo ya apuntado cuenta como pagado (sin doble cobro)', () => {
  it('cargo del extracto un día después del día de cobro → hecho', () => {
    const [r] = conciliarFijos([rec({})], [mov('2026-10-06', 10.99, 'PAYPAL *SPOTIFY P1234')], HOY, dir)
    expect(estadoCobro(r, HOY)).toBe('hecho')
    expect(r.detectado).toMatchObject({ mes: '2026-10', importe: 10.99, fecha: '2026-10-06' })
  })
  it('sin nada apuntado → sigue pendiente de confirmar', () => {
    const [r] = conciliarFijos([rec({})], [mov('2026-10-06', 9.99, 'NETFLIX')], HOY, dir)
    expect(estadoCobro(r, HOY)).toBe('confirmar')
  })
  it('recibo variable (luz): el importe cambia pero es el mismo sitio → hecho', () => {
    const luz = rec({ nombre: 'Luz Iberdrola', importe: 60, diaMes: 10 })
    const [r] = conciliarFijos([luz], [mov('2026-10-11', 74.3, 'RECIBO IBERDROLA CLIENTES')], HOY, dir)
    expect(estadoCobro(r, HOY)).toBe('hecho')
  })
  it('nombre de varias palabras: "Seguro moto" en "SEGURO MOTO MAPFRE"', () => {
    const s = rec({ nombre: 'Seguro moto', importe: 180, diaMes: 1, periodoMeses: 12, mesInicio: 10 })
    const [r] = conciliarFijos([s], [mov('2026-10-02', 180, 'SEGURO MOTO MAPFRE'), mov('2026-10-02', 420, 'SEGURO COCHE AXA')], HOY, dir)
    expect(r.detectado.importe).toBe(180)
  })
  it('con la memoria del usuario: ALIPAM es su gimnasio', () => {
    const g = rec({ nombre: 'Gimnasio barrio', importe: 35, diaMes: 3 })
    const [r] = conciliarFijos([g], [mov('2026-10-03', 35, 'PAGO TARJETA ALIPAM23')], HOY, dir)
    expect(estadoCobro(r, HOY)).toBe('hecho')
  })
  it('gasto rápido de la misma categoría con el importe exacto → hecho', () => {
    const g = rec({ nombre: 'Gimnasio', importe: 39.9, diaMes: 7, categoriaId: 'c-dep' })
    const [r] = conciliarFijos([g], [mov('2026-10-07', 39.9, null, { categoria_id: 'c-dep' })], HOY, dir)
    expect(estadoCobro(r, HOY)).toBe('hecho')
  })
  it('misma categoría pero otro importe y sin nombre → NO (podría ser otra cosa)', () => {
    const g = rec({ nombre: 'Gimnasio', importe: 39.9, diaMes: 7, categoriaId: 'c-dep' })
    const [r] = conciliarFijos([g], [mov('2026-10-07', 12, null, { categoria_id: 'c-dep' })], HOY, dir)
    expect(estadoCobro(r, HOY)).toBe('confirmar')
  })
  it('lejos del día de cobro (más de 7 días) no cuenta', () => {
    const [r] = conciliarFijos([rec({ diaMes: 25 })], [mov('2026-10-05', 10.99, 'SPOTIFY')], new Date(2026, 9, 26), dir)
    expect(r.detectado).toBeUndefined()
  })
  it('un movimiento cubre un solo fijo (dos fijos iguales, un pago)', () => {
    const r = conciliarFijos([rec({ id: 'a' }), rec({ id: 'b' })], [mov('2026-10-05', 10.99, 'SPOTIFY')], HOY, dir)
    expect(r.filter((x) => x.detectado)).toHaveLength(1)
  })
  it('ingresos: la nómina del extracto cuenta como recibida', () => {
    const nomina = rec({ tipo: 'ingreso', nombre: 'Nómina', importe: 2000, diaMes: 1 })
    const [r] = conciliarFijos([nomina], [{ ...mov('2026-10-01', 2003.5, 'NOMINA EMPRESA SL'), tipo: 'ingreso' }], HOY, dir)
    expect(estadoCobro(r, HOY)).toBe('hecho')
  })
  it('no toca si ya estaba confirmado, pausado, o no le toca este mes', () => {
    const lista = [rec({ id: 'c', mesesAplicados: ['2026-10'] }), rec({ id: 'p', activo: false }), rec({ id: 't', periodoMeses: 12, mesInicio: 3 })]
    const r = conciliarFijos(lista, [mov('2026-10-05', 10.99, 'SPOTIFY')], HOY, dir)
    expect(r.every((x) => !x.detectado)).toBe(true)
  })
  it('un movimiento futuro no cuenta', () => {
    const [r] = conciliarFijos([rec({ diaMes: 20 })], [mov('2026-10-20', 10.99, 'SPOTIFY')], HOY, dir)
    expect(r.detectado).toBeUndefined()
  })
})
