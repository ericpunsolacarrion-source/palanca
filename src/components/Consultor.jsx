import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icono from './Icono'
import { construirResumenIA } from '../lib/resumenParaIA'
import { contextoParaPregunta, respuestaDeCortesia } from '../lib/contextoFulcro'
import { useObjetivosCompartidos, usePresupuestoCompartido } from '../lib/DatosCompartidos'
import { supabase } from '../lib/supabaseClient'
import { leerDescartadas } from '../lib/suscripciones'
import { EVENTO_FULCRO } from '../lib/fulcro'
import { respuestaLocal } from '../lib/respuestasLocales'
import { registrarEvento } from '../lib/analitica'

// ─── ACTIVAR FULCRO ──────────────────────────────────────────────────────────
// Fulcro se activa cuando el servidor tiene la clave (ANTHROPIC_API_KEY en
// Vercel) y, en fase de pruebas, SOLO en los despliegues de prueba (develop →
// "Preview"); en producción sigue en "Próximamente" hasta FULCRO_PUBLICO=true.
// Al abrir el panel se pregunta a /api/consultor (GET) si está activo. En local
// sin servidor de /api, se puede forzar con VITE_FULCRO_ACTIVO=true en .env.
const FORZAR_ACTIVO = import.meta.env.VITE_FULCRO_ACTIVO === 'true'

// Abrir Fulcro con una pregunta desde cualquier pantalla: preguntarAFulcro() en lib/fulcro.js.

// Sin nada apuntado todavía: preguntas de arranque (no dependen de sus datos).
const PARA_EMPEZAR = [
  '¿Por dónde empiezo a ordenar mi dinero?',
  '¿Qué gastos me conviene apuntar?',
  '¿Qué es un colchón de emergencia?',
  '¿Cómo funciona el interés compuesto?',
]

const BASICAS = [
  '¿Voy bien este mes?',
  '¿En qué se me va más el dinero?',
  '¿Cómo podría ahorrar un poco más?',
  '¿Qué es la inversión y por dónde empiezo?',
]

// Sugerencias a partir de SUS datos (lo más útil primero), completadas con las
// básicas hasta 4. Así la primera pregunta ya es relevante para él.
function sugerenciasDe(resumen) {
  const s = []
  const subida = resumen.fijos?.avisos?.find((a) => a.includes('ha subido de precio'))
  if (subida) s.push(`¿Me compensa seguir con ${subida.split(' ha subido')[0]}?`)
  if (resumen.presupuesto?.configurado) s.push('¿Cómo voy con mi presupuesto este mes?')
  const obj = resumen.objetivosAhorro?.find((o) => o.progresoPct < 100)
  if (obj) s.push(`¿Cuándo llegaré a «${obj.nombre}»?`)
  if ((resumen.fijos?.nCompromisos ?? 0) >= 3) s.push('¿Qué suscripciones podría revisar?')
  // Se responde al momento, sin IA (lib/respuestasLocales.js).
  if ((resumen.fijos?.nCompromisos ?? 0) >= 1) s.push('¿Cuánto pago en fijos al mes?')
  for (const b of BASICAS) if (s.length < 4 && !s.includes(b)) s.push(b)
  return s.slice(0, 4)
}

// Texto de Fulcro con formato mínimo y SEGURO (sin HTML): párrafos, listas con
// "- " y **negrita**. Todo se pinta como elementos de React.
function enLinea(texto) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
    t.startsWith('**') && t.endsWith('**') ? <strong key={i}>{t.slice(2, -2)}</strong> : t,
  )
}
function TextoFulcro({ texto }) {
  const bloques = []
  for (const linea of texto.split('\n')) {
    const item = linea.match(/^\s*[-•*]\s+(.*)/)
    const ultimo = bloques.at(-1)
    if (item) {
      if (ultimo?.tipo === 'lista') ultimo.items.push(item[1])
      else bloques.push({ tipo: 'lista', items: [item[1]] })
    } else if (linea.trim() === '') {
      bloques.push({ tipo: 'corte' })
    } else if (ultimo?.tipo === 'parrafo') {
      ultimo.texto += ` ${linea.trim()}`
    } else {
      bloques.push({ tipo: 'parrafo', texto: linea.trim() })
    }
  }
  return bloques
    .filter((b) => b.tipo !== 'corte')
    .map((b, i) =>
      b.tipo === 'lista' ? (
        <ul key={i}>
          {b.items.map((it, j) => (
            <li key={j}>{enLinea(it)}</li>
          ))}
        </ul>
      ) : (
        <p key={i}>{enLinea(b.texto)}</p>
      ),
    )
}

// Conversación de la sesión (comodidad: sobrevive a cerrar el panel o recargar,
// se olvida al cerrar el navegador). No es un dato del motor.
const claveSesion = (usuarioId) => `palanca_fulcro_conversacion_${usuarioId}`
function leerConversacion(usuarioId) {
  try {
    const arr = JSON.parse(sessionStorage.getItem(claveSesion(usuarioId)) || '[]')
    return Array.isArray(arr) ? arr.filter((m) => !m.pendiente) : []
  } catch {
    return []
  }
}

export default function Consultor({ movimientos, objetivo, recurrentes = [], ejemplo = false }) {
  const usuarioId = objetivo?.usuarioId ?? 'anon'
  const [activo, setActivo] = useState(FORZAR_ACTIVO ? true : null) // null = sin comprobar
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState(() => leerConversacion(usuarioId))
  const [entrada, setEntrada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [restantes, setRestantes] = useState(null) // preguntas que quedan hoy (null = sin dato)
  const [preguntaPendiente, setPreguntaPendiente] = useState(null)
  const { objetivos } = useObjetivosCompartidos()
  const presupuesto = usePresupuestoCompartido()
  const finRef = useRef(null)

  // Resumen anónimo y agregado del motor (fuente única: movimientosUtils). Solo
  // se calcula con el panel ABIERTO (recorre todo el histórico: no tiene sentido
  // hacerlo en cada render de la app) y con dependencias estables (primitivos).
  const objetivoTexto = objetivo?.texto ?? null
  const { metodo, tasaAhorroObjetivo, gastoMaximoFijo, objetivoInversionMensual, configurado } = presupuesto
  const resumen = useMemo(
    () =>
      abierto
        ? {
            ...construirResumenIA(movimientos, {
              objetivos: ejemplo ? [] : objetivos,
              objetivo: objetivoTexto,
              recurrentes,
              presupuesto: { metodo, tasaAhorroObjetivo, gastoMaximoFijo, objetivoInversionMensual, configurado },
              descartadas: leerDescartadas(usuarioId),
            }),
            // Con los datos de ejemplo (usuario nuevo), Fulcro lo sabe y lo dice.
            ...(ejemplo ? { datosDeEjemplo: true } : {}),
          }
        : null,
    [abierto, movimientos, objetivos, objetivoTexto, recurrentes, metodo, tasaAhorroObjetivo, gastoMaximoFijo, objetivoInversionMensual, configurado, usuarioId, ejemplo],
  )
  const insights = resumen?.insights ?? []
  const sinDatos = movimientos.length === 0
  const sugerencias = useMemo(
    () => (sinDatos ? PARA_EMPEZAR : resumen ? sugerenciasDe(resumen) : BASICAS),
    [resumen, sinDatos],
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(claveSesion(usuarioId), JSON.stringify(mensajes.slice(-30)))
    } catch {
      // sin persistencia: la conversación dura mientras el panel esté montado
    }
  }, [mensajes, usuarioId])

  // ¿Está Fulcro activo en el servidor? Se comprueba la primera vez que se abre.
  useEffect(() => {
    if (!abierto || activo !== null) return
    let vigente = true
    fetch('/api/consultor')
      .then((r) => (r.ok ? r.json() : { activo: false }))
      .then((d) => vigente && setActivo(Boolean(d.activo)))
      .catch(() => vigente && setActivo(false))
    return () => {
      vigente = false
    }
  }, [abierto, activo])

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensajes, abierto])

  const actualizarUltimo = (cambios) =>
    setMensajes((prev) => {
      const copia = [...prev]
      copia[copia.length - 1] = { ...copia[copia.length - 1], ...cambios(copia[copia.length - 1]) }
      return copia
    })

  const preguntar = useCallback(
    async (texto, { forzarIA = false } = {}) => {
      const pregunta = texto.trim()
      if (!pregunta || enviando || !resumen) return

      const ultimaDeFulcro = [...mensajes].reverse().find((m) => m.rol === 'consultor' && !m.local)?.texto ?? ''
      const cortesia = respuestaDeCortesia(pregunta, ultimaDeFulcro)
      if (cortesia) {
        // Ambos marcados `local`: no se reenvían a la IA ni ocupan su historial.
        setMensajes((prev) => [
          ...prev,
          { rol: 'usuario', texto: pregunta, local: true },
          { rol: 'consultor', texto: cortesia, local: true },
        ])
        setEntrada('')
        return
      }

      // Preguntas de DATOS ("¿cuánto he gastado en gasolina…?"): se calculan
      // aquí, al momento y sin IA (gratis, no gastan preguntas del día).
      const local = forzarIA ? null : respuestaLocal(pregunta, { movimientos, recurrentes })
      if (local) {
        setMensajes((prev) => [
          ...prev,
          { rol: 'usuario', texto: pregunta, local: true },
          { rol: 'consultor', texto: local, local: true, alMomento: true, pregunta },
        ])
        setEntrada('')
        registrarEvento('fulcro_local')
        return
      }
      if (restantes === 0) {
        setMensajes((prev) => [
          ...prev,
          { rol: 'usuario', texto: pregunta, local: true },
          {
            rol: 'consultor',
            local: true,
            texto: 'Has usado tus preguntas de hoy. Las de **datos** siguen funcionando al momento: por ejemplo, «¿cuánto he gastado en gasolina los últimos 3 meses?» o «¿cuánto pago en fijos al mes?».',
          },
        ])
        setEntrada('')
        return
      }

      // Las respuestas locales no se reenvían a la IA (no aportan contexto).
      const historialPrevio = mensajes.filter((m) => !m.error && !m.pendiente && !m.local)
      setMensajes((prev) => [
        ...prev,
        { rol: 'usuario', texto: pregunta },
        { rol: 'consultor', texto: '', pendiente: true },
      ])
      setEntrada('')
      setEnviando(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const res = await fetch('/api/consultor', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({
            resumen,
            detalle: contextoParaPregunta(pregunta, movimientos),
            pregunta,
            historial: historialPrevio,
            stream: true,
          }),
        })

        if (!res.ok || !res.body) {
          const datos = await res.json().catch(() => ({}))
          const aviso =
            datos.code === 'no_autorizado'
              ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
              : datos.code === 'sin_configurar'
                ? 'Fulcro todavía no está activado. Vuelve pronto.'
                : datos.error || 'Ahora mismo no puedo responder. Inténtalo en un momento.'
          actualizarUltimo(() => ({ texto: aviso, error: true, pendiente: false }))
          if (datos.code === 'limite_diario') setRestantes(0)
          return
        }

        // Respuesta en streaming (líneas JSON): se pinta según llega.
        const lector = res.body.getReader()
        const decodificador = new TextDecoder()
        let resto = ''
        for (;;) {
          const { value, done } = await lector.read()
          if (done) break
          resto += decodificador.decode(value, { stream: true })
          const lineas = resto.split('\n')
          resto = lineas.pop()
          for (const linea of lineas) {
            if (!linea.trim()) continue
            let ev
            try {
              ev = JSON.parse(linea)
            } catch {
              continue
            }
            if (ev.t === 'texto') actualizarUltimo((m) => ({ texto: m.texto + ev.d }))
            else if (ev.t === 'rechazo') actualizarUltimo(() => ({ texto: ev.d }))
            else if (ev.t === 'error') actualizarUltimo((m) => ({ texto: m.texto || ev.d, error: !m.texto }))
            else if (ev.t === 'fin' && typeof ev.restantes === 'number') setRestantes(ev.restantes)
          }
        }
        actualizarUltimo((m) => ({
          pendiente: false,
          texto: m.texto || 'No he sabido qué responder. Prueba a reformular.',
        }))
      } catch {
        actualizarUltimo(() => ({ texto: 'No he podido conectar. Revisa tu conexión.', error: true, pendiente: false }))
      } finally {
        setEnviando(false)
      }
    },
    [enviando, mensajes, resumen, movimientos, recurrentes, restantes],
  )

  // Abrir con una pregunta desde otra pantalla (evento global).
  useEffect(() => {
    const abrirCon = (e) => {
      setAbierto(true)
      if (e.detail?.pregunta) setPreguntaPendiente(e.detail.pregunta)
    }
    window.addEventListener(EVENTO_FULCRO, abrirCon)
    return () => window.removeEventListener(EVENTO_FULCRO, abrirCon)
  }, [])
  useEffect(() => {
    if (preguntaPendiente && activo) {
      preguntar(preguntaPendiente)
      setPreguntaPendiente(null)
    }
  }, [preguntaPendiente, activo, preguntar])

  const sinPreguntas = restantes === 0

  return (
    <>
      <button
        type="button"
        className="consultor-fab"
        onClick={() => setAbierto(true)}
        aria-label="Abrir Fulcro, tu consultor de finanzas"
      >
        <Icono nombre="consultor" tam={18} className="consultor-fab-icono" />
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
              <span className="fulcro-avatar" aria-hidden="true">
                <Icono nombre="consultor" tam={18} />
              </span>
              <div className="consultor-cabecera-texto">
                <h2>Fulcro</h2>
                <p className="consultor-sub">
                  {ejemplo ? 'Con los datos de ejemplo' : sinDatos ? 'Pregúntale lo que quieras' : 'Con tus datos de Palanca'}
                </p>
              </div>
              {activo && mensajes.length > 0 && (
                <button
                  type="button"
                  className="consultor-nueva"
                  onClick={() => setMensajes([])}
                  disabled={enviando}
                >
                  Nueva
                </button>
              )}
              <button
                type="button"
                className="consultor-cerrar"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >
                <Icono nombre="cerrar" tam={18} />
              </button>
            </header>

            {activo === null ? (
              <div className="consultor-teaser" aria-busy="true">
                <span className="consultor-punto" />
              </div>
            ) : !activo ? (
              <div className="consultor-teaser">
                <span className="consultor-teaser-icono" aria-hidden="true">
                  <Icono nombre="consultor" tam={28} />
                </span>
                <span className="consultor-teaser-badge">Próximamente</span>
                <h3 className="consultor-teaser-titulo">Fulcro llega muy pronto</h3>
                <p>
                  Será tu <strong>consultor financiero personal</strong>: entenderá tus propios números y te
                  orientará con ellos delante — cómo vas, en qué se te va el dinero, qué suscripciones revisar y
                  cómo dar tu primer paso hacia la inversión.
                </p>
                <p className="consultor-teaser-nota">Lo estamos afinando. Muy pronto podrás hablar con él.</p>
              </div>
            ) : (
              <>
                <div className="consultor-mensajes" aria-live="polite">
                  {mensajes.length === 0 && (
                    <div className="consultor-bienvenida">
                      <p className="fulcro-hola">
                        {ejemplo ? (
                          <>
                            Hola. Soy Fulcro. Ahora ves los <strong>datos de ejemplo</strong>: pregúntame sobre ellos para
                            ver cómo te ayudaría con los tuyos.
                          </>
                        ) : sinDatos ? (
                          <>
                            Hola. Soy Fulcro. Cuando apuntes tus gastos e ingresos podré hablarte de <strong>tus</strong>{' '}
                            números; mientras, pregúntame lo que quieras sobre dinero.
                          </>
                        ) : (
                          <>
                            Hola. Soy Fulcro: te ayudo a entender <strong>tus</strong> números y a decidir mejor.
                            Pregúntame lo que quieras.
                          </>
                        )}
                      </p>

                      {insights.length > 0 && (
                        <div className="consultor-insights">
                          <span className="consultor-insights-titulo">He visto en tus números</span>
                          <ul>
                            {insights.slice(0, 3).map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="consultor-sugerencias">
                        {sugerencias.map((s) => (
                          <button key={s} type="button" onClick={() => preguntar(s)} disabled={sinPreguntas}>
                            {s}
                          </button>
                        ))}
                      </div>

                      <details className="fulcro-privacidad">
                        <summary>Qué ve Fulcro</summary>
                        <p>
                          Un <strong>resumen</strong> calculado por Palanca: totales por mes y categoría, ahorro, presupuesto,
                          objetivos, fijos y patrimonio. Si preguntas por algo concreto (una categoría, un comercio o un
                          mes), solo ese desglose. <strong>No</strong> ve tus movimientos uno a uno, ni tu nombre, ni tu
                          email, ni datos bancarios.
                        </p>
                      </details>
                    </div>
                  )}

                  {mensajes.map((m, i) =>
                    m.rol === 'usuario' ? (
                      <div key={i} className="fulcro-msg usuario">
                        {m.texto}
                      </div>
                    ) : (
                      <div key={i} className={`fulcro-msg consultor ${m.error ? 'error' : ''}`}>
                        {m.pendiente && !m.texto ? (
                          <span className="fulcro-escribiendo" aria-label="Fulcro está pensando">
                            <span className="consultor-punto" />
                            <span className="consultor-punto" />
                            <span className="consultor-punto" />
                          </span>
                        ) : (
                          <TextoFulcro texto={m.texto} />
                        )}
                        {m.alMomento && (
                          <div className="fulcro-al-momento">
                            <span>Calculado al momento con tus datos</span>
                            {!sinPreguntas && (
                              <button type="button" className="link" onClick={() => preguntar(m.pregunta, { forzarIA: true })} disabled={enviando}>
                                Que lo analice Fulcro
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ),
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
                    placeholder={sinPreguntas ? 'Pregunta datos: «¿cuánto gasté en…?»' : 'Pregunta sobre tu dinero…'}
                    aria-label="Tu pregunta"
                    maxLength={2000}
                    disabled={enviando}
                  />
                  <button type="submit" disabled={enviando || !entrada.trim()} aria-label="Enviar">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
                    </svg>
                  </button>
                </form>

                <p className="consultor-disclaimer">
                  {restantes !== null && restantes <= 5 && (
                    <span className="consultor-restantes">
                      {restantes === 0
                        ? 'Sin preguntas por hoy · '
                        : `Te ${restantes === 1 ? 'queda 1 pregunta' : `quedan ${restantes} preguntas`} hoy · `}
                    </span>
                  )}
                  Orientación educativa, no asesoramiento financiero.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}
