import { describe, expect, it } from 'vitest'
import { LOGOS } from './logosMarcas'
import { logoDe } from './marcas'

const lista = LOGOS.map((l) => ({ ...l, rx: new RegExp(l.re) }))
const k = (t) => logoDe(t, lista)?.k ?? null

describe('logos de marcas', () => {
  it('reconoce marcas por nombre y por el texto del banco', () => {
    expect(k('Netflix')).toBe('netflix')
    expect(k('COMPRA TARJ. NETFLIX.COM')).toBe('netflix')
    expect(k('Claude Pro')).toBe('claude')
    expect(k('Anthropic')).toBe('anthropic')
    expect(k('Mercadona')).toBe('mercadona')
    expect(k('McDonald\'s')).toBe('mcdonalds')
    expect(k('Mutua Madrileña')).toBe('mutuamadrilena')
  })
  it('lo específico gana a lo general', () => {
    expect(k('YouTube Music')).toBe('youtubemusic')
    expect(k('Uber Eats')).toBe('ubereats')
    expect(k('Amazon Prime')).toBe('primevideo')
    expect(k('Amazon')).toBe('amazon')
    expect(k('Apple Music')).toBe('applemusic')
  })
  it('no confunde palabras sueltas ni medios de pago', () => {
    expect(k('Bar Paco')).toBeNull()
    expect(k('COMPRA TARJ VISA BAR PACO')).toBeNull()
    expect(k('Pago del día')).toBeNull()
    expect(k('Visa')).toBe('visa')
    expect(k('')).toBeNull()
  })
  it('todas las entradas tienen colores y, si no están pendientes, dibujo', () => {
    for (const l of LOGOS) {
      expect(l.bg).toMatch(/^#/)
      if (!l.pendiente) expect(Boolean(l.d || l.body)).toBe(true)
      expect(() => new RegExp(l.re)).not.toThrow()
    }
  })
})
