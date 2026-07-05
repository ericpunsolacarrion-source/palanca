import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import { CATEGORIA_INVERSION, formatearEuros } from '../lib/categorias'
import { useCountUp } from '../lib/useCountUp'
import SelectorEtiqueta, { resolverEtiqueta } from './SelectorEtiqueta'

const hoy = () => new Date().toISOString().slice(0, 10)

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

function etiquetaMes(clave) {
  const [anio, mes] = clave.split('-')
  const fecha = new Date(Number(anio), Number(mes) - 1, 1)
  const texto = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function Inversiones({ usuarioId, onGuardado }) {
  const { items: categorias, crear: crearCategoria } = useEtiquetas('categorias', usuarioId, 'gasto')
  const { items: fuentes, crear: crearFuente } = useEtiquetas('fuentes', usuarioId, 'gasto')

  const [aportaciones, setAportaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  const [fuenteId, setFuenteId] = useState('')
  const [nuevaFuente, setNuevaFuente] = useState('')
  const [importe, setImporte] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const categoriaInversion = categorias.find((c) => c.nombre === CATEGORIA_INVERSION)

  const cargarAportaciones = useCallback(async () => {
    if (!usuarioId || !categoriaInversion) return
    setCargando(true)

    const { data, error: errorSelect } = await supabase
      .from('movimientos')
      .select('id, importe, fecha, fuente:fuentes(id, nombre)')
      .eq('usuario_id', usuarioId)
      .eq('categoria_id', categoriaInversion.id)
      .order('fecha', { ascending: false })

    if (!errorSelect) setAportaciones(data)
    setCargando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, categoriaInversion?.id])

  useEffect(() => {
    cargarAportaciones()
  }, [cargarAportaciones])

  const totalInvertido = useMemo(
    () => aportaciones.reduce((s, a) => s + Number(a.importe), 0),
    [aportaciones],
  )

  const porPlataforma = useMemo(() => {
    const mapa = new Map()
    for (const a of aportaciones) {
      const nombre = a.fuente?.nombre ?? 'Sin especificar'
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + Number(a.importe))
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }, [aportaciones])

  const ultimosDoceMeses = useMemo(() => {
    const hoyFecha = new Date()
    const claves = []
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(hoyFecha.getFullYear(), hoyFecha.getMonth() - i, 1)
      claves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const totales = new Map(claves.map((c) => [c, 0]))
    for (const a of aportaciones) {
      const clave = a.fecha.slice(0, 7)
      if (totales.has(clave)) totales.set(clave, totales.get(clave) + Number(a.importe))
    }

    return claves.map((clave) => {
      const [anio, mes] = clave.split('-')
      const fechaMes = new Date(Number(anio), Number(mes) - 1, 1)
      const etiqueta = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(fechaMes).replace('.', '')
      return { clave, etiqueta, total: totales.get(clave) }
    })
  }, [aportaciones])

  const mediaMensual = useMemo(
    () => ultimosDoceMeses.reduce((s, m) => s + m.total, 0) / 12,
    [ultimosDoceMeses],
  )

  const porMes = useMemo(() => {
    const mapa = new Map()
    for (const a of aportaciones) {
      const clave = a.fecha.slice(0, 7)
      if (!mapa.has(clave)) mapa.set(clave, { total: 0, detalle: [] })
      const entrada = mapa.get(clave)
      entrada.total += Number(a.importe)
      entrada.detalle.push({
        id: a.id,
        nombre: a.fuente?.nombre ?? 'Sin especificar',
        importe: Number(a.importe),
        fecha: a.fecha,
      })
    }
    return [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [aportaciones])

  const [eliminandoId, setEliminandoId] = useState(null)
  const [editando, setEditando] = useState(null)
  const [importeEdit, setImporteEdit] = useState('')
  const [fechaEdit, setFechaEdit] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta aportación? No se puede deshacer.')) return
    setEliminandoId(id)
    const { error: errorDelete } = await supabase.from('movimientos').delete().eq('id', id)
    setEliminandoId(null)
    if (!errorDelete) {
      cargarAportaciones()
      onGuardado?.()
    }
  }

  function empezarEdicion(d) {
    setEditando(d.id)
    setImporteEdit(String(d.importe))
    setFechaEdit(d.fecha)
  }

  async function handleGuardarEdicion(id) {
    const importeNumero = Number(importeEdit)
    if (!importeNumero || importeNumero <= 0) return
    setGuardandoEdit(true)
    const { error: errorUpdate } = await supabase
      .from('movimientos')
      .update({ importe: importeNumero, fecha: fechaEdit })
      .eq('id', id)
    setGuardandoEdit(false)
    if (!errorUpdate) {
      setEditando(null)
      cargarAportaciones()
      onGuardado?.()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const importeNumero = Number(importe)
    if (!importeNumero || importeNumero <= 0) {
      setError('Introduce un importe válido mayor que 0.')
      return
    }

    setGuardando(true)
    setError(null)

    let categoriaId = categoriaInversion?.id
    if (!categoriaId) {
      const creada = await crearCategoria(CATEGORIA_INVERSION)
      if (!creada) {
        setError('No se ha podido preparar la categoría de inversión. Inténtalo de nuevo.')
        setGuardando(false)
        return
      }
      categoriaId = creada.id
    }

    const resultFuente = await resolverEtiqueta(fuenteId, nuevaFuente, crearFuente, 'plataforma', setError)
    if (!resultFuente.ok) {
      setGuardando(false)
      return
    }

    const { error: errorInsert } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      tipo: 'gasto',
      categoria_id: categoriaId,
      fuente_id: resultFuente.id,
      importe: importeNumero,
      fecha,
      es_fijo: false,
    })

    setGuardando(false)

    if (errorInsert) {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
      return
    }

    setImporte('')
    setFuenteId('')
    setNuevaFuente('')
    cargarAportaciones()
    onGuardado?.()
  }

  return (
    <div className="vista">
      <div className="balance fade-in-up">
        <span className="balance-etiqueta-principal">Total invertido</span>
        <Cifra valor={totalInvertido} className="balance-hero inversion" />
        {mediaMensual > 0 && (
          <span className="balance-etiqueta-principal">
            Media de {formatearEuros(mediaMensual)} al mes (últimos 12 meses)
          </span>
        )}

        {porPlataforma.length > 0 && (
          <div className="inversion-plataformas">
            {porPlataforma.map(([nombre, total]) => (
              <div key={nombre} className="inversion-plataforma">
                <span>{nombre}</span>
                <span>{formatearEuros(total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {ultimosDoceMeses.some((m) => m.total > 0) && (
        <div className="grafico fade-in-up">
          <h2>Inversión mensual (12 meses)</h2>
          <div className="inversion-meses-redondas">
            {ultimosDoceMeses.map((m) => {
              const maximo = Math.max(1, ...ultimosDoceMeses.map((x) => x.total))
              const tamano = 28 + (m.total / maximo) * 22
              return (
                <div key={m.clave} className="inversion-mes-redonda-col">
                  <div
                    className={`inversion-mes-redonda ${m.total > 0 ? 'activa' : ''}`}
                    style={{ width: tamano, height: tamano }}
                    title={`${m.etiqueta}: ${formatearEuros(m.total)}`}
                  >
                    {m.total > 0 && <span className="inversion-mes-redonda-importe">{Math.round(m.total)}</span>}
                  </div>
                  <span>{m.etiqueta}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <form className="registro-movimiento fade-in-up" onSubmit={handleSubmit}>
        <h2>Nueva aportación</h2>

        <SelectorEtiqueta
          id="plataforma"
          label="Plataforma"
          valor={fuenteId}
          onChange={setFuenteId}
          items={fuentes}
          nuevoNombre={nuevaFuente}
          onNuevoNombreChange={setNuevaFuente}
          placeholder="ej. Trade Republic, MyInvestor"
        />

        <label htmlFor="importe-inversion">Importe (€)</label>
        <input
          id="importe-inversion"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          placeholder="0,00"
        />

        <label htmlFor="fecha-inversion">Fecha</label>
        <input
          id="fecha-inversion"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Registrar aportación'}
        </button>
      </form>

      {cargando ? (
        <p>Cargando historial…</p>
      ) : porMes.length === 0 ? (
        <p>Todavía no has registrado ninguna aportación.</p>
      ) : (
        <div className="inversion-historial">
          {porMes.map(([clave, { total, detalle }]) => (
            <div key={clave} className="inversion-mes fade-in-up">
              <div className="linea-principal">
                <span className="categoria">{etiquetaMes(clave)}</span>
                <span className="importe">{formatearEuros(total)}</span>
              </div>
              <div className="inversion-detalle-lista">
                {detalle.map((d) =>
                  editando === d.id ? (
                    <div key={d.id} className="edicion-movimiento">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={importeEdit}
                        onChange={(e) => setImporteEdit(e.target.value)}
                      />
                      <input type="date" value={fechaEdit} onChange={(e) => setFechaEdit(e.target.value)} />
                      <div className="edicion-acciones">
                        <button type="button" className="btn-eliminar" onClick={() => setEditando(null)}>
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGuardarEdicion(d.id)}
                          disabled={guardandoEdit}
                        >
                          {guardandoEdit ? 'Guardando…' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={d.id} className="inversion-detalle-fila">
                      <span>
                        {d.nombre}: {formatearEuros(d.importe)}
                      </span>
                      <span className="grupo-botones">
                        <button type="button" className="btn-editar" onClick={() => empezarEdicion(d)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-eliminar"
                          onClick={() => handleEliminar(d.id)}
                          disabled={eliminandoId === d.id}
                        >
                          {eliminandoId === d.id ? '…' : 'Eliminar'}
                        </button>
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
