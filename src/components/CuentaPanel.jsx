import { useState } from 'react'
import { createPortal } from 'react-dom'
import { borrarCuenta } from '../lib/auth'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'

// Panel de cuenta (usuarios de Auth): ver email, cerrar sesión y borrar la
// cuenta con todos sus datos (derecho de supresión).
export default function CuentaPanel({ email, onCerrar, onCerrarSesion }) {
  const [borrando, setBorrando] = useState(false)

  async function handleBorrar() {
    const seguro = await confirmar(
      'Esto borrará tu cuenta y TODOS tus datos (movimientos, inversiones, objetivos…) de forma permanente e irreversible. ¿Continuar?',
    )
    if (!seguro) return
    setBorrando(true)
    const { ok } = await borrarCuenta()
    setBorrando(false)
    if (ok) {
      toast('Cuenta y datos eliminados')
      onCerrar()
      // signOut ya se llamó dentro de borrarCuenta; el cambio de sesión recarga la vista.
    } else {
      toast('No se ha podido borrar la cuenta. Inténtalo de nuevo.', 'error')
    }
  }

  return createPortal(
    <div className="cuenta-overlay" onClick={onCerrar}>
      <section
        className="cuenta-caja"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Tu cuenta"
      >
        <header className="cuenta-cab">
          <h2>Tu cuenta</h2>
          <button type="button" className="consultor-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>

        <p className="cuenta-email">
          Sesión iniciada como <strong>{email}</strong>
        </p>

        <button type="button" className="cuenta-boton" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>

        <div className="cuenta-peligro">
          <span className="cuenta-peligro-titulo">Zona peligrosa</span>
          <p className="ayuda-mini">
            Borrar tu cuenta elimina de forma permanente todos tus datos. No se puede deshacer.
          </p>
          <button
            type="button"
            className="cuenta-borrar"
            onClick={handleBorrar}
            disabled={borrando}
          >
            {borrando ? 'Borrando…' : 'Borrar mi cuenta y todos mis datos'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
