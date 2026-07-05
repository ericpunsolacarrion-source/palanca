import { useState } from 'react'
import RegistroMovimiento from './RegistroMovimiento'
import ListaMovimientos from './ListaMovimientos'

export default function MovimientosTab({ usuarioId, movimientos, cargando, onGuardado }) {
  const [sub, setSub] = useState('nuevo')

  return (
    <div className="vista">
      <div className="sub-tabs">
        <button type="button" className={sub === 'nuevo' ? 'activo' : ''} onClick={() => setSub('nuevo')}>
          Nuevo
        </button>
        <button
          type="button"
          className={sub === 'historial' ? 'activo' : ''}
          onClick={() => setSub('historial')}
        >
          Historial
        </button>
      </div>

      {sub === 'nuevo' && <RegistroMovimiento usuarioId={usuarioId} onGuardado={onGuardado} />}

      {sub === 'historial' && (
        <ListaMovimientos movimientos={movimientos} cargando={cargando} onEliminado={onGuardado} />
      )}
    </div>
  )
}
