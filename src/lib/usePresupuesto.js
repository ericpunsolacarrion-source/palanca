import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function usePresupuesto(usuarioId) {
  const [tasaAhorroObjetivo, setTasaAhorroObjetivo] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!usuarioId) return
    setCargando(true)

    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    if (!error) setTasaAhorroObjetivo(data?.tasa_ahorro_objetivo ?? null)
    setCargando(false)
  }, [usuarioId])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function guardarTasa(nuevaTasa) {
    const { error } = await supabase
      .from('presupuestos')
      .upsert({ usuario_id: usuarioId, tasa_ahorro_objetivo: nuevaTasa, updated_at: new Date().toISOString() })

    if (!error) setTasaAhorroObjetivo(nuevaTasa)
    return !error
  }

  return { tasaAhorroObjetivo, cargando, guardarTasa }
}
