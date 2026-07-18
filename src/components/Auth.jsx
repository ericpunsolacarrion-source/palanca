import { useState } from 'react'
import { emailValido } from '../lib/perfil'
import { iniciarSesion, recuperarPassword, registrar, traducirErrorAuth } from '../lib/auth'

// Pantalla de acceso: iniciar sesión / crear cuenta / recuperar contraseña.
// Lo primero que ve la gente, así que cuidada y en la línea oscura de Palanca.
export default function Auth({ onAccesoAntiguo }) {
  const [modo, setModo] = useState('login') // 'login' | 'registro' | 'recuperar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  const emailOk = emailValido(email)

  function cambiarModo(nuevo) {
    setModo(nuevo)
    setError(null)
    setAviso(null)
    setPassword('')
    setPassword2('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setAviso(null)

    if (!emailOk) return setError('Introduce un email válido.')

    if (modo === 'recuperar') {
      setCargando(true)
      const { error: err } = await recuperarPassword(email)
      setCargando(false)
      if (err) return setError(traducirErrorAuth(err.message))
      setAviso('Si ese email tiene cuenta, te hemos enviado un enlace para restablecer la contraseña.')
      return
    }

    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')

    if (modo === 'registro') {
      if (password !== password2) return setError('Las contraseñas no coinciden.')
      setCargando(true)
      const { data, error: err } = await registrar(email, password)
      setCargando(false)
      if (err) return setError(traducirErrorAuth(err.message))
      // Si el proyecto exige confirmar el email, no hay sesión todavía.
      if (!data.session) {
        setAviso('Cuenta creada. Revisa tu correo (también spam) y confirma tu email para entrar.')
        setModo('login')
      }
      // Si hay sesión, onAuthStateChange en App entra solo.
      return
    }

    // login
    setCargando(true)
    const { error: err } = await iniciarSesion(email, password)
    setCargando(false)
    if (err) return setError(traducirErrorAuth(err.message))
    // La entrada la gestiona App al detectar la sesión.
  }

  const titulo =
    modo === 'registro' ? 'Crea tu cuenta' : modo === 'recuperar' ? 'Recuperar contraseña' : 'Bienvenido de nuevo'

  return (
    <div className="acceso">
      <div className="acceso-caja fade-in-up">
        <h1 className="acceso-logo">Palanca</h1>
        <p className="acceso-sub">Estructura tus finanzas desde el inicio.</p>

        <div className="acceso-tabs">
          <button
            type="button"
            className={modo === 'login' ? 'activo' : ''}
            onClick={() => cambiarModo('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={modo === 'registro' ? 'activo' : ''}
            onClick={() => cambiarModo('registro')}
          >
            Crear cuenta
          </button>
        </div>

        <h2 className="acceso-titulo">{titulo}</h2>

        <form onSubmit={handleSubmit} className="acceso-form">
          <label htmlFor="acceso-email">Email</label>
          <input
            id="acceso-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError(null)
            }}
            placeholder="nombre@correo.com"
            className={email && emailOk ? 'campo-ok' : ''}
            autoFocus
          />

          {modo !== 'recuperar' && (
            <>
              <label htmlFor="acceso-pass">Contraseña</label>
              <input
                id="acceso-pass"
                type="password"
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="Mínimo 6 caracteres"
              />
            </>
          )}

          {modo === 'registro' && (
            <>
              <label htmlFor="acceso-pass2">Repite la contraseña</label>
              <input
                id="acceso-pass2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => {
                  setPassword2(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="Repite la contraseña"
              />
            </>
          )}

          {error && <p className="error">{error}</p>}
          {aviso && <p className="acceso-aviso">{aviso}</p>}

          <button type="submit" className="acceso-boton" disabled={cargando}>
            {cargando
              ? 'Un momento…'
              : modo === 'registro'
                ? 'Crear cuenta'
                : modo === 'recuperar'
                  ? 'Enviar enlace'
                  : 'Entrar'}
          </button>
        </form>

        {modo === 'login' && (
          <button type="button" className="link acceso-link" onClick={() => cambiarModo('recuperar')}>
            ¿Has olvidado tu contraseña?
          </button>
        )}
        {modo === 'recuperar' && (
          <button type="button" className="link acceso-link" onClick={() => cambiarModo('login')}>
            ← Volver a iniciar sesión
          </button>
        )}

        {onAccesoAntiguo && (
          <button type="button" className="acceso-antiguo" onClick={onAccesoAntiguo}>
            Acceso antiguo por ID
          </button>
        )}
      </div>
    </div>
  )
}
