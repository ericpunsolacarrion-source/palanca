import { useState } from 'react'
import { emailValido } from '../lib/perfil'

const OBJETIVOS = [
  { valor: 'ahorro', titulo: 'Ahorrar', descripcion: 'Construir un colchón y ahorrar de forma constante' },
  { valor: 'jubilacion', titulo: 'Jubilación', descripcion: 'Planificar a largo plazo pensando en el futuro' },
  { valor: 'planificacion', titulo: 'Planificación', descripcion: 'Entender y organizar mejor mis finanzas' },
  { valor: 'otro', titulo: 'Otro', descripcion: 'Tengo otro objetivo en mente' },
]

export default function Onboarding({ onCompletar }) {
  const [seleccion, setSeleccion] = useState(null)
  const [email, setEmail] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function handleContinuar() {
    if (!seleccion) return
    if (!emailValido(email)) {
      setError('Introduce un correo válido (ej. nombre@correo.com).')
      return
    }
    setGuardando(true)
    setError(null)
    const ok = await onCompletar(seleccion, email)
    // Si sale bien, este componente se desmonta; si no, reactivamos el botón.
    if (!ok) {
      setGuardando(false)
      setError('No se ha podido crear tu cuenta. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  return (
    <div className="onboarding">
      <h1>Bienvenido a Palanca</h1>
      <p className="ayuda">¿Cuál es tu objetivo principal ahora mismo?</p>

      <div className="opciones-objetivo">
        {OBJETIVOS.map((o) => (
          <button
            key={o.valor}
            type="button"
            className={seleccion === o.valor ? 'opcion activo' : 'opcion'}
            onClick={() => setSeleccion(o.valor)}
          >
            <span className="titulo">{o.titulo}</span>
            <span className="descripcion">{o.descripcion}</span>
          </button>
        ))}
      </div>

      <div className="onboarding-email">
        <label htmlFor="email-onboarding">Tu correo electrónico</label>
        <input
          id="email-onboarding"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@correo.com"
        />
        <p className="ayuda-mini">
          Lo usaremos para avisarte de novedades y para ayudarte a recuperar tu cuenta.
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <button
        type="button"
        className="continuar"
        disabled={!seleccion || guardando}
        onClick={handleContinuar}
      >
        {guardando ? 'Preparando tu cuenta…' : 'Continuar'}
      </button>
    </div>
  )
}
