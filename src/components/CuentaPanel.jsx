import { useState } from 'react'
import { createPortal } from 'react-dom'
import { borrarCuenta } from '../lib/auth'
import { actualizarPerfil } from '../lib/perfil'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'

// Panel de cuenta (usuarios de Auth): editar nombre y año de nacimiento, ver
// email, cerrar sesión y borrar la cuenta con todos sus datos (supresión).
export default function CuentaPanel({ email, perfil, usuarioId, onPerfilActualizado, onCerrar, onCerrarSesion }) {
  const [nombre, setNombre] = useState(perfil?.nombre ?? '')
  const [anio, setAnio] = useState(perfil?.anio_nacimiento ? String(perfil.anio_nacimiento) : '')
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState(false)

  const cambiado =
    (nombre.trim() || null) !== (perfil?.nombre ?? null) ||
    (/^\d{4}$/.test(anio) ? Number(anio) : null) !== (perfil?.anio_nacimiento ?? null)

  async function handleGuardar() {
    setGuardando(true)
    const campos = {
      nombre: nombre.trim() || null,
      anio_nacimiento: /^\d{4}$/.test(anio) ? Number(anio) : null,
    }
    const actualizado = await actualizarPerfil(usuarioId, campos)
    setGuardando(false)
    if (actualizado) {
      onPerfilActualizado?.(actualizado)
      toast('Perfil actualizado')
    } else {
      toast('No se ha podido guardar. Inténtalo de nuevo.', 'error')
    }
  }

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

        <div className="cuenta-form">
          <label htmlFor="cuenta-nombre">Nombre</label>
          <input
            id="cuenta-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej. Eric"
          />

          <label htmlFor="cuenta-anio">Año de nacimiento</label>
          <input
            id="cuenta-anio"
            type="number"
            inputMode="numeric"
            min="1900"
            max="2025"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            placeholder="ej. 1998"
          />

          <button
            type="button"
            className="cuenta-boton cuenta-guardar"
            onClick={handleGuardar}
            disabled={guardando || !cambiado}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        <button type="button" className="cuenta-boton" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>

        <div className="cuenta-peligro">
          <span className="cuenta-peligro-titulo">Zona peligrosa</span>
          <p className="ayuda-mini">
            Borrar tu cuenta elimina de forma permanente todos tus datos. No se puede deshacer.
          </p>
          <button type="button" className="cuenta-borrar" onClick={handleBorrar} disabled={borrando}>
            {borrando ? 'Borrando…' : 'Borrar mi cuenta y todos mis datos'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
