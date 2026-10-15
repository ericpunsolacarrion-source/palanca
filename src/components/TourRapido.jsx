import { useEffect, useState } from 'react'
import Icono from './Icono'

// Demo rápida: 6 pasos que recorren la app de verdad (cambia de pestaña en
// cada paso y resalta su botón en la barra inferior). Poco texto: qué es y
// para qué te sirve. Se ofrece una vez al llegar y desde "Tu cuenta".
const PASOS = [
  {
    pestana: 'dashboard',
    titulo: 'Tu dinero, de un vistazo',
    texto: 'Lo que tienes, cómo va el mes y lo último que ha pasado. El ojo de arriba oculta las cifras si tienes a alguien al lado.',
  },
  {
    pestana: 'movimientos',
    titulo: 'Apunta en dos toques',
    texto: 'Un gasto o un ingreso en segundos. O trae tu último año del banco (extracto o capturas) y lo ordenamos por ti.',
  },
  {
    pestana: 'suscripciones',
    titulo: 'Suscripciones y recibos, bajo control',
    texto: 'Cuánto pagas al mes y al año. El día de cada cobro te avisamos para confirmarlo, y te decimos si algo sube de precio.',
  },
  {
    pestana: 'presupuesto',
    titulo: 'Tu plan',
    texto: 'Decide cuánto quieres ahorrar y te decimos cuánto puedes gastar al día. En Simuladores: objetivos, hipoteca o cuándo podrías dejar de trabajar.',
  },
  {
    pestana: 'inversiones',
    titulo: 'Lo que inviertes, aparte',
    texto: 'Invertir no es gastar: lo separamos para que veas cuánto llevas aportado y cómo crece.',
  },
  {
    pestana: 'dashboard',
    titulo: 'Y si tienes dudas, Fulcro',
    texto: 'Tu asistente lee tus números y te responde en claro: "¿en qué se me va el dinero?", "¿llego a mi objetivo?".',
    resaltar: '.consultor-fab',
  },
]

export default function TourRapido({ enDemo, onIrA, onTerminar, onEmpezarConMisDatos }) {
  const [i, setI] = useState(0)
  const paso = PASOS[i]
  const ultimo = i === PASOS.length - 1

  // Cada paso lleva a su pestaña y resalta su botón.
  useEffect(() => {
    onIrA(paso.pestana)
    const sel = paso.resaltar ?? `.bottom-nav [data-pestana="${paso.pestana}"]`
    const el = document.querySelector(sel)
    el?.classList.add('tour-resaltado')
    return () => el?.classList.remove('tour-resaltado')
  }, [paso, onIrA])

  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onTerminar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onTerminar])

  return (
    <div className={`tour ${paso.resaltar ? 'tour-arriba' : ''}`} role="dialog" aria-label="Demo rápida de Palanca" aria-live="polite">
      <div className="tour-cab">
        <span className="tour-paso">
          {i + 1} / {PASOS.length}
        </span>
        <button type="button" className="tour-saltar" onClick={onTerminar}>
          Saltar
        </button>
      </div>
      <h2 className="tour-titulo">{paso.titulo}</h2>
      <p className="tour-texto">{paso.texto}</p>
      {ultimo && enDemo && (
        <p className="tour-texto tour-nota">Todo lo que ves son datos de ejemplo. Cuando quieras, empieza con los tuyos.</p>
      )}
      <div className="tour-pie">
        <div className="tour-puntos" aria-hidden="true">
          {PASOS.map((p, n) => (
            <span key={n} className={n === i ? 'activo' : ''} />
          ))}
        </div>
        <div className="tour-botones">
          {i > 0 && (
            <button type="button" className="tour-atras" onClick={() => setI(i - 1)} aria-label="Paso anterior">
              <Icono nombre="chevron" tam={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
          {ultimo ? (
            <button type="button" className="tour-siguiente" onClick={enDemo ? onEmpezarConMisDatos : onTerminar}>
              {enDemo ? 'Empezar con mis datos' : 'Entendido'}
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
