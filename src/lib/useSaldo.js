import { useCallback, useEffect, useState } from 'react'

// Metadatos de reconciliación de saldo por usuario (localStorage). El DINERO
// (saldo inicial y ajustes) vive como movimientos de categoría Ajuste; aquí solo
// guardamos CUÁNDO fue la última vez que el usuario confirmó su saldo real, para
// el indicador de fiabilidad (incluye el caso en que el saldo ya cuadraba y no
// hizo falta crear ningún ajuste).
const clave = (usuarioId) => `palanca_saldo_${usuarioId}`

function leer(usuarioId) {
  try {
    return JSON.parse(localStorage.getItem(clave(usuarioId)) || '{}') || {}
  } catch {
    return {}
  }
}

export function useSaldo(usuarioId) {
  const [meta, setMeta] = useState(() => (usuarioId ? leer(usuarioId) : {}))

  useEffect(() => {
    setMeta(usuarioId ? leer(usuarioId) : {})
  }, [usuarioId])

  const marcarReconciliado = useCallback(() => {
    const nuevo = { ...leer(usuarioId), ultimaReconciliacion: new Date().toISOString() }
    if (usuarioId) localStorage.setItem(clave(usuarioId), JSON.stringify(nuevo))
    setMeta(nuevo)
  }, [usuarioId])

  return { ultimaReconciliacion: meta.ultimaReconciliacion ?? null, marcarReconciliado }
}
