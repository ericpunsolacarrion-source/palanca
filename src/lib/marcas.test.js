import { describe, expect, it } from 'vitest'
import { identidadVisual } from './marcas'

describe('identidad visual de comercios', () => {
  it('reconoce marcas aunque venga el texto del banco', () => {
    const n = identidadVisual('COMPRA TARJ. NETFLIX.COM')
    expect(n.marca).toBe('Netflix')
    expect(n.monograma).toBe('N')
    expect(identidadVisual('Mercadona').fondo).toBe('#00843D')
  })
  it('sin marca: tono estable por nombre y su inicial', () => {
    const a = identidadVisual('Bar Paco')
    expect(a.marca).toBeNull()
    expect(a.monograma).toBe('B')
    expect(identidadVisual('bar paco')).toEqual(a)
  })
  it('no rompe con vacío o símbolos', () => {
    expect(identidadVisual('').monograma).toBe('?')
    expect(identidadVisual(null).monograma).toBe('?')
    expect(identidadVisual('  ¿¡ ').monograma).toBe('?')
  })
})
