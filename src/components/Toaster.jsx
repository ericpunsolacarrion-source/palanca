import { useEffect, useRef, useState } from 'react'

const DURACION_MS = 2200

export default function Toaster() {
  const [mensaje, setMensaje] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    function onToast(e) {
      setMensaje(e.detail)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setMensaje(null), DURACION_MS)
    }
    window.addEventListener('palanca-toast', onToast)
    return () => {
      window.removeEventListener('palanca-toast', onToast)
      clearTimeout(timerRef.current)
    }
  }, [])

  if (!mensaje) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-icono">✓</span>
      {mensaje}
    </div>
  )
}
