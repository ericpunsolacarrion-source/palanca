import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { fusionarCapturas } = await import('./capturas')

describe('fusión de capturas solapadas', () => {
  it('un movimiento que aparece en dos capturas cuenta una vez', () => {
    const r = fusionarCapturas([
      { fecha: '2026-10-14', concepto: 'Mercadona', importe: -45.3, captura: 1 },
      { fecha: '2026-10-13', concepto: 'Nómina', importe: 1850, captura: 1 },
      { fecha: '2026-10-13', concepto: 'NÓMINA', importe: 1850, captura: 2 },
      { fecha: '2026-10-12', concepto: 'Repsol', importe: -50, captura: 2 },
    ])
    expect(r).toHaveLength(3)
    expect(r.map((m) => m.fecha)).toEqual(['2026-10-14', '2026-10-13', '2026-10-12'])
  })
  it('dos cafés iguales el mismo día en la misma captura se respetan', () => {
    const cafe = { fecha: '2026-10-14', concepto: 'Cafetería', importe: -1.5 }
    const r = fusionarCapturas([
      { ...cafe, captura: 1 },
      { ...cafe, captura: 1 },
      { ...cafe, captura: 2 }, // la segunda captura solo ve uno (solape)
    ])
    expect(r).toHaveLength(2)
  })
})
