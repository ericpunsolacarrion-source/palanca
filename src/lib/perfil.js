import { supabase } from './supabaseClient'
import { CATEGORIAS_INICIALES } from './categorias'

export async function obtenerPerfil(usuarioId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (error) return null
  return data
}

export async function crearPerfil(usuarioId, objetivo) {
  const { data, error } = await supabase
    .from('perfiles')
    .insert({ usuario_id: usuarioId, objetivo })
    .select()
    .single()

  if (error) return null

  const filas = Object.entries(CATEGORIAS_INICIALES).flatMap(([tipo, nombres]) =>
    nombres.map((nombre) => ({ usuario_id: usuarioId, tipo, nombre })),
  )
  await supabase.from('categorias').insert(filas)

  return data
}
