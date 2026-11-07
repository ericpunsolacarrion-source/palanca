import { describe, expect, it } from 'vitest'
import { colocarEtiquetas } from './etiquetasGrafico'

const noSolapan = (l, sep) => l.every((p, i) => i === 0 || l[i - 1].der + sep <= p.izq + 1e-9)

describe('etiquetas sin solapes', () => {
  it('muchas etiquetas juntas: ninguna se pisa y todas quedan dentro', () => {
    for (let semilla = 1; semilla < 40; semilla++) {
      let s = semilla
      const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647)
      const items = Array.from({ length: 14 }, (_, i) => ({ id: i, x: 40 + azar() * 520, ancho: 50 + azar() * 70, prioridad: azar() * 1000 }))
      const r = colocarEtiquetas(items, { min: 30, max: 600 })
      expect(noSolapan(r, 6)).toBe(true)
      expect(r.every((p) => p.izq >= 30 && p.der <= 600)).toBe(true)
      expect(r.length).toBeGreaterThan(2)
    }
  })
  it('la más importante conserva su sitio; las que no caben se omiten', () => {
    const r = colocarEtiquetas([{ id: 'a', x: 100, ancho: 80, prioridad: 1 }, { id: 'b', x: 104, ancho: 80, prioridad: 9 }, { id: 'c', x: 108, ancho: 80, prioridad: 2 }], { min: 0, max: 300, maxDesplazamiento: 90 })
    expect(r.find((p) => p.id === 'b').x).toBe(104)
    expect(noSolapan(r, 6)).toBe(true)
    expect(r.length).toBe(2)
  })
  it('una etiqueta cerca del borde se pega al borde', () => {
    const r = colocarEtiquetas([{ id: 'a', x: 5, ancho: 60, prioridad: 1 }], { min: 0, max: 300 })
    expect(r[0]).toMatchObject({ izq: 0, der: 60 })
  })
})
