import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { errorDeEnlaceAuth, limpiarErrorDeEnlace, mensajeErrorAuth, traducirErrorAuth } = await import('./auth')

describe('vuelta de un enlace del correo con error', () => {
  it('enlace caducado o ya usado → explicación clara', () => {
    const u = { hash: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', search: '' }
    expect(errorDeEnlaceAuth(u)).toMatch(/caducado o ya se había usado/)
  })
  it('error en la query (?error_description=…) también se detecta', () => {
    expect(errorDeEnlaceAuth({ hash: '', search: '?error=server_error&error_description=Algo' })).toMatch(/No se ha podido completar el enlace/)
  })
  it('sin error, o con el token de una confirmación correcta → nada', () => {
    expect(errorDeEnlaceAuth({ hash: '', search: '?diseno=v5' })).toBeNull()
    expect(errorDeEnlaceAuth({ hash: '#access_token=abc&type=signup', search: '' })).toBeNull()
  })
  it('limpia el error de la dirección y conserva el resto', () => {
    const replaceState = vi.fn()
    limpiarErrorDeEnlace({ hash: '#error=access_denied', search: '?diseno=v5&error_code=otp_expired', pathname: '/' }, { replaceState })
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?diseno=v5')
  })
  it('sin conexión con el servidor → lo dice (no «revisa los datos»)', () => {
    for (const m of ['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'AuthRetryableFetchError'])
      expect(traducirErrorAuth(m)).toMatch(/No podemos conectar con Palanca/)
  })
  it('error de red de Supabase con mensaje vacío → también', () => {
    expect(mensajeErrorAuth({ name: 'AuthRetryableFetchError', message: '{}', status: 0 })).toMatch(/No podemos conectar/)
    expect(mensajeErrorAuth({ name: 'AuthApiError', message: 'Invalid login credentials', status: 400 })).toMatch(/incorrectos/)
  })
  it('email sin confirmar → lo dice', () => {
    expect(traducirErrorAuth('Email not confirmed')).toMatch(/Confirma tu email/)
  })
})
