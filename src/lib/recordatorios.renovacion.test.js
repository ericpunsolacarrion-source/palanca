import { describe, expect, it } from 'vitest'
import { componerEmail, elegirRecordatorio } from './recordatorios'

// Aviso de renovación por email: solo si el cliente lo activó, unas 6 semanas
// antes (con tiempo para avisar por escrito con 1 mes), sin importes.
const base = { uid: 'u', nombre: 'Eric', alta: '2026-01-01', ultima: '2026-10-15', dias30: 10, movs: 50, plan: 'gratis', envios: {} }
const conSeguro = (extra = {}) => ({ ...base, avisos_renovacion: true, renovaciones: [{ nombre: 'Mapfre coche', fecha: '2026-11-26' }], ...extra })

describe('email de renovación', () => {
  it('a 41 días, si lo ha pedido', () => {
    expect(elegirRecordatorio(conSeguro(), '2026-10-16')).toBe('renovacion')
  })
  it('no, si no lo ha activado o si es pronto o tarde', () => {
    expect(elegirRecordatorio(conSeguro({ avisos_renovacion: null }), '2026-10-16')).toBe(null)
    expect(elegirRecordatorio(conSeguro({ avisos_renovacion: false }), '2026-10-16')).toBe(null)
    expect(elegirRecordatorio(conSeguro(), '2026-10-01')).toBe(null)
    expect(elegirRecordatorio(conSeguro(), '2026-10-25')).toBe(null)
  })
  it('una sola vez por renovación', () => {
    expect(elegirRecordatorio(conSeguro({ envios: { renovacion: '2026-10-12T17:00:00Z' }, ultimo_envio: '2026-10-12T17:00:00Z' }), '2026-10-16')).toBe(null)
  })
  it('dice la fecha y hasta cuándo avisar, sin importes', () => {
    const e = componerEmail('renovacion', conSeguro(), '2026-10-16', { app: 'https://app', baja: 'https://app/baja' }, { nombre: 'Palanca', email: 'hola@palanca.app' })
    expect(e.asunto).toBe('«Mapfre coche» se renueva el 26 de noviembre')
    expect(e.texto).toContain('avísales por escrito antes del 26 de octubre')
    expect(e.texto).not.toMatch(/€/)
  })
})
