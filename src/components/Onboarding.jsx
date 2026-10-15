import { useState } from 'react'
import { nombrePropio } from '../lib/nombrePropio'
import { emailValido } from '../lib/perfil'
import InputImporte from './InputImporte'
import Icono, { Marca } from './Icono'

// Alta en pasos cortos: UNA pregunta por pantalla, con barra de progreso y
// "lo pongo después" en lo opcional. Se siente rápido (cada paso es un toque)
// y nada bloquea la entrada salvo el objetivo, que se elige con un toque.
const OBJETIVOS = [
  { valor: 'planificacion', titulo: 'Saber en qué se me va el dinero', descripcion: 'Orden y claridad, sin hojas de cálculo' },
  { valor: 'suscripciones', titulo: 'Controlar suscripciones y recibos', descripcion: 'Cuánto pago, cuándo y si algo sube' },
  { valor: 'ahorro', titulo: 'Ahorrar más cada mes', descripcion: 'Un colchón y un ritmo constante' },
  { valor: 'jubilacion', titulo: 'Preparar mi futuro', descripcion: 'Invertir y pensar a largo plazo' },
]

const ANIO_ACTUAL = new Date().getFullYear()

export default function Onboarding({ onCompletar, emailInicial }) {
  // Con cuenta de Auth el email ya se conoce: no se vuelve a pedir.
  const cuentaAuth = Boolean(emailInicial)
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState('')
  const [seleccion, setSeleccion] = useState(null)
  const [email, setEmail] = useState(emailInicial ?? '')
  const [saldoInicial, setSaldoInicial] = useState(null)
  const [anioNacimiento, setAnioNacimiento] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const pasos = ['nombre', 'objetivo', ...(cuentaAuth ? [] : ['email']), 'saldo', 'edad']
  const actual = pasos[paso]
  const ultimo = paso === pasos.length - 1
  const anioValido = /^\d{4}$/.test(anioNacimiento) && Number(anioNacimiento) >= 1900 && Number(anioNacimiento) <= ANIO_ACTUAL - 14

  async function terminar(anio) {
    setGuardando(true)
    setError(null)
    const saldo = Number(saldoInicial)
    try {
      const ok = await onCompletar(
        seleccion,
        email,
        Number.isFinite(saldo) && saldo > 0 ? saldo : 0,
        anio,
        nombrePropio(nombre) || null,
      )
      // Si sale bien, este componente se desmonta; si no, se reactiva el botón.
      if (!ok) {
        setGuardando(false)
        setError('No se ha podido crear tu cuenta. Revisa tu conexión e inténtalo de nuevo.')
      }
    } catch {
      // Nunca dejar el botón colgado: la entrada debe ser infalible.
      setGuardando(false)
      setError('No se ha podido crear tu cuenta. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  function siguiente() {
    setError(null)
    if (actual === 'email' && !emailValido(email)) return setError('Introduce un correo válido (ej. nombre@correo.com).')
    if (actual === 'objetivo' && !seleccion) return setError('Elige una opción para seguir.')
    if (ultimo) return terminar(anioValido ? Number(anioNacimiento) : null)
    setPaso(paso + 1)
  }

  function saltar() {
    setError(null)
    if (actual === 'saldo') setSaldoInicial(null)
    if (actual === 'edad') return terminar(null)
    setPaso(paso + 1)
  }

  const saludo = nombre.trim() ? `${nombrePropio(nombre).split(' ')[0]}, ` : ''

  return (
    <div className="ob">
      <header className="ob-cab">
        {paso > 0 ? (
          <button type="button" className="ob-atras" onClick={() => setPaso(paso - 1)} aria-label="Paso anterior" disabled={guardando}>
            <Icono nombre="chevron" tam={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
        ) : (
          <Marca tam={24} />
        )}
        <div className="ob-progreso" role="progressbar" aria-valuemin={1} aria-valuemax={pasos.length} aria-valuenow={paso + 1} aria-label={`Paso ${paso + 1} de ${pasos.length}`}>
          <span style={{ width: `${((paso + 1) / pasos.length) * 100}%` }} />
        </div>
      </header>

      <form
        key={actual}
        className="ob-paso fade-in-up"
        onSubmit={(e) => {
          e.preventDefault()
          siguiente()
        }}
      >
        {actual === 'nombre' && (
          <>
            <h1 className="ob-titulo">Te damos la bienvenida a Palanca</h1>
            <p className="ob-sub">Cuatro preguntas rápidas y te enseñamos cómo se ve tu dinero ordenado.</p>
            <label className="ob-label" htmlFor="ob-nombre">¿Cómo te llamamos?</label>
            <input
              id="ob-nombre"
              className="ob-input"
              type="text"
              autoComplete="given-name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              maxLength={40}
              autoFocus
            />
          </>
        )}

        {actual === 'objetivo' && (
          <>
            <h1 className="ob-titulo">{saludo}¿qué te gustaría conseguir?</h1>
            <p className="ob-sub">Elige lo principal. Palanca te ayuda con todo lo demás igualmente.</p>
            <div className="ob-opciones" role="radiogroup" aria-label="Tu objetivo">
              {OBJETIVOS.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  role="radio"
                  aria-checked={seleccion === o.valor}
                  className={`ob-opcion ${seleccion === o.valor ? 'activo' : ''}`}
                  onClick={() => {
                    setSeleccion(o.valor)
                    setError(null)
                    // Un toque basta: avanza solo tras marcarlo.
                    setTimeout(() => setPaso((p) => (p === paso ? p + 1 : p)), 220)
                  }}
                >
                  <span className="ob-opcion-titulo">{o.titulo}</span>
                  <span className="ob-opcion-desc">{o.descripcion}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {actual === 'email' && (
          <>
            <h1 className="ob-titulo">¿Tu correo?</h1>
            <p className="ob-sub">Para recuperar tu cuenta si lo necesitas.</p>
            <input
              id="ob-email"
              className="ob-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              autoFocus
            />
          </>
        )}

        {actual === 'saldo' && (
          <>
            <h1 className="ob-titulo">¿Cuánto tienes hoy en tu cuenta?</h1>
            <p className="ob-sub">
              Aproximado vale. Es tu punto de partida: así tu patrimonio sale real desde el primer día. Puedes
              ajustarlo cuando quieras.
            </p>
            <InputImporte value={saldoInicial} onValueChange={setSaldoInicial} placeholder="0" autoFocus aria-label="Dinero que tienes hoy" />
          </>
        )}

        {actual === 'edad' && (
          <>
            <h1 className="ob-titulo">¿En qué año naciste?</h1>
            <p className="ob-sub">Solo para ajustar las simulaciones (jubilación, independencia financiera) a tu edad.</p>
            <input
              id="ob-anio"
              className="ob-input"
              type="text"
              inputMode="numeric"
              autoComplete="bday-year"
              maxLength={4}
              value={anioNacimiento}
              onChange={(e) => setAnioNacimiento(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder={`Ej. ${ANIO_ACTUAL - 30}`}
              autoFocus
            />
            {anioNacimiento.length === 4 && !anioValido && (
              <p className="ob-nota">Revisa el año: debe estar entre 1900 y {ANIO_ACTUAL - 14}.</p>
            )}
          </>
        )}

        {error && <p className="error">{error}</p>}

        <div className="ob-acciones">
          {actual !== 'objetivo' && (
            <button
              type="submit"
              className="ob-continuar"
              disabled={guardando || (actual === 'edad' && anioNacimiento !== '' && !anioValido)}
            >
              {guardando ? 'Preparando tu Palanca…' : ultimo ? 'Empezar' : 'Continuar'}
            </button>
          )}
          {(actual === 'saldo' || actual === 'edad') && (
            <button type="button" className="ob-saltar" onClick={saltar} disabled={guardando}>
              {actual === 'edad' ? 'Prefiero no decirlo' : 'Lo pongo después'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
