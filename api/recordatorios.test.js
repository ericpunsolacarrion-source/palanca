import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const insertados = []
let candidatos = []
let actualizado = null
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: async () => ({ data: candidatos, error: null }),
    from: () => ({
      insert: async (f) => {
        insertados.push(f)
        return { error: null }
      },
      update: (campos) => ({
        eq: async (col, val) => {
          actualizado = { campos, col, val }
          return { error: null }
        },
      }),
    }),
  }),
}))

import handler from './recordatorios.js'
import baja from './baja.js'
import { enlaceBaja, firmaValida, firmar } from './_firma.js'

const ENV = {
  RECORDATORIOS_ACTIVOS: 'true',
  CRON_SECRET: 'cron',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'srv',
  RESEND_API_KEY: 're_x',
  RECORDATORIOS_REMITENTE: 'Palanca <hola@palanca.app>',
  RECORDATORIOS_SECRETO: 'secreto',
  APP_URL: 'https://palanca.app/',
}
const respuesta = () => {
  const r = { code: 0, body: null, headers: {} }
  r.status = (c) => ((r.code = c), r)
  r.json = (b) => ((r.body = b), r)
  r.send = (b) => ((r.body = b), r)
  r.setHeader = (k, v) => (r.headers[k] = v)
  return r
}
const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
const haceDias = (n) => new Date(Date.parse(`${hoy}T12:00:00Z`) - n * 864e5).toISOString().slice(0, 10)

beforeEach(() => {
  Object.assign(process.env, ENV)
  insertados.length = 0
  candidatos = [
    { uid: 'u1', email: 'ana@x.com', nombre: 'Ana', alta: haceDias(60), ultima: haceDias(4), dias30: 9, movs: 30, plan: 'gratis', envios: {} },
    { uid: 'u2', email: 'luis@x.com', nombre: null, alta: haceDias(60), ultima: haceDias(1), dias30: 20, movs: 80, plan: 'gratis', envios: {} },
  ]
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'em_1' }) }))
})
afterEach(() => {
  for (const k of Object.keys(ENV)) delete process.env[k]
  delete process.env.RECORDATORIOS_SOLO_A
})

describe('api/recordatorios', () => {
  it('sin el secreto del cron: 401 y nada enviado', async () => {
    const r = respuesta()
    await handler({ headers: {}, query: {} }, r)
    expect(r.code).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('apagado si RECORDATORIOS_ACTIVOS no es true', async () => {
    process.env.RECORDATORIOS_ACTIVOS = 'false'
    const r = respuesta()
    await handler({ headers: { authorization: 'Bearer cron' }, query: {} }, r)
    expect(r.body.activo).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('dice qué variable falta', async () => {
    delete process.env.RESEND_API_KEY
    const r = respuesta()
    await handler({ headers: { authorization: 'Bearer cron' }, query: {} }, r)
    expect(r.body.faltan).toEqual(['resend'])
  })
  it('simular: dice a quién y qué, sin enviar', async () => {
    const r = respuesta()
    await handler({ headers: { authorization: 'Bearer cron' }, query: { simular: '1' } }, r)
    expect(r.body.detalle).toEqual([{ email: 'ana@x.com', tipo: 'inactivo', asunto: 'Ana, dos minutos para ponerte al día' }])
    expect(fetch).not.toHaveBeenCalled()
    expect(insertados).toEqual([])
  })
  it('envía a quien toca, con baja en un clic, y lo registra', async () => {
    const r = respuesta()
    await handler({ headers: { authorization: 'Bearer cron' }, query: {} }, r)
    expect(r.body.enviados).toBe(1)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    const cuerpo = JSON.parse(opts.body)
    expect(cuerpo.to).toEqual(['ana@x.com'])
    expect(cuerpo.headers['List-Unsubscribe']).toBe(`<${enlaceBaja('https://palanca.app', 'u1', 'secreto')}>`)
    expect(cuerpo.html).toContain('https://palanca.app?desde=email_inactivo')
    expect(insertados).toEqual([{ usuario_id: 'u1', tipo: 'inactivo', proveedor_id: 'em_1' }])
  })
  it('modo prueba: solo a RECORDATORIOS_SOLO_A', async () => {
    process.env.RECORDATORIOS_SOLO_A = 'otra@x.com'
    const r = respuesta()
    await handler({ headers: { authorization: 'Bearer cron' }, query: {} }, r)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('si Resend falla no se registra como enviado', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 422, json: async () => ({ message: 'dominio no verificado' }) }))
    const r = respuesta()
    await handler({ headers: { authorization: 'Bearer cron' }, query: {} }, r)
    expect(r.body.errores).toBe(1)
    expect(insertados).toEqual([])
  })
})

describe('api/baja', () => {
  it('firma: válida solo con el mismo secreto y usuario', () => {
    const t = firmar('u1', 'secreto')
    expect(firmaValida('u1', t, 'secreto')).toBe(true)
    expect(firmaValida('u2', t, 'secreto')).toBe(false)
    expect(firmaValida('u1', t, 'otro')).toBe(false)
    expect(firmaValida('u1', 'corta', 'secreto')).toBe(false)
  })
  it('GET con firma: pide confirmar y NO da de baja (antivirus que abren enlaces)', async () => {
    actualizado = null
    const r = respuesta()
    await baja({ method: 'GET', query: { u: 'u1', t: firmar('u1', 'secreto') } }, r)
    expect(r.body).toContain('Sí, darme de baja')
    expect(actualizado).toBe(null)
  })
  it('POST con firma: baja hecha', async () => {
    const r = respuesta()
    await baja({ method: 'POST', query: { u: 'u1', t: firmar('u1', 'secreto') } }, r)
    expect(r.code).toBe(200)
    expect(actualizado).toEqual({ campos: { recordatorios: false }, col: 'usuario_id', val: 'u1' })
  })
  it('firma falsa: 400 y nada cambia', async () => {
    actualizado = null
    const r = respuesta()
    await baja({ method: 'POST', query: { u: 'u1', t: 'x'.repeat(32) } }, r)
    expect(r.code).toBe(400)
    expect(actualizado).toBe(null)
  })
})
