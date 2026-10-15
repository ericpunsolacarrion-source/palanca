import { describe, expect, it } from 'vitest'
import { agruparPorComercio, categorizarFilas, filasDeCapturas, indicesParecidos, resumenHistorial } from './revisionImportacion'
import { crearCategorizador } from './categorizar'

const fila = (fecha, nota, importe, tipo = 'gasto', categoria = '') => ({ fecha, nota, importe, tipo, categoria, plataforma: '', esInversion: false })

describe('revisión de una importación', () => {
  it('capturas → filas canónicas con el signo como tipo', () => {
    expect(filasDeCapturas([{ fecha: '2026-10-01', concepto: 'Nómina', importe: 1850 }, { fecha: '2026-10-02', concepto: 'Lidl', importe: -20.5 }])).toEqual([
      fila('2026-10-01', 'Nómina', 1850, 'ingreso'),
      fila('2026-10-02', 'Lidl', 20.5, 'gasto'),
    ])
  })
  it('categoriza lo que no trae categoría y respeta la del archivo', () => {
    const r = categorizarFilas([fila('2026-10-01', 'MERCADONA', 30), fila('2026-10-01', 'MERCADONA', 30, 'gasto', 'Casa'), fila('2026-10-02', 'MYINVESTOR', 100)], crearCategorizador([]))
    expect(r.map((f) => [f.categoria, f.sugerida, f.esInversion])).toEqual([
      ['Comida', true, false],
      ['Casa', false, false],
      ['Inversion', true, true],
    ])
  })
  it('agrupa por comercio aunque el texto varíe', () => {
    const filas = categorizarFilas(
      [fila('2026-10-01', 'COMPRA TARJ MERCADONA', 30), fila('2026-10-05', 'COMPRA TARJ MERCADONA', 20), fila('2026-10-03', 'REPSOL 1234', 50), fila('2026-10-01', 'NOMINA', 1800, 'ingreso')],
      crearCategorizador([]),
    )
    const g = agruparPorComercio(filas)
    expect(g[0]).toMatchObject({ nombre: 'Mercadona', n: 2, total: 50, categoria: 'Comida', indices: [0, 1] })
    expect(g.map((x) => x.tipo)).toContain('ingreso')
  })
  it('detecta lo que ya tenías apuntado a mano (mismo día e importe), contando unidades', () => {
    const existentes = [{ fecha: '2026-10-01', tipo: 'gasto', importe: 1.5, nota: 'café' }]
    const filas = [fila('2026-10-01', 'CAFETERIA', 1.5), fila('2026-10-01', 'CAFETERIA', 1.5), fila('2026-10-02', 'CAFETERIA', 1.5)]
    expect([...indicesParecidos(filas, existentes)]).toEqual([0])
  })
  it('resumen del historial: periodo, medias y en qué se va', () => {
    const filas = categorizarFilas(
      [fila('2025-11-01', 'NOMINA', 2000, 'ingreso'), fila('2025-11-03', 'MERCADONA', 300), fila('2025-12-01', 'NOMINA', 2000, 'ingreso'), fila('2025-12-03', 'MERCADONA', 300), fila('2025-12-05', 'MYINVESTOR', 400), fila('2025-12-06', 'RENFE', 100)],
      crearCategorizador([]),
    )
    const r = resumenHistorial(filas)
    expect(r).toMatchObject({ desde: '2025-11-01', hasta: '2025-12-06', meses: 2, n: 6, ingresoMedio: 2000, gastoMedio: 350, tasaAhorro: 83 })
    expect(r.topCategorias[0]).toEqual({ nombre: 'Comida', mensual: 300, pct: 86 })
  })
  it('sin filas no hay resumen', () => {
    expect(resumenHistorial([])).toBeNull()
  })
})
