import { expect, it } from 'vitest'
import { nombrePropio } from './nombrePropio'

it('pone mayúsculas a nombres escritos todo en minúsculas o mayúsculas', () => {
  expect(nombrePropio('lucía')).toBe('Lucía')
  expect(nombrePropio('  ÁLVARO   ')).toBe('Álvaro')
  expect(nombrePropio('maría de la fuente')).toBe('María de la Fuente')
  expect(nombrePropio('JOSÉ-LUIS O\'NEILL')).toBe("José-Luis O'Neill")
})
it('respeta lo que ya viene con su forma', () => {
  expect(nombrePropio('McArthur')).toBe('McArthur')
  expect(nombrePropio('de Juan')).toBe('de Juan')
  expect(nombrePropio('')).toBe('')
  expect(nombrePropio(null)).toBe('')
})
