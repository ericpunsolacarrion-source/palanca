import { useEffect, useRef, useState } from 'react'
import { construirResumenIA } from '../lib/resumenParaIA'
import { useObjetivosAhorro } from '../lib/useObjetivosAhorro'

const SUGERENCIAS = [
  '¿Voy bien este mes?',
  '¿En qué se me va más el dinero?',
  '¿Qué es la inversión y por dónde empiezo?',
  '¿Cómo podría ahorrar un poco más?',
]

export default function Consultor({ movimientos, objetivo }) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [entrada, setEntrada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { objetivos } = useObjetivosAhorro(objetivo?.usuarioId ?? null)
  const finRef = useRef(null)

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, abierto, enviando])

  async function preguntar(texto) {
    const pregunta = texto.trim()
    if (!pregunta || enviando) return

    const historialPrevio = mensajes
    setMensajes((prev) => [...prev, { rol: 'usuario', texto: pregunta }])
    setEntrada('')
    setEnviando(true)

    try {
      const resumen = construirResumenIA(movimientos, {
        objetivos,
        objetivo: objetivo?.texto ?? null,
      })
      const res = await fetch('/api/consultor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resumen, pregunta, historial: historialPrevio }),
      })
      const datos = await res.json().catch(() => ({}))

      if (!res.ok) {
        const aviso =
          datos.code === 'sin_configurar'
            ? 'El consultor todavía no está activado. Vuelve pronto.'
            : datos.error || 'Ahora mismo no puedo responder. Inténtalo en un momento.'
        setMensajes((prev) => [...prev, { rol: 'consultor', texto: aviso, error: true }])
      } else {
        setMensajes((prev) => [...prev, { rol: 'consultor', texto: datos.respuesta }])
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        { rol: 'consultor', texto: 'No he podido conectar. Revisa tu conexión.', error: true },
      ])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="consultor-fab"
        onClick={() => setAbierto(true)}
        aria-label="Abrir Fulcro, tu consultor de finanzas"
      >
        <span className="consultor-fab-icono">✦</span>
        Fulcro
      </button>

      {abierto && (
        <div className="consultor-overlay" onClick={() => setAbierto(false)}>
          <section
            className="consultor-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Fulcro, consultor de finanzas"
          >
            <header className="consultor-cabecera">
              <div>
                <h2>Fulcro</h2>
                <p className="consultor-sub">Tu consultor en Palanca</p>
              </div>
              <button
                type="button"
                className="consultor-cerrar"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <div className="consultor-mensajes">
              {mensajes.length === 0 && (
                <div className="consultor-bienvenida">
                  <p>
                    Soy <strong>Fulcro</strong>. Pregúntame sobre tus finanzas y te oriento con tus
                    propios números: cómo vas, en qué se te va el dinero o cómo dar tu primer paso
                    hacia la inversión.
                  </p>
                  <div className="consultor-sugerencias">
                    {SUGERENCIAS.map((s) => (
                      <button key={s} type="button" onClick={() => preguntar(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensajes.map((m, i) => (
                <div key={i} className={`consultor-burbuja ${m.rol} ${m.error ? 'error' : ''}`}>
                  {m.texto}
                </div>
              ))}

              {enviando && (
                <div className="consultor-burbuja consultor pensando">
                  <span className="consultor-punto" />
                  <span className="consultor-punto" />
                  <span className="consultor-punto" />
                </div>
              )}
              <div ref={finRef} />
            </div>

            <form
              className="consultor-entrada"
              onSubmit={(e) => {
                e.preventDefault()
                preguntar(entrada)
              }}
            >
              <input
                type="text"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                placeholder="Escribe tu pregunta…"
                aria-label="Tu pregunta"
                maxLength={2000}
                disabled={enviando}
              />
              <button type="submit" disabled={enviando || !entrada.trim()}>
                Enviar
              </button>
            </form>

            <p className="consultor-disclaimer">
              Orientación educativa, no asesoramiento financiero. No sustituye a un profesional.
            </p>
          </section>
        </div>
      )}
    </>
  )
}
