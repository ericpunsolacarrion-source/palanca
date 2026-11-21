import { describe, expect, it, vi } from 'vitest'
import salud from './salud.js'
import registro from './registro-error.js'

const res = () => {
  const r = { h: {} }
  r.setHeader = (k, v) => { r.h[k] = v; return r }
  r.status = (c) => { r.c = c; return r }
  r.json = (b) => { r.b = b; return r }
  r.end = () => r
  return r
}

describe('/api/salud', () => {
  it('200 si Auth y la base de datos responden; 503 si no (¿pausado?)', async () => {
    process.env.VITE_SUPABASE_URL = 'https://x.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'clave'
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200 }))
    const a = res()
    await salud({}, a)
    expect(a.c).toBe(200)
    expect(a.b.estado).toBe('todo bien')
    globalThis.fetch = vi.fn(async () => { throw new TypeError('fetch failed') })
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const b = res()
    await salud({}, b)
    expect(b.c).toBe(503)
    expect(b.b.estado).toMatch(/pausado/)
    err.mockRestore()
  })
})

describe('/api/registro-error', () => {
  it('registra solo los campos conocidos, sin emails', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = res()
    await registro({ method: 'POST', body: JSON.stringify({ contexto: 'login', mensaje: 'x pepe@a.com', password: 'secreta' }) }, r)
    expect(r.c).toBe(204)
    const escrito = log.mock.calls[0].join(' ')
    expect(escrito).toContain('[email]')
    expect(escrito).not.toContain('secreta')
    log.mockRestore()
  })
})
