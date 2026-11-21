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

describe('blindaje del acceso: errores distinguibles sin revelar si el correo existe', () => {
  it('servicio caído (5xx) → «no podemos conectar», no «revisa los datos»', () => {
    expect(mensajeErrorAuth({ status: 503, message: 'upstream connect error' })).toMatch(/No podemos conectar/)
    expect(mensajeErrorAuth({ status: 500, message: 'Error sending recovery email' })).toMatch(/No podemos conectar/)
    expect(traducirErrorAuth('Error sending confirmation email')).toMatch(/enviar el correo/)
    expect(traducirErrorAuth('Email address "x@y.com" not authorized')).toMatch(/enviar el correo/)
  })
  it('contraseñas: débil, igual a la anterior y enlace caducado', () => {
    expect(mensajeErrorAuth({ status: 422, code: 'weak_password', message: 'Password is known to be weak' })).toMatch(/más segura/)
    expect(mensajeErrorAuth({ status: 422, code: 'same_password', message: 'x' })).toMatch(/distinta de la anterior/)
    expect(mensajeErrorAuth({ name: 'AuthSessionMissingError', message: 'Auth session missing!' })).toMatch(/caducado/)
  })
  it('anti-enumeración intacta: «ya registrado» no lo dice', () => {
    expect(mensajeErrorAuth({ status: 422, code: 'user_already_exists', message: 'User already registered' })).toBe('No se ha podido completar. Revisa los datos e inténtalo de nuevo.')
    expect(mensajeErrorAuth({ status: 400, message: 'Invalid login credentials' })).toBe('Email o contraseña incorrectos.')
  })
  it('enlace de recuperación caducado → explica que pida otro', () => {
    expect(errorDeEnlaceAuth({ hash: '#error=access_denied&error_code=otp_expired', search: '?recuperar=1' })).toMatch(/cambiar la contraseña ha caducado/)
  })
})

describe('registro interno del error técnico', () => {
  it('sin email ni contraseña: solo tipo, estado, código y mensaje recortado', async () => {
    const { registrarErrorAuth } = await import('./auth')
    const d = registrarErrorAuth('login', { name: 'AuthApiError', status: 400, code: 'x', message: 'fallo para ana@correo.com' }, null)
    expect(d).toEqual({ contexto: 'login', nombre: 'AuthApiError', estado: 400, codigo: 'x', mensaje: 'fallo para [email]' })
  })
})
