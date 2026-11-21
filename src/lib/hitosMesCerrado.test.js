import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calcularMetricas, detectarHitos, mesesSeguidosAhorrando } from './hitos'

const mov = (tipo, importe, fecha, nombre = tipo === 'ingreso' ? 'Nomina' : 'Comida') => ({ tipo, importe, fecha, categoria: { nombre } })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-03T12:00:00'))
})
afterEach(() => vi.useRealTimers())

describe('logros de ahorro: solo con meses cerrados', () => {
  it('registrar la nómina del mes en curso NO da el logro «20 % de ahorro» (el fallo conocido)', () => {
    const movimientos = [mov('ingreso', 1500, '2026-11-01'), mov('gasto', 10, '2026-11-02')]
    const m = calcularMetricas({ movimientos, movimientosMes: movimientos })
    expect(m.ratioAhorroMes).toBe(0)
    expect([...detectarHitos({ movimientos, movimientosMes: movimientos })]).not.toContain('ahorro_20')
  })

  it('un mes CERRADO con más del 20 % sí lo da', () => {
    const movimientos = [mov('ingreso', 1000, '2026-10-01'), mov('gasto', 700, '2026-10-15'), mov('ingreso', 1500, '2026-11-01')]
    const m = calcularMetricas({ movimientos, movimientosMes: [movimientos[2]] })
    expect(m.ratioAhorroMes).toBeCloseTo(30, 5)
  })

  it('«3 meses ahorrando» no cuenta el mes en curso', () => {
    const movimientos = [
      mov('ingreso', 1000, '2026-09-01'), mov('gasto', 100, '2026-09-10'),
      mov('ingreso', 1000, '2026-10-01'), mov('gasto', 100, '2026-10-10'),
      mov('ingreso', 1000, '2026-11-01'),
    ]
    expect(mesesSeguidosAhorrando(movimientos)).toBe(2)
  })
})
