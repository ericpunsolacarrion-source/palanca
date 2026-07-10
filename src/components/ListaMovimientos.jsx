import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { esInversion, formatearEuros } from '../lib/categorias'
import { claveMes, claveMesActual, formatearFecha, totalesDe } from '../lib/movimientosUtils'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import InputImporte from './InputImporte'

function FilaEdicion({ movimiento, onCancelar, onGuardado }) {
  const [importe, setImporte] = useState(Number(movimiento.importe))
  const [fecha, setFecha] = useState(movimiento.fecha)
  const [esFijo, setEsFijo] = useState(movimiento.es_fijo)
  const [nota, setNota] = useState(movimiento.nota ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function handleGuardar(e) {
    e.preventDefault()
    const importeNumero = Number(importe)
    if (!importe || !importeNumero || importeNumero <= 0) {
      setError('Introduce un importe válido mayor que 0.')
      return
    }

    setGuardando(true)
    const { error: errorUpdate } = await supabase
      .from('movimientos')
      .update({ importe: importeNumero, fecha, es_fijo: esFijo, nota: nota.trim() || null })
      .eq('id', movimiento.id)

    setGuardando(false)

    if (errorUpdate) {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
      return
    }

    toast('Cambios guardados')
    onGuardado()
  }

  return (
    <form className="edicion-movimiento" onSubmit={handleGuardar}>
      <label htmlFor={`importe-${movimiento.id}`}>Importe (€)</label>
      <InputImporte
        id={`importe-${movimiento.id}`}
        value={importe}
        onValueChange={setImporte}
      />

      <label htmlFor={`fecha-${movimiento.id}`}>Fecha</label>
      <input
        id={`fecha-${movimiento.id}`}
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />

      <div className="tipo-toggle">
        <button type="button" className={!esFijo ? 'activo' : ''} onClick={() => setEsFijo(false)}>
          Variable
        </button>
        <button type="button" className={esFijo ? 'activo' : ''} onClick={() => setEsFijo(true)}>
          Fijo
        </button>
      </div>

      <label htmlFor={`nota-${movimiento.id}`}>Nota (opcional)</label>
      <input
        id={`nota-${movimiento.id}`}
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      <div className="edicion-acciones">
        <button type="button" className="btn-eliminar" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

function SkeletonLista() {
  return (
    <ul className="lista-movimientos" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="skeleton-fila">
          <div className="skeleton skeleton-linea" style={{ width: '55%' }} />
          <div className="skeleton skeleton-linea" style={{ width: '35%' }} />
        </li>
      ))}
    </ul>
  )
}

function etiquetaMes(clave) {
  const [anio, mes] = clave.split('-')
  const texto = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(
    new Date(Number(anio), Number(mes) - 1, 1),
  )
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function ListaMovimientos({
  movimientos,
  cargando,
  onEliminado,
  soloLectura,
  onIrARegistro,
  agruparPorMes = false,
}) {
  const [eliminandoId, setEliminandoId] = useState(null)
  const [editandoId, setEditandoId] = useState(null)
  const [mesesAbiertos, setMesesAbiertos] = useState(() => new Set())

  if (cargando) return <SkeletonLista />

  if (movimientos.length === 0) {
    return (
      <div className="estado-vacio">
        <p>Todavía no hay movimientos.</p>
        {onIrARegistro && (
          <button type="button" onClick={onIrARegistro}>
            Registrar el primero
          </button>
        )}
      </div>
    )
  }

  async function handleEliminar(id) {
    if (!(await confirmar('¿Eliminar este movimiento?'))) return
    setEliminandoId(id)
    const { error } = await supabase.from('movimientos').delete().eq('id', id)
    setEliminandoId(null)
    if (error) {
      toast('No se ha podido eliminar. Revisa tu conexión.', 'error')
      return
    }
    toast('Movimiento eliminado')
    onEliminado?.()
  }

  function renderItem(m) {
    const inversion = esInversion(m)

    if (!soloLectura && editandoId === m.id) {
      return (
        <li key={m.id} className={inversion ? 'inversion' : m.tipo}>
          <FilaEdicion
            movimiento={m}
            onCancelar={() => setEditandoId(null)}
            onGuardado={() => {
              setEditandoId(null)
              onEliminado?.()
            }}
          />
        </li>
      )
    }

    return (
      <li key={m.id} className={inversion ? 'inversion' : m.tipo}>
        <div className="linea-principal">
          <span className="categoria">
            {m.categoria?.nombre ?? 'Sin categoría'}
            {m.fuente && <span className="fuente"> · {m.fuente.nombre}</span>}
          </span>
          <span className="importe">
            {inversion ? '↗ ' : m.tipo === 'gasto' ? '-' : '+'}
            {formatearEuros(m.importe)}
          </span>
        </div>
        <div className="linea-secundaria">
          <span>
            {formatearFecha(m.fecha)}{' '}
            <span className="badge-fijo">{m.es_fijo ? 'Fijo' : 'Variable'}</span>
          </span>
          <div className="linea-acciones">
            {m.nota && <span className="nota">{m.nota}</span>}
            {!soloLectura && (
              <span className="grupo-botones">
                <button type="button" className="btn-editar" onClick={() => setEditandoId(m.id)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={() => handleEliminar(m.id)}
                  disabled={eliminandoId === m.id}
                >
                  {eliminandoId === m.id ? '…' : 'Eliminar'}
                </button>
              </span>
            )}
          </div>
        </div>
      </li>
    )
  }

  // Modo plano (dashboard, últimos movimientos).
  if (!agruparPorMes) {
    return <ul className="lista-movimientos">{movimientos.map(renderItem)}</ul>
  }

  // Modo agrupado (historial): mes actual desplegado, anteriores en acordeón.
  const claveActual = claveMesActual()
  const grupos = new Map()
  for (const m of movimientos) {
    const clave = claveMes(m.fecha)
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave).push(m)
  }
  const claves = [...grupos.keys()].sort((a, b) => (a < b ? 1 : -1))

  function alternarMes(clave) {
    setMesesAbiertos((prev) => {
      const s = new Set(prev)
      if (s.has(clave)) s.delete(clave)
      else s.add(clave)
      return s
    })
  }

  return (
    <div className="historial-agrupado">
      {claves.map((clave) => {
        const items = grupos.get(clave)
        const esActual = clave === claveActual
        const abierto = esActual || mesesAbiertos.has(clave)
        const t = totalesDe(items)

        if (esActual) {
          return (
            <div key={clave} className="mes-grupo mes-actual">
              <div className="mes-cabecera-actual">{etiquetaMes(clave)}</div>
              <ul className="lista-movimientos">{items.map(renderItem)}</ul>
            </div>
          )
        }

        return (
          <div key={clave} className="mes-grupo">
            <button
              type="button"
              className={`mes-cabecera ${abierto ? 'abierto' : ''}`}
              onClick={() => alternarMes(clave)}
              aria-expanded={abierto}
            >
              <span className="mes-cabecera-nombre">
                <span className="mes-flecha">{abierto ? '▾' : '▸'}</span>
                {etiquetaMes(clave)}
              </span>
              <span className="mes-cabecera-resumen">
                <span className="ingreso">+{formatearEuros(t.ingresos)}</span>{' '}
                <span className="gasto">-{formatearEuros(t.gastos)}</span>
              </span>
            </button>
            {abierto && <ul className="lista-movimientos">{items.map(renderItem)}</ul>}
          </div>
        )
      })}
    </div>
  )
}
