import { describe, expect, it } from 'vitest'
import { estadoEnMes } from './calendarioBase'

const hoy = new Date(2026, 10, 15) // 15 nov 2026
const rec = (extra) => ({ id: 'r', activo: true, importe: 10, diaMes: 10, periodoMeses: 1, ...extra })

describe('calendario de Base: estado de un cobro en un mes', () => {
  it('mes actual: igual que estadoCobro (pagado, por confirmar, pendiente)', () => {
    expect(estadoEnMes(rec({ mesesAplicados: ['2026-11'] }), '2026-11', '2026-11', hoy)).toBe('pagado')
    expect(estadoEnMes(rec({}), '2026-11', '2026-11', hoy)).toBe('confirmar')
    expect(estadoEnMes(rec({ diaMes: 20 }), '2026-11', '2026-11', hoy)).toBe('pendiente')
  })
  it('meses pasados y futuros', () => {
    expect(estadoEnMes(rec({ mesesAplicados: ['2026-10'] }), '2026-10', '2026-11', hoy)).toBe('pagado')
    expect(estadoEnMes(rec({}), '2026-10', '2026-11', hoy)).toBe('sin-confirmar')
    expect(estadoEnMes(rec({}), '2026-12', '2026-11', hoy)).toBe('previsto')
  })
})
