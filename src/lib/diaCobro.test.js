import { describe, expect, it } from 'vitest'
import { detectarCobroNomina, diaInicioDesdeCobro } from './diaCobro'
import { generarClienteCompleto } from './clienteCompleto'

let n = 0
const mov = (tipo, cat, importe, fecha) => ({ id: `n${++n}`, tipo, importe, fecha, categoria: { nombre: cat } })
const HOY = new Date('2026-11-07T12:00:00')
const meses = (desde, hasta) => {
  const L = []
  for (let d = new Date(desde); d <= new Date(hasta); d.setMonth(d.getMonth() + 1)) L.push([d.getFullYear(), d.getMonth() + 1])
  return L
}
const f = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

describe('día declarado → día de inicio', () => {
  it('principio de mes = mes natural; fin de mes = ese día (máx. 28)', () => {
    expect([1, 3, 5, 6, 15, 25, 27, 28, 29, 30, 31].map(diaInicioDesdeCobro)).toEqual([1, 1, 1, 6, 15, 25, 27, 28, 28, 28, 28])
    expect([null, undefined, 0, 32, 'x'].map(diaInicioDesdeCobro)).toEqual([1, 1, 1, 1, 1])
  })
})

describe('detección con los movimientos', () => {
  it('nómina el 28 que a veces llega el 27 → el mes empieza el 27', () => {
    const L = meses('2025-11-01', '2026-10-01').map(([y, m]) => mov('ingreso', 'Nomina', 2100, f(y, m, m === 3 || m === 9 ? 27 : 28)))
    L.push(mov('gasto', 'Comida', 80, '2026-10-29'))
    const r = detectarCobroNomina(L, HOY)
    expect(r).toMatchObject({ diaHabitual: 28, diaMasTemprano: 27, diaInicio: 27 })
    expect(r.adelantos).toEqual(['2026-09-27', '2026-03-27'])
  })
  it('se adelanta hasta el 26 por un fin de semana → 26', () => {
    const L = meses('2026-01-01', '2026-10-01').map(([y, m]) => mov('ingreso', 'Nomina', 1800, f(y, m, m === 6 ? 26 : 28)))
    expect(detectarCobroNomina(L, HOY)).toMatchObject({ diaHabitual: 28, diaInicio: 26 })
  })
  it('nómina el 1 que a veces llega el 30 del mes anterior → el mes empieza el 28', () => {
    const L = meses('2026-01-01', '2026-11-01').map(([y, m]) => mov('ingreso', 'Nomina', 2000, m === 7 ? f(y, 6, 30) : f(y, m, 1)))
    expect(detectarCobroNomina(L, HOY)).toMatchObject({ diaHabitual: 1, diaMasTemprano: 30, diaInicio: 28 })
  })
  it('nómina siempre el 1 → mes natural (sin cambios)', () => {
    const L = meses('2026-01-01', '2026-11-01').map(([y, m]) => mov('ingreso', 'Nomina', 2000, f(y, m, 1)))
    expect(detectarCobroNomina(L, HOY)).toMatchObject({ diaHabitual: 1, diaInicio: 1, adelantos: [] })
  })
  it('la paga extra o un Bizum no son adelantos de la nómina', () => {
    const L = meses('2025-12-01', '2026-10-01').map(([y, m]) => mov('ingreso', 'Nomina', 2000, f(y, m, 28)))
    L.push(mov('ingreso', 'Nomina', 2000, '2026-06-20'), mov('ingreso', 'Nomina', 2000, '2025-12-20'))
    L.push(mov('ingreso', 'Otros ingresos', 30, '2026-10-25'))
    expect(detectarCobroNomina(L, HOY)).toMatchObject({ diaHabitual: 28, diaInicio: 28, adelantos: [] })
  })
  it('sin categoría «Nomina»: usa los ingresos grandes', () => {
    const L = meses('2026-03-01', '2026-10-01').map(([y, m]) => mov('ingreso', 'Otros ingresos', 1500, f(y, m, m === 5 ? 24 : 25)))
    L.push(mov('ingreso', 'Otros ingresos', 40, '2026-10-02'))
    expect(detectarCobroNomina(L, HOY)).toMatchObject({ diaHabitual: 25, diaInicio: 24 })
  })
  it('traspasos, ajustes y devoluciones no cuentan; con menos de 3 meses no se detecta', () => {
    const L = [mov('ingreso', 'Nomina', 2000, '2026-09-28'), mov('ingreso', 'Nomina', 2000, '2026-10-28'), mov('ingreso', 'Desde ahorro', 5000, '2026-08-10'), mov('ingreso', 'Ajuste', 9000, '2026-07-10'), mov('ingreso', 'Devoluciones', 3000, '2026-06-10')]
    expect(detectarCobroNomina(L, HOY)).toBeNull()
    expect(detectarCobroNomina([], HOY)).toBeNull()
  })
  it('solo mira los últimos 12 meses (un cambio de empresa se nota)', () => {
    const viejo = meses('2024-01-01', '2025-06-01').map(([y, m]) => mov('ingreso', 'Nomina', 1700, f(y, m, 1)))
    const nuevo = meses('2025-11-01', '2026-10-01').map(([y, m]) => mov('ingreso', 'Nomina', 2200, f(y, m, 28)))
    expect(detectarCobroNomina([...viejo, ...nuevo], HOY)).toMatchObject({ diaHabitual: 28, diaInicio: 28 })
  })
  it('cliente de 3 años (nómina el 1, paga extra el 20): mes natural', () => {
    const r = detectarCobroNomina(generarClienteCompleto(HOY).movimientos, HOY)
    expect(r).toMatchObject({ diaHabitual: 1, diaInicio: 1 })
  })
  it('no modifica los movimientos', () => {
    const L = meses('2026-01-01', '2026-10-01').map(([y, m]) => mov('ingreso', 'Nomina', 1800, f(y, m, 28)))
    const copia = JSON.stringify(L)
    detectarCobroNomina(L, HOY)
    expect(JSON.stringify(L)).toBe(copia)
  })
})
