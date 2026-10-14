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

describe('construirResumenIA · presupuesto, objetivos y proyección', () => {
  it('presupuesto por gasto fijo: límite, gastado y ritmo diario', () => {
    const r = construirResumenIA([], { presupuesto: { metodo: 'fijo', gastoMaximoFijo: 900 } })
    expect(r.presupuesto).toMatchObject({ configurado: true, limiteGastoMes: 900, gastadoMes: 0, restante: 900 })
    expect(r.presupuesto.puedeGastarAlDia).toBeGreaterThan(0)
  })
  it('sin presupuesto → configurado: false; sin ahorro → sin proyección', () => {
    const r = construirResumenIA([])
    expect(r.presupuesto).toEqual({ configurado: false })
    expect(r.proyeccion10Anios).toBeNull()
  })
  it('objetivo: cuánto falta y meses a su ritmo', () => {
    const r = construirResumenIA([], { objetivos: [{ nombre: 'Colchón', importe_objetivo: 3000, tipo: 'liquidez' }] })
    expect(r.objetivosAhorro[0]).toMatchObject({ faltan: 3000, ritmoMensual: 0, mesesParaAlcanzarloASuRitmo: null })
  })
})
