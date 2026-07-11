import { useCallback, useEffect, useState } from 'react'

// Accesos rápidos de gasto DEFINIDOS por el usuario (café 1,50 €, comer 12 €…).
// Son atajos de interfaz por dispositivo → se guardan en localStorage (como las
// píldoras y los hitos). El gasto que se registra al tocarlos SÍ va a Supabase.
// Cada acceso: { id, nombre, importe, categoriaId, categoriaNombre }.

const clave = (usuarioId) => `palanca_gastos_rapidos_${usuarioId}`

function leer(usuarioId) {
  try {
    const raw = localStorage.getItem(clave(usuarioId))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function escribir(usuarioId, items) {
  try {
    localStorage.setItem(clave(usuarioId), JSON.stringify(items))
  } catch {
    // sin persistencia, no pasa nada
  }
}

const idNuevo = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
  `gr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export function useGastosRapidos(usuarioId) {
  const [items, setItems] = useState(() => (usuarioId ? leer(usuarioId) : []))

  useEffect(() => {
    setItems(usuarioId ? leer(usuarioId) : [])
  }, [usuarioId])

  const guardar = useCallback(
    (nuevos) => {
      setItems(nuevos)
      if (usuarioId) escribir(usuarioId, nuevos)
    },
    [usuarioId],
  )

  const crear = useCallback(
    ({ nombre, importe, categoriaId, categoriaNombre }) => {
      const item = { id: idNuevo(), nombre: nombre.trim(), importe, categoriaId, categoriaNombre }
      guardar([...items, item])
      return item
    },
    [items, guardar],
  )

  const actualizar = useCallback(
    (id, campos) => {
      guardar(items.map((it) => (it.id === id ? { ...it, ...campos } : it)))
    },
    [items, guardar],
  )

  const eliminar = useCallback(
    (id) => {
      guardar(items.filter((it) => it.id !== id))
    },
    [items, guardar],
  )

  return { items, crear, actualizar, eliminar }
}
