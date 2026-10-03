import { describe, expect, it } from 'vitest'
import { lecturaBase, proyeccionCompromiso, resumenBase } from './baseInsights'

const gasto = (importe) => ({ tipo: 'gasto', importe, importe_centimos: Math.round(importe * 100), activo: true })
const ingreso = (importe) => ({ tipo: 'ingreso', importe, importe_centimos: Math.round(importe * 100), activo: true })

describe('baseInsights', () => {
  it('separa ingresos y gastos recurrentes y calcula su base mensual', () => {
    const r = resumenBase([gasto(17.99), gasto(35), ingreso(2000), { ...gasto(10), activo: false }])
    expect(r.gastoMensualCentimos).toBe(5299)
    expect(r.ingresoMensualCentimos).toBe(200000)
    expect(r.margenMensualCentimos).toBe(194701)
    expect(r.compromisos).toBe(3)
  })

  it('proyecta el importe habitual sin redondear el núcleo', () => {
    const r = gasto(17.99)
    expect(proyeccionCompromiso(r, 1)).toBe(21588)
    expect(proyeccionCompromiso(r, 5)).toBe(107940)
  })

  it('genera una lectura solo a partir de datos declarados', () => {
    const mensajes = lecturaBase([gasto(100), ingreso(2000)])
    expect(mensajes[0].texto).toContain('5%')
    expect(mensajes[1].texto).toContain('1200 €')
  })
})
