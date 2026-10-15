import { describe, expect, it } from 'vitest'
import { consultaLocal, respuestaLocal } from './respuestasLocales'

// El caso de Eric (16-10): "gasolina moto", "gasolina coche", "gasolina
// furgoneta" apuntados a mano y Repsol importado. Fulcro debe desglosar por
// concepto y dar el total, sin IA, entienda "último año" o no lleve "cuánto".
const HOY = new Date(2026, 9, 16, 12)
const mov = (fecha, importe, nota, cat = 'Transporte') => ({ id: `${fecha}${nota}${importe}`, tipo: 'gasto', fecha, importe, importe_centimos: Math.round(importe * 100), nota, categoria: { nombre: cat } })
const movimientos = [
  mov('2026-05-10', 6, 'Gasolina moto'), mov('2026-06-12', 8, 'Gasolina moto'), mov('2026-08-02', 7, 'Gasolina moto'), mov('2026-09-20', 6.5, 'Gasolina moto'),
  mov('2026-07-05', 60, 'Gasolina coche'), mov('2026-09-03', 62.4, 'Gasolina coche'), mov('2025-12-01', 58, 'Gasolina coche'),
  mov('2026-08-15', 90, 'Gasolina furgoneta'),
  mov('2026-09-25', 50, 'COMPRA TARJ. REPSOL ESTACION'),
  mov('2026-10-02', 800, 'Alquiler', 'Vivienda'),
  mov('2025-09-01', 71.5, 'gastos', 'Otros'), // el "comercio" que la IA confundió con gasolina
]

describe('gasolina moto / coche / furgoneta', () => {
  it('"cuanto he gastado en gasolina este ultimo año?" → desglose + total del último año', () => {
    const r = respuestaLocal('cuanto he gastado en gasolina este ultimo año?', { movimientos, hoy: HOY }).replace(/\u00a0/g, ' ')
    expect(r).toMatch(/En el último año has gastado \*\*347,90 €\*\* en \*\*gasolina\*\*/)
    expect(r).toContain('Gasolina coche: **180,40 €**')
    expect(r).toContain('Gasolina furgoneta: **90 €**')
    expect(r).toContain('Repsol: **50 €**')
    expect(r).toContain('Gasolina moto: **27,50 €**')
    expect(r).toContain('**Total: 347,90 €**')
    expect(r).not.toMatch(/gastos|71,50/)
  })
  it('"gasto en gasolina" (sin "cuánto") → media mensual con desglose, no a la IA', () => {
    const r = consultaLocal('gasto en gasolina', { movimientos, hoy: HOY })
    expect(r.texto).toMatch(/gasolina\*\* gastas de media/)
    expect(r.tarjeta.filas.map((f) => f.nombre)).toEqual(expect.arrayContaining(['Gasolina furgoneta', 'Gasolina coche', 'Repsol', 'Gasolina moto']))
  })
  it('"gasolina moto" → solo la moto', () => {
    const r = respuestaLocal('gasolina moto', { movimientos, hoy: HOY })
    expect(r).toMatch(/Gasolina moto/)
    expect(r).not.toMatch(/coche|furgoneta|Repsol/)
  })
  it('sin gastos en el periodo: dice el último y el último año, no "no veo nada"', () => {
    const r = respuestaLocal('¿cuánto he gastado en gasolina este mes?', { movimientos, hoy: HOY }).replace(/\u00a0/g, ' ')
    expect(r).toMatch(/Este mes no veo gastos en \*\*gasolina\*\*/)
    expect(r).toMatch(/El último fue el 25\/09\/2026/)
    expect(r).toMatch(/En el último año: \*\*347,90 €\*\*/)
  })
})
