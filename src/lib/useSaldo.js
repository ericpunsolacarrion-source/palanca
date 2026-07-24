import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Fecha de la última reconciliación de saldo del usuario. El DINERO (saldo
// inicial y ajustes) vive como movimientos de categoría Ajuste; aquí solo
// guardamos CUÁNDO confirmó por última vez su saldo real (indicador de
// fiabilidad, incluye el caso en que el saldo ya cuadraba). Persistido en
// `perfiles.ultima_reconciliacion`, migrando una sola vez desde localStorage.
const claveLS = (usuarioId) => `palanca_saldo_${usuarioId}`
const claveMigrado = (usuarioId) => `palanca_saldo_migrado_${usuarioId}`

function leerLS(usuarioId) {
  try {
    return JSON.parse(localStorage.getItem(claveLS(usuarioId)) || '{}') || {}
  } catch {
    return {}
  }
}

export function useSaldo(usuarioId) {
  const [ultima, setUltima] = useState(null)
  const [legacy, setLegacy] = useState(false)

  const cargar = useCallback(async () => {
    if (!usuarioId) {
      setUltima(null)
      return
    }
    const { data, error } = await supabase
      .from('perfiles')
      .select('ultima_reconciliacion')
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    if (error) {
      // Columna aún no disponible → modo localStorage.
      setLegacy(true)
      setUltima(leerLS(usuarioId).ultimaReconciliacion ?? null)
      return
    }
    setLegacy(false)

    let valor = data?.ultima_reconciliacion ?? null
    // Migración única desde localStorage.
    if (!valor && !localStorage.getItem(claveMigrado(usuarioId))) {
      const legacyVal = leerLS(usuarioId).ultimaReconciliacion
      if (legacyVal) {
        await supabase
          .from('perfiles')
          .update({ ultima_reconciliacion: legacyVal })
          .eq('usuario_id', usuarioId)
        valor = legacyVal
      }
      localStorage.setItem(claveMigrado(usuarioId), '1')
    }
    setUltima(valor)
  }, [usuarioId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const marcarReconciliado = useCallback(async () => {
    const ahora = new Date().toISOString()
    setUltima(ahora)
    if (legacy) {
      const nuevo = { ...leerLS(usuarioId), ultimaReconciliacion: ahora }
      if (usuarioId) localStorage.setItem(claveLS(usuarioId), JSON.stringify(nuevo))
      return
    }
    await supabase
      .from('perfiles')
      .update({ ultima_reconciliacion: ahora })
      .eq('usuario_id', usuarioId)
  }, [usuarioId, legacy])

  return { ultimaReconciliacion: ultima, marcarReconciliado }
}
