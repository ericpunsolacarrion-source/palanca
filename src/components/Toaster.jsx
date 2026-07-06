import { useEffect, useRef, useState } from 'react'

const DURACION_MS = 2200

export default function Toaster() {
  const [aviso, setAviso] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    function onToast(e) {
      setAviso(e.detail)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setAviso(null), DURACION_MS)
    }
    window.addEventListener('palanca-toast', onToast)
    return () => {
      window.removeEventListener('palanca-toast', onToast)
      clearTimeout(timerRef.current)
    }
  }, [])

  if (!aviso) return null

  const esError = aviso.tipo === 'error'

  return (
    <div className={`toast ${esError ? 'toast-error' : ''}`} role="status" aria-live="polite">
      <span className={`toast-icono ${esError ? 'error' : ''}`}>{esError ? '!' : '✓'}</span>
      {aviso.mensaje}
    </div>
  )
}
