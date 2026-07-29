import { useEffect, useMemo, useRef, useState } from 'react'
import { construirResumenIA } from '../lib/resumenParaIA'
import { useObjetivosCompartidos } from '../lib/DatosCompartidos'
import { supabase } from '../lib/supabaseClient'

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
  const { objetivos } = useObjetivosCompartidos()
  const finRef = useRef(null)

  // Resumen anónimo y agregado (fuente única: movimientosUtils). Se calcula una
  // vez y se reutiliza para el contexto de cada pregunta y para mostrar los
  // insights al abrir Fulcro. Los insights ya vienen redactados con cautela
  // (los que tocan liquidez/patrimonio no reconciliado llevan su reserva).
  const resumen = useMemo(
    () => construirResumenIA(movimientos, { objetivos, objetivo: objetivo?.texto ?? null }),
    [movimientos, objetivos, objetivo],
  )
  const insights = resumen.insights ?? []

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
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/consultor', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ resumen, pregunta, historial: historialPrevio }),
      })
      const datos = await res.json().catch(() => ({}))

      if (!res.ok) {
        const aviso =
          datos.code === 'no_autorizado'
            ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
            : datos.code === 'sin_configurar'
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
                    hacia la inversión. También te explico conceptos (interés compuesto, ETFs,
                    colchón de emergencia…) con tus datos delante.
                  </p>

                  {/* Insights: aparecen al ABRIR Fulcro (nunca como notificación
                      que interrumpa), en tono calmado y constructivo. Base para
                      la proactividad futura; ya redactados con cautela. */}
                  {insights.length > 0 && (
                    <div className="consultor-insights">
                      <span className="consultor-insights-titulo">He visto en tus números</span>
                      <ul>
                        {insights.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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
