import { useState } from 'react'
import AhorroObjetivo from './simuladores/AhorroObjetivo'
import InteresCompuesto from './simuladores/InteresCompuesto'
import Hipoteca from './simuladores/Hipoteca'
import IndependenciaFinanciera from './simuladores/IndependenciaFinanciera'

const SUBPESTANAS = [
  { id: 'ahorro', etiqueta: 'Ahorro' },
  { id: 'interes', etiqueta: 'Interés compuesto' },
  { id: 'hipoteca', etiqueta: 'Hipoteca' },
  { id: 'fire', etiqueta: 'Independencia' },
]

export default function Simulador({ usuarioId, ahorroMensual, gastoMensual, diasConHistorial }) {
  const [sub, setSub] = useState('ahorro')

  return (
    <div className="vista">
      <div className="sub-tabs">
        {SUBPESTANAS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={sub === s.id ? 'activo' : ''}
            onClick={() => setSub(s.id)}
          >
            {s.etiqueta}
          </button>
        ))}
      </div>

      {sub === 'ahorro' && <AhorroObjetivo usuarioId={usuarioId} ahorroMensual={ahorroMensual} />}
      {sub === 'interes' && <InteresCompuesto usuarioId={usuarioId} />}
      {sub === 'hipoteca' && <Hipoteca usuarioId={usuarioId} />}
      {sub === 'fire' && (
        <IndependenciaFinanciera
          usuarioId={usuarioId}
          gastoMensualActual={gastoMensual}
          ahorroMensualActual={ahorroMensual}
          diasConHistorial={diasConHistorial}
        />
      )}
    </div>
  )
}
