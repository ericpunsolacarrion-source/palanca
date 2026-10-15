import { describe, expect, it } from 'vitest'
import { cambioPatrimonioMes, conceptoDe, evolucionPatrimonio, fechaRelativa, resumenDelMes } from './inicio'

const mov = (tipo, cat, importe, fecha, nota = null) => ({ tipo, importe, fecha, nota, categoria: { nombre: cat } })
const HOY = new Date(2026, 9, 14) // 14/10/2026

// Tres meses idénticos: nómina día 1, alquiler día 2, súper día 20.
const base = []
for (const m of ['07', '08', '09']) {
  base.push(mov('ingreso', 'Nomina', 2000, `2026-${m}-01`))
  base.push(mov('gasto', 'Vivienda', 800, `2026-${m}-02`))
  base.push(mov('gasto', 'Comida', 300, `2026-${m}-20`))
}

describe('resumenDelMes', () => {
  it('totales del mes hasta hoy, sin movimientos futuros', () => {
    const movs = [...base, mov('ingreso', 'Nomina', 2000, '2026-10-01'), mov('gasto', 'Vivienda', 800, '2026-10-02'), mov('gasto', 'Comida', 50, '2026-10-30')]
    const r = resumenDelMes(movs, HOY)
    expect(r.totales.ingresos).toBe(2000)
    expect(r.totales.gastos).toBe(800)
    expect(r.diasRestantes).toBe(18)
  })
  it('ritmo: compara con lo gastado HASTA EL MISMO DÍA (el alquiler de principio de mes no dispara la alarma)', () => {
    const movs = [...base, mov('gasto', 'Vivienda', 800, '2026-10-02')]
    const r = resumenDelMes(movs, HOY)
    expect(r.ritmo.habitual).toBe(800)
    expect(Math.round(r.ritmo.difPct)).toBe(0)
  })
  it('ritmo: gastar más que de costumbre a estas alturas se detecta', () => {
    const movs = [...base, mov('gasto', 'Vivienda', 800, '2026-10-02'), mov('gasto', 'Ocio', 400, '2026-10-10')]
    expect(Math.round(resumenDelMes(movs, HOY).ritmo.difPct)).toBe(50)
  })
  it('sin meses previos no hay ritmo; categorías top 3 + resto', () => {
    const movs = ['A', 'B', 'C', 'D', 'E'].map((c, i) => mov('gasto', c, 10 * (5 - i), '2026-10-05'))
    const r = resumenDelMes(movs, HOY)
    expect(r.ritmo).toBeNull()
    expect(r.categorias.map((c) => c.nombre)).toEqual(['A', 'B', 'C', 'Resto'])
    expect(r.categorias[3].total).toBe(30)
  })
  it('la inversión no es gasto ni categoría de consumo', () => {
    const r = resumenDelMes([mov('gasto', 'Inversion', 200, '2026-10-05')], HOY)
    expect(r.totales.gastos).toBe(0)
    expect(r.totales.invertido).toBe(200)
    expect(r.categorias).toEqual([])
  })
})

describe('patrimonio en el inicio', () => {
  it('evolución a cierre de mes y cambio del mes en curso', () => {
    const movs = [...base, mov('ingreso', 'Nomina', 2000, '2026-10-01'), mov('gasto', 'Vivienda', 800, '2026-10-02')]
    const serie = evolucionPatrimonio(movs, 4, HOY)
    expect(serie.map((p) => p.mes)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10'])
    expect(serie.map((p) => p.valor)).toEqual([900, 1800, 2700, 3900])
    expect(cambioPatrimonioMes(movs, HOY)).toBe(1200)
  })
  it('un movimiento con fecha futura no cuenta todavía', () => {
    expect(cambioPatrimonioMes([mov('ingreso', 'Nomina', 100, '2026-10-30')], HOY)).toBe(0)
  })
})

describe('textos de listas', () => {
  it('fecha relativa', () => {
    expect(fechaRelativa('2026-10-14', HOY)).toBe('Hoy')
    expect(fechaRelativa('2026-10-13', HOY)).toBe('Ayer')
    expect(fechaRelativa('2026-10-02', HOY)).toBe('2 oct')
    expect(fechaRelativa('2025-12-31', HOY)).toMatch(/31 dic.*2025/)
  })
  it('concepto: comercio legible, nota o categoría', () => {
    expect(conceptoDe(mov('gasto', 'Comida', 1, '2026-10-01', 'MERCADONA'))).toBe('Mercadona')
    expect(conceptoDe(mov('gasto', 'Ocio', 1, '2026-10-01', 'COMPRA TARJ. NETFLIX.COM'))).toBe('Netflix') // el comercio real, no el texto del banco
    expect(conceptoDe(mov('gasto', 'Ocio', 1, '2026-10-01', 'Cena con Ana'))).toBe('Cena con Ana')
    expect(conceptoDe(mov('gasto', 'Ocio', 1, '2026-10-01'))).toBe('Ocio')
    expect(conceptoDe({ tipo: 'ingreso', importe: 1, fecha: '2026-10-01', categoria: { nombre: 'Ajuste' } })).toBe('Ajuste de saldo')
  })
})

describe('cambio del mes sin ajustes', () => {
  it('el saldo inicial no cuenta como "+X este mes"', () => {
    const movs = [{ tipo: 'ingreso', importe: 1200, fecha: '2026-10-01', categoria: { nombre: 'Ajuste' } }]
    expect(cambioPatrimonioMes(movs, HOY)).toBe(0)
  })
  it('sí cuenta lo ahorrado este mes', () => {
    const movs = [
      { tipo: 'ingreso', importe: 1200, fecha: '2026-09-01', categoria: { nombre: 'Ajuste' } },
      { tipo: 'ingreso', importe: 2000, fecha: '2026-10-01', categoria: { nombre: 'Nomina' } },
      { tipo: 'gasto', importe: 300, fecha: '2026-10-05', categoria: { nombre: 'Comida' } },
    ]
    expect(cambioPatrimonioMes(movs, HOY)).toBe(1700)
  })
})

describe('ingreso que llega a final de mes', () => {
  const pension = (mes) => ({ tipo: 'ingreso', importe: 1300, fecha: `2026-${mes}-25`, categoria: { nombre: 'Pensión' } })
  const gasto = (fecha, importe) => ({ tipo: 'gasto', importe, fecha, categoria: { nombre: 'Comida' } })
  it('el día 14, sin la pensión del 25: ingreso pendiente (no "en negativo")', () => {
    const movs = [pension('07'), pension('08'), pension('09'), gasto('2026-10-05', 200)]
    const r = resumenDelMes(movs, HOY)
    expect(r.diaIngresoHabitual).toBe(25)
    expect(r.ingresoPendiente).toBe(true)
  })
  it('si cobra el día 1 y no ha llegado nada, no se inventa que está pendiente', () => {
    const nomina = (mes) => ({ tipo: 'ingreso', importe: 1300, fecha: `2026-${mes}-01`, categoria: { nombre: 'Nomina' } })
    const r = resumenDelMes([nomina('08'), nomina('09'), gasto('2026-10-05', 200)], HOY)
    expect(r.ingresoPendiente).toBe(false)
  })
  it('sin historial de ingresos no hay día habitual', () => {
    expect(resumenDelMes([gasto('2026-10-05', 20)], HOY).diaIngresoHabitual).toBeNull()
  })
})
