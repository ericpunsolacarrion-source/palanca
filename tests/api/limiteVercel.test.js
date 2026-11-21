import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'

// Vercel (plan Hobby) admite como mucho 12 funciones: cada .js de api/ que no
// empiece por «_» es una. Si se pasa, el despliegue falla y producción se queda
// en la versión anterior sin avisar. Las pruebas de api/ van en tests/api/.
describe('límite de funciones de Vercel', () => {
  it('api/ tiene 12 funciones o menos y ninguna prueba dentro', () => {
    const funciones = readdirSync('api').filter((f) => f.endsWith('.js') && !f.startsWith('_'))
    expect(funciones.filter((f) => f.includes('.test.'))).toEqual([])
    expect(funciones.length).toBeLessThanOrEqual(12)
  })
})
