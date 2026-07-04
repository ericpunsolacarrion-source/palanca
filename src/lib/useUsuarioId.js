import { useState } from 'react'

const STORAGE_KEY = 'palanca_usuario_id'

export function useUsuarioId() {
  const [usuarioId, setUsuarioIdState] = useState(() => localStorage.getItem(STORAGE_KEY))

  function setUsuarioId(id) {
    const limpio = id.trim()
    if (!limpio) return
    localStorage.setItem(STORAGE_KEY, limpio)
    setUsuarioIdState(limpio)
  }

  function cerrarSesion() {
    localStorage.removeItem(STORAGE_KEY)
    setUsuarioIdState(null)
  }

  return { usuarioId, setUsuarioId, cerrarSesion }
}
