import { afterEach, describe, expect, it } from 'vitest'
import { vistaPreviaPeriodos } from './periodoVista'
import { configurarPeriodo, diaInicioPeriodo } from './periodo'
import { diaInicioDePerfil } from './periodoVista'

const mov = (id, tipo, importe, fecha, cat = 'Comida') => ({ id, tipo, importe, importe_centimos: Math.round(importe * 100), fecha, categoria: { nombre: cat } })
const L = [mov(1, 'ingreso', 2000, '2026-09-28', 'Nomina'), mov(2, 'gasto', 100, '2026-10-05'), mov(3, 'ingreso', 2000, '2026-10-28', 'Nomina'), mov(4, 'gasto', 50, '2026-10-30'), mov(5, 'gasto', 70, '2026-11-03')]
const hoy = new Date('2026-11-07T12:00:00')

afterEach(() => configurarPeriodo(1))

describe('vista previa del ajuste', () => {
  it('muestra los últimos periodos con el día propuesto sin cambiar la configuración activa', () => {
    configurarPeriodo(1)
    const v = vistaPreviaPeriodos(L, 28, 3, hoy)
    expect(diaInicioPeriodo()).toBe(1)
    expect(v.map((p) => [p.clave, p.rango, p.n, p.ingresos, p.gastos])).toEqual([
      ['2026-11', '28 oct – 27 nov', 3, 2000, 120],
      ['2026-10', '28 sept – 27 oct', 2, 2000, 100],
      ['2026-09', '28 ago – 27 sept', 0, 0, 0],
    ])
    const d1 = vistaPreviaPeriodos(L, 1, 3, hoy)
    expect(d1.map((p) => [p.clave, p.n, p.ingresos])).toEqual([['2026-11', 1, 0], ['2026-10', 3, 2000], ['2026-09', 1, 2000]])
    // Mismo nº de movimientos y mismos totales, solo repartidos de otra forma.
    expect(v.reduce((a, p) => a + p.n, 0)).toBe(d1.reduce((a, p) => a + p.n, 0))
  })
  it('perfiles existentes sin la columna → 1; valores raros → 1', () => {
    expect(diaInicioDePerfil({ nombre: 'x' }, null)).toBe(1)
    expect(diaInicioDePerfil({ dia_inicio_periodo: 28 }, 'u')).toBe(28)
    expect(diaInicioDePerfil({ dia_inicio_periodo: 31 }, 'u')).toBe(1)
    expect(diaInicioDePerfil({ dia_inicio_periodo: null }, 'u')).toBe(1)
  })
})
