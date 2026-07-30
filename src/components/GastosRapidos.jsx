import { useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import { useGastosRapidos } from '../lib/useGastosRapidos'
import { confirmar } from '../lib/confirmar'
import InputImporte from './InputImporte'

function FormularioRapido({ inicial, categorias, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [importe, setImporte] = useState(inicial ? Number(inicial.importe) : null)
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '')
  const [error, setError] = useState(null)

  function handleSubmit() {
    if (!nombre.trim()) return setError('Ponle un nombre (ej. Café).')
    if (!importe || Number(importe) <= 0) return setError('Pon un importe por defecto.')
    if (!categoriaId) return setError('Elige una categoría.')
    const cat = categorias.find((c) => c.id === categoriaId)
    onGuardar({
      nombre: nombre.trim(),
      importe: Number(importe),
      categoriaId,
      categoriaNombre: cat?.nombre ?? null,
    })
  }

  // No es un <form> porque va anidado dentro del formulario de movimiento
  // (formularios anidados son HTML inválido y disparan el submit externo).
  return (
    <div className="gr-form">
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Nombre (ej. Café, Comer, Gasolina)"
        autoFocus
      />
      <InputImporte value={importe} onValueChange={setImporte} placeholder="Importe" />
      <div className="chips-fila" role="group" aria-label="Categoría">
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            className={categoriaId === c.id ? 'chip activo' : 'chip'}
            onClick={() => setCategoriaId(c.id)}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="edicion-acciones">
        <button type="button" className="btn-eliminar" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit}>
          Guardar acceso
        </button>
      </div>
    </div>
  )
}

export default function GastosRapidos({
  usuarioId,
  categorias,
  onRegistrar,
  registrandoId,
  repetibles = [],
  onRepetir,
  duplicandoClave,
}) {
  const { items, crear, actualizar, eliminar } = useGastosRapidos(usuarioId)
  const [gestion, setGestion] = useState(false)
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)

  async function handleEliminar(id) {
    if (await confirmar('¿Borrar este acceso rápido?')) eliminar(id)
  }

  // "Añadir rápido" unificado: si tienes accesos guardados, se muestran esos
  // (＋). Si no, se muestran sugerencias de tu histórico reciente (↻) como
  // semilla. Nunca las dos tiras a la vez. La ayuda larga solo aparece la
  // primera vez (ni accesos guardados ni histórico) como onboarding de una línea.
  const hayGuardados = items.length > 0
  const mostrarRepetibles = !hayGuardados && repetibles.length > 0
  const mostrarAyuda = !hayGuardados && repetibles.length === 0

  // Sin accesos guardados y sin histórico ni gestión abierta: solo la ayuda de
  // una línea (con el "Editar" para empezar) — no una sección vacía y pesada.
  return (
    <div className="gastos-rapidos">
      <div className="gr-cabecera">
        <span className="repetir-titulo">Añadir rápido</span>
        <button
          type="button"
          className="link"
          onClick={() => {
            setGestion((g) => !g)
            setCreando(false)
            setEditandoId(null)
          }}
        >
          {gestion ? 'Hecho' : 'Editar'}
        </button>
      </div>

      {!gestion && hayGuardados && (
        <div className="repetir-chips">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className="repetir-chip gr-chip"
              onClick={() => onRegistrar(it)}
              disabled={registrandoId === it.id}
            >
              <span className="repetir-chip-icono">＋</span>
              <span className="repetir-chip-texto">
                {it.nombre} · {formatearEuros(Number(it.importe))}
              </span>
            </button>
          ))}
        </div>
      )}

      {!gestion && mostrarRepetibles && (
        <div className="repetir-chips">
          {repetibles.map((rep) => {
            const clave = `${rep.categoriaId}|${rep.fuenteId}|${rep.importe}`
            const etiqueta = rep.fuenteNombre || rep.categoriaNombre || 'Movimiento'
            return (
              <button
                key={clave}
                type="button"
                className="repetir-chip"
                onClick={() => onRepetir?.(rep)}
                disabled={duplicandoClave === clave}
              >
                <span className="repetir-chip-icono">↻</span>
                <span className="repetir-chip-texto">
                  {etiqueta} · {formatearEuros(rep.importe)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!gestion && mostrarAyuda && (
        <p className="ayuda gr-vacio">
          Pulsa “Editar” para crear accesos de un toque (café, comer, gasolina…).
        </p>
      )}

      {gestion && (
        <div className="gr-gestion">
          {items.map((it) =>
            editandoId === it.id ? (
              <FormularioRapido
                key={it.id}
                inicial={it}
                categorias={categorias}
                onGuardar={(datos) => {
                  actualizar(it.id, datos)
                  setEditandoId(null)
                }}
                onCancelar={() => setEditandoId(null)}
              />
            ) : (
              <div key={it.id} className="gr-item">
                <span className="gr-item-texto">
                  {it.nombre} · {formatearEuros(Number(it.importe))}
                  {it.categoriaNombre && <span className="gr-item-cat"> · {it.categoriaNombre}</span>}
                </span>
                <span className="grupo-botones">
                  <button type="button" className="btn-editar" onClick={() => setEditandoId(it.id)}>
                    Editar
                  </button>
                  <button type="button" className="btn-eliminar" onClick={() => handleEliminar(it.id)}>
                    Borrar
                  </button>
                </span>
              </div>
            ),
          )}

          {creando ? (
            <FormularioRapido
              categorias={categorias}
              onGuardar={(datos) => {
                crear(datos)
                setCreando(false)
              }}
              onCancelar={() => setCreando(false)}
            />
          ) : (
            <button type="button" className="btn-nuevo-objetivo" onClick={() => setCreando(true)}>
              + Nuevo acceso rápido
            </button>
          )}
        </div>
      )}
    </div>
  )
}
