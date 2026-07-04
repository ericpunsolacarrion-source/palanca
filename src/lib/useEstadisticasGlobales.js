import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Datos de todo el histórico del usuario (no solo el mes actual), usados
// para el aviso de "llevas X días sin registrar nada" y para desbloquear
// el simulador de independencia financiera cuando hay suficiente historial.
export function useEstadisticasGlobales(usuarioId) {
  const [diasDesdeUltimoMovimiento, setDiasDesdeUltimoMovimiento] = useState(null)
  const [diasConHistorial, setDiasConHistorial] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!usuarioId) return
    let cancelado = false

    async function cargar() {
      setCargando(true)

      const [ultimo, primero] = await Promise.all([
        supabase
          .from('movimientos')
          .select('created_at')
          .eq('usuario_id', usuarioId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('movimientos')
          .select('fecha')
          .eq('usuario_id', usuarioId)
          .order('fecha', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelado) return

      const ahora = Date.now()

      if (ultimo.data?.created_at) {
        const dias = Math.floor((ahora - new Date(ultimo.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
        setDiasDesdeUltimoMovimiento(dias)
      } else {
        setDiasDesdeUltimoMovimiento(null)
      }

      if (primero.data?.fecha) {
        const dias = Math.floor((ahora - new Date(primero.data.fecha).getTime()) / (1000 * 60 * 60 * 24))
        setDiasConHistorial(dias)
      } else {
        setDiasConHistorial(0)
      }

      setCargando(false)
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [usuarioId])

  return { diasDesdeUltimoMovimiento, diasConHistorial, cargando }
}
