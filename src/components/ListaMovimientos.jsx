import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { esInversion, formatearEuros } from '../lib/categorias'
import { formatearFecha } from '../lib/movimientosUtils'

function FilaEdicion({ movimiento, onCancelar, onGuardado }) {
  const [importe, setImporte] = useState(String(movimiento.importe))
  const [fecha, setFecha] = useState(movimiento.fecha)
  const [esFijo, setEsFijo] = useState(movimiento.es_fijo)
  const [nota, setNota] = useState(movimiento.nota ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function handleGuardar(e) {
    e.preventDefault()
    const importeNumero = Number(importe)
    if (!importeNumero || importeNumero <= 0) {
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

    onGuardado()
  }

  return (
    <form className="edicion-movimiento" onSubmit={handleGuardar}>
      <label htmlFor={`importe-${movimiento.id}`}>Importe (€)</label>
      <input
        id={`importe-${movimiento.id}`}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={importe}
        onChange={(e) => setImporte(e.target.value)}
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

export default function ListaMovimientos({ movimientos, cargando, onEliminado, soloLectura, onIrARegistro }) {
  const [eliminandoId, setEliminandoId] = useState(null)
  const [editandoId, setEditandoId] = useState(null)

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
    if (!window.confirm('¿Eliminar este movimiento? No se puede deshacer.')) return
    setEliminandoId(id)
    const { error } = await supabase.from('movimientos').delete().eq('id', id)
    setEliminandoId(null)
    if (!error) onEliminado?.()
  }

  return (
    <ul className="lista-movimientos">
      {movimientos.map((m) => {
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
      })}
    </ul>
  )
}
