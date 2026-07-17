import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import { useRecurrentes } from '../lib/useRecurrentes'
import { formatearEuros } from '../lib/categorias'
import { claveMesActual, formatearFecha, hoyIso } from '../lib/movimientosUtils'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import InputImporte from './InputImporte'
import InputFecha from './InputFecha'

// Fecha por defecto al marcar un recurrente: el día del mes definido, en el mes
// en curso (acotado al último día del mes). Sin día definido, el día de hoy.
function fechaDelMes(rec) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (rec.diaMes) {
    const ultimo = new Date(y, m + 1, 0).getDate()
    const d = Math.min(rec.diaMes, ultimo)
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return hoyIso()
}

function FormularioRecurrente({ inicial, categoriasGasto, categoriasIngreso, onGuardar, onCancelar }) {
  const [tipo, setTipo] = useState(inicial?.tipo ?? 'gasto')
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [importe, setImporte] = useState(inicial ? Number(inicial.importe) : null)
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '')
  const [diaMes, setDiaMes] = useState(inicial?.diaMes ? String(inicial.diaMes) : '')
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
    const diaNum = diaMes ? Math.min(31, Math.max(1, Math.round(Number(diaMes)))) : null
    onGuardar({
      tipo,
      nombre: nombre.trim(),
      importe: Number(importe),
      categoriaId,
      categoriaNombre: cat?.nombre ?? null,
      diaMes: diaNum,
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

      <label className="rec-dia">
        <span>¿Qué día del mes ocurre? (opcional)</span>
        <input
          type="number"
          min="1"
          max="31"
          inputMode="numeric"
          value={diaMes}
          onChange={(e) => setDiaMes(e.target.value)}
          placeholder="ej. 1, 28"
        />
      </label>
      <p className="ayuda-mini">
        Se usará como fecha del movimiento cuando lo marques en la checklist. Si lo dejas vacío, se
        usará el día en que lo marques.
      </p>

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

// Nº de meses que el recurrente lleva registrado (histórico conservado).
function mesesRegistrados(rec) {
  return Array.isArray(rec.mesesAplicados) ? rec.mesesAplicados.length : 0
}

// Ítem PENDIENTE de la checklist. Al marcar el check se abre una confirmación
// explícita ("¿Confirmas X € el DD/MM?") con importe y fecha editables antes de
// registrar, para que cualquiera entienda qué pasa al confirmar.
function FilaChecklist({ rec, hoyDia, registrando, onRegistrar }) {
  const esIngreso = rec.tipo === 'ingreso'
  const [abierto, setAbierto] = useState(false)
  const [importe, setImporte] = useState(Number(rec.importe))
  const [fecha, setFecha] = useState(() => fechaDelMes(rec))

  const diasRestantes = rec.diaMes ? rec.diaMes - hoyDia : null
  const toca = diasRestantes === null || diasRestantes <= 0
  const meses = mesesRegistrados(rec)

  const cuando = () => {
    if (!rec.diaMes) return null
    if (diasRestantes <= 0) return ' · toca ya'
    if (diasRestantes === 1) return ' · mañana'
    return ` · en ${diasRestantes} días`
  }

  return (
    <div className={`rec-cl-fila ${toca ? '' : 'proximo'} ${abierto ? 'abierto' : ''}`}>
      <div className="rec-cl-linea">
        <label className="rec-cl-check">
          <input
            type="checkbox"
            checked={false}
            disabled={registrando}
            onChange={() => setAbierto(true)}
            aria-label={`Marcar ${rec.nombre} como hecho este mes`}
          />
          <span className="rec-cl-tick" aria-hidden="true" />
        </label>
        <div className="rec-cl-info">
          <span className="rec-cl-nombre">{rec.nombre}</span>
          <span className="rec-cl-sub">
            {rec.categoriaNombre}
            {rec.diaMes && <span className={`rec-cuando ${toca ? 'toca' : ''}`}>{cuando()}</span>}
            {meses > 0 && (
              <span className="rec-cl-racha">
                {' · '}llevas {meses} {meses === 1 ? 'mes' : 'meses'}
              </span>
            )}
          </span>
        </div>
        <span className={`rec-cl-importe ${esIngreso ? 'ingreso' : 'gasto'}`}>
          {esIngreso ? '+' : '−'}
          {formatearEuros(Number(rec.importe))}
        </span>
      </div>

      {abierto && (
        <div className="rec-cl-form">
          <p className="rec-cl-confirma">
            ¿Confirmas{' '}
            <strong className={esIngreso ? 'ingreso' : 'gasto'}>
              {esIngreso ? '+' : '−'}
              {formatearEuros(Number(importe) || 0)}
            </strong>{' '}
            el <strong>{formatearFecha(fecha)}</strong>? Se registrará como movimiento.
          </p>
          <div className="rec-cl-campos">
            <label className="rec-cl-campo">
              <span>Importe{rec.confirmar ? ' (ajústalo si varía)' : ''}</span>
              <InputImporte value={importe} onValueChange={setImporte} />
            </label>
            <label className="rec-cl-campo">
              <span>Fecha</span>
              <InputFecha value={fecha} onChange={setFecha} />
            </label>
          </div>
          <div className="rec-cl-form-acc">
            <button type="button" className="btn-eliminar" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onRegistrar(rec, Number(importe), fecha)}
              disabled={registrando}
            >
              {registrando ? '…' : 'Confirmar y registrar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Ítem YA HECHO este mes: marcado, sin acción. Muestra la racha de meses.
function FilaHecha({ rec }) {
  const esIngreso = rec.tipo === 'ingreso'
  const meses = mesesRegistrados(rec)
  return (
    <div className="rec-cl-fila hecha">
      <div className="rec-cl-linea">
        <span className="rec-cl-check hecha">
          <span className="rec-cl-tick" aria-hidden="true">
            ✓
          </span>
        </span>
        <div className="rec-cl-info">
          <span className="rec-cl-nombre">{rec.nombre}</span>
          <span className="rec-cl-sub">
            Hecho este mes
            {meses > 0 && ` · llevas ${meses} ${meses === 1 ? 'mes' : 'meses'}`}
          </span>
        </div>
        <span className={`rec-cl-importe hecha ${esIngreso ? 'ingreso' : 'gasto'}`}>
          {esIngreso ? '+' : '−'}
          {formatearEuros(Number(rec.importe))}
        </span>
      </div>
    </div>
  )
}

export default function Recurrentes({ usuarioId, onRegistrado }) {
  const { items, crear, actualizar, eliminar, marcarAplicado } = useRecurrentes(usuarioId)
  const { items: categoriasGasto } = useEtiquetas('categorias', usuarioId, 'gasto')
  const { items: categoriasIngreso } = useEtiquetas('categorias', usuarioId, 'ingreso')
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [registrandoId, setRegistrandoId] = useState(null)

  async function registrar(rec, importe, fecha) {
    if (!importe || importe <= 0) return
    setRegistrandoId(rec.id)
    const { error } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      tipo: rec.tipo,
      categoria_id: rec.categoriaId,
      fuente_id: rec.fuenteId ?? null,
      importe,
      fecha: fecha || fechaDelMes(rec),
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

  const mesActual = claveMesActual()
  const hoyDia = new Date().getDate()

  const activos = items.filter((r) => r.activo)
  // Pendientes de este mes: los que ya tocan primero (por día).
  const pendientes = activos
    .filter((r) => r.aplicadoEn !== mesActual)
    .sort((a, b) => (a.diaMes ?? 99) - (b.diaMes ?? 99))
  const hechos = activos.filter((r) => r.aplicadoEn === mesActual)

  return (
    <div className="recurrentes vista">
      <p className="ayuda">
        Tu checklist del mes: <strong>marca cada recurrente cuando ocurra</strong> (se ha cobrado la
        nómina, se ha pagado el recibo) y se registrará solo, con la fecha que le pusiste. Los de
        importe variable te dejan ajustar la cifra al marcarlos.
      </p>

      {activos.length > 0 && (
        <div className="rec-checklist">
          <span className="balance-etiqueta-principal">
            Checklist de este mes
            {pendientes.length > 0 && <span className="rec-cl-cuenta"> · {pendientes.length} por marcar</span>}
          </span>
          {pendientes.map((rec) => (
            <FilaChecklist
              key={rec.id}
              rec={rec}
              hoyDia={hoyDia}
              onRegistrar={registrar}
              registrando={registrandoId === rec.id}
            />
          ))}
          {hechos.map((rec) => (
            <FilaHecha key={rec.id} rec={rec} />
          ))}
          {pendientes.length === 0 && (
            <p className="ayuda rec-cl-todo">¡Todo marcado este mes! 🎉</p>
          )}
        </div>
      )}

      <div className="rec-gestion">
        <span className="balance-etiqueta-principal">Configurar recurrentes</span>
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
                  {rec.diaMes ? ` · día ${rec.diaMes}` : ''}
                  {rec.confirmar ? ' · confirmar importe' : ' · importe fijo'}
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
