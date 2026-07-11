import { useState } from 'react'
import RegistroMovimiento from './RegistroMovimiento'
import ListaMovimientos from './ListaMovimientos'
import Recurrentes from './Recurrentes'
import { formatearEuros } from '../lib/categorias'
import { totalesDe } from '../lib/movimientosUtils'
import { useRecurrentes } from '../lib/useRecurrentes'

function ResumenMes({ movimientosMes }) {
  const { ingresos, gastos } = totalesDe(movimientosMes)

  return (
    <div className="resumen-mes-mini">
      <span>
        Este mes: ingresado <strong className="ingreso">{formatearEuros(ingresos)}</strong>
      </span>
      <span>
        gastado <strong className="gasto">{formatearEuros(gastos)}</strong>
      </span>
    </div>
  )
}

export default function MovimientosTab({ usuarioId, movimientos, movimientosMes, cargando, onGuardado }) {
  const [sub, setSub] = useState('nuevo')
  const { pendientes } = useRecurrentes(usuarioId)

  return (
    <div className="vista">
      <div className="sub-tabs">
        <button type="button" className={sub === 'nuevo' ? 'activo' : ''} onClick={() => setSub('nuevo')}>
          Nuevo
        </button>
        <button
          type="button"
          className={sub === 'recurrentes' ? 'activo' : ''}
          onClick={() => setSub('recurrentes')}
        >
          Recurrentes
          {pendientes.length > 0 && <span className="sub-tab-badge">{pendientes.length}</span>}
        </button>
        <button
          type="button"
          className={sub === 'historial' ? 'activo' : ''}
          onClick={() => setSub('historial')}
        >
          Historial
        </button>
      </div>

      {sub === 'nuevo' && (
        <RegistroMovimiento usuarioId={usuarioId} movimientos={movimientos} onGuardado={onGuardado} />
      )}

      {sub === 'recurrentes' && <Recurrentes usuarioId={usuarioId} onRegistrado={onGuardado} />}

      {sub === 'historial' && (
        <>
          {!cargando && movimientos.length > 0 && <ResumenMes movimientosMes={movimientosMes} />}
          <ListaMovimientos
            movimientos={movimientos}
            cargando={cargando}
            onEliminado={onGuardado}
            onIrARegistro={() => setSub('nuevo')}
            agruparPorMes
          />
        </>
      )}
    </div>
  )
}
