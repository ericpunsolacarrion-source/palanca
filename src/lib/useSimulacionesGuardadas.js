import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useSimulacionesGuardadas(usuarioId, tipo) {
  const [simulaciones, setSimulaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!usuarioId) return
    setCargando(true)

    const { data, error } = await supabase
      .from('simulaciones_guardadas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', tipo)
      .order('created_at', { ascending: false })

    if (!error) setSimulaciones(data)
    setCargando(false)
  }, [usuarioId, tipo])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function guardar(nombre, datos) {
    const { data, error } = await supabase
      .from('simulaciones_guardadas')
      .insert({ usuario_id: usuarioId, tipo, nombre, datos })
      .select()
      .single()

    if (!error) setSimulaciones((prev) => [data, ...prev])
    return !error
  }

  async function eliminar(id) {
    const { error } = await supabase.from('simulaciones_guardadas').delete().eq('id', id)
    if (!error) setSimulaciones((prev) => prev.filter((s) => s.id !== id))
    return !error
  }

  return { simulaciones, cargando, guardar, eliminar }
}
