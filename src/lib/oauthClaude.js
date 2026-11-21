// Permiso para el CONECTOR DE CLAUDE (servidor OAuth 2.1 de Supabase Auth).
// Supabase manda al usuario a /oauth/consent?authorization_id=…; si aún no ha
// iniciado sesión, la app enseña el acceso y, al entrar, vuelve a esta pantalla
// (el id se guarda un rato en el navegador por si el login le saca de la ruta).
import { supabase } from './supabaseClient'

const CLAVE = 'palanca_oauth_pendiente'
const VIGENCIA_MS = 15 * 60 * 1000

export function autorizacionPendiente(ubicacion = globalThis.location, almacen = globalThis.sessionStorage) {
  try {
    const params = new URLSearchParams(ubicacion?.search ?? '')
    const id = params.get('authorization_id')
    if (id && /^\/oauth\/consent\/?$/.test(ubicacion.pathname)) {
      almacen?.setItem(CLAVE, JSON.stringify({ id, t: Date.now() }))
      return id
    }
    const guardada = JSON.parse(almacen?.getItem(CLAVE) || 'null')
    if (guardada?.id && Date.now() - guardada.t < VIGENCIA_MS) return guardada.id
  } catch {
    /* sin almacenamiento: solo vale la URL */
  }
  return null
}

export function olvidarAutorizacion(almacen = globalThis.sessionStorage) {
  try {
    almacen?.removeItem(CLAVE)
  } catch {
    /* nada */
  }
}

export async function detallesAutorizacion(id) {
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id)
  if (error) throw error
  return data
}

export async function responderAutorizacion(id, permitir) {
  const fn = permitir ? supabase.auth.oauth.approveAuthorization : supabase.auth.oauth.denyAuthorization
  const { data, error } = await fn.call(supabase.auth.oauth, id, { skipBrowserRedirect: true })
  if (error) throw error
  return data?.redirect_url ?? data?.redirect_to ?? null
}
