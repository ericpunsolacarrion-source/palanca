import { describe, expect, it } from 'vitest'
import { coincideBusqueda } from './busqueda'

const m = { tipo: 'gasto', importe: 13.99, nota: 'COMPRA TARJ. NETFLIX.COM', categoria: { nombre: 'Ocio' }, fuente: null }
describe('buscador del historial', () => {
  it('por comercio, sin mayúsculas ni acentos', () => {
    expect(coincideBusqueda(m, 'netflix')).toBe(true)
    expect(coincideBusqueda({ ...m, nota: 'Cafetería' }, 'cafeteria')).toBe(true)
  })
  it('por categoría e importe con coma', () => {
    expect(coincideBusqueda(m, 'ocio')).toBe(true)
    expect(coincideBusqueda(m, '13,99')).toBe(true)
  })
  it('varias palabras: todas deben estar', () => {
    expect(coincideBusqueda(m, 'netflix ocio')).toBe(true)
    expect(coincideBusqueda(m, 'netflix comida')).toBe(false)
  })
  it('vacío coincide con todo; sin nota no rompe', () => {
    expect(coincideBusqueda(m, '  ')).toBe(true)
    expect(coincideBusqueda({ tipo: 'gasto', importe: null }, 'x')).toBe(false)
  })
})
