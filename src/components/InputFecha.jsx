import { useEffect, useRef, useState } from 'react'
import { formatearFecha } from '../lib/movimientosUtils'

// Campo de fecha con DOS formas de introducirla: escribir dd/mm/aaaa a mano o
// abrir el calendario. El valor se guarda siempre en ISO 'yyyy-mm-dd'.
// Convierte 'dd/mm/aaaa' (admite d/m/aa y separador - o /) a ISO, o null.
function aIso(texto) {
  const m = String(texto).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (!m) return null
  let d = Number(m[1])
  const mo = Number(m[2])
  let y = Number(m[3])
  if (y < 100) y += 2000
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime()) || dt.getUTCMonth() + 1 !== mo) return null
  return iso
}

export default function InputFecha({ id, value, onChange }) {
  const [texto, setTexto] = useState(() => (value ? formatearFecha(value) : ''))
  const dateRef = useRef(null)

  function abrirCalendario() {
    const el = dateRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker()
        return
      } catch {
        // algunos navegadores lanzan si no hay gesto; caemos al focus
      }
    }
    el.focus()
    el.click()
  }

  // Refleja cambios externos del valor (ej. reset del formulario).
  useEffect(() => {
    setTexto(value ? formatearFecha(value) : '')
  }, [value])

  function onTexto(e) {
    const t = e.target.value
    setTexto(t)
    const iso = aIso(t)
    if (iso) onChange(iso)
  }

  // Al salir del campo, si el texto no es una fecha válida, se restaura el
  // último valor bueno para no dejar basura.
  function onBlur() {
    if (!aIso(texto)) setTexto(value ? formatearFecha(value) : '')
  }

  return (
    <div className="input-fecha">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={texto}
        onChange={onTexto}
        onBlur={onBlur}
        className="input-fecha-texto"
      />
      {/* Botón que abre el calendario del sistema (con el input nativo detrás
          como ancla/alternativa). */}
      <button
        type="button"
        className="input-fecha-cal"
        onClick={abrirCalendario}
        aria-label="Abrir calendario"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      </button>
      <input
        ref={dateRef}
        type="date"
        value={value || ''}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="input-fecha-nativo"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
