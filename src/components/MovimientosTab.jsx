import { useState } from 'react'
import RegistroMovimiento from './RegistroMovimiento'
import ListaMovimientos from './ListaMovimientos'
import { esInversion, formatearEuros } from '../lib/categorias'

function ResumenMes({ movimientos }) {
  const ingresos = movimientos
    .filter((m) => m.tipo === 'ingreso')
    .reduce((s, m) => s + Number(m.importe), 0)
  const gastos = movimientos
    .filter((m) => m.tipo === 'gasto' && !esInversion(m))
    .reduce((s, m) => s + Number(m.importe), 0)

  return (
    <div className="resumen-mes-mini">
      <span>
        Ingresado <strong className="ingreso">{formatearEuros(ingresos)}</strong>
      </span>
      <span>
        Gastado <strong className="gasto">{formatearEuros(gastos)}</strong>
      </span>
    </div>
  )
}

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
        <>
          {!cargando && movimientos.length > 0 && <ResumenMes movimientos={movimientos} />}
          <ListaMovimientos movimientos={movimientos} cargando={cargando} onEliminado={onGuardado} />
        </>
      )}
    </div>
  )
}
