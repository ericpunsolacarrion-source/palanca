import { useEffect, useState } from 'react'
import { descartarPildora, pildoraDescartada } from '../lib/pildoras'

// Píldora educativa breve, contextual y descartable. Al cerrarla no desaparece
// para siempre: reaparece con un movimiento nuevo (cambia `firma`) o en una
// nueva sesión. Ver la regla documentada en lib/pildoras.js.
export default function Pildora({ usuarioId, pildora, firma = '', onCta, onDescartar }) {
  const [oculta, setOculta] = useState(() => pildoraDescartada(usuarioId, pildora.id, firma))

  // Al cambiar la firma de datos (o de usuario/píldora), se reevalúa si sigue
  // descartada: así vuelve a mostrarse cuando hay algo nuevo que decir.
  useEffect(() => {
    setOculta(pildoraDescartada(usuarioId, pildora.id, firma))
  }, [usuarioId, pildora.id, firma])

  if (!pildora || oculta) return null

  function cerrar() {
    descartarPildora(usuarioId, pildora.id, firma)
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
