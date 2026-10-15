import { describe, expect, it } from 'vitest'
import { guionLlamada, momentoParaNegociar, planDeAhorro, tipoNegociable } from './negociables'

const HOY = new Date(2026, 9, 15) // 15/10/2026
const rec = (extra) => ({ activo: true, tipo: 'gasto', periodoMeses: 1, mesesAplicados: [], diaMes: 5, ...extra })

describe('qué se puede negociar', () => {
  it.each([
    ['Movistar fibra', 'telefonia'],
    ['Iberdrola', 'energia'],
    ['Seguro del coche', 'seguro'],
    ['Netflix', 'digital'],
    ['Canal de Isabel II', 'agua'],
    ['Basic-Fit', 'gimnasio'],
    ['Alquiler', null],
  ])('%s → %s', (nombre, tipo) => {
    expect(tipoNegociable(rec({ nombre }))).toBe(tipo)
  })
  it('por categoría si el nombre no lo dice', () => {
    expect(tipoNegociable(rec({ nombre: 'Póliza hogar', categoriaNombre: 'Seguros' }))).toBe('seguro')
    expect(tipoNegociable(rec({ nombre: 'Cosa', categoriaNombre: 'Suscripciones' }))).toBe('digital')
  })
  it('los ingresos nunca', () => {
    expect(tipoNegociable({ tipo: 'ingreso', nombre: 'Movistar' })).toBeNull()
  })
})

describe('plan de ahorro', () => {
  const recs = [
    rec({ id: 1, nombre: 'Movistar fibra', importe: 45 }), // 540/año
    rec({ id: 2, nombre: 'Seguro del coche', importe: 400, periodoMeses: 12, mesInicio: 11, diaMes: 20 }), // renueva 20/11
    rec({ id: 3, nombre: 'Netflix', importe: 13.99 }),
    rec({ id: 4, nombre: 'Alquiler', importe: 750 }),
    rec({ id: 5, nombre: 'Iberdrola', importe: 60, activo: false }),
  ]
  const plan = planDeAhorro(recs, HOY)
  it('solo compromisos activos con palanca; el alquiler no', () => {
    expect(plan.items.map((i) => i.rec.id).sort()).toEqual([1, 2, 3])
  })
  it('total negociable orientativo (sin las digitales)', () => {
    // telefonía 540 × 10–30 % = 54–162; seguro 400 × 10–25 % = 40–100
    expect(plan.negociable).toEqual({ min: 94, max: 262, n: 2 })
    expect(plan.digital).toEqual({ costeAnual: 168, n: 1 })
  })
  it('el seguro que renueva en 36 días va primero y es urgente', () => {
    expect(plan.items[0].rec.id).toBe(2)
    expect(plan.items[0].momento.urgente).toBe(true)
    expect(plan.items[0].momento.texto).toMatch(/renueva el 20 nov/)
  })
})

describe('momento ideal en seguros', () => {
  const seguro = (mes, dia) => rec({ nombre: 'Seguro hogar', importe: 300, periodoMeses: 12, mesInicio: mes, diaMes: dia })
  it('lejos de la renovación: apúntalo', () => {
    const m = momentoParaNegociar(seguro(3, 10), 'seguro', HOY)
    expect(m.urgente).toBe(false)
    expect(m.texto).toMatch(/Apúntalo/)
  })
  it('a menos de 30 días: aún puedes pedir', () => {
    expect(momentoParaNegociar(seguro(10, 30), 'seguro', HOY).texto).toMatch(/aún puedes/)
  })
})

describe('guion de llamada', () => {
  it('lleva sus datos', () => {
    const g = guionLlamada(rec({ nombre: 'Vodafone', importe: 52.9 }), 'telefonia', { antiguedad: '3 años' })
    expect(g).toMatch(/desde hace 3 años/)
    expect(g).toMatch(/52,90\s€ al mes por Vodafone/)
  })
  it('las digitales no tienen guion (no se negocian)', () => {
    expect(guionLlamada(rec({ nombre: 'Netflix', importe: 13.99 }), 'digital')).toBeNull()
  })
})
