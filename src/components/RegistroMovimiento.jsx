import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import SelectorEtiqueta from './SelectorEtiqueta'
import { resolverEtiqueta } from '../lib/etiquetas'
import { CATEGORIA_INVERSION, formatearEuros } from '../lib/categorias'
import { hoyIso } from '../lib/movimientosUtils'
import { frecuenciaCategorias, frecuentesParaRepetir, importesFrecuentes } from '../lib/sugerencias'
import { toast } from '../lib/toast'
import InputImporte from './InputImporte'

const TOAST_MODO = { gasto: 'Gasto guardado', ingreso: 'Ingreso guardado', inversion: 'Inversión guardada' }

export default function RegistroMovimiento({ usuarioId, movimientos = [], onGuardado }) {
  // modo: 'gasto' | 'ingreso' | 'inversion'. La inversión se guarda como
  // gasto + categoría "Inversion" (mismo registro que en la pantalla Inversión).
  const [modo, setModo] = useState('gasto')
  const [categoriaId, setCategoriaId] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [fuenteId, setFuenteId] = useState('')
  const [nuevaFuente, setNuevaFuente] = useState('')
  const [importe, setImporte] = useState(null)
  const [fecha, setFecha] = useState(hoyIso())
  const [esFijo, setEsFijo] = useState(false)
  const [nota, setNota] = useState('')
  const [mostrarNota, setMostrarNota] = useState(false)
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
  }, [modo])

  // Sugerencias derivadas del histórico para registrar con menos toques.
  const categoriasOrdenadas = useMemo(() => {
    const freq = frecuenciaCategorias(movimientos, modo)
    return [...categorias].sort((a, b) => (freq.get(b.nombre) ?? 0) - (freq.get(a.nombre) ?? 0))
  }, [categorias, movimientos, modo])

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
    const { error: errorInsert } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      tipo: tipoDb,
      categoria_id: rep.categoriaId,
      fuente_id: rep.fuenteId,
      importe: rep.importe,
      fecha: hoyIso(),
      es_fijo: esInversion ? false : rep.esFijo,
    })
    setDuplicandoClave(null)
    if (errorInsert) {
      toast('No se ha podido añadir. Inténtalo de nuevo.', 'error')
      return
    }
    toast(`Añadido: ${formatearEuros(rep.importe)}`)
    onGuardado()
  }

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

    const { error: errorInsert } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      tipo: tipoDb,
      categoria_id: idCategoria,
      fuente_id: resultFuente.id,
      importe: importeNumero,
      fecha,
      es_fijo: esInversion ? false : esFijo,
      nota: nota.trim() || null,
    })

    setGuardando(false)

    if (errorInsert) {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
      return
    }

    setImporte(null)
    setNota('')
    setMostrarNota(false)
    setCategoriaId('')
    setNuevaCategoria('')
    setFuenteId('')
    setNuevaFuente('')
    setEsFijo(false)
    toast(TOAST_MODO[modo])
    onGuardado()
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

      {repetibles.length > 0 && (
        <div className="repetir-strip">
          <span className="repetir-titulo">Repetir</span>
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
        <InputImporte id="importe" value={importe} onValueChange={setImporte} autoFocus />
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

      {!esInversion && (
        <SelectorEtiqueta
          id="categoria"
          label="Categoría"
          valor={categoriaId}
          onChange={setCategoriaId}
          items={categoriasOrdenadas}
          nuevoNombre={nuevaCategoria}
          onNuevoNombreChange={setNuevaCategoria}
          placeholder={modo === 'ingreso' ? 'ej. Dividendos, Alquiler' : 'ej. Vivienda, Ocio'}
        />
      )}

      <SelectorEtiqueta
        id="fuente"
        label={
          esInversion
            ? 'Plataforma'
            : `Concepto ${modo === 'ingreso' ? '(ej. Restaurante, Oficina)' : '(opcional)'}`
        }
        valor={fuenteId}
        onChange={setFuenteId}
        items={fuentes}
        nuevoNombre={nuevaFuente}
        onNuevoNombreChange={setNuevaFuente}
        placeholder={
          esInversion
            ? 'ej. Trade Republic, MyInvestor'
            : modo === 'ingreso'
              ? 'ej. Trabajo restaurante'
              : 'ej. Alquiler piso'
        }
      />

      <div className="fila-fecha-fijo">
        <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        {!esInversion && (
          <div className="tipo-toggle">
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

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={guardando} className="btn-guardar-movimiento">
        {guardando ? 'Guardando…' : textoBoton}
      </button>
    </form>
  )
}
