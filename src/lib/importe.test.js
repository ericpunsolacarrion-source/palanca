import { describe, expect, it } from 'vitest'
import { aCentimos, aEuros, eurosDe } from './importe'

describe('aCentimos / aEuros (frontera euros ↔ céntimos)', () => {
  it('convierte euros con 2 decimales a céntimos enteros exactos', () => {
    expect(aCentimos(1234.56)).toBe(123456)
    expect(aCentimos('1234.56')).toBe(123456)
    expect(aCentimos(0)).toBe(0)
    expect(aCentimos(0.05)).toBe(5)
    expect(aCentimos(1000000)).toBe(100000000)
  })

  it('siempre devuelve un entero', () => {
    for (const v of [0.1, 0.2, 0.3, 19.99, 22414.83, 0.07]) {
      expect(Number.isInteger(aCentimos(v))).toBe(true)
    }
  })

  it('admite importes negativos (ajustes tipo gasto)', () => {
    expect(aCentimos(-20)).toBe(-2000)
    expect(aCentimos(-0.01)).toBe(-1)
  })

  it('devuelve null para vacío o no numérico', () => {
    expect(aCentimos('')).toBeNull()
    expect(aCentimos(null)).toBeNull()
    expect(aCentimos(undefined)).toBeNull()
    expect(aCentimos('abc')).toBeNull()
  })

  it('ELIMINA la deriva de float que sí tiene la suma directa', () => {
    // La trampa clásica: en float, 0,1 + 0,2 = 0,30000000000000004
    expect(0.1 + 0.2).not.toBe(0.3)
    // En céntimos enteros es exacto:
    expect(aCentimos(0.1) + aCentimos(0.2)).toBe(30)
    expect(aEuros(aCentimos(0.1) + aCentimos(0.2))).toBe(0.3)
  })

  it('aEuros invierte aCentimos para presentar', () => {
    expect(aEuros(123456)).toBe(1234.56)
    expect(aEuros(2241483)).toBe(22414.83)
    expect(aEuros(0)).toBe(0)
    expect(aEuros(null)).toBe(0)
  })

  it('ida y vuelta exacta para cualquier importe de ≤2 decimales', () => {
    for (const euros of [0, 0.01, 0.1, 0.2, 1.99, 300, 1234.56, 19765.9, 22414.83]) {
      expect(aEuros(aCentimos(euros))).toBeCloseTo(euros, 10)
    }
  })
})

describe('eurosDe (lectura prefiriendo céntimos, con respaldo a euros)', () => {
  it('prefiere los céntimos cuando existen', () => {
    expect(eurosDe(123456, 1234.56)).toBe(1234.56)
    expect(eurosDe(500, 9.99)).toBe(5) // gana céntimos aunque el euro difiera
    expect(eurosDe(0, null)).toBe(0) // 0 céntimos es válido
  })

  it('cae al valor en euros si faltan los céntimos (filas antiguas)', () => {
    expect(eurosDe(null, 1234.56)).toBe(1234.56)
    expect(eurosDe(undefined, '300')).toBe(300)
  })

  it('devuelve null cuando no hay ni céntimos ni euros', () => {
    expect(eurosDe(null, null)).toBeNull()
    expect(eurosDe(null, '')).toBeNull()
    expect(eurosDe(undefined, undefined)).toBeNull()
  })
})
