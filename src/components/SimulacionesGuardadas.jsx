import { useState } from 'react'
import { useSimulacionesGuardadas } from '../lib/useSimulacionesGuardadas'
import { toast } from '../lib/toast'

export default function SimulacionesGuardadas({ usuarioId, tipo, datosActuales, onCargar }) {
  const { simulaciones, cargando, guardar, eliminar } = useSimulacionesGuardadas(usuarioId, tipo)
  const [guardando, setGuardando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)

  async function handleGuardar(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardando(true)
    await guardar(nombre.trim(), datosActuales)
    setGuardando(false)
    setNombre('')
    setMostrarForm(false)
    toast('Simulación guardada')
  }

  return (
    <div className="simulaciones-guardadas">
      {!cargando && simulaciones.length > 0 && (
        <div className="simulaciones-lista">
          {simulaciones.map((s) => (
            <div key={s.id} className="simulacion-item">
              <button type="button" className="simulacion-nombre" onClick={() => onCargar(s.datos)}>
                {s.nombre}
              </button>
              <button type="button" className="btn-eliminar" onClick={() => eliminar(s.id)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {datosActuales &&
        (mostrarForm ? (
          <form onSubmit={handleGuardar} className="guardar-simulacion-form">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Piso centro, 150.000€"
              autoFocus
            />
            <button type="submit" disabled={guardando || !nombre.trim()}>
              {guardando ? '…' : 'Guardar'}
            </button>
            <button type="button" className="btn-eliminar" onClick={() => setMostrarForm(false)}>
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" className="link" onClick={() => setMostrarForm(true)}>
            Guardar esta simulación
          </button>
        ))}
    </div>
  )
}
