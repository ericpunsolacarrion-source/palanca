import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import { CATEGORIA_INVERSION, esInversion, formatearEuros } from '../lib/categorias'
import { agregarPorMes, claveMes, formatearCompacto, formatearFecha } from '../lib/movimientosUtils'
import { useCountUp } from '../lib/useCountUp'
import SelectorEtiqueta from './SelectorEtiqueta'
import { resolverEtiqueta } from '../lib/etiquetas'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import Pildora from './Pildora'
import { PILDORA_INVERSION } from '../lib/pildoras'

const hoy = () => new Date().toISOString().slice(0, 10)
const ALTO_BARRAS = 110

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

function etiquetaMesLarga(clave) {
  const [anio, mes] = clave.split('-')
  const fecha = new Date(Number(anio), Number(mes) - 1, 1)
  const texto = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function GraficoInversionMensual({ meses, media }) {
  const maximo = Math.max(1, ...meses.map((m) => m.invertido))
  const pctMedia = (media / maximo) * 100

  return (
    <div className="grafico fade-in-up">
      <h2>Inversión mensual (12 meses)</h2>
      <div className="inv-barras" style={{ height: ALTO_BARRAS + 40 }}>
        {media > 0 && (
          <div className="inv-linea-media" style={{ bottom: `${20 + (pctMedia / 100) * ALTO_BARRAS}px` }}>
            <span>media {formatearEuros(media)}</span>
          </div>
        )}
        {meses.map((m, i) => {
          const pct = (m.invertido / maximo) * 100
          return (
            <div key={m.clave} className="inv-col">
              <span className="inv-importe">{m.invertido > 0 ? formatearCompacto(m.invertido) : ''}</span>
              <div className="inv-zona-barra" style={{ height: ALTO_BARRAS }}>
                <div
                  className={`inv-barra ${m.invertido > 0 ? 'activa' : ''}`}
                  style={{ height: `${Math.max(pct, 2)}%`, animationDelay: `${i * 0.04}s` }}
                  title={`${m.etiqueta}: ${formatearEuros(m.invertido)}`}
                />
              </div>
              <span className="inv-mes">{m.etiqueta}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Inversiones({ usuarioId, movimientos, cargando, onGuardado }) {
  const { items: categorias, crear: crearCategoria } = useEtiquetas('categorias', usuarioId, 'gasto')
  const { items: fuentes, crear: crearFuente } = useEtiquetas('fuentes', usuarioId, 'gasto')

  const [fuenteId, setFuenteId] = useState('')
  const [nuevaFuente, setNuevaFuente] = useState('')
  const [importe, setImporte] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const categoriaInversion = categorias.find((c) => c.nombre === CATEGORIA_INVERSION)

  // Las aportaciones SON movimientos con categoría "Inversion": misma fuente
  // de datos que el resto de la app, siempre sincronizado.
  const aportaciones = useMemo(() => movimientos.filter(esInversion), [movimientos])

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

  const ultimosDoceMeses = useMemo(() => agregarPorMes(aportaciones, 12), [aportaciones])

  const mediaMensual = useMemo(
    () => ultimosDoceMeses.reduce((s, m) => s + m.invertido, 0) / 12,
    [ultimosDoceMeses],
  )

  const porMes = useMemo(() => {
    const mapa = new Map()
    for (const a of aportaciones) {
      const clave = claveMes(a.fecha)
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
    if (!(await confirmar('¿Eliminar esta aportación?'))) return
    setEliminandoId(id)
    const { error: errorDelete } = await supabase.from('movimientos').delete().eq('id', id)
    setEliminandoId(null)
    if (errorDelete) {
      toast('No se ha podido eliminar. Revisa tu conexión.', 'error')
      return
    }
    toast('Aportación eliminada')
    onGuardado?.()
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
      toast('Cambios guardados')
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
    toast('Aportación registrada')
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

      <Pildora usuarioId={usuarioId} pildora={PILDORA_INVERSION} />

      {ultimosDoceMeses.some((m) => m.invertido > 0) && (
        <GraficoInversionMensual meses={ultimosDoceMeses} media={mediaMensual} />
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
        <div className="lista-movimientos">
          <div className="skeleton-fila">
            <div className="skeleton skeleton-linea" style={{ width: '55%' }} />
            <div className="skeleton skeleton-linea" style={{ width: '35%' }} />
          </div>
        </div>
      ) : porMes.length === 0 ? (
        <div className="estado-vacio">
          <p>Todavía no has registrado ninguna aportación.</p>
          <p className="ayuda">
            Registra arriba tu primera inversión y verás aquí el desglose por mes y plataforma.
          </p>
        </div>
      ) : (
        <div className="inversion-historial">
          {porMes.map(([clave, { total, detalle }]) => (
            <div key={clave} className="inversion-mes fade-in-up">
              <div className="linea-principal">
                <span className="categoria">{etiquetaMesLarga(clave)}</span>
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
                        {formatearFecha(d.fecha)} · {d.nombre}: {formatearEuros(d.importe)}
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
