// Validación de sesión para los endpoints /api. El prefijo "_" hace que Vercel
// NO lo exponga como ruta pública (es un helper, no un endpoint).
//
// Falla SIEMPRE cerrado: si no hay token, falta configuración o la validación no
// se puede completar, devuelve null (el llamante debe responder 401). Nunca deja
// pasar por defecto.
import { createClient } from '@supabase/supabase-js'

export async function usuarioDeLaPeticion(req) {
  const cabecera = req.headers?.authorization || req.headers?.Authorization || ''
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : ''
  if (!token) return null

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null // sin config no se puede validar → denegar

  try {
    const sb = createClient(url, key)
    const { data, error } = await sb.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  } catch {
    return null
  }
}
