import { supabase } from './supabaseClient'

// Acciones de autenticación (Supabase Auth, email + contraseña). La sesión se
// persiste sola en localStorage (persistSession por defecto), así que se
// mantiene entre visitas. Estas funciones son puras: la UI vive en Auth.jsx.

const norm = (email) => String(email || '').trim().toLowerCase()

export async function registrar(email, password) {
  return supabase.auth.signUp({
    email: norm(email),
    password,
    // Que el enlace de confirmación vuelva a ESTA app (no al localhost por
    // defecto). El dominio debe estar en Supabase → Auth → Redirect URLs.
    options: { emailRedirectTo: window.location.origin },
  })
}

export async function iniciarSesion(email, password) {
  return supabase.auth.signInWithPassword({ email: norm(email), password })
}

export async function cerrarSesionAuth() {
  return supabase.auth.signOut()
}

// Borra la cuenta del usuario logueado y TODOS sus datos. Usa una función RPC
// con permisos elevados (borrar_mi_cuenta) que elimina las filas del usuario y
// su entrada en auth.users. Tras borrar, cierra la sesión.
export async function borrarCuenta() {
  const { error } = await supabase.rpc('borrar_mi_cuenta')
  if (error) return { ok: false, error }
  await supabase.auth.signOut()
  return { ok: true }
}

// Reenvía el correo de confirmación de una cuenta nueva (si existe y no está
// confirmada; si no, Supabase no envía nada y la app no lo revela).
export async function reenviarConfirmacion(email) {
  return supabase.auth.resend({
    type: 'signup',
    email: norm(email),
    options: { emailRedirectTo: window.location.origin },
  })
}

// Errores que Supabase devuelve EN LA DIRECCIÓN al volver de un enlace del
// correo (confirmar cuenta, recuperar contraseña): #error=…&error_code=…&
// error_description=…  Antes se ignoraban y la persona veía la pantalla de
// acceso sin ninguna explicación. Devuelve un texto claro o null.
export function errorDeEnlaceAuth(ubicacion = globalThis.location) {
  const partes = new URLSearchParams(`${String(ubicacion?.hash ?? '').replace(/^#/, '')}&${String(ubicacion?.search ?? '').replace(/^\?/, '')}`)
  const codigo = (partes.get('error_code') || '').toLowerCase()
  const error = (partes.get('error') || '').toLowerCase()
  const desc = (partes.get('error_description') || '').toLowerCase()
  if (!codigo && !error && !desc) return null
  const deRecuperacion = /[?&]recuperar=1\b/.test(String(ubicacion?.search ?? ''))
  if (deRecuperacion && (codigo === 'otp_expired' || /expired|invalid/.test(desc)))
    return 'El enlace para cambiar la contraseña ha caducado o ya se había usado (algunos correos lo abren solos al revisarlo). Pide otro abajo, en «¿Olvidaste tu contraseña?».'
  if (codigo === 'otp_expired' || /expired|invalid/.test(desc))
    return 'El enlace del correo ha caducado o ya se había usado (algunos correos lo abren solos al revisarlo). Entra con tu email y contraseña; si te pide confirmar el email, pulsa «Reenviar correo de confirmación».'
  return 'No se ha podido completar el enlace del correo. Entra con tu email y contraseña o pide un correo nuevo.'
}

// Quita el error de la dirección (para que no vuelva a salir al recargar).
export function limpiarErrorDeEnlace(ubicacion = globalThis.location, historial = globalThis.history) {
  try {
    if (/error/.test(ubicacion?.hash ?? '') || /error_code|error_description/.test(ubicacion?.search ?? '')) {
      const p = new URLSearchParams(String(ubicacion.search ?? '').replace(/^\?/, ''))
      for (const k of ['error', 'error_code', 'error_description']) p.delete(k)
      const q = p.toString()
      historial?.replaceState(null, '', `${ubicacion.pathname}${q ? `?${q}` : ''}`)
    }
  } catch {
    /* sin historial: no pasa nada */
  }
}

export async function recuperarPassword(email) {
  return supabase.auth.resetPasswordForEmail(norm(email), {
    redirectTo: `${window.location.origin}?recuperar=1`,
  })
}

// Error de Supabase (objeto) → texto claro. Los fallos de red llegan como
// AuthRetryableFetchError, a veces con el mensaje vacío o «{}».
export function mensajeErrorAuth(err, contexto = 'auth') {
  if (!err) return null
  registrarErrorAuth(contexto, err)
  if (err.name === 'AuthRetryableFetchError' || err.status === 0) return traducirErrorAuth('fetch failed')
  // El servicio falla (5xx, proyecto pausado detrás de un proxy…): no es culpa de los datos.
  if (err.status >= 500 || err.code === 'unexpected_failure') return MSG_SIN_SERVICIO
  if (err.code === 'weak_password') return MSG_PASSWORD_DEBIL
  if (err.code === 'same_password') return 'La nueva contraseña debe ser distinta de la anterior.'
  if (err.name === 'AuthSessionMissingError' || err.code === 'session_not_found' || err.code === 'session_expired') return MSG_ENLACE_CADUCADO
  if (err.code === 'over_email_send_rate_limit' || err.code === 'over_request_rate_limit') return traducirErrorAuth('rate limit')
  if (err.code === 'signup_disabled') return 'Ahora mismo no se pueden crear cuentas nuevas. Inténtalo más tarde.'
  return traducirErrorAuth(err.message)
}

export const MSG_SIN_SERVICIO = 'No podemos conectar con Palanca ahora mismo. No es un problema de tus datos: inténtalo de nuevo en unos minutos.'
export const MSG_PASSWORD_DEBIL = 'Elige una contraseña más segura: al menos 8 caracteres, mezclando letras y números.'
export const MSG_ENLACE_CADUCADO = 'El enlace ha caducado o ya se usó. Pide otro desde «¿Olvidaste tu contraseña?».'

// El error TÉCNICO real (para saber qué falló): en desarrollo, a la consola; en
// producción, a los registros de Vercel (/api/registro-error). Nunca el email
// ni la contraseña: solo el tipo de error, su código y su estado.
export function registrarErrorAuth(contexto, err, envio = globalThis.navigator) {
  const datos = {
    contexto: String(contexto).slice(0, 40),
    nombre: String(err?.name ?? '').slice(0, 60),
    estado: Number(err?.status) || 0,
    codigo: String(err?.code ?? '').slice(0, 60),
    mensaje: String(err?.message ?? '').replace(/[^\s@]+@[^\s@]+/g, '[email]').slice(0, 200),
  }
  try {
    if (import.meta.env?.DEV) {
      console.warn('[auth]', datos)
      return datos
    }
    envio?.sendBeacon?.('/api/registro-error', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
  } catch {
    /* registrar nunca debe romper el acceso */
  }
  return datos
}

export const MIN_PASSWORD = 8

// Nueva contraseña (pantalla de recuperación): validación local antes de llamar
// a Supabase, que tiene sus propias reglas.
export function validarNuevaPassword(nueva, repetida) {
  if (nueva.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
  if (!/[a-zA-Z]/.test(nueva) || !/\d/.test(nueva)) return 'Mezcla letras y números para que sea más segura.'
  if (nueva !== repetida) return 'Las dos contraseñas no coinciden.'
  return null
}

export async function cambiarPassword(password) {
  return supabase.auth.updateUser({ password })
}

// Traduce los mensajes de error de Supabase a algo claro en español.
export function traducirErrorAuth(msg) {
  const m = String(msg || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  // NOTA: "already registered" NO se traduce a un mensaje que confirme que el
  // email existe (eso sería enumeración de usuarios). El alta lo trata como un
  // mensaje neutro (ver Auth.jsx). Aquí cae al mensaje genérico de abajo.
  if (m.includes('password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('password should contain') || m.includes('weak password') || m.includes('pwned'))
    return MSG_PASSWORD_DEBIL
  if (m.includes('should be different from the old'))
    return 'La nueva contraseña debe ser distinta de la anterior.'
  if (m.includes('auth session missing'))
    return MSG_ENLACE_CADUCADO
  // No se pudo enviar el correo (servidor de correo de Supabase): no son tus datos.
  if (m.includes('error sending') || m.includes('smtp') || m.includes('not authorized'))
    return 'No hemos podido enviar el correo ahora mismo. Inténtalo de nuevo en unos minutos.'
  if (m.includes('signups not allowed'))
    return 'Ahora mismo no se pueden crear cuentas nuevas. Inténtalo más tarde.'
  if (m.includes('email not confirmed'))
    return 'Confirma tu email antes de entrar (revisa tu correo, también spam).'
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'Introduce un email válido.'
  // Sin conexión con el servidor (sin internet, o Supabase caído o pausado):
  // antes salía «Revisa los datos», que confundía.
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('network request failed') || m.includes('load failed') || m.includes('fetch failed') || m.includes('retryable'))
    return MSG_SIN_SERVICIO
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  return 'No se ha podido completar. Revisa los datos e inténtalo de nuevo.'
}
