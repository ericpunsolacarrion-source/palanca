import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import { CATEGORIA_INVERSION, esInversion, formatearEuros } from '../lib/categorias'
import { agregarPorMes, claveMes, formatearCompacto, formatearFecha, hoyIso } from '../lib/movimientosUtils'
import { useCountUp } from '../lib/useCountUp'
import SelectorEtiqueta from './SelectorEtiqueta'
import { resolverEtiqueta } from '../lib/etiquetas'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import Pildora from './Pildora'
import { firmaDatos, PILDORA_INVERSION } from '../lib/pildoras'
import InputImporte from './InputImporte'

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

const ANCHO_COL = 34 // ancho por mes al deslizar
// Zona reservada bajo las barras para las etiquetas de mes/año (gap + texto).
// Fija para que TODAS las columnas tengan la misma línea base y la media
// quede perfectamente alineada con las barras.
const ZONA_ETIQUETA = 30

function GraficoInversionMensual({ meses, media }) {
  const maximo = Math.max(1, ...meses.map((m) => m.invertido))
  // La media no debe superar el alto de las barras (si media ≈ máximo).
  const pctMedia = Math.min((media / maximo) * 100, 100)

  const scrollRef = useRef(null)
  // Arranca en el mes más reciente; el límite izquierdo es el primer mes con
  // inversión (no hay meses anteriores en el array, así no se puede ir más atrás).
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [meses.length])

  const anchoContenido = Math.max(0, meses.length * ANCHO_COL)

  return (
    <div className="grafico fade-in-up">
      <h2>Inversión mensual</h2>
      <div className="inv-scroll" ref={scrollRef}>
        <div
          className="inv-barras"
          style={{ height: ALTO_BARRAS + ZONA_ETIQUETA, width: anchoContenido, minWidth: '100%' }}
        >
          {meses.map((m, i) => {
            const pct = Math.max((m.invertido / maximo) * 100, m.invertido > 0 ? 4 : 2)
            const esEnero = m.clave.endsWith('-01')
            const anio = m.clave.slice(0, 4)
            return (
              <div key={m.clave} className="inv-col">
                <div className="inv-zona-barra" style={{ height: ALTO_BARRAS }}>
                  {/* El importe se ancla justo encima de la barra (no en una línea fija). */}
                  {m.invertido > 0 && (
                    <span className="inv-importe" style={{ bottom: `${pct}%` }}>
                      {formatearCompacto(m.invertido)}
                    </span>
                  )}
                  <div
                    className={`inv-barra ${m.invertido > 0 ? 'activa' : ''}`}
                    style={{ height: `${pct}%`, animationDelay: `${i * 0.04}s` }}
                    title={`${m.etiqueta}: ${formatearEuros(m.invertido)}`}
                  />
                </div>
                <span className={`inv-mes ${esEnero ? 'inv-mes-anio' : ''}`}>
                  {m.etiqueta}
                  {esEnero && <span className="inv-anio">{anio}</span>}
                </span>
              </div>
            )
          })}

          {/* La línea de media se dibuja AL FINAL para quedar por encima de las
              barras (antes quedaba tapada). Alineada a la línea base de las barras. */}
          {media > 0 && (
            <div
              className="inv-linea-media"
              style={{ bottom: `${ZONA_ETIQUETA + (pctMedia / 100) * ALTO_BARRAS}px` }}
            >
              <span className="inv-linea-media-etq">media {formatearEuros(media)}</span>
            </div>
          )}
        </div>
      </div>
      {meses.length > 12 && <span className="grafico-hint">← desliza para ver tu historial</span>}
    </div>
  )
}

export default function Inversiones({ usuarioId, movimientos, cargando, onGuardado }) {
  const { items: categorias, crear: crearCategoria } = useEtiquetas('categorias', usuarioId, 'gasto')
  const { items: fuentes, crear: crearFuente } = useEtiquetas('fuentes', usuarioId, 'gasto')

  const [fuenteId, setFuenteId] = useState('')
  const [nuevaFuente, setNuevaFuente] = useState('')
  const [importe, setImporte] = useState(null)
  const [fecha, setFecha] = useState(hoyIso())
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

  // Media móvil de los últimos 12 meses (para la línea de referencia y etiqueta).
  const mediaMensual = useMemo(
    () => agregarPorMes(aportaciones, 12).reduce((s, m) => s + m.invertido, 0) / 12,
    [aportaciones],
  )

  // Meses a mostrar en el gráfico: desde el primer mes con inversión hasta hoy,
  // para poder deslizar hacia atrás sin llegar antes de la primera aportación.
  const nMesesInversion = useMemo(() => {
    if (aportaciones.length === 0) return 12
    let min = Infinity
    for (const a of aportaciones) {
      const t = new Date(a.fecha).getTime()
      if (t < min) min = t
    }
    const d0 = new Date(min)
    const hoy = new Date()
    const n = (hoy.getFullYear() - d0.getFullYear()) * 12 + (hoy.getMonth() - d0.getMonth()) + 1
    return Math.min(Math.max(n, 1), 120)
  }, [aportaciones])

  const mesesInversion = useMemo(
    () => agregarPorMes(aportaciones, nMesesInversion),
    [aportaciones, nMesesInversion],
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

  // Historial colapsado por mes: por defecto una línea por mes; al tocar se
  // despliega el detalle. El mes más reciente arranca abierto como guía.
  const [abiertos, setAbiertos] = useState(() => new Set())
  const mesMasReciente = porMes[0]?.[0]
  const alternarMes = (clave) =>
    setAbiertos((prev) => {
      const n = new Set(prev)
      if (n.has(clave)) n.delete(clave)
      else n.add(clave)
      return n
    })

  const [eliminandoId, setEliminandoId] = useState(null)
  const [editando, setEditando] = useState(null)
  const [importeEdit, setImporteEdit] = useState(null)
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
    setImporteEdit(Number(d.importe))
    setFechaEdit(d.fecha)
  }

  async function handleGuardarEdicion(id) {
    const importeNumero = Number(importeEdit)
    if (!importeEdit || !importeNumero || importeNumero <= 0) return
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
    if (!importe || !importeNumero || importeNumero <= 0) {
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

    setImporte(null)
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

      <Pildora usuarioId={usuarioId} pildora={PILDORA_INVERSION} firma={firmaDatos(movimientos)} />

      {mesesInversion.some((m) => m.invertido > 0) && (
        <GraficoInversionMensual meses={mesesInversion} media={mediaMensual} />
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
        <InputImporte id="importe-inversion" value={importe} onValueChange={setImporte} />

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
          {porMes.map(([clave, { total, detalle }]) => {
            const abierto = abiertos.has(clave) || clave === mesMasReciente
            return (
            <div key={clave} className={`inversion-mes fade-in-up ${abierto ? 'abierto' : ''}`}>
              <button
                type="button"
                className="inversion-mes-cab"
                onClick={() => alternarMes(clave)}
                aria-expanded={abierto}
              >
                <span className="categoria">{etiquetaMesLarga(clave)}</span>
                <span className="inversion-mes-der">
                  <span className="inversion-mes-cuenta">
                    {detalle.length} {detalle.length === 1 ? 'aportación' : 'aportaciones'}
                  </span>
                  <span className="importe">{formatearEuros(total)}</span>
                  <span className="inv-chevron" aria-hidden="true">▾</span>
                </span>
              </button>
              <div className="inversion-detalle-wrap">
              <div className="inversion-detalle-lista">
                {detalle.map((d) =>
                  editando === d.id ? (
                    <div key={d.id} className="edicion-movimiento">
                      <InputImporte value={importeEdit} onValueChange={setImporteEdit} />
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
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
