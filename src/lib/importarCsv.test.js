import { describe, expect, it } from 'vitest'
import { detectarMapeo, parseCsv, parseImporte, parseImporteConSigno, procesarCsv } from './importarCsv'

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
