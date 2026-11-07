import { describe, expect, it } from 'vitest'
import { categoriasFrenteAMedia, filasPorCategoria } from './presupuesto'

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

describe('filasPorCategoria (límites por categoría)', () => {
  const mv = (fecha, cat, importe, id = `c-${cat}`) => ({ tipo: 'gasto', fecha, importe, importe_centimos: Math.round(importe * 100), categoria: { id, nombre: cat } })
  const h = [
    mv('2026-08-05', 'Comida', 300), mv('2026-09-05', 'Comida', 330), mv('2026-10-05', 'Comida', 348),
    mv('2026-10-12', 'Ocio', 90),
    mv('2026-11-03', 'Comida', 267.4), mv('2026-11-04', 'Transporte', 84.66),
  ]
  it('distingue límite, gastado y media, y calcula lo que queda', () => {
    const f = filasPorCategoria(h, '2026-11', { 'c-Comida': { categoriaId: 'c-Comida', nombre: 'Comida', importe: 300 } })
    const comida = f.find((x) => x.nombre === 'Comida')
    expect(comida).toMatchObject({ limite: 300, gastado: 267.4, media: 326, queda: 32.6, estado: 'cerca' })
    expect(f.find((x) => x.nombre === 'Transporte')).toMatchObject({ limite: null, estado: 'sin-limite', queda: null })
  })
  it('muestra categorías habituales sin gasto este mes (para fijarles límite)', () => {
    const f = filasPorCategoria(h, '2026-11', {})
    expect(f.find((x) => x.nombre === 'Ocio')).toMatchObject({ gastado: 0, media: 30 })
  })
  it('si te pasas, «queda» es negativo y el estado es «pasado»', () => {
    const f = filasPorCategoria(h, '2026-11', { 'c-Transporte': { categoriaId: 'c-Transporte', nombre: 'Transporte', importe: 80 } })
    expect(f.find((x) => x.nombre === 'Transporte')).toMatchObject({ queda: -4.66, estado: 'pasado' })
  })
  it('un límite de una categoría sin movimientos sigue visible; si la renombras se casa por id', () => {
    const f = filasPorCategoria(h, '2026-11', { 'c-Regalos': { categoriaId: 'c-Regalos', nombre: 'Regalos', importe: 50 } })
    expect(f.find((x) => x.nombre === 'Regalos')).toMatchObject({ gastado: 0, limite: 50, queda: 50 })
    const renombrada = filasPorCategoria(h, '2026-11', { 'c-Comida': { categoriaId: 'c-Comida', nombre: 'Súper (antes)', importe: 300 } })
    expect(renombrada.find((x) => x.nombre === 'Comida').limite).toBe(300)
    expect(renombrada.some((x) => x.nombre === 'Súper (antes)')).toBe(false)
  })
  it('no cambia los movimientos ni el cálculo de gasto', () => {
    const copia = JSON.stringify(h)
    filasPorCategoria(h, '2026-11', { 'c-Comida': { categoriaId: 'c-Comida', nombre: 'Comida', importe: 1 } })
    expect(JSON.stringify(h)).toBe(copia)
  })
})
