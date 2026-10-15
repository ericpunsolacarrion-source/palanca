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

describe('importación conectada (identidad y duplicados)', async () => {
  const { crearDirectorio } = await import('./comercios')
  const { crearCategorizador } = await import('./categorizar')
  const fila = (fecha, nota, importe, tipo = 'gasto') => ({ fecha, nota, importe, tipo, categoria: '', esInversion: false })
  const mov = (fecha, importe, extra = {}) => ({ fecha, tipo: 'gasto', importe, importe_centimos: Math.round(importe * 100), nota: null, fuente: null, categoria: { nombre: 'Comida' }, ...extra })

  it('ALIPAM23: lo que el usuario dijo una vez agrupa con Mercadona y hereda su categoría', () => {
    const dir = crearDirectorio([{ clave: 'alipam', nombre: 'Mercadona', categoria: 'Comida' }])
    const filas = [fila('2026-10-01', 'PAGO TARJETA ALIPAM23', 30), fila('2026-10-03', 'COMPRA TARJ. MERCADONA VALENCIA', 50), fila('2026-10-05', 'PAGO TARJETA ALIPAM88', 20)]
    const grupos = agruparPorComercio(filas, dir)
    expect(grupos).toHaveLength(1)
    expect(grupos[0]).toMatchObject({ nombre: 'Mercadona', n: 3, total: 100, origen: 'memoria' })
    expect(grupos[0].claves.sort()).toEqual(['alipam', 'mercadona valencia'])
    const cat = crearCategorizador([], dir)
    expect(cat({ nota: 'PAGO TARJETA ALIPAM23' })).toMatchObject({ categoria: 'Comida', origen: 'memoria', comercio: 'Mercadona' })
  })

  it('sin memoria, ALIPAM23 con el nombre real de una marca hereda la regla (Mercadona → Comida)', () => {
    const dir = crearDirectorio([{ clave: 'alipam', nombre: 'Mercadona' }])
    expect(crearCategorizador([], dir)({ nota: 'PAGO TARJETA ALIPAM23' }).categoria).toBe('Comida')
  })

  it('el historial también aprende por comercio real (aunque el banco lo escriba distinto)', () => {
    const dir = crearDirectorio([])
    const hist = [mov('2026-09-01', 10, { nota: 'COMPRA TARJ MERCADONA MADRID', categoria: { nombre: 'Supermercado' } })]
    expect(crearCategorizador(hist, dir)({ nota: 'MERCADONA VALENCIA 123' }).categoria).toBe('Supermercado')
  })

  const dir = crearDirectorio([])
  it('fijo confirmado el día 5 y el banco lo carga el 6: ya apuntado', () => {
    const existentes = [mov('2026-10-05', 10.99, { nota: 'Spotify', es_fijo: true })]
    expect([...indicesParecidos([fila('2026-10-06', 'SPOTIFY AB', 10.99)], existentes, dir)]).toEqual([0])
  })
  it('gasto rápido sin comercio y el banco al día siguiente: ya apuntado', () => {
    const existentes = [mov('2026-10-10', 85.4)]
    expect([...indicesParecidos([fila('2026-10-11', 'COMPRA TARJ MERCADONA', 85.4)], existentes, dir)]).toEqual([0])
  })
  it('mismo importe, otro comercio, otro día: NO es el mismo', () => {
    const existentes = [mov('2026-10-10', 12.99, { nota: 'Netflix' })]
    expect([...indicesParecidos([fila('2026-10-12', 'ZARA', 12.99)], existentes, dir)]).toEqual([])
  })
  it('importes pequeños solo cuentan el mismo día (dos cafés no son el mismo)', () => {
    const existentes = [mov('2026-10-10', 1.5)]
    expect([...indicesParecidos([fila('2026-10-11', 'CAFETERIA', 1.5)], existentes, dir)]).toEqual([])
  })
  it('a más de 3 días no se considera duplicado', () => {
    const existentes = [mov('2026-10-01', 40, { nota: 'Repsol' })]
    expect([...indicesParecidos([fila('2026-10-06', 'ESTACION REPSOL', 40)], existentes, dir)]).toEqual([])
  })
  it('un apunte cubre una sola fila; el exacto gana al cercano', () => {
    const existentes = [mov('2026-10-10', 20, { nota: 'Mercadona' })]
    const filas = [fila('2026-10-11', 'MERCADONA', 20), fila('2026-10-10', 'MERCADONA', 20)]
    expect([...indicesParecidos(filas, existentes, dir)]).toEqual([1])
  })
})
