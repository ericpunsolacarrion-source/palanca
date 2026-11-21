import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/supabaseClient', () => ({ supabase: {} }))
const { validarNuevaPassword } = await import('./NuevaContrasena.jsx')

describe('nueva contraseña', () => {
  it('mínimo 8, letras y números, y las dos iguales', () => {
    expect(validarNuevaPassword('abc12', 'abc12')).toMatch(/al menos 8/)
    expect(validarNuevaPassword('abcdefgh', 'abcdefgh')).toMatch(/letras y números/)
    expect(validarNuevaPassword('abcdefg1', 'abcdefg2')).toMatch(/no coinciden/)
    expect(validarNuevaPassword('abcdefg1', 'abcdefg1')).toBeNull()
  })
})
