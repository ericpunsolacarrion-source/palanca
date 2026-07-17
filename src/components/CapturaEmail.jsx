import { useState } from 'react'
import { emailValido, guardarEmail } from '../lib/perfil'
import { toast } from '../lib/toast'

// Banner para usuarios que se registraron antes de pedir el correo:
// se muestra hasta que lo dejan guardado.
export default function CapturaEmail({ usuarioId, onGuardado }) {
  const [email, setEmail] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!emailValido(email)) {
      setError('Introduce un correo válido (ej. nombre@correo.com).')
      return
    }
    setGuardando(true)
    setError(null)
    const ok = await guardarEmail(usuarioId, email)
    setGuardando(false)
    if (!ok) {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
      return
    }
    toast('Correo guardado')
    onGuardado(email.trim().toLowerCase())
  }

  return (
    <form className="captura-email fade-in-up" onSubmit={handleSubmit}>
      <span className="captura-email-titulo">Completa tu cuenta</span>
      <p className="ayuda-mini">
        Deja tu correo para avisarte de novedades y ayudarte a recuperar tu cuenta.
      </p>
      <div className="captura-email-fila">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          placeholder="nombre@correo.com"
          aria-label="Tu correo electrónico"
        />
        <button type="submit" disabled={guardando || !email}>
          {guardando ? '…' : 'Guardar'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
