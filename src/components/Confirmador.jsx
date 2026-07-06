import { useEffect, useState } from 'react'
import { resolverConfirmacion } from '../lib/confirmar'

export default function Confirmador() {
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    function onConfirmar(e) {
      setMensaje(e.detail)
    }
    window.addEventListener('palanca-confirmar', onConfirmar)
    return () => window.removeEventListener('palanca-confirmar', onConfirmar)
  }, [])

  if (!mensaje) return null

  function responder(valor) {
    setMensaje(null)
    resolverConfirmacion(valor)
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" onClick={() => responder(false)}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <p className="modal-mensaje">{mensaje}</p>
        <p className="ayuda-mini">Esta acción no se puede deshacer.</p>
        <div className="modal-acciones">
          <button type="button" className="modal-cancelar" onClick={() => responder(false)}>
            Cancelar
          </button>
          <button type="button" className="modal-confirmar" onClick={() => responder(true)} autoFocus>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
