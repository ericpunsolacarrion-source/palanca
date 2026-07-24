import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Tipo de bolsa que sigue cada objetivo: 'liquidez' | 'inversion' | 'patrimonio'.
// Persistido en la columna `objetivos_ahorro.tipo`. Migra una sola vez el mapa
// antiguo de localStorage (por id de objetivo) a la columna, sin borrar el
// localStorage. Si la columna aún no existe, degrada a localStorage.
const claveLS = (usuarioId) => `palanca_objetivo_tipo_${usuarioId}`
const claveMigrado = (usuarioId) => `palanca_objetivo_tipo_migrado_${usuarioId}`

function leerLS(usuarioId) {
  try {
    return JSON.parse(localStorage.getItem(claveLS(usuarioId)) || '{}') || {}
  } catch {
    return {}
  }
}

export const TIPOS_OBJETIVO = [
  { id: 'liquidez', etiqueta: 'Ahorro líquido' },
  { id: 'inversion', etiqueta: 'Inversión' },
  { id: 'patrimonio', etiqueta: 'Patrimonio' },
]

export function useObjetivoTipo(usuarioId) {
  const [mapa, setMapa] = useState({})
  const [legacy, setLegacy] = useState(false)

  const cargar = useCallback(async () => {
    if (!usuarioId) {
      setMapa({})
      return
    }
    const { data, error } = await supabase
      .from('objetivos_ahorro')
      .select('id, tipo')
      .eq('usuario_id', usuarioId)

    if (error) {
      // Columna `tipo` o tabla no disponible → modo localStorage.
      setLegacy(true)
      setMapa(leerLS(usuarioId))
      return
    }
    setLegacy(false)

    // Migración única: rellena la columna tipo de los objetivos que aún no la
    // tengan, usando el mapa antiguo de localStorage.
    if (!localStorage.getItem(claveMigrado(usuarioId))) {
      const ls = leerLS(usuarioId)
      const sinTipo = (data || []).filter((o) => !o.tipo && ls[o.id])
      for (const o of sinTipo) {
        await supabase.from('objetivos_ahorro').update({ tipo: ls[o.id] }).eq('id', o.id)
      }
      localStorage.setItem(claveMigrado(usuarioId), '1')
      if (sinTipo.length > 0) {
        await cargar()
        return
      }
    }

    const m = {}
    for (const o of data || []) m[o.id] = o.tipo || 'liquidez'
    setMapa(m)
  }, [usuarioId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const tipoDe = useCallback((id) => mapa[id] || 'liquidez', [mapa])

  const fijarTipo = useCallback(
    async (id, tipo) => {
      // Optimista en memoria.
      setMapa((prev) => ({ ...prev, [id]: tipo }))
      if (legacy) {
        const nuevo = { ...leerLS(usuarioId), [id]: tipo }
        if (usuarioId) localStorage.setItem(claveLS(usuarioId), JSON.stringify(nuevo))
        return
      }
      await supabase.from('objetivos_ahorro').update({ tipo }).eq('id', id)
    },
    [usuarioId, legacy],
  )

  return { tipoDe, fijarTipo }
}
