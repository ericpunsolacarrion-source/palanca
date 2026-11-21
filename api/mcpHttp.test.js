import { describe, expect, it, vi, beforeEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const usuario = { id: 'u1' }
let conSesion = false
vi.mock('./_auth.js', () => ({
  usuarioDeLaPeticion: async () => (conSesion ? usuario : null),
  clienteDelUsuario: () => ({ from: () => ({}) }),
}))
const { default: mcp } = await import('./mcp.js')
const { default: recurso } = await import('./oauth-recurso.js')

function resFalsa() {
  const r = { cabeceras: {}, codigo: null, cuerpo: undefined }
  r.setHeader = (k, v) => { r.cabeceras[k.toLowerCase()] = v; return r }
  r.status = (c) => { r.codigo = c; return r }
  r.json = (b) => { r.cuerpo = b; return r }
  r.send = (b) => { r.cuerpo = JSON.parse(b); return r }
  r.end = () => r
  return r
}
const req = (extra = {}) => ({ method: 'POST', headers: { host: 'palanca-zeta.vercel.app', 'x-forwarded-proto': 'https' }, body: { jsonrpc: '2.0', id: 1, method: 'ping' }, ...extra })

beforeEach(() => { conSesion = false })

describe('/api/mcp', () => {
  it('sin sesión: 401 con el enlace a los metadatos para iniciar sesión', async () => {
    const r = resFalsa()
    await mcp(req(), r)
    expect(r.codigo).toBe(401)
    expect(r.cabeceras['www-authenticate']).toBe('Bearer resource_metadata="https://palanca-zeta.vercel.app/.well-known/oauth-protected-resource"')
  })

  it('con sesión: responde JSON-RPC; notificaciones = 202; GET = 405; OPTIONS = 204', async () => {
    conSesion = true
    const r = resFalsa()
    await mcp(req(), r)
    expect(r.codigo).toBe(200)
    expect(r.cuerpo).toEqual({ jsonrpc: '2.0', id: 1, result: {} })
    const n = resFalsa()
    await mcp(req({ body: { jsonrpc: '2.0', method: 'notifications/initialized' } }), n)
    expect(n.codigo).toBe(202)
    const g = resFalsa()
    await mcp(req({ method: 'GET' }), g)
    expect(g.codigo).toBe(405)
    const o = resFalsa()
    await mcp(req({ method: 'OPTIONS' }), o)
    expect(o.codigo).toBe(204)
  })

  it('lotes y JSON roto', async () => {
    conSesion = true
    const l = resFalsa()
    await mcp(req({ body: [{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', id: 2, method: 'ping' }] }), l)
    expect(l.cuerpo).toHaveLength(2)
    const j = resFalsa()
    await mcp(req({ body: '{roto' }), j)
    expect(j.codigo).toBe(400)
  })
})

describe('/.well-known/oauth-protected-resource', () => {
  it('apunta al servidor de autorización de Supabase', () => {
    process.env.VITE_SUPABASE_URL = 'https://ejemplo.supabase.co'
    const r = resFalsa()
    recurso(req({ method: 'GET' }), r)
    expect(r.cuerpo).toMatchObject({ resource: 'https://palanca-zeta.vercel.app/api/mcp', authorization_servers: ['https://ejemplo.supabase.co/auth/v1'] })
  })
})

describe('motor empaquetado para el servidor', () => {
  it('api/_motor.js está al día (npm run motor:api)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'motor-'))
    const salida = path.join(dir, 'motor.js')
    execFileSync(path.resolve('node_modules/.bin/esbuild'), ['src/servidor/motorServidor.js', '--bundle', '--platform=node', '--format=esm', `--outfile=${salida}`, '--log-level=warning', '--banner:js=// GENERADO con npm run motor:api desde src/servidor/motorServidor.js. No editar a mano.'])
    expect(readFileSync('api/_motor.js', 'utf8')).toBe(readFileSync(salida, 'utf8'))
  })
})
