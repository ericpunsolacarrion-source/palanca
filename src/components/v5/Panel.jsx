import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icono from '../Icono'

// Panel lateral (v5): entra por la derecha en el ordenador y sube como hoja a
// pantalla completa en el móvil. Escape o el fondo lo cierran; el foco entra
// al abrir y vuelve a donde estaba al cerrar.
export default function Panel({ titulo, subtitulo, onCerrar, children, ancho = 480, pie = null, etiqueta }) {
  const caja = useRef(null)
  useEffect(() => {
    const previo = document.activeElement
    const t = setTimeout(() => {
      const primero = caja.current?.querySelector('input:not([type=hidden]), select, textarea, button:not(.v5-panel-cerrar)')
      ;(primero ?? caja.current)?.focus({ preventScroll: true })
    }, 30)
    const tecla = (e) => {
      if (e.key === 'Escape') {
        // Un modal de confirmación encima manda: no cerrar el panel por debajo.
        if (document.querySelector('.modal-fondo')) return
        e.stopPropagation()
        onCerrar()
      }
    }
    document.addEventListener('keydown', tecla)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', tecla)
      previo?.focus?.({ preventScroll: true })
    }
  }, [onCerrar])

  return createPortal(
    <div className="v5-panel-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <section
        ref={caja}
        className="v5-panel"
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta ?? titulo}
        tabIndex={-1}
        style={{ '--ancho-panel': `${ancho}px` }}
      >
        <header className="v5-panel-cab">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button type="button" className="v5-boton fantasma icono-solo v5-panel-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tam={18} />
          </button>
        </header>
        <div className="v5-panel-cuerpo">{children}</div>
        {pie && <footer className="v5-panel-pie">{pie}</footer>}
      </section>
    </div>,
    document.body,
  )
}
