import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Estado de sesión de Supabase Auth. Se usa una vez a nivel de App y se deriva
// el usuarioId efectivo. Mantiene la sesión entre visitas (la persiste el
// propio cliente de Supabase).
export function useAuth() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return
      setSession(data.session ?? null)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setSession(sesion ?? null)
    })
    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, cargandoAuth: cargando, usuarioAuthId: session?.user?.id ?? null }
}
