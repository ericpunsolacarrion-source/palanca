import { describe, expect, it } from 'vitest'
import { agruparHistorial } from './historial'
import { totalesDe } from './movimientosUtils'
import { generarClienteCompleto } from './clienteCompleto'

const HOY = new Date(2026, 10, 7)
let n = 0
const mov = (tipo, cat, importe, fecha) => ({ id: `h${++n}`, tipo, importe, importe_centimos: Math.round(importe * 100), fecha, categoria: { nombre: cat } })

describe('agruparHistorial', () => {
  const L = [
    mov('ingreso', 'Nomina', 2000, '2026-11-01'),
    mov('gasto', 'Comida', 45.5, '2026-11-03'),
    mov('gasto', 'Inversion', 300, '2026-10-02'),
    mov('gasto', 'Comida', 60.25, '2026-10-15'),
    mov('ingreso', 'Nomina', 1900, '2025-12-01'),
    mov('gasto', 'Ocio', 20, '2025-03-09'),
    mov('gasto', 'Ocio', 10, '2024-07-01'),
  ]
  const g = agruparHistorial(L, HOY)

  it('mes en curso primero y marcado, luego meses del año, luego años', () => {
    expect(g.map((b) => `${b.tipo}:${b.clave}`)).toEqual(['mes:2026-11', 'mes:2026-10', 'anio:2025', 'anio:2024'])
    expect(g[0].actual).toBe(true)
    expect(g[2].meses.map((m) => m.clave)).toEqual(['2025-12', '2025-03'])
  })

  it('los totales de cada bloque son la suma de sus movimientos (regla única)', () => {
    expect(g[1].totales).toMatchObject({ gastos: 60.25, invertido: 300, ingresos: 0 })
    expect(g[2].totales).toMatchObject({ ingresos: 1900, gastos: 20, ahorro: 1880 })
    expect(g[2].n).toBe(2)
  })

  it('no duplica ni pierde movimientos y no los modifica', () => {
    const copia = JSON.stringify(L)
    const ids = g.flatMap((b) => (b.tipo === 'mes' ? b.movimientos : b.meses.flatMap((m) => m.movimientos))).map((m) => m.id)
    expect(ids.sort()).toEqual(L.map((m) => m.id).sort())
    expect(JSON.stringify(L)).toBe(copia)
  })

  it('el mes en curso aparece aunque no tenga movimientos', () => {
    const h = agruparHistorial([mov('gasto', 'Ocio', 5, '2026-09-01')], HOY)
    expect(h[0]).toMatchObject({ clave: '2026-11', n: 0, actual: true })
  })

  it('movimientos con fecha futura no rompen el orden', () => {
    const h = agruparHistorial([mov('gasto', 'Ocio', 5, '2027-02-01'), mov('gasto', 'Ocio', 5, '2026-12-01'), mov('gasto', 'Ocio', 5, '2026-11-02')], HOY)
    expect(h.map((b) => b.clave)).toEqual(['2027', '2026-12', '2026-11'])
  })

  it('con 3 años de cliente real: los totales agrupados cuadran con el total', () => {
    const { movimientos } = generarClienteCompleto(HOY)
    const h = agruparHistorial(movimientos, HOY)
    const suma = (k) => Math.round(h.reduce((s, b) => s + b.totales[k] * 100, 0))
    const total = totalesDe(movimientos)
    for (const k of ['ingresos', 'gastos', 'invertido', 'ahorro']) expect(suma(k)).toBe(Math.round(total[k] * 100))
    expect(h.reduce((s, b) => s + b.n, 0)).toBe(movimientos.length)
    // Cada año cuadra con sus meses.
    for (const a of h.filter((b) => b.tipo === 'anio')) {
      expect(a.meses.reduce((s, m) => s + m.n, 0)).toBe(a.n)
      expect(Math.round(a.meses.reduce((s, m) => s + m.totales.gastos * 100, 0))).toBe(Math.round(a.totales.gastos * 100))
    }
  })
})
