import { useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import { hoyIso } from '../../lib/movimientosUtils'
import { useObjetivosAhorro } from '../../lib/useObjetivosAhorro'
import { toast } from '../../lib/toast'
import { confirmar } from '../../lib/confirmar'
import InputImporte from '../InputImporte'

function mesesHasta(fechaIso) {
  if (!fechaIso) return null
  const hoy = new Date(hoyIso())
  const destino = new Date(fechaIso)
  const meses = (destino.getFullYear() - hoy.getFullYear()) * 12 + (destino.getMonth() - hoy.getMonth())
  return meses
}

function TarjetaObjetivo({ objetivo, ahorroMensual, onEditar, onEliminar }) {
  const meta = Number(objetivo.importe_objetivo)
  const actual = Number(objetivo.importe_actual)
  const restante = Math.max(meta - actual, 0)
  const pct = meta > 0 ? Math.min((actual / meta) * 100, 100) : 0
  const completado = actual >= meta

  const mesesRitmo = ahorroMensual > 0 ? Math.ceil(restante / ahorroMensual) : null
  const mesesPlazo = mesesHasta(objetivo.fecha_objetivo)
  const aportacionNecesaria = mesesPlazo && mesesPlazo > 0 ? restante / mesesPlazo : null

  return (
    <div className="objetivo-card fade-in-up">
      <div className="objetivo-card-cabecera">
        <span className="objetivo-nombre">{objetivo.nombre}</span>
        <span className="grupo-botones">
          <button type="button" className="btn-editar" onClick={onEditar}>
            Editar
          </button>
          <button type="button" className="btn-eliminar" onClick={onEliminar}>
            Eliminar
          </button>
        </span>
      </div>

      <div className="objetivo-cifras">
        <span className="objetivo-actual">{formatearEuros(actual)}</span>
        <span className="objetivo-meta">de {formatearEuros(meta)}</span>
      </div>

      <div className="ratio-barra">
        <div
          className={`ratio-barra-relleno ${completado ? '' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="objetivo-pct">{pct.toFixed(0)}%</span>

      {completado ? (
        <p className="objetivo-nota objetivo-logrado">¡Objetivo alcanzado! 🎉</p>
      ) : (
        <p className="objetivo-nota">
          Te faltan <strong>{formatearEuros(restante)}</strong>.
          {mesesRitmo !== null && (
            <>
              {' '}A tu ritmo de ahorro ({formatearEuros(ahorroMensual)}/mes), lo alcanzarías en{' '}
              <strong>{mesesRitmo}</strong> {mesesRitmo === 1 ? 'mes' : 'meses'}.
            </>
          )}
          {aportacionNecesaria !== null && (
            <>
              {' '}Para llegar en la fecha marcada necesitas apartar{' '}
              <strong>{formatearEuros(aportacionNecesaria)}</strong>/mes.
            </>
          )}
        </p>
      )}
    </div>
  )
}

function FormularioObjetivo({ inicial, onGuardar, onCancelar, guardando }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [importeObjetivo, setImporteObjetivo] = useState(
    inicial ? Number(inicial.importe_objetivo) : null,
  )
  const [importeActual, setImporteActual] = useState(
    inicial ? Number(inicial.importe_actual) : null,
  )
  const [fechaObjetivo, setFechaObjetivo] = useState(inicial?.fecha_objetivo ?? '')
  const [error, setError] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    const meta = Number(importeObjetivo)
    if (!nombre.trim()) return setError('Ponle un nombre al objetivo.')
    if (!meta || meta <= 0) return setError('Introduce un importe objetivo válido.')
    setError(null)
    onGuardar({
      nombre,
      importeObjetivo: meta,
      importeActual: Number(importeActual) || 0,
      fechaObjetivo: fechaObjetivo || null,
    })
  }

  return (
    <form className="objetivo-form" onSubmit={handleSubmit}>
      <label htmlFor="obj-nombre">Nombre</label>
      <input
        id="obj-nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="ej. Fondo de emergencia, Entrada piso"
        autoFocus
      />

      <label htmlFor="obj-meta">Importe objetivo (€)</label>
      <InputImporte
        id="obj-meta"
        value={importeObjetivo}
        onValueChange={setImporteObjetivo}
        placeholder="ej. 6.000"
      />

      <label htmlFor="obj-actual">¿Cuánto llevas ya? (€, opcional)</label>
      <InputImporte
        id="obj-actual"
        value={importeActual}
        onValueChange={setImporteActual}
        placeholder="0"
      />

      <label htmlFor="obj-fecha">Fecha objetivo (opcional)</label>
      <input
        id="obj-fecha"
        type="date"
        value={fechaObjetivo}
        onChange={(e) => setFechaObjetivo(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      <div className="edicion-acciones">
        <button type="button" className="btn-eliminar" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar objetivo'}
        </button>
      </div>
    </form>
  )
}

export default function AhorroObjetivo({ usuarioId, ahorroMensual }) {
  const { objetivos, cargando, tablaFalta, crear, actualizar, eliminar } = useObjetivosAhorro(usuarioId)
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function handleCrear(datos) {
    setGuardando(true)
    const ok = await crear(datos)
    setGuardando(false)
    if (ok) {
      setCreando(false)
      toast('Objetivo guardado')
    } else {
      toast('No se ha podido guardar', 'error')
    }
  }

  async function handleActualizar(id, datos) {
    setGuardando(true)
    const ok = await actualizar(id, {
      nombre: datos.nombre.trim(),
      importe_objetivo: datos.importeObjetivo,
      importe_actual: datos.importeActual,
      fecha_objetivo: datos.fechaObjetivo,
    })
    setGuardando(false)
    if (ok) {
      setEditandoId(null)
      toast('Objetivo actualizado')
    } else {
      toast('No se ha podido guardar', 'error')
    }
  }

  async function handleEliminar(id) {
    if (!(await confirmar('¿Eliminar este objetivo de ahorro?'))) return
    const ok = await eliminar(id)
    if (ok) toast('Objetivo eliminado')
    else toast('No se ha podido eliminar', 'error')
  }

  return (
    <div className="simulador fade-in-up">
      <h2>Objetivos de ahorro</h2>
      <p className="ayuda">
        Crea metas concretas (fondo de emergencia, entrada de un piso, un viaje…) y sigue tu
        progreso hacia cada una.
      </p>

      {tablaFalta && (
        <p className="ayuda" style={{ color: 'var(--gasto)' }}>
          Los objetivos de ahorro estarán disponibles en cuanto se active esta función.
        </p>
      )}

      {cargando ? (
        <div className="skeleton skeleton-linea" style={{ width: '60%', height: 40 }} />
      ) : (
        <>
          {objetivos.map((o) =>
            editandoId === o.id ? (
              <FormularioObjetivo
                key={o.id}
                inicial={o}
                guardando={guardando}
                onGuardar={(datos) => handleActualizar(o.id, datos)}
                onCancelar={() => setEditandoId(null)}
              />
            ) : (
              <TarjetaObjetivo
                key={o.id}
                objetivo={o}
                ahorroMensual={ahorroMensual}
                onEditar={() => setEditandoId(o.id)}
                onEliminar={() => handleEliminar(o.id)}
              />
            ),
          )}

          {!tablaFalta && objetivos.length === 0 && !creando && (
            <div className="estado-vacio">
              <p>Aún no tienes objetivos de ahorro.</p>
              <button type="button" onClick={() => setCreando(true)}>
                Crear mi primer objetivo
              </button>
            </div>
          )}

          {creando ? (
            <FormularioObjetivo
              guardando={guardando}
              onGuardar={handleCrear}
              onCancelar={() => setCreando(false)}
            />
          ) : (
            !tablaFalta &&
            objetivos.length > 0 && (
              <button type="button" className="btn-nuevo-objetivo" onClick={() => setCreando(true)}>
                + Nuevo objetivo
              </button>
            )
          )}
        </>
      )}
    </div>
  )
}
