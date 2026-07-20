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

export async function crearPerfil(usuarioId, objetivo, email, anioNacimiento) {
  const emailLimpio = email?.trim().toLowerCase() || null
  const anio = Number.isInteger(anioNacimiento) ? anioNacimiento : null

  // Alta tolerante: probamos con TODAS las columnas opcionales y, si alguna aún
  // no existe en la BD, reintentamos con menos, sin bloquear el alta ni perder
  // el email por culpa de la columna del año.
  const intentos = [
    { usuario_id: usuarioId, objetivo, email: emailLimpio, anio_nacimiento: anio },
    { usuario_id: usuarioId, objetivo, email: emailLimpio },
    { usuario_id: usuarioId, objetivo },
  ]
  let data = null
  let error = null
  for (const fila of intentos) {
    ;({ data, error } = await supabase.from('perfiles').insert(fila).select().single())
    if (!error) break
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
