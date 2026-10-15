import { beforeEach, describe, expect, it, vi } from 'vitest'
const rpc = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('./supabaseClient', () => ({ supabase: { rpc: (...a) => rpc(...a) } }))
import { debeContarVisita, iniciarAnalitica, registrarEvento } from './analitica'

describe('debeContarVisita', () => {
  const ahora = Date.UTC(2026, 9, 15, 10)
  it('cuenta la primera vez y valores raros', () => {
    expect(debeContarVisita(null, ahora)).toBe(true)
    expect(debeContarVisita('basura', ahora)).toBe(true)
    expect(debeContarVisita('0', ahora)).toBe(true)
  })
  it('no cuenta dentro de los 30 minutos, sí después', () => {
    expect(debeContarVisita(String(ahora - 29 * 60000), ahora)).toBe(false)
    expect(debeContarVisita(String(ahora - 30 * 60000), ahora)).toBe(true)
  })
})

describe('registrarEvento', () => {
  beforeEach(() => rpc.mockClear())
  it('no envía nada si el usuario lo ha desactivado o no hay sesión', () => {
    iniciarAnalitica({ usuarioId: 'u1', permitida: false })
    registrarEvento('movimiento')
    iniciarAnalitica({ usuarioId: null, permitida: true })
    registrarEvento('movimiento')
    expect(rpc).not.toHaveBeenCalled()
  })
  it('envía solo el tipo de evento (sin datos)', () => {
    iniciarAnalitica({ usuarioId: 'u1', permitida: true })
    registrarEvento('movimiento')
    expect(rpc).toHaveBeenLastCalledWith('registrar_evento', { p_tipo: 'movimiento' })
  })
  it('un fallo de red no rompe nada', () => {
    rpc.mockImplementationOnce(() => Promise.reject(new Error('sin red')))
    iniciarAnalitica({ usuarioId: 'u1', permitida: true })
    expect(() => registrarEvento('movimiento')).not.toThrow()
  })
})
