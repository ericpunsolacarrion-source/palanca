import { describe, expect, it } from 'vitest'
import { construirResumenIA } from './resumenParaIA'

describe('construirResumenIA · fijos', () => {
  it('incluye suscripciones y gastos fijos con coste prorrateado', () => {
    const recurrentes = [
      { id: '1', nombre: 'Netflix', tipo: 'gasto', activo: true, importe: 13.99, diaMes: 3, mesesAplicados: [] },
      { id: '2', nombre: 'Seguro', tipo: 'gasto', activo: true, importe: 360, periodoMeses: 12, mesInicio: 3, diaMes: 1, mesesAplicados: [] },
      { id: '3', nombre: 'Nómina', tipo: 'ingreso', activo: true, importe: 2000, diaMes: 1, mesesAplicados: [] },
    ]
    const r = construirResumenIA([], { recurrentes })
    expect(r.fijos.nCompromisos).toBe(2)
    expect(r.fijos.costeMensualProrrateado).toBe(44) // 13,99 + 30
    expect(r.fijos.costeAnual).toBe(528) // 167,88 + 360
    expect(r.fijos.compromisos.map((c) => c.periodicidad)).toEqual(['mensual', 'anual'])
    expect(JSON.stringify(r).length).toBeLessThan(30000) // cabe en el límite del endpoint
  })
})
