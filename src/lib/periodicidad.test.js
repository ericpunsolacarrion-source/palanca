import { describe, expect, it } from 'vitest'
import { cobrosProximos, costeAnual, costeMensual, proximoCobro, textoCalendario, tocaEnMes } from './periodicidad'

const HOY = new Date(2026, 9, 14) // 14 oct 2026

describe('tocaEnMes', () => {
  it('mensual toca siempre', () => {
    expect(tocaEnMes({}, '2026-07')).toBe(true)
  })
  it('trimestral desde febrero: feb, may, ago, nov', () => {
    const r = { periodoMeses: 3, mesInicio: 2 }
    expect(['2026-02', '2026-05', '2026-08', '2026-11'].every((c) => tocaEnMes(r, c))).toBe(true)
    expect(tocaEnMes(r, '2026-10')).toBe(false)
    expect(tocaEnMes({ periodoMeses: 3, mesInicio: 11 }, '2026-02')).toBe(true) // da la vuelta al año
  })
  it('anual solo en su mes', () => {
    expect(tocaEnMes({ periodoMeses: 12, mesInicio: 3 }, '2027-03')).toBe(true)
    expect(tocaEnMes({ periodoMeses: 12, mesInicio: 3 }, '2027-04')).toBe(false)
  })
})

describe('proximoCobro', () => {
  it('mensual, día por llegar este mes', () => {
    expect(proximoCobro({ diaMes: 20 }, HOY)).toMatchObject({ fecha: '2026-10-20', dias: 6, texto: 'en 6 días' })
  })
  it('mensual ya confirmado este mes → el mes siguiente', () => {
    expect(proximoCobro({ diaMes: 20, mesesAplicados: ['2026-10'] }, HOY).fecha).toBe('2026-11-20')
  })
  it('mensual atrasado sin confirmar → "toca ya" (días negativos)', () => {
    expect(proximoCobro({ diaMes: 10 }, HOY)).toMatchObject({ dias: -4, texto: 'hace 4 días' })
  })
  it('anual en marzo → marzo del año que viene', () => {
    expect(proximoCobro({ periodoMeses: 12, mesInicio: 3, diaMes: 3 }, HOY)).toMatchObject({
      fecha: '2027-03-03',
      texto: 'mar 2027',
    })
  })
  it('semestral, acota el día al último del mes', () => {
    expect(proximoCobro({ periodoMeses: 6, mesInicio: 2, diaMes: 31 }, HOY).fecha).toBe('2027-02-28')
  })
})

describe('costes prorrateados', () => {
  it('mensual y anual coherentes', () => {
    expect(costeMensual({ importe: 13.99 })).toBe(13.99)
    expect(costeAnual({ importe: 13.99 })).toBe(167.88)
    expect(costeMensual({ importe: 49.9, periodoMeses: 12 })).toBe(4.16)
    expect(costeAnual({ importe: 49.9, periodoMeses: 12 })).toBe(49.9)
    expect(costeAnual({ importe: 30, periodoMeses: 3 })).toBe(120)
  })
})

describe('cobrosProximos', () => {
  it('solo activos dentro de la ventana, ordenados', () => {
    const recs = [
      { nombre: 'Gym', activo: true, importe: 40, diaMes: 16 },
      { nombre: 'Netflix', activo: true, importe: 13.99, diaMes: 15 },
      { nombre: 'Pausado', activo: false, importe: 9, diaMes: 15 },
      { nombre: 'Prime', activo: true, importe: 49.9, periodoMeses: 12, mesInicio: 3, diaMes: 3 },
    ]
    expect(cobrosProximos(recs, 7, HOY).map((c) => c.rec.nombre)).toEqual(['Netflix', 'Gym'])
  })
})

describe('textoCalendario', () => {
  it('describe cuándo se cobra', () => {
    expect(textoCalendario({ diaMes: 5 })).toBe('día 5')
    expect(textoCalendario({ periodoMeses: 3, mesInicio: 11, diaMes: 1 })).toBe('trimestral · feb, may, ago, nov · día 1')
  })
})
