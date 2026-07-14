import { useCallback, useEffect, useState } from 'react'

// Tipo de bolsa que sigue cada objetivo: 'liquidez' | 'inversion' | 'patrimonio'.
// Se guarda en localStorage por usuario, mapeado por id de objetivo (el objetivo
// vive en Supabase; su tipo aquí, para no tocar el esquema). Por defecto
// 'liquidez'. Reversible y fácil de migrar luego a una columna real.
const clave = (usuarioId) => `palanca_objetivo_tipo_${usuarioId}`

function leer(usuarioId) {
  try {
    return JSON.parse(localStorage.getItem(clave(usuarioId)) || '{}') || {}
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
  const [mapa, setMapa] = useState(() => (usuarioId ? leer(usuarioId) : {}))

  useEffect(() => {
    setMapa(usuarioId ? leer(usuarioId) : {})
  }, [usuarioId])

  const tipoDe = useCallback((id) => mapa[id] || 'liquidez', [mapa])

  const fijarTipo = useCallback(
    (id, tipo) => {
      const nuevo = { ...leer(usuarioId), [id]: tipo }
      if (usuarioId) localStorage.setItem(clave(usuarioId), JSON.stringify(nuevo))
      setMapa(nuevo)
    },
    [usuarioId],
  )

  return { tipoDe, fijarTipo }
}
