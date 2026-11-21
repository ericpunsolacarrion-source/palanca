import { useEffect, useState } from 'react'
import { llegoConRecuperacion, supabase } from './supabaseClient'

// Estado de sesión de Supabase Auth. Se usa una vez a nivel de App y se deriva
// el usuarioId efectivo. Mantiene la sesión entre visitas (la persiste el
// propio cliente de Supabase).
// ¿Venimos del enlace «Restablecer contraseña» del correo con una sesión de
// recuperación abierta? (fragmento type=recovery, leído antes de que Supabase lo
// borre, o el evento PASSWORD_RECOVERY). Solo la dirección ?recuperar=1 NO
// basta: si el enlace caducó, la persona entra luego con su contraseña de siempre.
export function vieneDeRecuperacion(hash = '') {
  return llegoConRecuperacion || /(^|[#&])type=recovery(&|$)/.test(hash)
}

export function useAuth() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [recuperando, setRecuperando] = useState(() => vieneDeRecuperacion(globalThis.location?.hash ?? ''))

  useEffect(() => {
    let activo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return
      setSession(data.session ?? null)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      setSession(sesion ?? null)
    })
    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const terminarRecuperacion = () => {
    setRecuperando(false)
    try {
      const u = new URL(globalThis.location.href)
      u.searchParams.delete('recuperar')
      globalThis.history?.replaceState(null, '', `${u.pathname}${u.search}`)
    } catch {
      /* nada */
    }
  }
  return { session, cargandoAuth: cargando, usuarioAuthId: session?.user?.id ?? null, recuperando, terminarRecuperacion }
}
