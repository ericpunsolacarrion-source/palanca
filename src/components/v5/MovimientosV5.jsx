import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { coincideBusqueda } from '../../lib/busqueda'
import { esAjuste, esDevolucion, esInversion, esTraspaso, etiquetaCategoria, formatearEuros } from '../../lib/categorias'
import { claveMesActual, esConsumo, etiquetaMes, formatearFecha, netoAjustes, rangoMeses, totalesDe } from '../../lib/movimientosUtils'
import { conceptoDe, fechaRelativa } from '../../lib/inicio'
import { directorio } from '../../lib/comercios'
import { AVISO_DEMO, esDemo } from '../../lib/datosDemo'
import { supabase } from '../../lib/supabaseClient'
import { toast } from '../../lib/toast'
import { confirmar } from '../../lib/confirmar'
import { FilaEdicion } from '../ListaMovimientos'
import Icono from '../Icono'
import Avatar from './Avatar'
import Panel from './Panel'

const ImportarHistorial = lazy(() => import('../ImportarHistorial'))

// MOVIMIENTOS v5: una tabla para entender y gestionar tu dinero.
//  - Barra de herramientas: buscar, tipo, periodo, importar y nuevo.
//  - Resumen del conjunto filtrado (lo que suma lo que estás viendo).
//  - Tabla agrupada por día con los importes alineados a la derecha.
//  - Detalle a la derecha (ordenador) o en panel (móvil): ver, editar, eliminar.
// Las reglas de qué es gasto, ingreso o inversión son las de siempre
// (movimientosUtils / categorias); aquí solo se filtra y se presenta.

const TIPOS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'ingreso', etiqueta: 'Ingresos' },
  { id: 'gasto', etiqueta: 'Gastos' },
  { id: 'inversion', etiqueta: 'Inversión' },
  { id: 'ajuste', etiqueta: 'Ahorro y ajustes' },
]

function coincideTipo(m, tipo) {
  if (tipo === 'ajuste') return esAjuste(m) || esTraspaso(m)
  if (tipo === 'inversion') return esInversion(m)
  if (tipo === 'ingreso') return m.tipo === 'ingreso' && !esAjuste(m) && !esTraspaso(m) && !esInversion(m)
  if (tipo === 'gasto') return esConsumo(m)
  return true
}

const POR_PAGINA = 120
const FMT_DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const FMT_DIA_ANIO = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
function tituloDia(iso) {
  const rel = fechaRelativa(iso)
  if (rel === 'Hoy' || rel === 'Ayer') return rel
  const [y, m, d] = iso.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  const t = (y === new Date().getFullYear() ? FMT_DIA : FMT_DIA_ANIO).format(f)
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const claseMov = (m) => (esInversion(m) ? 'inversion' : esTraspaso(m) || esAjuste(m) ? 'traspaso' : m.tipo)
const signoMov = (m) => (esTraspaso(m) ? '' : esInversion(m) ? (m.tipo === 'ingreso' ? '+' : '') : m.tipo === 'gasto' ? '−' : '+')
function naturaleza(m) {
  if (esAjuste(m)) return 'Ajuste de saldo'
  if (esTraspaso(m)) return m.tipo === 'ingreso' ? 'Vuelta desde tu ahorro' : 'Traspaso a tu ahorro'
  if (esInversion(m)) return m.tipo === 'ingreso' ? 'Retirada de inversión' : 'Aportación a inversión'
  if (esDevolucion(m)) return 'Devolución'
  return m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'
}

function Detalle({ m, usuarioId, todos, soloLectura, onGuardado, onCerrar, enPanel = false }) {
  const [editando, setEditando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  useEffect(() => setEditando(false), [m.id])
  const concepto = conceptoDe(m)
  const banco = m.nota && m.nota !== concepto ? m.nota : null
  const identidad = directorio().identificar(m)
  const demo = soloLectura || esDemo(m.id)

  async function eliminar() {
    if (demo) return toast(AVISO_DEMO)
    if (!(await confirmar('¿Eliminar este movimiento?'))) return
    setBorrando(true)
    const { error } = await supabase.from('movimientos').delete().eq('id', m.id)
    setBorrando(false)
    if (error) return toast('No se ha podido eliminar. Revisa tu conexión.', 'error')
    toast('Movimiento eliminado')
    onCerrar()
    onGuardado({ accion: 'borrar', ids: [m.id] })
  }

  if (editando) {
    return (
      <div className="v5-det v5-det-edicion">
        {!enPanel && <h3 className="v5-det-titulo-edicion">Editar movimiento</h3>}
        <FilaEdicion
          movimiento={m}
          usuarioId={usuarioId}
          todos={todos}
          onCancelar={() => setEditando(false)}
          onGuardado={(cambio) => {
            setEditando(false)
            onGuardado(cambio)
          }}
        />
      </div>
    )
  }

  const filas = [
    ['Fecha', formatearFecha(m.fecha)],
    ['Tipo', naturaleza(m)],
    ['Categoría', etiquetaCategoria(m.categoria?.nombre, m.tipo)],
    m.fuente?.nombre && [esInversion(m) ? 'Plataforma' : 'Cuenta o sitio', m.fuente.nombre],
    banco && ['Nota o texto del banco', banco],
    identidad?.nombre && identidad.nombre !== concepto && ['Comercio', identidad.nombre],
    ['Fijo', m.es_fijo ? 'Sí, se repite' : 'No'],
  ].filter(Boolean)

  return (
    <div className="v5-det">
      <div className="v5-det-cab">
        <Avatar nombre={concepto} movimiento={m} tam={48} />
        <div className="v5-det-nombre">
          <h3>{concepto}</h3>
          <span className="v5-tenue">{naturaleza(m)}</span>
        </div>
        {!enPanel && (
          <button type="button" className="v5-boton fantasma icono-solo" onClick={onCerrar} aria-label="Cerrar detalle">
            <Icono nombre="cerrar" tam={16} />
          </button>
        )}
      </div>
      <div className={`v5-det-importe num ${claseMov(m)}`}>
        {signoMov(m)}
        {formatearEuros(Number(m.importe))}
      </div>
      <dl className="v5-det-datos">
        {filas.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="v5-det-acciones">
        <button type="button" className="v5-boton" onClick={() => (demo ? toast(AVISO_DEMO) : setEditando(true))}>
          <Icono nombre="nota" tam={15} /> Editar
        </button>
        <button type="button" className="v5-boton peligro" onClick={eliminar} disabled={borrando}>
          {borrando ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </div>
  )
}

export default function MovimientosV5({
  usuarioId,
  movimientos,
  cargando,
  onGuardado,
  filtro,
  onLimpiarFiltro,
  modoInicial,
  movimientosReales,
  recurrentes = [],
  onIrA,
  onNuevo,
  soloLectura = false,
}) {
  const [vista, setVista] = useState(modoInicial === 'importar' ? 'importar' : 'lista')
  const [tipo, setTipo] = useState('todos')
  const [mes, setMes] = useState('todo')
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState(null)
  const [limite, setLimite] = useState(POR_PAGINA)
  const [ancho, setAncho] = useState(() => window.innerWidth)
  useEffect(() => {
    const r = () => setAncho(window.innerWidth)
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])
  const escritorio = ancho >= 1100

  // Llegada desde una métrica del inicio («gastos de este mes»).
  useEffect(() => {
    if (!filtro) return
    setVista('lista')
    setTipo(filtro)
    setMes(claveMesActual())
    onLimpiarFiltro?.()
  }, [filtro, onLimpiarFiltro])
  useEffect(() => {
    if (modoInicial === 'importar') setVista('importar')
    else if (modoInicial === 'historial') setVista('lista')
  }, [modoInicial])
  useEffect(() => setLimite(POR_PAGINA), [tipo, mes, busqueda])

  const meses = useMemo(() => rangoMeses(movimientos), [movimientos])
  const filtrados = useMemo(
    () =>
      movimientos.filter(
        (m) => (mes === 'todo' || m.fecha.slice(0, 7) === mes) && coincideTipo(m, tipo) && coincideBusqueda(m, busqueda),
      ),
    [movimientos, mes, tipo, busqueda],
  )
  const totales = useMemo(() => totalesDe(filtrados), [filtrados])
  const netoAj = useMemo(() => (tipo === 'ajuste' ? netoAjustes(filtrados) : 0), [filtrados, tipo])
  const visibles = filtrados.slice(0, limite)
  const grupos = useMemo(() => {
    const g = new Map()
    for (const m of visibles) {
      if (!g.has(m.fecha)) g.set(m.fecha, [])
      g.get(m.fecha).push(m)
    }
    return [...g.entries()]
  }, [visibles])
  const seleccionado = seleccion ? movimientos.find((m) => m.id === seleccion) : null
  useEffect(() => {
    if (seleccion && !seleccionado) setSeleccion(null)
  }, [seleccion, seleccionado])

  const conCuenta = filtrados.some((m) => m.fuente?.nombre)
  const hayFiltros = tipo !== 'todos' || mes !== 'todo' || busqueda.trim() !== ''
  const limpiar = () => {
    setTipo('todos')
    setMes('todo')
    setBusqueda('')
  }

  if (vista === 'importar') {
    return (
      <div className="vista v5-movs">
        <div className="v5-movs-barra">
          <button type="button" className="v5-boton fantasma" onClick={() => setVista('lista')}>
            <Icono nombre="chevron" tam={16} style={{ transform: 'rotate(180deg)' }} /> Volver a movimientos
          </button>
        </div>
        <div className="v5-importar">
          <Suspense fallback={<div className="skeleton skeleton-linea" style={{ height: 120 }} />}>
            <ImportarHistorial
              usuarioId={usuarioId}
              movimientos={movimientosReales ?? movimientos}
              recurrentes={recurrentes}
              onImportado={onGuardado}
              onIrA={onIrA}
            />
          </Suspense>
        </div>
      </div>
    )
  }

  return (
    <div className="vista v5-movs">
      <div className="v5-movs-barra" role="search">
        <label className="v5-buscar">
          <Icono nombre="lupa" tam={16} />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar: Mercadona, Netflix, 13,99…"
            aria-label="Buscar en tus movimientos"
          />
        </label>
        <select className="v5-select" value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Periodo">
          <option value="todo">Todo el historial</option>
          {meses.map((c) => (
            <option key={c} value={c}>
              {etiquetaMes(c)}
            </option>
          ))}
        </select>
        <div className="v5-movs-botones">
          <button type="button" className="v5-boton" onClick={() => setVista('importar')}>
            <Icono nombre="importar" tam={16} /> Importar
          </button>
          <button type="button" className="v5-boton primario" onClick={() => onNuevo('gasto')}>
            <Icono nombre="mas" tam={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="v5-movs-tipos" role="group" aria-label="Filtrar por tipo">
        {TIPOS.map((t) => (
          <button key={t.id} type="button" className={`v5-filtro ${tipo === t.id ? 'activo' : ''}`} aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>
            {t.etiqueta}
          </button>
        ))}
        {hayFiltros && (
          <button type="button" className="v5-enlace v5-limpiar" onClick={limpiar}>
            Quitar filtros
          </button>
        )}
      </div>

      <div className="v5-movs-resumen" aria-live="polite">
        <span>
          <b className="num">{filtrados.length}</b> {filtrados.length === 1 ? 'movimiento' : 'movimientos'}
          {mes !== 'todo' && <> · {etiquetaMes(mes).toLowerCase()}</>}
        </span>
        {tipo === 'ajuste' ? (
          <span>
            Efecto neto <b className="num">{formatearEuros(netoAj)}</b>
          </span>
        ) : (
          <>
            {totales.ingresos > 0 && (
              <span>
                Entra <b className="num v5-positivo">+{formatearEuros(totales.ingresos)}</b>
              </span>
            )}
            {totales.gastos !== 0 && (
              <span>
                Sale <b className="num">−{formatearEuros(totales.gastos)}</b>
              </span>
            )}
            {totales.invertido !== 0 && (
              <span>
                Invertido <b className="num v5-oro">{formatearEuros(totales.invertido)}</b>
              </span>
            )}
            {tipo === 'todos' && (totales.ingresos > 0 || totales.gastos !== 0) && (
              <span>
                Balance <b className={`num ${totales.ahorro >= 0 ? 'v5-positivo' : 'v5-negativo'}`}>{totales.ahorro >= 0 ? '+' : '−'}{formatearEuros(Math.abs(totales.ahorro))}</b>
              </span>
            )}
          </>
        )}
      </div>

      <div className={`v5-movs-cuerpo ${seleccionado && escritorio ? 'con-detalle' : ''}`}>
        <div className={`v5-tabla ${conCuenta ? '' : 'sin-cuenta'}`} role="table" aria-label="Movimientos">
          <div className="v5-tabla-cab" role="row">
            <span role="columnheader">Concepto</span>
            <span role="columnheader" className="v5-col-cat">Categoría</span>
            <span role="columnheader" className="v5-col-cuenta">Cuenta</span>
            <span role="columnheader" className="v5-col-importe">Importe</span>
          </div>
          {cargando && movimientos.length === 0 ? (
            <div className="v5-tabla-vacia">
              <div className="skeleton skeleton-linea" style={{ width: '60%' }} />
              <div className="skeleton skeleton-linea" style={{ width: '40%' }} />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="v5-tabla-vacia">
              <p>{movimientos.length === 0 ? 'Todavía no hay movimientos.' : busqueda.trim() ? `Nada coincide con «${busqueda.trim()}».` : 'No hay movimientos con estos filtros.'}</p>
              {movimientos.length === 0 ? (
                <button type="button" className="v5-boton primario" onClick={() => onNuevo('gasto')}>
                  Apuntar el primero
                </button>
              ) : (
                <button type="button" className="v5-boton" onClick={limpiar}>
                  Quitar filtros
                </button>
              )}
            </div>
          ) : (
            grupos.map(([dia, items]) => {
              const t = totalesDe(items)
              return (
                <div key={dia} role="rowgroup" className="v5-tabla-grupo">
                  <div className="v5-tabla-dia" role="row">
                    <span role="cell">{tituloDia(dia)}</span>
                    <span role="cell" className="num v5-tenue">
                      {t.gastos > 0 && `−${formatearEuros(t.gastos)}`}
                      {t.gastos > 0 && t.ingresos > 0 && ' · '}
                      {t.ingresos > 0 && `+${formatearEuros(t.ingresos)}`}
                    </span>
                  </div>
                  {items.map((m) => {
                    const concepto = conceptoDe(m)
                    const activo = seleccion === m.id
                    return (
                      <div
                        key={m.id}
                        role="row"
                        tabIndex={0}
                        className={`v5-tabla-fila ${activo ? 'activo' : ''}`}
                        aria-selected={activo}
                        onClick={() => setSeleccion(activo ? null : m.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSeleccion(activo ? null : m.id)
                          }
                        }}
                      >
                        <span role="cell" className="v5-col-concepto">
                          <Avatar nombre={concepto} movimiento={m} tam={34} />
                          <span className="v5-fila-texto">
                            <b>{concepto}</b>
                            <small>
                              <span className="v5-solo-estrecho">{etiquetaCategoria(m.categoria?.nombre, m.tipo)} · </span>
                              {m.nota && m.nota !== concepto ? m.nota : naturaleza(m)}
                              {m.es_fijo && <span className="v5-insignia v5-mini">Fijo</span>}
                            </small>
                          </span>
                        </span>
                        <span role="cell" className="v5-col-cat">
                          <span className="v5-etiqueta-cat">{etiquetaCategoria(m.categoria?.nombre, m.tipo)}</span>
                        </span>
                        <span role="cell" className="v5-col-cuenta v5-tenue">{m.fuente?.nombre ?? '—'}</span>
                        <span role="cell" className={`v5-col-importe num v5-importe ${claseMov(m)}`}>
                          {signoMov(m)}
                          {formatearEuros(Number(m.importe))}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
          {filtrados.length > limite && (
            <div className="v5-tabla-mas">
              <button type="button" className="v5-boton" onClick={() => setLimite((n) => n + POR_PAGINA)}>
                Mostrar {Math.min(POR_PAGINA, filtrados.length - limite)} más
              </button>
              <span className="v5-tenue">Ves {limite} de {filtrados.length}</span>
            </div>
          )}
        </div>

        {seleccionado && escritorio && (
          <aside className="v5-movs-detalle" aria-label="Detalle del movimiento">
            <Detalle
              m={seleccionado}
              usuarioId={usuarioId}
              todos={movimientosReales ?? movimientos}
              soloLectura={soloLectura}
              onGuardado={onGuardado}
              onCerrar={() => setSeleccion(null)}
            />
          </aside>
        )}
      </div>

      {seleccionado && !escritorio && (
        <Panel titulo="Movimiento" onCerrar={() => setSeleccion(null)}>
          <Detalle
            m={seleccionado}
            usuarioId={usuarioId}
            todos={movimientosReales ?? movimientos}
            soloLectura={soloLectura}
            onGuardado={onGuardado}
            onCerrar={() => setSeleccion(null)}
            enPanel
          />
        </Panel>
      )}
    </div>
  )
}
