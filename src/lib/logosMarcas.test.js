import { describe, expect, it } from 'vitest'
import { INDICE } from './logos/indice'
import { logoDe } from './marcas'

const lista = INDICE.map(([k, n, re, bg, fg, e, g, mono, img]) => ({ k, n, re, bg, fg, e, g, mono, img: img === 1, pendiente: !g && img !== 1, rx: new RegExp(re) }))
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
  it('más de 3.000 marcas con logo, y las pasarelas de pago no tapan al comercio', () => {
    expect(lista.filter((l) => !l.pendiente).length).toBeGreaterThan(3000)
    expect(k('SUMUP *BAR PACO')).toBeNull()
    expect(k('Bar Delta')).toBeNull()
    expect(k('WhatsApp')).toBe('whatsapp')
    expect(k('CAIXABANK TRANSF')).toBe('caixabank')
    expect(k('Pago AEAT modelo 130')).toBe('aeat')
    expect(k('TRADE REPUBLIC BANK')).toBe('traderepublic')
    expect(lista.find((l) => l.k === 'netflix').img).toBe(true)
    expect(k('Netflix')).toBe('netflix')
    for (const l of lista) expect(l.bg).toMatch(/^#/)
  })
})
