import Icono from './Icono'
import { etiquetaCategoria } from '../lib/categorias'
import { conceptoDe, fechaRelativa } from '../lib/inicio'
import { AVISO_DEMO, esDemo } from '../lib/datosDemo'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { esInversion, esTraspaso, formatearEuros } from '../lib/categorias'
import { SELECT_MOVIMIENTO, claveMes, claveMesActual, hoyIso, totalesDe } from '../lib/movimientosUtils'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import { aCentimos } from '../lib/importe'
import InputImporte from './InputImporte'
import InputFecha from './InputFecha'
import { useEtiquetas } from '../lib/useEtiquetas'
import { useComerciosCompartidos } from '../lib/DatosCompartidos'
import { claveComercio, directorio, mismaEtiqueta } from '../lib/comercios'
import { esAjuste } from '../lib/categorias'

function FilaEdicion({ movimiento, usuarioId, todos = [], onCancelar, onGuardado }) {
  const [importe, setImporte] = useState(Number(movimiento.importe))
  const [fecha, setFecha] = useState(movimiento.fecha)
  const [esFijo, setEsFijo] = useState(movimiento.es_fijo)
  const [nota, setNota] = useState(movimiento.nota ?? '')
  const identidad = directorio().identificar(movimiento)
  const [comercio, setComercio] = useState(identidad.nombre)
  const [categoriaId, setCategoriaId] = useState(movimiento.categoria_id ?? movimiento.categoria?.id ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const { recordar } = useComerciosCompartidos()
  const { items: categorias } = useEtiquetas('categorias', usuarioId, movimiento.tipo)
  // Comercio y categoría se editan en el consumo y los ingresos; no en
  // inversiones (su "comercio" es la plataforma) ni en ajustes de saldo.
  const editable = !esInversion(movimiento) && !esAjuste(movimiento)
  const categoriasVisibles = categorias.filter((c) => c.nombre !== 'Ajuste' && c.nombre !== 'Inversion')

  async function handleGuardar(e) {
    e.preventDefault()
    const importeNumero = Number(importe)
    if (!importe || !importeNumero || importeNumero <= 0) {
      setError('Introduce un importe válido mayor que 0.')
      return
    }
    const nombreNuevo = comercio.trim().replace(/\s+/g, ' ')
    const cambiaComercio = editable && nombreNuevo && !mismaEtiqueta(nombreNuevo, identidad.nombre)
    const cambiaCategoria = editable && categoriaId && categoriaId !== (movimiento.categoria_id ?? movimiento.categoria?.id)
    // Si el movimiento no tenía texto (gasto rápido), el comercio pasa a ser su nota.
    const sinTexto = !(movimiento.nota || movimiento.fuente?.nombre)
    const notaFinal = cambiaComercio && sinTexto && !nota.trim() ? nombreNuevo : nota.trim() || null

    setGuardando(true)
    const { data: fila, error: errorUpdate } = await supabase
      .from('movimientos')
      .update({
        importe: importeNumero,
        importe_centimos: aCentimos(importeNumero),
        fecha,
        es_fijo: esFijo,
        nota: notaFinal,
        ...(cambiaCategoria ? { categoria_id: categoriaId } : {}),
      })
      .eq('id', movimiento.id)
      .select(SELECT_MOVIMIENTO)
      .single()
    setGuardando(false)
    if (errorUpdate) {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
      return
    }

    // MEMORIA: "este texto del banco es <comercio>" (y su categoría), para siempre.
    const nombreCat = categorias.find((c) => c.id === categoriaId)?.nombre
    const clave = claveComercio(movimiento.nota || movimiento.fuente?.nombre || '')
    if (clave && (cambiaComercio || cambiaCategoria)) {
      await recordar([{ clave, nombre: cambiaComercio ? nombreNuevo : identidad.nombre, ...(cambiaCategoria && nombreCat ? { categoria: nombreCat } : {}) }])
    }

    // ¿Hay más movimientos de ese comercio con otra categoría? Se ofrece igualarlos.
    const nombreFinal = cambiaComercio ? nombreNuevo : identidad.nombre
    if (cambiaCategoria && nombreFinal) {
      const dir = directorio()
      const otros = todos.filter(
        (x) =>
          x.id !== movimiento.id &&
          !esDemo(x.id) &&
          x.tipo === movimiento.tipo &&
          !esInversion(x) &&
          !esAjuste(x) &&
          (x.categoria_id ?? x.categoria?.id) !== categoriaId &&
          (mismaEtiqueta(dir.nombreDe(x), nombreFinal) || (clave && claveComercio(x.nota || x.fuente?.nombre || '') === clave)),
      )
      if (otros.length && (await confirmar(`¿Poner también «${etiquetaCategoria(nombreCat)}» a los otros ${otros.length} movimientos de ${nombreFinal}?`))) {
        const { error: errLote } = await supabase.from('movimientos').update({ categoria_id: categoriaId }).in('id', otros.map((x) => x.id))
        if (errLote) toast('No se han podido actualizar los demás. Inténtalo de nuevo.', 'error')
        else toast(`Actualizados ${otros.length + 1} movimientos de ${nombreFinal}`)
        onGuardado() // recarga completa: cambian varios
        return
      }
    }

    toast(cambiaComercio ? `Guardado. Recordaremos que es ${nombreNuevo}` : 'Cambios guardados')
    onGuardado(fila ? { accion: 'editar', fila } : undefined)
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
      <InputFecha id={`fecha-${movimiento.id}`} value={fecha} onChange={setFecha} max={hoyIso()} />

      {editable && (
        <>
          <label htmlFor={`comercio-${movimiento.id}`}>{movimiento.tipo === 'ingreso' ? 'De quién' : 'Comercio'}</label>
          <input
            id={`comercio-${movimiento.id}`}
            type="text"
            value={comercio}
            maxLength={60}
            onChange={(e) => setComercio(e.target.value)}
            placeholder={movimiento.tipo === 'ingreso' ? 'ej. Empresa, Bizum de Ana' : 'ej. Mercadona'}
          />
          {movimiento.nota && !mismaEtiqueta(movimiento.nota, comercio) && (
            <p className="ayuda-mini edicion-banco">En el banco: {movimiento.nota}. Si cambias el nombre, lo recordaremos para los próximos.</p>
          )}

          <label htmlFor={`categoria-${movimiento.id}`}>Categoría</label>
          <select id={`categoria-${movimiento.id}`} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            {!categoriasVisibles.some((c) => c.id === categoriaId) && movimiento.categoria && (
              <option value={categoriaId}>{etiquetaCategoria(movimiento.categoria.nombre)}</option>
            )}
            {categoriasVisibles.map((c) => (
              <option key={c.id} value={c.id}>{etiquetaCategoria(c.nombre)}</option>
            ))}
          </select>
        </>
      )}

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
  usuarioId,
  todos,
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
    if (esDemo(id)) return toast(AVISO_DEMO)
    if (!(await confirmar('¿Eliminar este movimiento?'))) return
    setEliminandoId(id)
    const { error } = await supabase.from('movimientos').delete().eq('id', id)
    setEliminandoId(null)
    if (error) {
      toast('No se ha podido eliminar. Revisa tu conexión.', 'error')
      return
    }
    toast('Movimiento eliminado')
    onEliminado?.({ accion: 'borrar', ids: [id] })
  }

  function renderItem(m) {
    const inversion = esInversion(m)

    if (!soloLectura && editandoId === m.id) {
      return (
        <li key={m.id} className={inversion ? 'inversion' : m.tipo}>
          <FilaEdicion
            movimiento={m}
            usuarioId={usuarioId}
            todos={todos ?? movimientos}
            onCancelar={() => setEditandoId(null)}
            onGuardado={(cambio) => {
              setEditandoId(null)
              onEliminado?.(cambio)
            }}
          />
        </li>
      )
    }

    return (
      <li key={m.id} className={inversion ? 'inversion' : m.tipo}>
        <div className="linea-principal">
          <span className="categoria">{conceptoDe(m)}</span>
          <span className="importe">
            {inversion || esTraspaso(m) ? '' : m.tipo === 'gasto' ? '−' : '+'}
            {formatearEuros(m.importe)}
          </span>
        </div>
        <div className="linea-secundaria">
          <span className="ls-meta">
            {/* El título ya es el concepto: aquí la categoría (si no es lo mismo) y la fecha. */}
            {conceptoDe(m) !== etiquetaCategoria(m.categoria?.nombre) && <span>{etiquetaCategoria(m.categoria?.nombre)} · </span>}
            {fechaRelativa(m.fecha)}
            {m.es_fijo && <span className="badge-fijo">Fijo</span>}
          </span>
          {!soloLectura && (
            <span className="grupo-botones">
              <button type="button" className="btn-editar" onClick={() => (esDemo(m.id) ? toast(AVISO_DEMO) : setEditandoId(m.id))}>
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
                <span className="mes-flecha"><Icono nombre="chevron" tam={14} style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }} /></span>
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
