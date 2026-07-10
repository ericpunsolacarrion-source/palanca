import { useMemo } from 'react'
import { cambioPorCategoria, comparativasConMesAnterior } from '../lib/movimientosUtils'

// Microcomparativas contra el propio historial del usuario (nunca con otros).
export default function Comparativas({ movimientos }) {
  const avisos = useMemo(() => {
    const base = comparativasConMesAnterior(movimientos)
    const cat = cambioPorCategoria(movimientos)
    if (cat && base.length < 2) {
      base.push({
        tono: 'bien',
        texto: `Este mes has gastado un ${Math.round(Math.abs(cat.pct))}% menos en ${cat.nombre}`,
      })
    }
    return base
  }, [movimientos])

  if (avisos.length === 0) return null

  return (
    <div className="comparativas fade-in-up">
      {avisos.map((a, i) => (
        <div key={i} className={`comparativa comparativa-${a.tono}`}>
          <span className="comparativa-flecha">{a.tono === 'bien' ? '▲' : '▼'}</span>
          {a.texto}
        </div>
      ))}
    </div>
  )
}
