import { useCallback, useEffect, useState } from 'react'

// Registro de importaciones CSV para poder deshacerlas. Guarda por usuario, en
// localStorage, el lote (id, fecha, nombre, ids de los movimientos insertados).
const clave = (usuarioId) => `palanca_importaciones_${usuarioId}`

function leer(usuarioId) {
  try {
    const arr = JSON.parse(localStorage.getItem(clave(usuarioId)) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function escribir(usuarioId, items) {
  try {
    localStorage.setItem(clave(usuarioId), JSON.stringify(items))
  } catch {
    // sin persistencia
  }
}

export function useImportaciones(usuarioId) {
  const [items, setItems] = useState(() => (usuarioId ? leer(usuarioId) : []))

  useEffect(() => {
    setItems(usuarioId ? leer(usuarioId) : [])
  }, [usuarioId])

  const registrar = useCallback(
    ({ nombre, ids }) => {
      const lote = {
        id: `imp_${Date.now()}`,
        fecha: new Date().toISOString(),
        nombre: nombre || 'Importación',
        ids,
        count: ids.length,
      }
      const nuevos = [lote, ...(usuarioId ? leer(usuarioId) : [])]
      setItems(nuevos)
      if (usuarioId) escribir(usuarioId, nuevos)
      return lote
    },
    [usuarioId],
  )

  const quitar = useCallback(
    (id) => {
      const nuevos = (usuarioId ? leer(usuarioId) : []).filter((l) => l.id !== id)
      setItems(nuevos)
      if (usuarioId) escribir(usuarioId, nuevos)
    },
    [usuarioId],
  )

  return { items, registrar, quitar }
}
