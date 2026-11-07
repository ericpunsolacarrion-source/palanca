import { describe, expect, it } from 'vitest'
import { diaEnPeriodo, diasDelPeriodo, fechaEnPeriodo, normalizarDiaInicio, periodoDe, rangoPeriodo, sumarMeses, textoRangoPeriodo, isoDe } from './periodo'

const todasLasFechas = (desde, hasta) => {
  const L = []
  for (let d = new Date(`${desde}T12:00:00`); isoDe(d) <= hasta; d.setDate(d.getDate() + 1)) L.push(isoDe(d))
  return L
}
const FECHAS = todasLasFechas('2023-12-01', '2028-03-31') // incluye 2024 y 2028 bisiestos

describe('periodoDe · definición formal', () => {
  it('día 1 = mes natural en todas las fechas', () => {
    for (const f of FECHAS) expect(periodoDe(f, 1)).toBe(f.slice(0, 7))
  })
  it('inicio 28: del 28 de octubre al 27 de noviembre es noviembre', () => {
    expect(periodoDe('2026-10-27', 28)).toBe('2026-10')
    expect(periodoDe('2026-10-28', 28)).toBe('2026-11')
    expect(periodoDe('2026-10-31', 28)).toBe('2026-11')
    expect(periodoDe('2026-11-01', 28)).toBe('2026-11')
    expect(periodoDe('2026-11-27', 28)).toBe('2026-11')
    expect(periodoDe('2026-11-28', 28)).toBe('2026-12')
    expect(rangoPeriodo('2026-11', 28)).toEqual({ desde: '2026-10-28', hasta: '2026-11-27' })
    expect(textoRangoPeriodo('2026-11', 28)).toBe('28 oct – 27 nov')
  })
  it('cambio de año: 28 de diciembre ya es enero del año siguiente', () => {
    expect(periodoDe('2026-12-27', 28)).toBe('2026-12')
    expect(periodoDe('2026-12-28', 28)).toBe('2027-01')
    expect(periodoDe('2026-12-31', 28)).toBe('2027-01')
    expect(rangoPeriodo('2027-01', 28)).toEqual({ desde: '2026-12-28', hasta: '2027-01-27' })
    expect(sumarMeses('2026-12', 1)).toBe('2027-01')
    expect(sumarMeses('2027-01', -1)).toBe('2026-12')
  })
  it('meses de 28, 29, 30 y 31 días: el periodo que empieza en ellos dura eso', () => {
    // inicio 28: «marzo 2027» = 28 feb – 27 mar → 28 días (febrero de 28)
    expect(diasDelPeriodo('2027-03', 28)).toBe(28)
    expect(diasDelPeriodo('2028-03', 28)).toBe(29) // 2028 bisiesto
    expect(diasDelPeriodo('2026-12', 28)).toBe(30) // 28 nov – 27 dic
    expect(diasDelPeriodo('2026-11', 28)).toBe(31) // 28 oct – 27 nov
    expect(diasDelPeriodo('2027-02', 1)).toBe(28)
    expect(diasDelPeriodo('2026-10', 1)).toBe(31)
  })
  it('sin huecos ni solapes: cada fecha cae en un único periodo y los rangos son contiguos', () => {
    for (const s of [1, 2, 15, 25, 28]) {
      const porClave = new Map()
      for (const f of FECHAS) {
        const k = periodoDe(f, s)
        if (!porClave.has(k)) porClave.set(k, [])
        porClave.get(k).push(f)
      }
      const claves = [...porClave.keys()]
      for (let i = 0; i < claves.length; i++) {
        const fechas = porClave.get(claves[i])
        if (i > 0 && i < claves.length - 1) {
          // periodo completo: el rango declarado coincide con las fechas reales
          expect(rangoPeriodo(claves[i], s)).toEqual({ desde: fechas[0], hasta: fechas.at(-1) })
          expect(fechas.length).toBe(diasDelPeriodo(claves[i], s))
        }
        if (i > 0) expect(claves[i]).toBe(sumarMeses(claves[i - 1], 1))
        fechas.forEach((f, j) => {
          expect(diaEnPeriodo(f, s) - diaEnPeriodo(fechas[0], s)).toBe(j)
          if (i > 0) expect(fechaEnPeriodo(claves[i], diaEnPeriodo(f, s), s)).toBe(f)
        })
      }
    }
  })
  it('valores fuera de rango se tratan como día 1', () => {
    for (const v of [0, 29, 31, -3, 'x', null, undefined, 2.5]) expect(normalizarDiaInicio(v)).toBe(1)
    expect(periodoDe('2026-10-30', 31)).toBe('2026-10')
  })
})
