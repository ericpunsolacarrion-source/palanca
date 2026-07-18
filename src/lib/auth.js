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

export async function recuperarPassword(email) {
  return supabase.auth.resetPasswordForEmail(norm(email), {
    redirectTo: `${window.location.origin}?recuperar=1`,
  })
}

// Traduce los mensajes de error de Supabase a algo claro en español.
export function traducirErrorAuth(msg) {
  const m = String(msg || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (m.includes('already registered') || m.includes('user already exists'))
    return 'Ya existe una cuenta con ese email. Inicia sesión.'
  if (m.includes('password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('email not confirmed'))
    return 'Confirma tu email antes de entrar (revisa tu correo, también spam).'
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'Introduce un email válido.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  return 'No se ha podido completar. Revisa los datos e inténtalo de nuevo.'
}
