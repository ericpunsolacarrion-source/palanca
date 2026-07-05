import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import SelectorEtiqueta from './SelectorEtiqueta'
import { resolverEtiqueta } from '../lib/etiquetas'
import { toast } from '../lib/toast'

const hoy = () => new Date().toISOString().slice(0, 10)

export default function RegistroMovimiento({ usuarioId, onGuardado }) {
  const [tipo, setTipo] = useState('gasto')
  const [categoriaId, setCategoriaId] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [fuenteId, setFuenteId] = useState('')
  const [nuevaFuente, setNuevaFuente] = useState('')
  const [importe, setImporte] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [esFijo, setEsFijo] = useState(false)
  const [nota, setNota] = useState('')
  const [mostrarNota, setMostrarNota] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const { items: categorias, crear: crearCategoria } = useEtiquetas('categorias', usuarioId, tipo)
  const { items: fuentes, crear: crearFuente } = useEtiquetas('fuentes', usuarioId, tipo)

  useEffect(() => {
    setCategoriaId('')
    setNuevaCategoria('')
    setFuenteId('')
    setNuevaFuente('')
  }, [tipo])

  async function handleSubmit(e) {
    e.preventDefault()
    const importeNumero = Number(importe)
    if (!importeNumero || importeNumero <= 0) {
      setError('Introduce un importe válido mayor que 0.')
      return
    }
    if (!categoriaId) {
      setError('Elige o crea una categoría.')
      return
    }

    setGuardando(true)
    setError(null)

    const resultCategoria = await resolverEtiqueta(categoriaId, nuevaCategoria, crearCategoria, 'categoría', setError)
    if (!resultCategoria.ok) {
      setGuardando(false)
      return
    }

    const resultFuente = await resolverEtiqueta(fuenteId, nuevaFuente, crearFuente, 'concepto', setError)
    if (!resultFuente.ok) {
      setGuardando(false)
      return
    }

    const { error: errorInsert } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      tipo,
      categoria_id: resultCategoria.id,
      fuente_id: resultFuente.id,
      importe: importeNumero,
      fecha,
      es_fijo: esFijo,
      nota: nota.trim() || null,
    })

    setGuardando(false)

    if (errorInsert) {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
      return
    }

    setImporte('')
    setNota('')
    setMostrarNota(false)
    setCategoriaId('')
    setNuevaCategoria('')
    setFuenteId('')
    setNuevaFuente('')
    setEsFijo(false)
    toast(tipo === 'ingreso' ? 'Ingreso guardado' : 'Gasto guardado')
    onGuardado()
  }

  return (
    <form className="registro-movimiento registro-movimiento-v2" onSubmit={handleSubmit}>
      <div className="tipo-toggle">
        <button
          type="button"
          className={tipo === 'gasto' ? 'activo' : ''}
          onClick={() => setTipo('gasto')}
        >
          Gasto
        </button>
        <button
          type="button"
          className={tipo === 'ingreso' ? 'activo' : ''}
          onClick={() => setTipo('ingreso')}
        >
          Ingreso
        </button>
      </div>

      <div className="importe-hero">
        <span className="importe-hero-simbolo">€</span>
        <input
          id="importe"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          placeholder="0,00"
          autoFocus
        />
      </div>

      <SelectorEtiqueta
        id="categoria"
        label="Categoría"
        valor={categoriaId}
        onChange={setCategoriaId}
        items={categorias}
        nuevoNombre={nuevaCategoria}
        onNuevoNombreChange={setNuevaCategoria}
        placeholder={tipo === 'ingreso' ? 'ej. Dividendos, Alquiler' : 'ej. Vivienda, Ocio'}
      />

      <SelectorEtiqueta
        id="fuente"
        label={`Concepto ${tipo === 'ingreso' ? '(ej. Restaurante, Oficina)' : '(opcional)'}`}
        valor={fuenteId}
        onChange={setFuenteId}
        items={fuentes}
        nuevoNombre={nuevaFuente}
        onNuevoNombreChange={setNuevaFuente}
        placeholder={tipo === 'ingreso' ? 'ej. Trabajo restaurante' : 'ej. Alquiler piso'}
      />

      <div className="fila-fecha-fijo">
        <input
          id="fecha"
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
        {guardando ? 'Guardando…' : `Guardar ${tipo}`}
      </button>
    </form>
  )
}
