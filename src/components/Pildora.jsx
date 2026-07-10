import { useState } from 'react'
import { descartarPildora, pildoraDescartada } from '../lib/pildoras'

// Píldora educativa breve, contextual y descartable.
export default function Pildora({ usuarioId, pildora, onCta, onDescartar }) {
  const [oculta, setOculta] = useState(() => pildoraDescartada(usuarioId, pildora.id))

  if (!pildora || oculta) return null

  function cerrar() {
    descartarPildora(usuarioId, pildora.id)
    setOculta(true)
    onDescartar?.()
  }

  return (
    <div className="pildora fade-in-up">
      <span className="pildora-icono" aria-hidden="true">
        i
      </span>
      <div className="pildora-cuerpo">
        <p className="pildora-texto">{pildora.texto}</p>
        {pildora.cta && (
          <button type="button" className="pildora-cta" onClick={() => onCta?.(pildora.cta.pestana)}>
            {pildora.cta.texto} →
          </button>
        )}
      </div>
      <button type="button" className="pildora-cerrar" onClick={cerrar} aria-label="Descartar consejo">
        ×
      </button>
    </div>
  )
}
