import { describe, expect, it } from 'vitest'
import { balanceInicio } from './inicio'

const mov = (tipo, cat, importe, fecha) => ({ tipo, importe, fecha, nota: null, categoria: { nombre: cat } })

// Mayo–septiembre: 2.000 de nómina, 800 de alquiler, 300 de comida y 60 de restaurantes.
// Octubre: mismo sueldo, gasta menos en comida y más en restaurantes.
const movs = []
for (const m of ['05', '06', '07', '08', '09']) {
  movs.push(mov('ingreso', 'Nomina', 2000, `2026-${m}-01`), mov('gasto', 'Vivienda', 800, `2026-${m}-02`), mov('gasto', 'Comida', 300, `2026-${m}-15`), mov('gasto', 'Restaurantes', 60, `2026-${m}-20`))
}
movs.push(mov('ingreso', 'Nomina', 2000, '2026-10-01'), mov('gasto', 'Vivienda', 800, '2026-10-02'), mov('gasto', 'Comida', 200, '2026-10-15'), mov('gasto', 'Restaurantes', 90, '2026-10-20'))

describe('balanceInicio: qué mes cuenta Inicio y contra qué lo compara', () => {
  it('días 1–3: cierra el mes anterior («Octubre, cerrado»)', () => {
    const b = balanceInicio(movs, new Date(2026, 10, 2))
    expect(b).toMatchObject({ clave: '2026-10', cerrado: true })
    expect(b.totales).toMatchObject({ ingresos: 2000, gastos: 1090, ahorro: 910 })
  })
  it('cada cifra contra la media de los meses anteriores con datos', () => {
    const b = balanceInicio(movs, new Date(2026, 10, 2))
    expect(b.medias).toMatchObject({ ingresos: 2000, gastos: 1160, ahorro: 840 })
  })
  it('es su mejor mes si su ratio de ahorro es el más alto de la serie', () => {
    expect(balanceInicio(movs, new Date(2026, 10, 2)).mejorMes).toBe(true)
  })
  it('categorías: destaca lo que MÁS sube, no lo más grande', () => {
    const b = balanceInicio(movs, new Date(2026, 10, 2))
    expect(b.categorias[0]).toMatchObject({ nombre: 'Vivienda', total: 800, difPct: 0 })
    expect(b.categorias.find((c) => c.nombre === 'Restaurantes').difPct).toBe(50)
    expect(b.categorias.find((c) => c.nombre === 'Comida').difPct).toBe(-33)
    expect(b.masSube).toBe('Restaurantes')
  })
  it('del día 4 en adelante cuenta el mes en curso y no compara categorías a medias', () => {
    const b = balanceInicio(movs, new Date(2026, 9, 21))
    expect(b).toMatchObject({ clave: '2026-10', cerrado: false })
    expect(b.categorias.every((c) => c.difPct === null)).toBe(true)
    expect(b.mejorMes).toBe(false)
  })
  it('sin historia: no hay medias ni comparaciones', () => {
    const b = balanceInicio(movs.filter((m) => m.fecha >= '2026-10'), new Date(2026, 10, 2))
    expect(b.medias.ahorro).toBeNull()
    expect(b.masSube).toBeNull()
  })
})
