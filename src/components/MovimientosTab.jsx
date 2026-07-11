import { useEffect, useMemo, useState } from 'react'
import RegistroMovimiento from './RegistroMovimiento'
import ListaMovimientos from './ListaMovimientos'
import Recurrentes from './Recurrentes'
import { esInversion, formatearEuros } from '../lib/categorias'
import { totalesDe } from '../lib/movimientosUtils'
import { useRecurrentes } from '../lib/useRecurrentes'

const ETIQUETA_FILTRO = { ingreso: 'Ingresos', gasto: 'Gastos', inversion: 'Inversión' }

function coincideFiltro(m, filtro) {
  if (filtro === 'inversion') return esInversion(m)
  if (filtro === 'ingreso') return m.tipo === 'ingreso'
  return m.tipo === 'gasto' && !esInversion(m)
}

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

export default function MovimientosTab({
  usuarioId,
  movimientos,
  movimientosMes,
  cargando,
  onGuardado,
  filtro,
  onLimpiarFiltro,
}) {
  const [sub, setSub] = useState('nuevo')
  const { pendientes } = useRecurrentes(usuarioId)

  // Al llegar con un filtro (desde una métrica del dashboard), mostrar la vista
  // filtrada del mes en curso.
  useEffect(() => {
    if (filtro) setSub('filtrado')
  }, [filtro])

  const movsFiltrados = useMemo(
    () => (filtro ? movimientosMes.filter((m) => coincideFiltro(m, filtro)) : []),
    [filtro, movimientosMes],
  )

  function cambiarSub(nuevo) {
    onLimpiarFiltro?.()
    setSub(nuevo)
  }

  if (sub === 'filtrado' && filtro) {
    const total = movsFiltrados.reduce((s, m) => s + Number(m.importe), 0)
    return (
      <div className="vista">
        <div className="filtro-cabecera">
          <button type="button" className="btn-volver" onClick={() => cambiarSub('historial')}>
            ← Movimientos
          </button>
          <span className="filtro-titulo">
            {ETIQUETA_FILTRO[filtro]} de este mes:{' '}
            <strong className={filtro === 'ingreso' ? 'ingreso' : filtro === 'inversion' ? 'inversion' : 'gasto'}>
              {formatearEuros(total)}
            </strong>
          </span>
        </div>
        {movsFiltrados.length === 0 ? (
          <p className="ayuda">No hay {ETIQUETA_FILTRO[filtro].toLowerCase()} este mes.</p>
        ) : (
          <ListaMovimientos movimientos={movsFiltrados} cargando={cargando} onEliminado={onGuardado} />
        )}
      </div>
    )
  }

  return (
    <div className="vista">
      <div className="sub-tabs">
        <button type="button" className={sub === 'nuevo' ? 'activo' : ''} onClick={() => cambiarSub('nuevo')}>
          Nuevo
        </button>
        <button
          type="button"
          className={sub === 'recurrentes' ? 'activo' : ''}
          onClick={() => cambiarSub('recurrentes')}
        >
          Recurrentes
          {pendientes.length > 0 && <span className="sub-tab-badge">{pendientes.length}</span>}
        </button>
        <button
          type="button"
          className={sub === 'historial' ? 'activo' : ''}
          onClick={() => cambiarSub('historial')}
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
