import { supabase } from './supabaseClient'
import { CATEGORIAS_INICIALES } from './categorias'

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

export async function obtenerPerfil(usuarioId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (error) return null
  return data
}

export async function crearPerfil(usuarioId, objetivo, email) {
  const emailLimpio = email?.trim().toLowerCase() || null

  let { data, error } = await supabase
    .from('perfiles')
    .insert({ usuario_id: usuarioId, objetivo, email: emailLimpio })
    .select()
    .single()

  // Si la columna email todavía no existe en la BD, no bloqueamos el alta:
  // guardamos el perfil sin email (se podrá añadir después desde el banner).
  if (error && emailLimpio) {
    ;({ data, error } = await supabase
      .from('perfiles')
      .insert({ usuario_id: usuarioId, objetivo })
      .select()
      .single())
  }

  if (error) return null

  const filas = Object.entries(CATEGORIAS_INICIALES).flatMap(([tipo, nombres]) =>
    nombres.map((nombre) => ({ usuario_id: usuarioId, tipo, nombre })),
  )
  await supabase.from('categorias').insert(filas)

  return data
}

export async function guardarEmail(usuarioId, email) {
  const emailLimpio = email.trim().toLowerCase()
  const { error } = await supabase
    .from('perfiles')
    .update({ email: emailLimpio })
    .eq('usuario_id', usuarioId)

  return !error
}
