import { useEffect, useMemo, useRef, useState } from 'react'
import Icono from './Icono'
import { TOUR_AVANZADO, TOUR_RAPIDO, buscarElemento, capitulosDe } from '../lib/tours'
import { cerrarFulcro, preguntarAFulcro } from '../lib/fulcro'

// Recorrido guiado por la app de verdad: cada paso cambia de pestaña (y de
// subpestaña), resalta la pieza de la que habla y, en la avanzada, le hace a
// Fulcro una pregunta en directo. Pasos en lib/tours.js.
//  - Rápida: 6 pasos, qué es cada pestaña.
//  - Avanzada: 7 capítulos, hasta dónde llega cada parte (se puede saltar
//    de capítulo). Se ofrece desde "Tu cuenta" y al final de la rápida.
export default function TourRapido({ nivel = 'rapido', enDemo, volverAMisDatos = false, onIrA, onTerminar, onEmpezarConMisDatos, onAvanzada }) {
  const pasos = nivel === 'avanzado' ? TOUR_AVANZADO : TOUR_RAPIDO
  const capitulos = useMemo(() => capitulosDe(pasos), [pasos])
  const [i, setI] = useState(0)
  const paso = pasos[i]
  const ultimo = i === pasos.length - 1
  const cap = capitulos.findLastIndex((c) => c.inicio <= i)

  // onIrA cambia en cada render de App: se guarda en una ref para que el paso
  // se ejecute UNA vez (si no, pulsar la subpestaña re-renderiza y vuelve a empezar).
  const irA = useRef(onIrA)
  irA.current = onIrA

  // Llegar al paso: pestaña → subpestaña → resaltar (con un respiro para que
  // la pantalla se pinte) → Fulcro si toca.
  useEffect(() => {
    irA.current(paso.pestana)
    if (!paso.fulcro) cerrarFulcro()
    let el = null
    const t1 = setTimeout(() => buscarElemento(paso.clic)?.click(), 250)
    const t2 = setTimeout(() => {
      el = paso.resaltar ? buscarElemento(paso.resaltar) : document.querySelector(`.bottom-nav [data-pestana="${paso.pestana}"]`)
      el?.classList.add('tour-resaltado')
      if (paso.resaltar) el?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
      if (paso.fulcro) preguntarAFulcro(paso.fulcro)
    }, 550)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      el?.classList.remove('tour-resaltado')
    }
  }, [paso])

  // El capítulo activo, siempre visible en la fila de capítulos.
  const filaCaps = useRef(null)
  useEffect(() => {
    const fila = filaCaps.current
    const activo = fila?.querySelector('.activo')
    if (fila && activo) fila.scrollTo({ left: activo.offsetLeft - 16, behavior: 'smooth' })
  }, [cap])

  const terminar = () => {
    cerrarFulcro()
    onTerminar()
  }

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') terminar()
      if (e.key === 'ArrowRight' && !ultimo) setI((n) => n + 1)
      if (e.key === 'ArrowLeft' && i > 0) setI((n) => n - 1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }) // se re-registra en cada paso (usa i y ultimo actuales)

  const avanzado = nivel === 'avanzado'
  return (
    <div
      className={`tour ${paso.arriba || paso.fulcro ? 'tour-arriba' : ''} ${avanzado ? 'tour-avanzado' : ''}`}
      role="dialog"
      aria-label={avanzado ? 'Demo avanzada de Palanca' : 'Demo rápida de Palanca'}
      aria-live="polite"
    >
      <div className="tour-cab">
        <span className="tour-paso">
          {avanzado ? `${paso.capitulo} · ` : ''}
          {i + 1} / {pasos.length}
        </span>
        <button type="button" className="tour-saltar" onClick={terminar}>
          {avanzado ? 'Salir' : 'Saltar'}
        </button>
      </div>
      {avanzado && (
        <div className="tour-capitulos" role="tablist" aria-label="Capítulos" ref={filaCaps}>
          {capitulos.map((c, n) => (
            <button
              key={c.nombre}
              type="button"
              role="tab"
              aria-selected={n === cap}
              className={n === cap ? 'activo' : n < cap ? 'hecho' : ''}
              onClick={() => setI(c.inicio)}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}
      <h2 className="tour-titulo">{paso.titulo}</h2>
      <p className="tour-texto">{paso.texto}</p>
      {paso.mas && (
        <p className="tour-mas">
          <Icono nombre="sube" tam={14} />
          <span>{paso.mas}</span>
        </p>
      )}
      {ultimo && enDemo && (
        <p className="tour-texto tour-nota">
          {volverAMisDatos ? 'Todo lo que has visto eran datos de ejemplo: tus datos siguen intactos.' : 'Todo lo que ves son datos de ejemplo. Cuando quieras, empieza con los tuyos.'}
        </p>
      )}
      {ultimo && !avanzado && onAvanzada && (
        <button type="button" className="tour-mas-boton" onClick={onAvanzada}>
          ¿Quieres verlo todo? Demo avanzada
        </button>
      )}
      <div className="tour-pie">
        <div className="tour-puntos" aria-hidden="true">
          {(avanzado ? pasos.filter((p) => p.capitulo === paso.capitulo) : pasos).map((p, n) => (
            <span key={n} className={p === paso ? 'activo' : ''} />
          ))}
        </div>
        <div className="tour-botones">
          {i > 0 && (
            <button type="button" className="tour-atras" onClick={() => setI(i - 1)} aria-label="Paso anterior">
              <Icono nombre="chevron" tam={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
          {ultimo ? (
            <button type="button" className="tour-siguiente" onClick={enDemo && onEmpezarConMisDatos ? onEmpezarConMisDatos : terminar}>
              {!enDemo || !onEmpezarConMisDatos ? 'Entendido' : volverAMisDatos ? 'Volver a mis datos' : 'Empezar con mis datos'}
            </button>
          ) : (
            <button type="button" className="tour-siguiente" onClick={() => setI(i + 1)}>
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
