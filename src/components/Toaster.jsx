import { useEffect, useRef, useState } from 'react'

const DURACION_MS = 2200
const DURACION_ACCION_MS = 5000 // más tiempo si hay un botón (p.ej. "Deshacer")

export default function Toaster() {
  const [aviso, setAviso] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    function onToast(e) {
      setAviso(e.detail)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setAviso(null), e.detail?.accion ? DURACION_ACCION_MS : DURACION_MS)
    }
    window.addEventListener('palanca-toast', onToast)
    return () => {
      window.removeEventListener('palanca-toast', onToast)
      clearTimeout(timerRef.current)
    }
  }, [])

  if (!aviso) return null

  const esError = aviso.tipo === 'error'

  function ejecutarAccion() {
    clearTimeout(timerRef.current)
    setAviso(null)
    aviso.accion?.onAccion?.()
  }

  return (
    <div className={`toast ${esError ? 'toast-error' : ''}`} role="status" aria-live="polite">
      <span className={`toast-icono ${esError ? 'error' : ''}`}>{esError ? '!' : '✓'}</span>
      <span className="toast-texto">{aviso.mensaje}</span>
      {aviso.accion && (
        <button type="button" className="toast-accion" onClick={ejecutarAccion}>
          {aviso.accion.texto}
        </button>
      )}
    </div>
  )
}
