import { useState } from 'react'
import { cambiarPassword, cerrarSesionAuth, MSG_ENLACE_CADUCADO, mensajeErrorAuth } from '../lib/auth'
import { BotonOjo } from './Auth'
import { Marca } from './Icono'
import { toast } from '../lib/toast'

const MIN = 8

// Validación local antes de llamar a Supabase (que tiene sus propias reglas).
export function validarNuevaPassword(nueva, repetida) {
  if (nueva.length < MIN) return `La contraseña debe tener al menos ${MIN} caracteres.`
  if (!/[a-zA-Z]/.test(nueva) || !/\d/.test(nueva)) return 'Mezcla letras y números para que sea más segura.'
  if (nueva !== repetida) return 'Las dos contraseñas no coinciden.'
  return null
}

// Pantalla a la que llega el enlace «Restablecer contraseña» del correo: la
// sesión de recuperación ya está abierta; aquí se elige la nueva.
export default function NuevaContrasena({ onHecho }) {
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const caducado = error === MSG_ENLACE_CADUCADO

  async function guardar(e) {
    e.preventDefault()
    const local = validarNuevaPassword(nueva, repetida)
    if (local) return setError(local)
    setGuardando(true)
    setError(null)
    const { error: err } = await cambiarPassword(nueva)
    setGuardando(false)
    if (err) return setError(mensajeErrorAuth(err, 'nueva-password'))
    toast('Contraseña cambiada. Ya estás dentro.')
    onHecho?.()
  }

  async function pedirOtro() {
    await cerrarSesionAuth()
    window.location.assign('/?modo=recuperar')
  }

  return (
    <div className="acceso">
      <div className="acceso-caja fade-in-up" data-testid="nueva-contrasena">
        <span className="acceso-marca"><Marca /></span>
        <h2 className="acceso-titulo">Elige tu nueva contraseña</h2>
        <form onSubmit={guardar} className="acceso-form" noValidate>
          <label htmlFor="nueva-pass">Nueva contraseña</label>
          <div className="acceso-pass-wrap">
            <input
              id="nueva-pass"
              type={ver ? 'text' : 'password'}
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => { setNueva(e.target.value); if (error) setError(null) }}
              placeholder={`Mínimo ${MIN} caracteres, letras y números`}
              autoFocus
            />
            <BotonOjo mostrar={ver} onToggle={() => setVer((v) => !v)} />
          </div>
          <label htmlFor="nueva-pass-2">Repítela</label>
          <div className="acceso-pass-wrap">
            <input
              id="nueva-pass-2"
              type={ver ? 'text' : 'password'}
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => { setRepetida(e.target.value); if (error) setError(null) }}
              placeholder="La misma otra vez"
            />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {caducado ? (
            <button type="button" className="acceso-boton" onClick={pedirOtro}>Pedir otro enlace</button>
          ) : (
            <button type="submit" className="acceso-boton" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar contraseña'}</button>
          )}
        </form>
      </div>
    </div>
  )
}
