import { describe, expect, it } from 'vitest'
import { detectarMapeo, faltanColumnas, parseCsv, parseFecha, parseImporte, parseImporteConSigno, procesarCsv, procesarFilas } from './importarCsv'

describe('parseImporte (formato español por defecto)', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['1234.56', 1234.56],
    ['1,50', 1.5],
    ['1.234', 1234], // miles español, NO 1,234 €
    ['1.234.567', 1234567],
    ['12.5', 12.5],
    ['1,234,567.89', 1234567.89],
    ['45 €', 45],
    ['-45,30', 45.3],
  ])('%s → %s', (entrada, esperado) => {
    expect(parseImporte(entrada)).toBe(esperado)
  })

  it('rechaza vacío, cero y texto', () => {
    expect(parseImporte('')).toBeNull()
    expect(parseImporte('0')).toBeNull()
    expect(parseImporte('abc')).toBeNull()
  })

  it('conserva el signo en parseImporteConSigno', () => {
    expect(parseImporteConSigno('-45,30')).toBe(-45.3)
    expect(parseImporteConSigno('(10,00)')).toBe(-10)
    expect(parseImporteConSigno('+10')).toBe(10)
  })
})

describe('parseCsv', () => {
  it('detecta el separador ; de Excel en español', () => {
    const { cabeceras, filas } = parseCsv('fecha;tipo;importe\n01/02/2026;gasto;1.234,56\n')
    expect(cabeceras).toEqual(['fecha', 'tipo', 'importe'])
    expect(filas[0]).toEqual(['01/02/2026', 'gasto', '1.234,56'])
  })

  it('quita el BOM de la cabecera', () => {
    expect(parseCsv('﻿fecha,importe\n').cabeceras[0]).toBe('fecha')
  })
})

describe('procesarCsv (extracto bancario con signos)', () => {
  const csv = 'fecha;concepto;importe\n01/02/2026;Nomina;2.000,00\n02/02/2026;Super;-45,30\n'
  it('sin columna tipo: negativo = gasto, positivo = ingreso', () => {
    const mapeo = detectarMapeo(parseCsv(csv).cabeceras)
    const { validas, errores } = procesarCsv(csv, mapeo, new Set())
    expect(errores).toEqual([])
    expect(validas.map((v) => [v.tipo, v.importe])).toEqual([
      ['ingreso', 2000],
      ['gasto', 45.3],
    ])
  })

  it('sin signos, mantiene el comportamiento clásico (todo gasto)', () => {
    const solo = 'fecha;importe\n01/02/2026;10\n'
    const { validas } = procesarCsv(solo, detectarMapeo(['fecha', 'importe']), new Set())
    expect(validas[0].tipo).toBe('gasto')
  })
})

describe('extractos reales de banco', () => {
  it('salta las líneas de información y encuentra la tabla', () => {
    const csv = [
      'Titular;EJEMPLO PEREZ',
      'Cuenta;ES00 0000 0000 0000 0000 0000',
      'Periodo;01/01/2026 - 31/03/2026',
      '',
      'Fecha operación;Fecha valor;Concepto;Importe (EUR);Saldo',
      '15/03/2026;16/03/2026;COMPRA TARJ. MERCADONA;-45,30;1.200,00',
      '01/03/2026;01/03/2026;NOMINA EMPRESA SL;1.850,00;1.245,30',
    ].join('\n')
    const { cabeceras } = parseCsv(csv)
    expect(cabeceras[0]).toBe('Fecha operación')
    const mapeo = detectarMapeo(cabeceras)
    expect(mapeo.fecha).toBe(0)
    expect(mapeo.concepto).toBe(2)
    expect(mapeo.importe).toBe(3)
    const { validas, errores } = procesarCsv(csv, mapeo, new Set())
    expect(errores).toEqual([])
    expect(validas.map((v) => [v.fecha, v.tipo, v.importe])).toEqual([
      ['2026-03-15', 'gasto', 45.3],
      ['2026-03-01', 'ingreso', 1850],
    ])
  })

  it('columnas separadas de cargo y abono (Debe/Haber)', () => {
    const csv = 'Fecha;Descripción;Debe;Haber\n02/02/26;Recibo luz;68,40;\n03/02/26;Transferencia recibida;;300,00\n'
    const mapeo = detectarMapeo(parseCsv(csv).cabeceras)
    expect(mapeo.cargo).toBe(2)
    expect(mapeo.abono).toBe(3)
    expect(faltanColumnas(mapeo)).toEqual([])
    const { validas } = procesarCsv(csv, mapeo, new Set())
    expect(validas.map((v) => [v.fecha, v.tipo, v.importe])).toEqual([
      ['2026-02-02', 'gasto', 68.4],
      ['2026-02-03', 'ingreso', 300],
    ])
  })

  it('fechas en todos los formatos habituales', () => {
    expect(parseFecha('2026/03/15')).toBe('2026-03-15')
    expect(parseFecha('15.03.2026')).toBe('2026-03-15')
    expect(parseFecha('15/03/26')).toBe('2026-03-15')
    expect(parseFecha('15/03/2026 10:23')).toBe('2026-03-15')
    expect(parseFecha('2026-03-15T08:00:00Z')).toBe('2026-03-15')
    expect(parseFecha(new Date(2026, 2, 15))).toBe('2026-03-15')
    expect(parseFecha(46096)).toBe('2026-03-15') // número de serie de Excel
    expect(parseFecha('31/02/2026')).toBeNull()
    expect(parseFecha(12)).toBeNull()
  })

  it('celdas numéricas de Excel no se reinterpretan', () => {
    expect(parseImporteConSigno(1.234)).toBe(1.23)
    expect(parseImporteConSigno(-45.3)).toBe(-45.3)
    const { validas } = procesarFilas([[46096, 'Netflix', -12.99]], { fecha: 0, concepto: 1, importe: 2, tipo: -1, categoria: -1, cargo: -1, abono: -1, plataforma: -1 }, new Set())
    expect(validas[0]).toMatchObject({ fecha: '2026-03-15', nota: 'Netflix', importe: 12.99, tipo: 'gasto' })
  })

  it('sin categoría en el fichero queda vacía (la sugiere el categorizador)', () => {
    const { validas } = procesarCsv('fecha;concepto;importe\n01/02/2026;Mercadona;-20\n', { fecha: 0, concepto: 1, importe: 2, tipo: -1, categoria: -1, cargo: -1, abono: -1, plataforma: -1 }, new Set())
    expect(validas[0].categoria).toBe('')
  })
})
