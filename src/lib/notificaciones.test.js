import { describe, expect, it } from 'vitest'
import { estadoNotificaciones, iosSinInstalar, permisoActual, puedeNotificar } from './notificaciones'

describe('estado real de las notificaciones', () => {
  it('sin API de notificaciones: no disponibles (y en iPhone, pide instalar)', () => {
    expect(permisoActual({})).toBe('unsupported')
    expect(estadoNotificaciones('unsupported')).toMatchObject({ clave: 'no-disponible', accion: null })
    expect(estadoNotificaciones('unsupported', false, { ios: true })).toMatchObject({ clave: 'ios', accion: null })
  })
  it('permiso pendiente: ofrece activar', () => {
    expect(permisoActual({ Notification: { permission: 'default' } })).toBe('default')
    expect(estadoNotificaciones('default')).toMatchObject({ clave: 'sin-activar', accion: 'activar' })
  })
  it('denegado: bloqueadas, sin botón (el navegador no deja volver a pedirlo)', () => {
    expect(estadoNotificaciones('denied')).toMatchObject({ clave: 'bloqueadas', tono: 'aviso', accion: null })
  })
  it('concedido: activadas y se pueden silenciar/reanudar en Palanca', () => {
    expect(estadoNotificaciones('granted')).toMatchObject({ clave: 'activas', accion: 'silenciar' })
    expect(estadoNotificaciones('granted', true)).toMatchObject({ clave: 'silenciadas', accion: 'reanudar' })
    expect(puedeNotificar('granted', false)).toBe(true)
    expect(puedeNotificar('granted', true)).toBe(false)
    expect(puedeNotificar('default', false)).toBe(false)
    expect(puedeNotificar('denied', false)).toBe(false)
  })
  it('detecta iPhone fuera de la app instalada', () => {
    const win = { matchMedia: () => ({ matches: false }) }
    expect(iosSinInstalar({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }, win)).toBe(true)
    expect(iosSinInstalar({ userAgent: 'Mozilla/5.0 (iPhone)', standalone: true }, win)).toBe(false)
    expect(iosSinInstalar({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }, win)).toBe(false)
  })
})
