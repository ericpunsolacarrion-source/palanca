import { describe, expect, it } from 'vitest'
import { detectarMapeo, procesarFilas, tablaDesdeFilas } from './importarCsv'
import { esPlantilla, tipoDePlantilla, traducirTipoPlantilla, TIPOS_PLANTILLA, COLUMNAS_PLANTILLA } from './plantillaPalanca'
import { unirHojas } from './leerArchivo'
import { bolsas, totalesDe } from './movimientosUtils'
import { comoMovimiento } from './revisionImportacion'

const CAB = COLUMNAS_PLANTILLA
const plantilla = (filas) => {
  const t = tablaDesdeFilas([CAB, ...filas])
  return procesarFilas(t.filas, detectarMapeo(t.cabeceras), new Set(), { inicio: t.inicio })
}

describe('tipos de la plantilla', () => {
  it('reconoce todos los tipos, con o sin tildes y mayúsculas', () => {
    for (const t of TIPOS_PLANTILLA) expect(tipoDePlantilla(t)?.nombre).toBe(t)
    expect(tipoDePlantilla('APORTACION AL BROKER')?.nombre).toBe('Aportación al bróker')
    expect(tipoDePlantilla('compra inversion')?.nombre).toBe('Compra inversión')
    expect(tipoDePlantilla('cualquier cosa')).toBeNull()
  })

  it('traduce cada tipo a las reglas del motor', () => {
    expect(traducirTipoPlantilla('Gasto', 10, 'Comida')).toEqual({ tipo: 'gasto', categoria: 'Comida', esInversion: false })
    expect(traducirTipoPlantilla('Compra inversión', 10, '')).toEqual({ tipo: 'gasto', categoria: 'Inversion', esInversion: true })
    expect(traducirTipoPlantilla('Venta inversión', 10, '')).toEqual({ tipo: 'ingreso', categoria: 'Inversion', esInversion: true })
    expect(traducirTipoPlantilla('Aportación al bróker', 10, '')).toMatchObject({ tipo: 'gasto', categoria: 'Ahorro' })
    expect(traducirTipoPlantilla('Retirada del bróker', 10, '')).toMatchObject({ tipo: 'ingreso', categoria: 'Desde ahorro' })
    expect(traducirTipoPlantilla('Devolución', 10, 'Compras')).toMatchObject({ tipo: 'ingreso', categoria: 'Devoluciones' })
    expect(traducirTipoPlantilla('Dividendo', 10, '')).toMatchObject({ tipo: 'ingreso', categoria: 'Dividendos' })
  })

  it('importes negativos: gasto negativo = devolución; ingreso negativo = gasto', () => {
    expect(traducirTipoPlantilla('Gasto', -10, 'Compras')).toMatchObject({ tipo: 'ingreso', categoria: 'Devoluciones' })
    expect(traducirTipoPlantilla('Ingreso', -342, 'Nómina')).toMatchObject({ tipo: 'gasto', categoria: 'Nómina' })
  })
})

describe('detección de la plantilla', () => {
  it('por la columna Activo o por un tipo exclusivo', () => {
    const m = detectarMapeo(CAB)
    expect(m.activo).toBe(6)
    expect(esPlantilla(m, [])).toBe(true)
    const sinActivo = detectarMapeo(['Fecha', 'Tipo', 'Concepto', 'Importe'])
    expect(esPlantilla(sinActivo, [['01/01/2026', 'Gasto', 'x', '1']])).toBe(false)
    expect(esPlantilla(sinActivo, [['01/01/2026', 'Dividendo', 'x', '1']])).toBe(true)
  })

  it('el CSV de «Descargar mis datos» (gastos en negativo) NO es plantilla: no cambia', () => {
    const t = tablaDesdeFilas([
      ['fecha', 'tipo', 'categoria', 'importe', 'concepto', 'cuenta'],
      ['2026-01-02', 'gasto', 'Comida', '-12,50', 'Mercadona', ''],
    ])
    const r = procesarFilas(t.filas, detectarMapeo(t.cabeceras), new Set())
    expect(r.plantilla).toBe(false)
    expect(r.validas[0]).toMatchObject({ tipo: 'gasto', importe: 12.5, categoria: 'Comida' })
  })
})

describe('importar una plantilla', () => {
  const filas = [
    ['28/10/2026', 'Ingreso', 'Nómina octubre', 'Nómina', '1.450,00', '', ''],
    ['29/10/2026', 'Gasto', 'Mercadona', 'Comida', '42,35', '', ''],
    ['30/10/2026', 'Devolución', 'Devolución Zara', 'Compras', '19,95', '', ''],
    ['30/10/2026', 'Aportación al bróker', 'Transferencia a Trade Republic', '', '500,00', 'Trade Republic', ''],
    ['31/10/2026', 'Compra inversión', 'Compra', '', '251,00', 'Trade Republic', 'NVIDIA'],
    ['01/11/2026', 'Interés', 'Intereses', '', '3,12', 'Trade Republic', ''],
    ['05/11/2026', 'Venta inversión', 'Venta ETF', '', '120,40', 'Trade Republic', 'ETF'],
    ['', 'Gasto', 'Sin fecha', 'Otros', '5', '', ''],
    ['01/01/2099', 'Gasto', 'Futuro', 'Otros', '5', '', ''],
    ['02/11/2026', 'Regalo', 'Tipo raro', '', '5', '', ''],
  ]
  const r = plantilla(filas)

  it('marca el archivo como plantilla y salta las filas sin fecha, futuras o con tipo desconocido', () => {
    expect(r.plantilla).toBe(true)
    expect(r.validas).toHaveLength(7)
    expect(r.errores.map((e) => e.motivo)).toEqual(['fecha inválida', 'fecha futura (aún no ha ocurrido)', 'tipo desconocido ("Regalo")'])
  })

  it('añade el activo al concepto y guarda la plataforma', () => {
    const compra = r.validas.find((v) => v.esInversion && v.tipo === 'gasto')
    expect(compra).toMatchObject({ nota: 'Compra · NVIDIA', plataforma: 'Trade Republic', categoria: 'Inversion', importe: 251 })
  })

  it('con las reglas de Palanca: invertido = compras − ventas; la aportación es neutra; interés = ingreso; devolución resta gasto', () => {
    const movs = r.validas.map(comoMovimiento)
    const t = totalesDe(movs)
    expect(t.gastos).toBeCloseTo(42.35 - 19.95, 2)
    expect(t.ingresos).toBeCloseTo(1450 + 3.12, 2)
    const b = bolsas(movs)
    expect(b.bolsaInversion).toBeCloseTo(251 - 120.4, 2)
    // Disponible = todo lo que entra − lo que sale − lo comprado + lo vendido (la aportación no cambia nada).
    expect(b.bolsaLiquidez).toBeCloseTo(1450 - 42.35 + 19.95 - 251 + 3.12 + 120.4, 2)
    expect(b.patrimonio).toBeCloseTo(b.bolsaLiquidez + b.bolsaInversion, 2)
  })

  it('volver a subirla no duplica (misma fecha, importe y concepto)', () => {
    const ya = new Set(r.validas.map((v) => `${v.fecha}|${v.tipo}|${v.importe.toFixed(2)}|${v.nota.toLowerCase()}`))
    const t = tablaDesdeFilas([CAB, ...filas])
    const otra = procesarFilas(t.filas, detectarMapeo(t.cabeceras), ya)
    expect(otra.validas).toHaveLength(0)
    expect(otra.duplicados).toHaveLength(7)
  })
})

describe('Excel con varias pestañas', () => {
  it('junta las pestañas con las mismas columnas e ignora las de ayuda', () => {
    const ayuda = [['PLANTILLA'], ['texto'], [CAB.map((c) => `Ejemplo · ${c}`)].flat(), ['01/01/2026', 'Gasto', 'x', 'Otros', '1', '', '']]
    const a2025 = [CAB, ['01/01/2025', 'Gasto', 'A', 'Otros', '1', '', '']]
    const a2026 = [CAB, ['01/01/2026', 'Gasto', 'B', 'Otros', '2', '', ''], ['02/01/2026', 'Gasto', 'C', 'Otros', '3', '', '']]
    const { filas, nHojas } = unirHojas([a2025, ayuda, a2026])
    expect(nHojas).toBe(2)
    expect(filas).toHaveLength(4)
    expect(filas[0]).toEqual(CAB)
  })

  it('una plantilla vacía no importa los ejemplos', () => {
    const ayuda = [['PLANTILLA'], CAB.map((c) => `Ejemplo · ${c}`), ['01/01/2026', 'Gasto', 'x', 'Otros', '1', '', '']]
    const { filas } = unirHojas([[CAB], ayuda])
    expect(tablaDesdeFilas(filas).filas).toHaveLength(0)
  })
})

describe('tipos escritos de otra forma (por una persona o por la IA)', () => {
  it('«Compra de acciones», «Inversiones», «Intereses», «Aportación broker»…', () => {
    expect(tipoDePlantilla('Compra de acciones')?.nombre).toBe('Compra inversión')
    expect(tipoDePlantilla('Compras')?.nombre).toBe('Compra inversión')
    expect(tipoDePlantilla('Inversiones')?.nombre).toBe('Compra inversión')
    expect(tipoDePlantilla('Intereses')?.nombre).toBe('Interés')
    expect(tipoDePlantilla('Interés')?.nombre).toBe('Interés')
    expect(tipoDePlantilla('Dividendos')?.nombre).toBe('Dividendo')
    expect(tipoDePlantilla('Aportación broker')?.nombre).toBe('Aportación al bróker')
    expect(tipoDePlantilla('Venta de acciones')?.nombre).toBe('Venta inversión')
    expect(tipoDePlantilla('Gastos')?.nombre).toBe('Gasto')
  })

  it('sin columna Activo y con «Compra» + Plataforma, sigue siendo plantilla: las compras son inversión', () => {
    const t = tablaDesdeFilas([
      ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Importe', 'Plataforma'],
      ['01/10/2026', 'Gasto', 'Mercadona', 'Comida', '30', ''],
      ['02/10/2026', 'Compra', 'NVIDIA', '', '200', 'Trade Republic'],
    ])
    const r = procesarFilas(t.filas, detectarMapeo(t.cabeceras), new Set())
    expect(r.plantilla).toBe(true)
    expect(r.validas[1]).toMatchObject({ esInversion: true, categoria: 'Inversion', tipo: 'gasto' })
  })

  it('Gasto con categoría «Inversión» = compra de inversión', () => {
    const r = plantilla([['02/10/2026', 'Gasto', 'ETF', 'Inversión', '150', 'Trade Republic', '']])
    expect(r.validas[0]).toMatchObject({ esInversion: true, categoria: 'Inversion', tipo: 'gasto' })
  })

  it('un extracto del banco con tipo «Compra» (tarjeta) NO se toma por plantilla', () => {
    const t = tablaDesdeFilas([
      ['Fecha', 'Tipo', 'Concepto', 'Importe'],
      ['01/10/2026', 'Compra', 'MERCADONA', '-30,00'],
      ['02/10/2026', 'Ingreso', 'NOMINA', '1.200,00'],
    ])
    const r = procesarFilas(t.filas, detectarMapeo(t.cabeceras), new Set())
    expect(r.plantilla).toBe(false)
    expect(r.validas.some((v) => v.esInversion)).toBe(false)
  })

  it('extracto sin tipo: categoría «Inversión» con tilde queda como Inversion', () => {
    const t = tablaDesdeFilas([
      ['Fecha', 'Concepto', 'Categoría', 'Importe'],
      ['01/10/2026', 'TRADE REPUBLIC', 'Inversión', '-100'],
    ])
    const r = procesarFilas(t.filas, detectarMapeo(t.cabeceras), new Set())
    expect(r.validas[0]).toMatchObject({ categoria: 'Inversion' })
  })
})
