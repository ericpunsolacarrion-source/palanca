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

export async function crearPerfil(usuarioId, objetivo, email, anioNacimiento, nombre) {
  const emailLimpio = email?.trim().toLowerCase() || null
  const anio = Number.isInteger(anioNacimiento) ? anioNacimiento : null
  const nombreLimpio = nombre?.trim() || null

  // Alta tolerante: probamos con TODAS las columnas opcionales y, si alguna aún
  // no existe en la BD, reintentamos con menos (de la más nueva a la más básica),
  // sin bloquear el alta ni perder columnas que sí existen.
  const base = { usuario_id: usuarioId, objetivo }
  const intentos = [
    { ...base, email: emailLimpio, anio_nacimiento: anio, nombre: nombreLimpio },
    { ...base, email: emailLimpio, anio_nacimiento: anio },
    { ...base, email: emailLimpio },
    base,
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

// Actualiza campos del perfil de forma tolerante: si alguna columna aún no
// existe, la quita y reintenta con el resto. Devuelve el perfil actualizado o null.
export async function actualizarPerfil(usuarioId, campos) {
  let intento = { ...campos }
  const claves = Object.keys(intento)
  for (let i = 0; i <= claves.length; i += 1) {
    const { data, error } = await supabase
      .from('perfiles')
      .update(intento)
      .eq('usuario_id', usuarioId)
      .select()
      .single()
    if (!error) return data
    // Si el error menciona una columna, la quitamos y reintentamos.
    const col = claves.find((c) => error.message?.includes(c) && intento[c] !== undefined)
    if (!col) return null
    delete intento[col]
    if (Object.keys(intento).length === 0) return null
  }
  return null
}

export async function guardarEmail(usuarioId, email) {
  const emailLimpio = email.trim().toLowerCase()
  const { error } = await supabase
    .from('perfiles')
    .update({ email: emailLimpio })
    .eq('usuario_id', usuarioId)

  return !error
}
