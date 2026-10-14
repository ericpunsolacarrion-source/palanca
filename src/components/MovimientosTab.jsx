import { useEffect, useMemo, useState } from 'react'
import RegistroMovimiento from './RegistroMovimiento'
import ListaMovimientos from './ListaMovimientos'
import ImportadorCsv from './ImportadorCsv'
import { coincideBusqueda } from '../lib/busqueda'
import { esAjuste, esInversion, esTraspaso, formatearEuros } from '../lib/categorias'
import { esConsumo, netoAjustes, sumarImportes, totalesDe } from '../lib/movimientosUtils'

const ETIQUETA_FILTRO = { ingreso: 'Ingresos', gasto: 'Gastos', inversion: 'Inversión', ajuste: 'Ajustes' }

// Filtros del historial, coherentes con el modelo de dos bolsas.
const FILTROS_HIST = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'ingreso', etiqueta: 'Ingresos' },
  { id: 'gasto', etiqueta: 'Gastos' },
  { id: 'inversion', etiqueta: 'Inversión' },
  { id: 'ajuste', etiqueta: 'Ahorro/Ajuste' },
]

function coincideFiltro(m, filtro) {
  if (filtro === 'ajuste') return esAjuste(m) || esTraspaso(m)
  if (filtro === 'inversion') return esInversion(m)
  if (filtro === 'ingreso') return m.tipo === 'ingreso' && !esAjuste(m)
  if (filtro === 'gasto') return esConsumo(m)
  return true // 'todos'
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
  modoInicialRegistro,
}) {
  // Se puede llegar directo al historial o al importador (accesos del inicio).
  const [sub, setSub] = useState(() =>
    modoInicialRegistro === 'historial' || modoInicialRegistro === 'importar' ? modoInicialRegistro : 'nuevo',
  )
  const [filtroHist, setFiltroHist] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const movsHistorial = useMemo(
    () => movimientos.filter((m) => coincideFiltro(m, filtroHist) && coincideBusqueda(m, busqueda)),
    [movimientos, filtroHist, busqueda],
  )
  const buscando = busqueda.trim() !== ''

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
    // Ajustes: efecto NETO (los de signo − restan); el resto, suma exacta.
    const total = filtro === 'ajuste' ? netoAjustes(movsFiltrados) : sumarImportes(movsFiltrados)
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
          className={sub === 'historial' ? 'activo' : ''}
          onClick={() => cambiarSub('historial')}
        >
          Historial
        </button>
        <button
          type="button"
          className={sub === 'importar' ? 'activo' : ''}
          onClick={() => cambiarSub('importar')}
        >
          Importar
        </button>
      </div>

      {sub === 'nuevo' && (
        <RegistroMovimiento
          usuarioId={usuarioId}
          movimientos={movimientos}
          onGuardado={onGuardado}
          modoInicial={modoInicialRegistro === 'gasto' || modoInicialRegistro === 'ingreso' ? modoInicialRegistro : undefined}
        />
      )}


      {sub === 'importar' && (
        <ImportadorCsv usuarioId={usuarioId} movimientos={movimientos} onImportado={onGuardado} />
      )}

      {sub === 'historial' && (
        <>
          {!cargando && movimientos.length > 0 && <ResumenMes movimientosMes={movimientosMes} />}
          {movimientos.length > 0 && (
            <div className="hist-buscar">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar: Mercadona, Netflix, 13,99…"
                aria-label="Buscar en tus movimientos"
                enterKeyHint="search"
              />
              {buscando && (
                <span className="hist-buscar-total">
                  {movsHistorial.length} {movsHistorial.length === 1 ? 'resultado' : 'resultados'}
                  {/* Total solo si todos son del mismo tipo (sumar ingresos y gastos no dice nada) */}
                  {movsHistorial.length > 0 && movsHistorial.every((m) => m.tipo === movsHistorial[0].tipo) && (
                    <> · {formatearEuros(sumarImportes(movsHistorial))}</>
                  )}
                </span>
              )}
            </div>
          )}
          <div className="chips-fila chips-fila-compacta" role="group" aria-label="Filtrar historial">
            {FILTROS_HIST.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip chip-sm ${filtroHist === f.id ? 'activo' : ''}`}
                onClick={() => setFiltroHist(f.id)}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>
          {buscando && movsHistorial.length === 0 ? (
            <p className="ayuda hist-sin-resultados">No hay movimientos que coincidan con «{busqueda.trim()}».</p>
          ) : (
          <ListaMovimientos
            movimientos={movsHistorial}
            cargando={cargando}
            onEliminado={onGuardado}
            onIrARegistro={() => setSub('nuevo')}
            agruparPorMes={filtroHist === 'todos' && !buscando}
          />
          )}
        </>
      )}
    </div>
  )
}
