import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { esInversion, formatearEuros } from '../lib/categorias'

export default function ListaMovimientos({ movimientos, cargando, onEliminado }) {
  const [eliminandoId, setEliminandoId] = useState(null)

  if (cargando) return <p>Cargando movimientos…</p>
  if (movimientos.length === 0) return <p>Todavía no hay movimientos este mes.</p>

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
                {m.fecha} <span className="badge-fijo">{m.es_fijo ? 'Fijo' : 'Variable'}</span>
              </span>
              <div className="linea-acciones">
                {m.nota && <span className="nota">{m.nota}</span>}
                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={() => handleEliminar(m.id)}
                  disabled={eliminandoId === m.id}
                >
                  {eliminandoId === m.id ? '…' : 'Eliminar'}
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
