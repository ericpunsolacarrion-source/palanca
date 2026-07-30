import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import SelectorEtiqueta from './SelectorEtiqueta'
import { resolverEtiqueta } from '../lib/etiquetas'
import { CATEGORIA_INVERSION, colorDeCategoria, formatearEuros } from '../lib/categorias'
import { SELECT_MOVIMIENTO, formatearFecha, hoyIso } from '../lib/movimientosUtils'
import { categoriaProbable, frecuenciaCategorias, frecuentesParaRepetir, importesFrecuentes } from '../lib/sugerencias'
import { toast } from '../lib/toast'
import InputImporte from './InputImporte'
import InputFecha from './InputFecha'
import GastosRapidos from './GastosRapidos'

const TOAST_MODO = { gasto: 'Gasto guardado', ingreso: 'Ingreso guardado', inversion: 'Inversión guardada' }

export default function RegistroMovimiento({ usuarioId, movimientos = [], onGuardado, modoInicial }) {
  // modo: 'gasto' | 'ingreso' | 'inversion'. La inversión se guarda como
  // gasto + categoría "Inversion" (mismo registro que en la pantalla Inversión).
  const [modo, setModo] = useState(modoInicial ?? 'gasto')
  const [categoriaId, setCategoriaId] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [fuenteId, setFuenteId] = useState('')
  const [nuevaFuente, setNuevaFuente] = useState('')
  const [importe, setImporte] = useState(null)
  const [fecha, setFecha] = useState(hoyIso())
  const [esFijo, setEsFijo] = useState(false)
  const [nota, setNota] = useState('')
  const [mostrarNota, setMostrarNota] = useState(false)
  const [mostrarDetalles, setMostrarDetalles] = useState(false)
  const [mostrarMasCategorias, setMostrarMasCategorias] = useState(false)
  // true cuando el usuario ha elegido categoría a mano: deja de auto-sugerir.
  const [categoriaManual, setCategoriaManual] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const esInversion = modo === 'inversion'
  const tipoDb = esInversion ? 'gasto' : modo

  const { items: categorias, crear: crearCategoria } = useEtiquetas('categorias', usuarioId, tipoDb)
  const { items: fuentes, crear: crearFuente } = useEtiquetas('fuentes', usuarioId, tipoDb)

  useEffect(() => {
    setCategoriaId('')
    setNuevaCategoria('')
    setFuenteId('')
    setNuevaFuente('')
    setMostrarMasCategorias(false)
    setCategoriaManual(false)
  }, [modo])

  // Categoría pre-seleccionada inteligente: mientras el usuario no elija a mano,
  // se marca la categoría más probable (según importe/histórico), para que
  // registrar sea confirmar, no pensar. Un toque en otro chip la fija a mano.
  const categoriaSugeridaId = useMemo(
    () => (esInversion ? null : categoriaProbable(movimientos, modo, importe)),
    [movimientos, modo, importe, esInversion],
  )

  useEffect(() => {
    if (!categoriaManual && !esInversion) setCategoriaId(categoriaSugeridaId ?? '')
  }, [categoriaSugeridaId, categoriaManual, esInversion])

  // Sugerencias derivadas del histórico para registrar con menos toques.
  const categoriasOrdenadas = useMemo(() => {
    const freq = frecuenciaCategorias(movimientos, modo)
    return [...categorias].sort((a, b) => (freq.get(b.nombre) ?? 0) - (freq.get(a.nombre) ?? 0))
  }, [categorias, movimientos, modo])

  // Categorías como chips (las más usadas primero). Si la elegida no está entre
  // las visibles (viene de "Otra"), se incluye para que siga marcada.
  const CATS_VISIBLES = 6
  const catsChips = useMemo(() => {
    const top = categoriasOrdenadas.slice(0, CATS_VISIBLES)
    if (categoriaId && !top.some((c) => c.id === categoriaId)) {
      const sel = categoriasOrdenadas.find((c) => c.id === categoriaId)
      if (sel) return [sel, ...top].slice(0, CATS_VISIBLES)
    }
    return top
  }, [categoriasOrdenadas, categoriaId])

  // Resumen corto para la barra "Más detalles" plegada.
  const resumenDetalles = `${fecha === hoyIso() ? 'Hoy' : formatearFecha(fecha)}${nota.trim() ? ' · nota' : ''}${esFijo ? ' · fijo' : ''}`

  const repetibles = useMemo(() => frecuentesParaRepetir(movimientos, modo), [movimientos, modo])

  const importesSugeridos = useMemo(
    () => importesFrecuentes(movimientos, modo, categoriaId || null),
    [movimientos, modo, categoriaId],
  )

  async function categoriaInversionId() {
    const existente = categorias.find((c) => c.nombre === CATEGORIA_INVERSION)
    if (existente) return existente.id
    const creada = await crearCategoria(CATEGORIA_INVERSION)
    return creada?.id ?? null
  }

  const [duplicandoClave, setDuplicandoClave] = useState(null)

  // Repetir en un toque: inserta el mismo movimiento con fecha de hoy.
  async function duplicar(rep) {
    if (!rep.categoriaId) return
    const clave = `${rep.categoriaId}|${rep.fuenteId}|${rep.importe}`
    setDuplicandoClave(clave)
    const { data: fila, error: errorInsert } = await supabase
      .from('movimientos')
      .insert({
        usuario_id: usuarioId,
        tipo: tipoDb,
        categoria_id: rep.categoriaId,
        fuente_id: rep.fuenteId,
        importe: rep.importe,
        fecha: hoyIso(),
        es_fijo: esInversion ? false : rep.esFijo,
      })
      .select(SELECT_MOVIMIENTO)
      .single()
    setDuplicandoClave(null)
    if (errorInsert) {
      toast('No se ha podido añadir. Inténtalo de nuevo.', 'error')
      return
    }
    onGuardado(fila ? { accion: 'crear', filas: [fila] } : undefined)
    toast(`Añadido: ${formatearEuros(rep.importe)}`, 'ok', accionDeshacer(fila))
  }

  const [registrandoRapidoId, setRegistrandoRapidoId] = useState(null)

  // Registra al instante un acceso rápido de gasto definido por el usuario.
  async function registrarRapido(item) {
    if (!item.categoriaId) {
      toast('Ese acceso no tiene categoría. Edítalo.', 'error')
      return
    }
    setRegistrandoRapidoId(item.id)
    const { data: fila, error: errorInsert } = await supabase
      .from('movimientos')
      .insert({
        usuario_id: usuarioId,
        tipo: 'gasto',
        categoria_id: item.categoriaId,
        fuente_id: null,
        importe: Number(item.importe),
        fecha: hoyIso(),
        es_fijo: false,
      })
      .select(SELECT_MOVIMIENTO)
      .single()
    setRegistrandoRapidoId(null)
    if (errorInsert) {
      toast('No se ha podido añadir. Inténtalo de nuevo.', 'error')
      return
    }
    onGuardado(fila ? { accion: 'crear', filas: [fila] } : undefined)
    toast(`${item.nombre}: ${formatearEuros(Number(item.importe))}`, 'ok', accionDeshacer(fila))
  }

  // Deshacer al vuelo el último movimiento creado (desde el toast). Borra por id
  // y refresca quirúrgicamente, sin sacar al usuario del alta.
  async function deshacerUltimo(id) {
    const { error: errorDelete } = await supabase.from('movimientos').delete().eq('id', id)
    if (errorDelete) {
      toast('No se ha podido deshacer.', 'error')
      return
    }
    toast('Movimiento deshecho')
    onGuardado({ accion: 'borrar', ids: [id] })
  }

  // Acción "Deshacer" para el toast, si el servidor devolvió la fila creada.
  const accionDeshacer = (fila) =>
    fila ? { texto: 'Deshacer', onAccion: () => deshacerUltimo(fila.id) } : null

  async function handleSubmit(e) {
    e.preventDefault()
    const importeNumero = Number(importe)
    if (!importe || !importeNumero || importeNumero <= 0) {
      setError('Introduce un importe válido mayor que 0.')
      return
    }
    if (!esInversion && !categoriaId) {
      setError('Elige o crea una categoría.')
      return
    }

    setGuardando(true)
    setError(null)

    // Categoría: fija a "Inversion" en modo inversión; elegida en gasto/ingreso.
    let idCategoria
    if (esInversion) {
      idCategoria = await categoriaInversionId()
      if (!idCategoria) {
        setError('No se ha podido preparar la categoría de inversión. Inténtalo de nuevo.')
        setGuardando(false)
        return
      }
    } else {
      const resultCategoria = await resolverEtiqueta(categoriaId, nuevaCategoria, crearCategoria, 'categoría', setError)
      if (!resultCategoria.ok) {
        setGuardando(false)
        return
      }
      idCategoria = resultCategoria.id
    }

    const etiquetaFuente = esInversion ? 'plataforma' : 'concepto'
    const resultFuente = await resolverEtiqueta(fuenteId, nuevaFuente, crearFuente, etiquetaFuente, setError)
    if (!resultFuente.ok) {
      setGuardando(false)
      return
    }

    const { data: fila, error: errorInsert } = await supabase
      .from('movimientos')
      .insert({
        usuario_id: usuarioId,
        tipo: tipoDb,
        categoria_id: idCategoria,
        fuente_id: resultFuente.id,
        importe: importeNumero,
        fecha,
        es_fijo: esInversion ? false : esFijo,
        nota: nota.trim() || null,
      })
      .select(SELECT_MOVIMIENTO)
      .single()

    setGuardando(false)

    if (errorInsert) {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
      return
    }

    // "Varios seguidos": se limpia el importe y lo específico del movimiento,
    // pero se MANTIENE la fecha y el tipo, se pliegan los detalles y se re-enfoca
    // el importe, listo para encadenar el siguiente sin salir de la pantalla.
    setImporte(null)
    setNota('')
    setMostrarNota(false)
    setCategoriaId('')
    setNuevaCategoria('')
    setFuenteId('')
    setNuevaFuente('')
    setEsFijo(false)
    setMostrarDetalles(false)
    setMostrarMasCategorias(false)
    setCategoriaManual(false)
    onGuardado(fila ? { accion: 'crear', filas: [fila] } : undefined)
    toast(TOAST_MODO[modo], 'ok', accionDeshacer(fila))
    requestAnimationFrame(() => document.getElementById('importe')?.focus())
  }

  const textoBoton = { gasto: 'Guardar gasto', ingreso: 'Guardar ingreso', inversion: 'Guardar inversión' }[modo]

  return (
    <form
      className={`registro-movimiento registro-movimiento-v2 ${esInversion ? 'modo-inversion' : ''}`}
      onSubmit={handleSubmit}
    >
      <div className="tipo-toggle tipo-toggle-3">
        <button type="button" className={modo === 'gasto' ? 'activo' : ''} onClick={() => setModo('gasto')}>
          Gasto
        </button>
        <button type="button" className={modo === 'ingreso' ? 'activo' : ''} onClick={() => setModo('ingreso')}>
          Ingreso
        </button>
        <button
          type="button"
          className={`inversion ${modo === 'inversion' ? 'activo' : ''}`}
          onClick={() => setModo('inversion')}
        >
          Inversión
        </button>
      </div>

      {modo === 'gasto' && (
        <GastosRapidos
          usuarioId={usuarioId}
          categorias={categoriasOrdenadas}
          onRegistrar={registrarRapido}
          registrandoId={registrandoRapidoId}
          repetibles={repetibles}
          onRepetir={duplicar}
          duplicandoClave={duplicandoClave}
        />
      )}

      {/* Ingreso/inversión: no hay accesos guardados, pero sí "repetir" del
          histórico como añadido rápido (en gasto lo maneja GastosRapidos). */}
      {modo !== 'gasto' && repetibles.length > 0 && (
        <div className="repetir-strip">
          <span className="repetir-titulo">Añadir rápido</span>
          <div className="repetir-chips">
            {repetibles.map((rep) => {
              const clave = `${rep.categoriaId}|${rep.fuenteId}|${rep.importe}`
              const etiqueta = rep.fuenteNombre || rep.categoriaNombre || 'Movimiento'
              return (
                <button
                  key={clave}
                  type="button"
                  className="repetir-chip"
                  onClick={() => duplicar(rep)}
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
        </div>
      )}

      <div className="importe-hero">
        <span className="importe-hero-simbolo">€</span>
        <InputImporte
          id="importe"
          value={importe}
          onValueChange={setImporte}
          autoFocus
          mostrarEuro={false}
        />
      </div>

      {importesSugeridos.length > 0 && (
        <div className="importes-sugeridos">
          {importesSugeridos.map((imp) => (
            <button
              key={imp}
              type="button"
              className={`chip-importe ${Number(importe) === imp ? 'activo' : ''}`}
              onClick={() => setImporte(imp)}
            >
              {formatearEuros(imp)}
            </button>
          ))}
        </div>
      )}

      {/* Categoría: chips de las más usadas (un toque) + "Otra" para el resto/crear */}
      {!esInversion && (
        <div className="cat-seccion">
          <span className="campo-label">Categoría</span>
          <div className="cat-chips">
            {catsChips.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${categoriaId === c.id ? 'activo' : ''}`}
                onClick={() => {
                  setCategoriaId(c.id)
                  setCategoriaManual(true)
                  setNuevaCategoria('')
                  setMostrarMasCategorias(false)
                }}
              >
                <span
                  className="cat-dot"
                  style={{ background: colorDeCategoria(c.nombre) }}
                  aria-hidden="true"
                />
                {c.nombre}
              </button>
            ))}
            <button
              type="button"
              className={`chip chip-otra ${mostrarMasCategorias ? 'activo' : ''}`}
              onClick={() => setMostrarMasCategorias((v) => !v)}
            >
              ＋ Otra
            </button>
          </div>
          {mostrarMasCategorias && (
            <SelectorEtiqueta
              id="categoria"
              label=""
              valor={categoriaId}
              onChange={(v) => {
                setCategoriaId(v)
                setCategoriaManual(true)
              }}
              items={categoriasOrdenadas}
              nuevoNombre={nuevaCategoria}
              onNuevoNombreChange={setNuevaCategoria}
              compacto
              placeholder={modo === 'ingreso' ? 'ej. Dividendos, Alquiler' : 'ej. Vivienda, Ocio'}
            />
          )}
        </div>
      )}

      {/* Más detalles: concepto, fecha, Variable/Fijo y nota — plegados por defecto */}
      <button
        type="button"
        className="mas-detalles-toggle"
        onClick={() => setMostrarDetalles((v) => !v)}
        aria-expanded={mostrarDetalles}
      >
        <span>{mostrarDetalles ? '▾' : '▸'} Más detalles</span>
        {!mostrarDetalles && <span className="mas-detalles-resumen">{resumenDetalles}</span>}
      </button>

      {mostrarDetalles && (
        <div className="mas-detalles">
          <SelectorEtiqueta
            id="fuente"
            label={
              esInversion
                ? 'Plataforma'
                : `Concepto ${modo === 'ingreso' ? '(ej. Restaurante)' : '(opcional)'}`
            }
            valor={fuenteId}
            onChange={setFuenteId}
            items={fuentes}
            nuevoNombre={nuevaFuente}
            onNuevoNombreChange={setNuevaFuente}
            compacto
            placeholder={
              esInversion
                ? 'ej. Trade Republic, MyInvestor'
                : modo === 'ingreso'
                  ? 'ej. Trabajo restaurante'
                  : 'ej. Alquiler piso'
            }
          />

          <div className="fila-fecha-fijo">
            <InputFecha id="fecha" value={fecha} onChange={setFecha} max={hoyIso()} />
            {!esInversion && (
              <div className="tipo-toggle tipo-toggle-mini">
                <button type="button" className={!esFijo ? 'activo' : ''} onClick={() => setEsFijo(false)}>
                  Variable
                </button>
                <button type="button" className={esFijo ? 'activo' : ''} onClick={() => setEsFijo(true)}>
                  Fijo
                </button>
              </div>
            )}
          </div>

          {mostrarNota ? (
            <input
              id="nota"
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="ej. Compra semanal"
              autoFocus
            />
          ) : (
            <button type="button" className="link" onClick={() => setMostrarNota(true)}>
              + Añadir nota
            </button>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={guardando} className="btn-guardar-movimiento">
        {guardando ? 'Guardando…' : textoBoton}
      </button>
    </form>
  )
}
