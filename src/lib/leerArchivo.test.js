import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { ArchivoNoSoportado, decodificarTexto, leerArchivoMovimientos } from './leerArchivo'
import { detectarMapeo, procesarFilas, tablaDesdeFilas } from './importarCsv'

const archivo = (bytes, name) => new File([bytes], name)

describe('lectura de extractos', () => {
  it('Excel .xlsx con líneas de información antes de la tabla', async () => {
    const { filas, formato } = await leerArchivoMovimientos(archivo(readFileSync(new URL('./__fixtures__/extracto.xlsx', import.meta.url)), 'movimientos.xlsx'))
    expect(formato).toBe('Excel')
    const { cabeceras, filas: datos, inicio } = tablaDesdeFilas(filas)
    expect(cabeceras.slice(0, 4)).toEqual(['Fecha', 'Fecha valor', 'Concepto', 'Importe'])
    const { validas, errores } = procesarFilas(datos, detectarMapeo(cabeceras), new Set(), { inicio })
    expect(errores).toEqual([])
    expect(validas.map((v) => [v.fecha, v.tipo, v.importe, v.nota])).toEqual([
      ['2026-03-15', 'gasto', 45.3, 'COMPRA TARJ. MERCADONA VALENCIA'],
      ['2026-03-01', 'ingreso', 1850, 'NOMINA EMPRESA SL'],
      ['2026-02-28', 'gasto', 68.4, 'RECIBO IBERDROLA CLIENTES'],
    ])
  })
  it('CSV en Windows-1252 conserva las tildes', () => {
    const latin1 = new Uint8Array([0x65, 0x6e, 0x65, 0x72, 0x67, 0xed, 0x61]) // "energía"
    expect(decodificarTexto(latin1)).toBe('energía')
    expect(decodificarTexto(new TextEncoder().encode('energía'))).toBe('energía')
  })
  it('Excel antiguo binario y PDF: error claro', async () => {
    await expect(leerArchivoMovimientos(archivo(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0]), 'a.xls'))).rejects.toBeInstanceOf(ArchivoNoSoportado)
    await expect(leerArchivoMovimientos(archivo(new TextEncoder().encode('%PDF-1.7'), 'a.pdf'))).rejects.toBeInstanceOf(ArchivoNoSoportado)
  })
  it('CSV normal', async () => {
    const { filas, formato } = await leerArchivoMovimientos(archivo(new TextEncoder().encode('fecha;importe\n01/02/2026;-3\n'), 'a.csv'))
    expect(formato).toBe('CSV')
    expect(filas).toEqual([['fecha', 'importe'], ['01/02/2026', '-3']])
  })
})
