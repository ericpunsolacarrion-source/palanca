import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabaseClient', () => ({ supabase: {} }))
import { movimientosACsv } from './exportarDatos'
import { detectarMapeo, leerFilasTexto, procesarCsv } from './importarCsv'

describe('movimientosACsv', () => {
  const movs = [
    { fecha: '2026-10-02', tipo: 'gasto', importe: 1234.5, nota: 'Compra; "grande"', categoria: { nombre: 'Comida' }, fuente: null },
    { fecha: '2026-10-01', tipo: 'ingreso', importe: 2000, nota: null, categoria: { nombre: 'Nomina' }, fuente: { nombre: 'BBVA' } },
  ]
  it('formato español y campos escapados', () => {
    const csv = movimientosACsv(movs)
    expect(csv.startsWith('﻿fecha;tipo;categoria;importe;concepto;cuenta\r\n')).toBe(true)
    expect(csv).toContain('2026-10-02;gasto;Comida;-1234,50;"Compra; ""grande""";')
  })
  it('Palanca lo vuelve a importar igual (ida y vuelta)', () => {
    const csv = movimientosACsv(movs)
    const mapeo = detectarMapeo(leerFilasTexto(csv)[0])
    const { validas, errores } = procesarCsv(csv, mapeo, new Set())
    expect(errores).toEqual([])
    expect(validas.map((v) => [v.fecha, v.tipo, v.importe, v.categoria])).toEqual([
      ['2026-10-02', 'gasto', 1234.5, 'Comida'],
      ['2026-10-01', 'ingreso', 2000, 'Nomina'],
    ])
  })
})
