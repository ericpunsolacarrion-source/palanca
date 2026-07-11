import { useCallback, useEffect, useState } from 'react'

// Escenarios de independencia financiera guardados por el usuario para
// compararlos (conservador / realista / optimista…). Cada uno guarda su nombre
// y sus parámetros. Se guardan en localStorage por dispositivo (como los gastos
// rápidos): son simulaciones personales, no datos financieros del histórico.
// Cada escenario: { id, nombre, gasto, patrimonio, ahorro, rentabilidad }.

const clave = (usuarioId) => `palanca_escenarios_if_${usuarioId}`

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
    // sin persistencia, no pasa nada
  }
}

const idNuevo = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
  `if_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export function useEscenariosIF(usuarioId) {
  const [items, setItems] = useState(() => (usuarioId ? leer(usuarioId) : []))

  useEffect(() => {
    setItems(usuarioId ? leer(usuarioId) : [])
  }, [usuarioId])

  const guardarLista = useCallback(
    (nuevos) => {
      setItems(nuevos)
      if (usuarioId) escribir(usuarioId, nuevos)
    },
    [usuarioId],
  )

  const crear = useCallback(
    (datos) => {
      guardarLista([...items, { id: idNuevo(), ...datos }])
    },
    [items, guardarLista],
  )

  const eliminar = useCallback(
    (id) => {
      guardarLista(items.filter((it) => it.id !== id))
    },
    [items, guardarLista],
  )

  return { items, crear, eliminar }
}
