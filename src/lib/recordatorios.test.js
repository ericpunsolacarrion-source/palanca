import { describe, expect, it } from 'vitest'
import { componerEmail, elegirRecordatorio } from './recordatorios'
import { FRASES, fraseDelDia } from './frases'

const HOY = '2026-10-15'
const base = { uid: 'u1', alta: '2026-08-01', ultima: '2026-10-11', dias30: 10, movs: 40, plan: 'gratis', plan_hasta: null, ultimo_envio: null, envios: {} }
const ts = (iso) => `${iso}T17:00:00Z`

describe('elegirRecordatorio', () => {
  it('a los 4 días sin entrar: "inactivo"', () => {
    expect(elegirRecordatorio(base, HOY)).toBe('inactivo')
  })
  it('solo uno por racha: si ya se envió tras su último día activo, nada', () => {
    expect(elegirRecordatorio({ ...base, envios: { inactivo: ts('2026-10-11') }, ultimo_envio: ts('2026-10-11') }, HOY)).toBe(null)
  })
  it('un envío de una racha anterior no bloquea la nueva', () => {
    expect(elegirRecordatorio({ ...base, envios: { inactivo: ts('2026-09-20') }, ultimo_envio: ts('2026-09-20') }, HOY)).toBe('inactivo')
  })
  it('nunca más de 1 email cada 3 días', () => {
    expect(elegirRecordatorio({ ...base, ultimo_envio: ts('2026-10-13') }, HOY)).toBe(null)
  })
  it('activo hace 1-2 días o 7-13: nada; 14-21: "te_echamos"; más: silencio', () => {
    expect(elegirRecordatorio({ ...base, ultima: '2026-10-14' }, HOY)).toBe(null)
    expect(elegirRecordatorio({ ...base, ultima: '2026-10-05' }, HOY)).toBe(null)
    expect(elegirRecordatorio({ ...base, ultima: '2026-09-28' }, HOY)).toBe('te_echamos')
    expect(elegirRecordatorio({ ...base, ultima: '2026-08-15' }, HOY)).toBe(null)
  })
  it('alta sin apuntar nada: una sola vez entre el día 2 y el 6', () => {
    const nuevo = { ...base, movs: 0, alta: '2026-10-12', ultima: '2026-10-12' }
    expect(elegirRecordatorio(nuevo, HOY)).toBe('sin_empezar')
    expect(elegirRecordatorio({ ...nuevo, alta: '2026-10-14' }, HOY)).toBe(null)
    expect(elegirRecordatorio({ ...nuevo, envios: { sin_empezar: ts('2026-10-10') }, ultimo_envio: ts('2026-10-10') }, HOY)).toBe(null)
    expect(elegirRecordatorio({ ...nuevo, alta: '2026-09-01' }, HOY)).toBe(null)
  })
  it('fin de prueba Premium: 1-2 días antes, con prioridad', () => {
    const p = { ...base, plan: 'prueba', plan_hasta: '2026-10-17' }
    expect(elegirRecordatorio(p, HOY)).toBe('prueba_termina')
    expect(elegirRecordatorio({ ...p, plan_hasta: '2026-10-20' }, HOY)).toBe('inactivo')
  })
  it('invitación a Premium solo con Premium activado, enganchado y en Gratis', () => {
    const fiel = { ...base, ultima: '2026-10-15', dias30: 12 }
    expect(elegirRecordatorio(fiel, HOY)).toBe(null)
    expect(elegirRecordatorio(fiel, HOY, { premiumActivo: true })).toBe('invitacion_premium')
    expect(elegirRecordatorio({ ...fiel, dias30: 4 }, HOY, { premiumActivo: true })).toBe(null)
    expect(elegirRecordatorio({ ...fiel, plan: 'premium' }, HOY, { premiumActivo: true })).toBe(null)
    expect(elegirRecordatorio({ ...fiel, envios: { invitacion_premium: ts('2026-09-01') }, ultimo_envio: ts('2026-09-01') }, HOY, { premiumActivo: true })).toBe(null)
  })
})

describe('componerEmail', () => {
  const enlaces = { app: 'https://palanca.app', baja: 'https://palanca.app/api/baja?u=u1&t=x' }
  const rem = { nombre: 'Palanca', email: 'hola@palanca.app' }
  it('lleva frase, botón con origen, baja y remitente; sin importes', () => {
    const e = componerEmail('inactivo', { ...base, nombre: 'Marta López' }, HOY, enlaces, rem)
    expect(e.asunto).toBe('Marta, dos minutos para ponerte al día')
    expect(e.texto).toContain('Hace 4 días')
    expect(e.html).toContain('https://palanca.app?desde=email_inactivo')
    expect(e.html).toContain(enlaces.baja.replace('&', '&amp;'))
    expect(e.texto).toContain(fraseDelDia('u1', HOY).texto)
    expect(e.html).toContain('hola@palanca.app')
    expect(e.texto).not.toMatch(/€/)
  })
  it('escapa el nombre (sin inyección de HTML)', () => {
    const e = componerEmail('inactivo', { ...base, nombre: '<script>x</script>' }, HOY, enlaces, rem)
    expect(e.html).not.toContain('<script>')
  })
  it('todos los tipos se componen', () => {
    for (const t of ['inactivo', 'te_echamos', 'sin_empezar', 'invitacion_premium']) {
      expect(componerEmail(t, base, HOY, enlaces, rem).asunto.length).toBeGreaterThan(5)
    }
    expect(componerEmail('prueba_termina', { ...base, plan_hasta: '2026-10-17' }, HOY, enlaces, rem).asunto).toBe('Tu prueba de Premium termina el 17 de octubre')
  })
})

describe('frases', () => {
  it('estable en el día y para la persona; todas con autor', () => {
    expect(fraseDelDia('a', HOY)).toBe(fraseDelDia('a', HOY))
    const distintas = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((s) => fraseDelDia(s, HOY).texto))
    expect(distintas.size).toBeGreaterThan(1)
    for (const f of FRASES) expect(f.autor && f.texto).toBeTruthy()
  })
})
