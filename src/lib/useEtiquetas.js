import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Hook genérico para listas de "etiquetas" ampliables por el usuario
// (categorías y conceptos comparten la misma forma: usuario_id, tipo, nombre).
export function useEtiquetas(tabla, usuarioId, tipo) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!usuarioId) return
    setCargando(true)

    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', tipo)
      .order('nombre', { ascending: true })

    if (!error) setItems(data)
    setCargando(false)
  }, [tabla, usuarioId, tipo])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function crear(nombre) {
    const limpio = nombre.trim()
    if (!limpio) return null

    const { data, error } = await supabase
      .from(tabla)
      .insert({ usuario_id: usuarioId, tipo, nombre: limpio })
      .select()
      .single()

    if (error) {
      const existente = items.find((f) => f.nombre.toLowerCase() === limpio.toLowerCase())
      if (existente) return existente
      return null
    }

    setItems((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return data
  }

  return { items, cargando, crear, recargar: cargar }
}
