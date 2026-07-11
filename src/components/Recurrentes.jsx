import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import { useRecurrentes } from '../lib/useRecurrentes'
import { formatearEuros } from '../lib/categorias'
import { hoyIso } from '../lib/movimientosUtils'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import InputImporte from './InputImporte'

function FormularioRecurrente({ inicial, categoriasGasto, categoriasIngreso, onGuardar, onCancelar }) {
  const [tipo, setTipo] = useState(inicial?.tipo ?? 'gasto')
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [importe, setImporte] = useState(inicial ? Number(inicial.importe) : null)
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '')
  // Por defecto: gastos automáticos (sin confirmar), ingresos a confirmar cada mes.
  const [confirmarImporte, setConfirmarImporte] = useState(
    inicial ? Boolean(inicial.confirmar) : (inicial?.tipo ?? 'gasto') === 'ingreso',
  )
  const [error, setError] = useState(null)

  const categorias = tipo === 'ingreso' ? categoriasIngreso : categoriasGasto

  function handleSubmit() {
    if (!nombre.trim()) return setError('Ponle un nombre (ej. Alquiler, Nómina).')
    if (!importe || Number(importe) <= 0) return setError('Pon el importe habitual.')
    if (!categoriaId) return setError('Elige una categoría.')
    const cat = categorias.find((c) => c.id === categoriaId)
    onGuardar({
      tipo,
      nombre: nombre.trim(),
      importe: Number(importe),
      categoriaId,
      categoriaNombre: cat?.nombre ?? null,
      confirmar: confirmarImporte,
    })
  }

  return (
    <div className="rec-form">
      <div className="tipo-toggle">
        <button
          type="button"
          className={tipo === 'gasto' ? 'activo' : ''}
          onClick={() => {
            setTipo('gasto')
            setCategoriaId('')
            setConfirmarImporte(false)
          }}
        >
          Gasto
        </button>
        <button
          type="button"
          className={tipo === 'ingreso' ? 'activo' : ''}
          onClick={() => {
            setTipo('ingreso')
            setCategoriaId('')
            setConfirmarImporte(true)
          }}
        >
          Ingreso
        </button>
      </div>

      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={tipo === 'ingreso' ? 'Nombre (ej. Nómina)' : 'Nombre (ej. Alquiler)'}
        autoFocus
      />
      <InputImporte value={importe} onValueChange={setImporte} placeholder="Importe habitual" />

      <div className="chips-fila chips-fila-compacta" role="group" aria-label="Categoría">
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip chip-sm ${categoriaId === c.id ? 'activo' : ''}`}
            onClick={() => setCategoriaId(c.id)}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      <label className="rec-check">
        <input
          type="checkbox"
          checked={confirmarImporte}
          onChange={(e) => setConfirmarImporte(e.target.checked)}
        />
        Confirmar el importe cada mes (recomendado para ingresos, que suelen variar)
      </label>

      {error && <p className="error">{error}</p>}
      <div className="edicion-acciones">
        <button type="button" className="btn-eliminar" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit}>
          Guardar recurrente
        </button>
      </div>
    </div>
  )
}

function TarjetaPendiente({ rec, onRegistrar, registrando }) {
  const [importe, setImporte] = useState(Number(rec.importe))
  const esIngreso = rec.tipo === 'ingreso'

  return (
    <div className={`rec-pendiente ${esIngreso ? 'ingreso' : 'gasto'}`}>
      <div className="rec-pendiente-info">
        <span className="rec-pendiente-nombre">{rec.nombre}</span>
        <span className="rec-pendiente-cat">{rec.categoriaNombre}</span>
      </div>
      {rec.confirmar ? (
        <div className="rec-pendiente-confirmar">
          <InputImporte value={importe} onValueChange={setImporte} />
          <button type="button" onClick={() => onRegistrar(rec, Number(importe))} disabled={registrando}>
            Registrar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="rec-pendiente-boton"
          onClick={() => onRegistrar(rec, Number(rec.importe))}
          disabled={registrando}
        >
          {esIngreso ? '+ ' : '− '}
          {formatearEuros(Number(rec.importe))}
        </button>
      )}
    </div>
  )
}

export default function Recurrentes({ usuarioId, onRegistrado }) {
  const { items, pendientes, crear, actualizar, eliminar, marcarAplicado } = useRecurrentes(usuarioId)
  const { items: categoriasGasto } = useEtiquetas('categorias', usuarioId, 'gasto')
  const { items: categoriasIngreso } = useEtiquetas('categorias', usuarioId, 'ingreso')
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [registrandoId, setRegistrandoId] = useState(null)

  async function registrar(rec, importe) {
    if (!importe || importe <= 0) return
    setRegistrandoId(rec.id)
    const { error } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      tipo: rec.tipo,
      categoria_id: rec.categoriaId,
      fuente_id: rec.fuenteId ?? null,
      importe,
      fecha: hoyIso(),
      es_fijo: true,
    })
    setRegistrandoId(null)
    if (error) {
      toast('No se ha podido registrar. Inténtalo de nuevo.', 'error')
      return
    }
    marcarAplicado(rec.id)
    toast(`${rec.nombre} registrado`)
    onRegistrado?.()
  }

  async function handleEliminar(id) {
    if (await confirmar('¿Borrar este recurrente?')) eliminar(id)
  }

  return (
    <div className="recurrentes vista">
      <p className="ayuda">
        Configura lo que se repite cada mes (alquiler, nómina, suscripciones) y regístralo sin
        volver a rellenar nada. Los ingresos te piden confirmar el importe, por si varía.
      </p>

      {pendientes.length > 0 && (
        <div className="rec-pendientes">
          <span className="balance-etiqueta-principal">Pendientes de este mes</span>
          {pendientes.map((rec) => (
            <TarjetaPendiente
              key={rec.id}
              rec={rec}
              onRegistrar={registrar}
              registrando={registrandoId === rec.id}
            />
          ))}
        </div>
      )}

      <div className="rec-gestion">
        <span className="balance-etiqueta-principal">Tus recurrentes</span>
        {items.length === 0 && !creando && (
          <p className="ayuda">Aún no tienes recurrentes. Crea el primero abajo.</p>
        )}
        {items.map((rec) =>
          editandoId === rec.id ? (
            <FormularioRecurrente
              key={rec.id}
              inicial={rec}
              categoriasGasto={categoriasGasto}
              categoriasIngreso={categoriasIngreso}
              onGuardar={(datos) => {
                actualizar(rec.id, datos)
                setEditandoId(null)
              }}
              onCancelar={() => setEditandoId(null)}
            />
          ) : (
            <div key={rec.id} className={`rec-item ${rec.activo ? '' : 'pausado'}`}>
              <div className="rec-item-info">
                <span className="rec-item-nombre">
                  {rec.nombre}
                  <span className={`rec-badge ${rec.tipo}`}>{rec.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span>
                  {!rec.activo && <span className="rec-badge pausado">Pausado</span>}
                </span>
                <span className="rec-item-detalle">
                  {formatearEuros(Number(rec.importe))} · {rec.categoriaNombre}
                  {rec.confirmar ? ' · confirmar cada mes' : ' · automático'}
                </span>
              </div>
              <span className="grupo-botones">
                <button type="button" className="btn-editar" onClick={() => actualizar(rec.id, { activo: !rec.activo })}>
                  {rec.activo ? 'Pausar' : 'Activar'}
                </button>
                <button type="button" className="btn-editar" onClick={() => setEditandoId(rec.id)}>
                  Editar
                </button>
                <button type="button" className="btn-eliminar" onClick={() => handleEliminar(rec.id)}>
                  Borrar
                </button>
              </span>
            </div>
          ),
        )}

        {creando ? (
          <FormularioRecurrente
            categoriasGasto={categoriasGasto}
            categoriasIngreso={categoriasIngreso}
            onGuardar={(datos) => {
              crear(datos)
              setCreando(false)
            }}
            onCancelar={() => setCreando(false)}
          />
        ) : (
          <button type="button" className="btn-nuevo-objetivo" onClick={() => setCreando(true)}>
            + Nuevo recurrente
          </button>
        )}
      </div>
    </div>
  )
}
