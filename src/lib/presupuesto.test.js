import { describe, expect, it } from 'vitest'
import { categoriasFrenteAMedia } from './presupuesto'

const g = (fecha, cat, importe) => ({ tipo: 'gasto', fecha, importe, importe_centimos: Math.round(importe * 100), categoria: { nombre: cat } })

describe('presupuesto: categorías frente a tu media', () => {
  const hist = [
    g('2026-11-03', 'Comida', 120),
    g('2026-11-04', 'Ocio', 30),
    g('2026-10-05', 'Comida', 200),
    g('2026-09-05', 'Comida', 100),
    g('2026-09-06', 'Ocio', 60),
    g('2026-07-01', 'Comida', 999), // más allá de 3 meses con datos (oct, sep, jul…): jul sí entra (agosto vacío se salta)
  ]
  it('media de los 3 meses previos con gasto, saltando los vacíos', () => {
    const r = categoriasFrenteAMedia(hist, '2026-11')
    const comida = r.find((c) => c.nombre === 'Comida')
    expect(comida.gastado).toBe(120)
    expect(comida.media).toBe(Math.round(((200 + 100 + 999) / 3) * 100) / 100)
    const ocio = r.find((c) => c.nombre === 'Ocio')
    expect(ocio.media).toBe(20)
    expect(ocio.pctMedia).toBe(150)
  })
  it('sin historia: media null', () => {
    const r = categoriasFrenteAMedia([g('2026-11-03', 'Comida', 10)], '2026-11')
    expect(r[0]).toEqual({ nombre: 'Comida', gastado: 10, media: null, pctMedia: null })
  })
  it('no cuenta inversión ni ajustes', () => {
    const r = categoriasFrenteAMedia([g('2026-11-03', 'Inversion', 500), g('2026-11-03', 'Ajuste', 50)], '2026-11')
    expect(r).toEqual([])
  })
})
