import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CATEGORIA_INVERSION, etiquetaCategoria, formatearEuros } from '../lib/categorias'
import { claveDuplicado, COLUMNAS, detectarMapeo, faltanColumnas, procesarFilas, tablaDesdeFilas } from '../lib/importarCsv'
import { ArchivoNoSoportado, leerArchivoMovimientos } from '../lib/leerArchivo'
import { capturasActivas, leerCapturas } from '../lib/capturas'
import { crearCategorizador } from '../lib/categorizar'
import { agruparPorComercio, categorizarFilas, comoMovimiento, filasDeCapturas, indicesParecidos, resumenHistorial } from '../lib/revisionImportacion'
import { detectarSuscripciones, costeAnualTotal } from '../lib/suscripciones'
import { planDeAhorro } from '../lib/negociables'
import { deducirMapeoIA } from '../lib/mapearColumnasIA'
import { useImportaciones } from '../lib/useImportaciones'
import { useEtiquetas } from '../lib/useEtiquetas'
import { useComerciosCompartidos } from '../lib/DatosCompartidos'
import { directorio, formaEtiqueta, nombreParaComercio, normalizarTexto } from '../lib/comercios'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import { aCentimos } from '../lib/importe'
import { formatearFecha } from '../lib/movimientosUtils'
import { fechaRelativa } from '../lib/inicio'
import Icono from './Icono'
import { registrarEvento } from '../lib/analitica'

// TRAE TU HISTORIAL: el momento clave para enganchar. Con un año de
// movimientos, Palanca enseña desde el primer día en qué se va el dinero, las
// suscripciones y cuánto se puede ahorrar.
//   1. Elegir: extracto del banco (Excel/CSV, lo más completo) o capturas de
//      la app del banco (cuando el banco no deja descargar).
//   2. Revisar: por COMERCIO, no fila a fila; lo ya apuntado se excluye solo.
//   3. Resumen: tu historial en cifras + suscripciones + plan de ahorro.

const ETIQUETA_COL = {
  fecha: 'Fecha',
  tipo: 'Tipo',
  categoria: 'Categoría',
  concepto: 'Concepto',
  importe: 'Importe (con signo)',
  cargo: 'Cargo / Debe (salidas)',
  abono: 'Abono / Haber (entradas)',
  plataforma: 'Plataforma',
}
const CATEGORIAS_GASTO = ['Comida', 'Restaurantes', 'Transporte', 'Vivienda', 'Suministros', 'Suscripciones', 'Seguros', 'Compras', 'Salud', 'Ocio', 'Deporte', 'Viajes', 'Educación', 'Comisiones', 'Impuestos', 'Efectivo', 'Ahorro', 'Inversion', 'Otros']
const CATEGORIAS_INGRESO = ['Nomina', 'Pensión', 'Prestaciones', 'Transferencias', 'Devoluciones', 'Intereses', 'Desde ahorro', 'Inversion', 'Otros ingresos']
const MAX_CAPTURAS = 20
const fmtMes = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).replace('.', '')

function GuiaDescarga() {
  return (
    <details className="ih-guia">
      <summary>¿Cómo descargo el extracto?</summary>
      <ol>
        <li>Entra en la <strong>web de tu banco</strong> desde el ordenador (la app del móvil a veces no deja descargar).</li>
        <li>Abre tu cuenta y ve a <strong>Movimientos</strong>.</li>
        <li>Elige el periodo: cuanto más, mejor (por ejemplo, <strong>el último año</strong>).</li>
        <li>Pulsa <strong>Descargar</strong> o <strong>Exportar</strong> y elige <strong>Excel</strong> o <strong>CSV</strong>.</li>
      </ol>
      <p>Funciona con los extractos de los bancos españoles habituales, aunque traigan líneas del banco antes de la tabla o columnas separadas de cargos y abonos. Si tu banco solo da PDF, usa las capturas.</p>
    </details>
  )
}

function Elegir({ activoCapturas, onArchivo, onCapturas, error }) {
  const archivoRef = useRef(null)
  const capturasRef = useRef(null)
  return (
    <div className="ih-elegir">
      <header className="ih-cab">
        <h2 className="ih-titulo">Trae tu historial</h2>
        <p className="ih-sub">
          Con unos meses de movimientos, Palanca te enseña desde hoy en qué se te va el dinero, tus suscripciones y cuánto
          puedes ahorrar. Todo se revisa antes de guardar.
        </p>
      </header>

      <div className="ih-opcion recomendada">
        <span className="ih-chip">Recomendado</span>
        <h3>Extracto del banco</h3>
        <p>Excel o CSV con los movimientos de meses o años. El archivo se lee en tu móvil: no se sube a ningún sitio.</p>
        <input ref={archivoRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => onArchivo(e.target.files?.[0])} hidden />
        <button type="button" className="ih-boton" onClick={() => archivoRef.current?.click()}>
          <Icono nombre="importar" tam={18} /> Elegir extracto
        </button>
        <GuiaDescarga />
      </div>

      <div className={`ih-opcion ${activoCapturas ? '' : 'inactiva'}`}>
        <h3>Capturas de la app del banco</h3>
        <p>
          ¿Tu banco no deja descargar? Haz capturas de la lista de movimientos (hasta {MAX_CAPTURAS}) y las leemos por ti.
        </p>
        <input ref={capturasRef} type="file" accept="image/*" multiple onChange={(e) => onCapturas([...(e.target.files ?? [])])} hidden />
        <button type="button" className="ih-boton secundario" disabled={!activoCapturas} onClick={() => capturasRef.current?.click()}>
          <Icono nombre="calendario" tam={18} /> {activoCapturas ? 'Elegir capturas' : 'Muy pronto'}
        </button>
        <p className="ih-nota">
          Las capturas se envían a nuestro servidor solo para leerlas con IA y no se guardan. Tapa o recorta lo que no quieras
          compartir (como el saldo).
        </p>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export default function ImportarHistorial({ usuarioId, movimientos, recurrentes = [], onImportado, onIrA }) {
  const { items: importaciones, registrar, quitar } = useImportaciones(usuarioId)
  const { items: catsGasto } = useEtiquetas('categorias', usuarioId, 'gasto')
  const { items: catsIngreso } = useEtiquetas('categorias', usuarioId, 'ingreso')
  const [paso, setPaso] = useState('elegir') // elegir | leyendo | revisar | listo
  const [activoCapturas, setActivoCapturas] = useState(false)
  const [error, setError] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [origen, setOrigen] = useState(null) // { tipo: 'archivo'|'capturas', nombre, formato }
  const [tabla, setTabla] = useState(null) // archivo: { cabeceras, filas, inicio }
  const [mapeo, setMapeo] = useState({})
  const [filasCapturas, setFilasCapturas] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [cambiosCat, setCambiosCat] = useState({}) // clave de grupo → categoría elegida
  const [cambiosNombre, setCambiosNombre] = useState({}) // clave de grupo → comercio real
  const [editando, setEditando] = useState(null) // clave de grupo cuyo nombre se edita
  const { alias, recordar } = useComerciosCompartidos()
  const [incluirParecidos, setIncluirParecidos] = useState(false)
  const [verTodosGrupos, setVerTodosGrupos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState(null) // tras importar
  const [mapeandoIA, setMapeandoIA] = useState(false)

  useEffect(() => {
    capturasActivas().then(setActivoCapturas)
  }, [])

  const clavesExistentes = useMemo(() => {
    const set = new Set()
    for (const m of movimientos) set.add(claveDuplicado({ fecha: m.fecha, tipo: m.tipo, importe: m.importe, nota: m.nota }))
    return set
  }, [movimientos])
  // `alias` en las dependencias: si cambia la memoria de comercios, se recalcula.
  const categorizador = useMemo(() => crearCategorizador(movimientos), [movimientos, alias]) // eslint-disable-line react-hooks/exhaustive-deps

  // Comercios que ya conoce (memoria + lo apuntado): sugerencias al renombrar.
  const conocidos = useMemo(() => {
    const dir = directorio()
    const nombres = new Map()
    for (const a of alias) nombres.set(a.nombre.toLowerCase(), a.nombre)
    for (const m of movimientos) {
      const n = dir.nombreDe(m)
      if (n && n.length <= 40) nombres.set(n.toLowerCase(), nombres.get(n.toLowerCase()) ?? n)
    }
    return [...nombres.values()].sort((a, b) => a.localeCompare(b, 'es'))
  }, [alias, movimientos])

  // Filas válidas (archivo o capturas), con duplicados exactos fuera y categoría sugerida.
  const procesado = useMemo(() => {
    if (tabla) {
      if (faltanColumnas(mapeo).length) return null
      const r = procesarFilas(tabla.filas, mapeo, clavesExistentes, { inicio: tabla.inicio })
      return { ...r, validas: categorizarFilas(r.validas, categorizador) }
    }
    if (filasCapturas) {
      const validas = []
      const duplicados = []
      for (const f of filasCapturas) (clavesExistentes.has(claveDuplicado(f)) ? duplicados : validas).push(f)
      return { validas: categorizarFilas(validas, categorizador), duplicados, errores: [] }
    }
    return null
  }, [tabla, mapeo, filasCapturas, clavesExistentes, categorizador])

  const parecidos = useMemo(() => (procesado ? indicesParecidos(procesado.validas, movimientos) : new Set()), [procesado, movimientos])
  const grupos = useMemo(() => (procesado ? agruparPorComercio(procesado.validas) : []), [procesado, alias]) // eslint-disable-line react-hooks/exhaustive-deps

  // Renombrar un comercio: si se parece a uno conocido (mayúsculas, errata),
  // se usa el conocido; y si aún no se eligió categoría, se propone la suya.
  function renombrar(g, texto) {
    setEditando(null)
    const limpio = texto.trim().replace(/\s+/g, ' ')
    if (!limpio || limpio === g.nombre) return
    const { nombre, de, corregido } = nombreParaComercio(limpio, conocidos)
    setCambiosNombre((c) => ({ ...c, [g.clave]: nombre }))
    if (corregido) toast(de === 'tuyo' ? `Lo hemos dejado como «${nombre}», que ya tenías` : `Lo hemos dejado como «${nombre}»`)
    if (!cambiosCat[g.clave]) {
      const sugerida = categorizador({ nota: nombre, tipo: g.tipo })
      if (sugerida.origen !== 'defecto') setCambiosCat((c) => ({ ...c, [g.clave]: sugerida.categoria }))
    }
  }

  // Filas finales: con las categorías cambiadas por grupo y sin lo ya apuntado.
  const finales = useMemo(() => {
    if (!procesado) return []
    const catDe = new Map()
    for (const g of grupos) if (cambiosCat[g.clave]) for (const i of g.indices) catDe.set(i, cambiosCat[g.clave])
    return procesado.validas
      .map((f, i) => {
        const categoria = catDe.get(i) ?? f.categoria
        return { ...f, categoria, esInversion: categoria === CATEGORIA_INVERSION, _i: i }
      })
      .filter((f) => incluirParecidos || !parecidos.has(f._i))
  }, [procesado, grupos, cambiosCat, parecidos, incluirParecidos])

  const resumenPrevio = useMemo(() => resumenHistorial(finales), [finales])

  function reiniciar() {
    setPaso('elegir')
    setTabla(null)
    setMapeo({})
    setFilasCapturas(null)
    setAvisos([])
    setCambiosCat({})
    setCambiosNombre({})
    setEditando(null)
    setIncluirParecidos(false)
    setVerTodosGrupos(false)
    setError(null)
    setOrigen(null)
    setProgreso(null)
  }

  async function onArchivo(file) {
    if (!file) return
    setError(null)
    setPaso('leyendo')
    setProgreso({ texto: 'Leyendo tu extracto…' })
    try {
      const { filas, formato } = await leerArchivoMovimientos(file)
      const t = tablaDesdeFilas(filas)
      if (t.filas.length === 0) throw new ArchivoNoSoportado('No hemos encontrado movimientos en este archivo.')
      setTabla(t)
      setMapeo(detectarMapeo(t.cabeceras))
      setOrigen({ tipo: 'archivo', nombre: file.name, formato })
      setPaso('revisar')
    } catch (e) {
      setError(e instanceof ArchivoNoSoportado ? e.message : 'No hemos podido leer este archivo. Prueba a descargarlo en CSV.')
      setPaso('elegir')
    }
  }

  async function onCapturas(files) {
    const imagenes = files.filter((f) => f.type.startsWith('image/')).slice(0, MAX_CAPTURAS)
    if (imagenes.length === 0) return
    setError(null)
    setPaso('leyendo')
    setProgreso({ texto: `Leyendo ${imagenes.length === 1 ? 'tu captura' : `${imagenes.length} capturas`}…`, hechas: 0, total: imagenes.length })
    const { movimientos: leidos, avisos: av } = await leerCapturas(imagenes, (hechas, total) =>
      setProgreso({ texto: `Leyendo capturas… ${hechas} de ${total}`, hechas, total }),
    )
    if (leidos.length === 0) {
      setError(av[0] || 'No hemos encontrado movimientos en las capturas. Prueba con capturas de la lista de movimientos.')
      setPaso('elegir')
      return
    }
    setFilasCapturas(filasDeCapturas(leidos))
    setAvisos(files.length > MAX_CAPTURAS ? [`Solo se han leído las ${MAX_CAPTURAS} primeras capturas.`, ...av] : av)
    setOrigen({ tipo: 'capturas', nombre: `${imagenes.length} ${imagenes.length === 1 ? 'captura' : 'capturas'}` })
    setPaso('revisar')
  }

  async function deducirIA() {
    setMapeandoIA(true)
    const r = await deducirMapeoIA(tabla.cabeceras, tabla.filas.slice(0, 3))
    setMapeandoIA(false)
    if (r.ok) {
      setMapeo({ ...detectarMapeo([]), ...r.mapeo })
      toast('Columnas deducidas: revísalas')
    } else toast(r.code === 'sin_configurar' ? 'El asistente con IA no está activado. Asígnalas a mano.' : 'No se han podido deducir. Asígnalas a mano.', 'error')
  }

  async function idsDeCategorias(filas) {
    const { data: existentes } = await supabase.from('categorias').select('id, tipo, nombre').eq('usuario_id', usuarioId)
    // Sin duplicados: "comida" del archivo es tu "Comida" (mayúsculas, acentos, plural).
    const mapa = {}
    const porForma = new Map()
    for (const c of existentes ?? []) {
      mapa[`${c.tipo}|${c.nombre}`] = c.id
      porForma.set(`${c.tipo}|${formaEtiqueta(c.nombre)}`, c.id)
    }
    const deForma = (tipo, nombre) => porForma.get(`${tipo}|${formaEtiqueta(nombre)}`)
    const necesarias = new Set(filas.map((f) => `${f.tipo}|${f.esInversion ? CATEGORIA_INVERSION : f.categoria}`))
    const aCrear = []
    for (const k of necesarias) {
      if (mapa[k]) continue
      const [tipo, nombre] = k.split('|')
      const existente = deForma(tipo, nombre)
      if (existente) mapa[k] = existente
      else aCrear.push({ usuario_id: usuarioId, tipo, nombre })
    }
    if (aCrear.length) {
      const { data } = await supabase.from('categorias').insert(aCrear).select('id, tipo, nombre')
      for (const c of data ?? []) mapa[`${c.tipo}|${c.nombre}`] = c.id
    }
    return mapa
  }

  async function idsDeFuentes(filas) {
    const { data: existentes } = await supabase.from('fuentes').select('id, nombre').eq('usuario_id', usuarioId)
    const mapa = {}
    const porForma = new Map()
    for (const f of existentes ?? []) {
      mapa[f.nombre] = f.id
      porForma.set(normalizarTexto(f.nombre), f.id)
    }
    const plataformas = [...new Set(filas.filter((f) => f.esInversion && f.plataforma).map((f) => f.plataforma))]
    for (const n of plataformas) if (!mapa[n] && porForma.has(normalizarTexto(n))) mapa[n] = porForma.get(normalizarTexto(n))
    const aCrear = plataformas
      .filter((n) => !mapa[n])
      .map((nombre) => ({ usuario_id: usuarioId, tipo: 'gasto', nombre }))
    if (aCrear.length) {
      const { data } = await supabase.from('fuentes').insert(aCrear).select('id, nombre')
      for (const f of data ?? []) mapa[f.nombre] = f.id
    }
    return mapa
  }

  async function importar() {
    if (finales.length === 0 || guardando) return
    setGuardando(true)
    try {
      const catMap = await idsDeCategorias(finales)
      const fuenteMap = await idsDeFuentes(finales)
      const filas = finales.map((v) => ({
        usuario_id: usuarioId,
        tipo: v.tipo,
        categoria_id: catMap[`${v.tipo}|${v.esInversion ? CATEGORIA_INVERSION : v.categoria}`] ?? null,
        fuente_id: v.esInversion && v.plataforma ? fuenteMap[v.plataforma] ?? null : null,
        importe: v.importe,
        importe_centimos: aCentimos(v.importe),
        fecha: v.fecha,
        es_fijo: false,
        nota: v.nota || null,
      }))
      const ids = []
      for (let i = 0; i < filas.length; i += 200) {
        const { data, error } = await supabase.from('movimientos').insert(filas.slice(i, i + 200)).select('id')
        if (error) throw error
        for (const r of data ?? []) ids.push(r.id)
      }
      registrar({ nombre: origen?.nombre ?? 'Importación', ids })
      // MEMORIA: lo que el usuario ha corregido se recuerda para siempre. La
      // próxima vez que el banco escriba "ALIPAM23", será Mercadona sin preguntar.
      const aprendido = []
      for (const g of grupos) {
        const nombre = cambiosNombre[g.clave]
        const categoria = cambiosCat[g.clave]
        if (!nombre && !categoria) continue
        for (const clave of g.claves) aprendido.push({ clave, nombre: nombre ?? g.nombre, ...(categoria ? { categoria } : {}) })
      }
      if (aprendido.length) await recordar(aprendido)
      registrarEvento(origen?.tipo === 'capturas' ? 'importacion_capturas' : 'importacion')

      // Resumen de lo traído: historial, suscripciones y ahorro posible.
      const todos = [...movimientos, ...finales.map(comoMovimiento)]
      const detectadas = detectarSuscripciones(todos, recurrentes)
      const plan = planDeAhorro(
        detectadas.map((d) => ({ id: d.clave, activo: true, tipo: 'gasto', nombre: d.nombre, importe: d.importe, periodoMeses: d.periodoMeses, mesInicio: d.mesInicio, diaMes: d.diaMes, mesesAplicados: [] })),
      )
      setResultado({ resumen: resumenHistorial(finales), detectadas, anualSuscripciones: costeAnualTotal(detectadas), plan })
      setPaso('listo')
      onImportado?.()
    } catch (e) {
      console.error(e)
      toast('No se ha podido importar. Revisa tu conexión e inténtalo de nuevo.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function deshacer(lote) {
    if (!(await confirmar(`¿Deshacer la importación de ${lote.count} movimientos?`))) return
    for (let i = 0; i < lote.ids.length; i += 200) {
      const { error } = await supabase.from('movimientos').delete().in('id', lote.ids.slice(i, i + 200))
      if (error) return toast('No se ha podido deshacer del todo. Revisa tu conexión.', 'error')
    }
    quitar(lote.id)
    toast('Importación deshecha')
    onImportado?.()
  }

  const opcionesCat = (tipo) => {
    const propias = (tipo === 'ingreso' ? catsIngreso : catsGasto).map((c) => c.nombre).filter((n) => n !== 'Ajuste')
    const base = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO
    return [...new Set([...propias, ...base])]
  }

  // ── Pantallas ─────────────────────────────────────────────────────────────
  let contenido
  if (paso === 'leyendo') {
    contenido = (
      <div className="ih-leyendo" aria-live="polite">
        <span className="ih-spinner" aria-hidden="true" />
        <p>{progreso?.texto}</p>
        {progreso?.total > 1 && (
          <div className="ih-barra"><span style={{ width: `${(progreso.hechas / progreso.total) * 100}%` }} /></div>
        )}
      </div>
    )
  } else if (paso === 'revisar') {
    const faltan = tabla ? faltanColumnas(mapeo) : []
    // Primero lo que Palanca no ha reconocido (necesita al usuario); después, por
    // dinero: un traspaso al ahorro o un rescate de fondo pesan más que un café.
    const sinReconocer = (g) => /^Otros/.test(cambiosCat[g.clave] ?? g.categoria)
    const ordenados = [...grupos].sort((a, b) => sinReconocer(b) - sinReconocer(a) || b.total - a.total)
    const gruposVisibles = verTodosGrupos ? ordenados : ordenados.slice(0, 10)
    contenido = (
      <div className="ih-revisar">
        <div className="ih-origen">
          <span>
            <strong>{origen?.nombre}</strong>
            {origen?.formato && ` · ${origen.formato}`}
          </span>
          <button type="button" className="link" onClick={reiniciar}>Cambiar</button>
        </div>

        {tabla && (
          <details className="ih-columnas" open={faltan.length > 0}>
            <summary>{faltan.length ? 'Indícanos qué columna es cada cosa' : 'Columnas reconocidas (revisar)'}</summary>
            <button type="button" className="ih-boton secundario ih-ia" onClick={deducirIA} disabled={mapeandoIA}>
              {mapeandoIA ? 'Deduciendo…' : 'Deducir columnas con IA'}
            </button>
            <div className="importador-mapeo">
              {COLUMNAS.map((col) => (
                <label key={col} className="importador-map-fila">
                  <span>{ETIQUETA_COL[col]}{col === 'fecha' && ' *'}</span>
                  <select value={mapeo[col] ?? -1} onChange={(e) => setMapeo({ ...mapeo, [col]: Number(e.target.value) })}>
                    <option value={-1}>—</option>
                    {tabla.cabeceras.map((c, i) => <option key={i} value={i}>{c || `Columna ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="ayuda">Necesitamos la fecha y el importe (o las columnas de cargos y abonos).</p>
          </details>
        )}

        {procesado && resumenPrevio && (
          <>
            <div className="ih-cifras">
              <div>
                <strong>{finales.length}</strong>
                <span>movimientos nuevos</span>
              </div>
              <div>
                <strong>{resumenPrevio.meses}</strong>
                <span>{resumenPrevio.meses === 1 ? 'mes' : 'meses'} · {fmtMes(resumenPrevio.desde)} – {fmtMes(resumenPrevio.hasta)}</span>
              </div>
            </div>
            {(procesado.duplicados.length > 0 || parecidos.size > 0 || procesado.errores.length > 0) && (
              <ul className="ih-notas">
                {procesado.duplicados.length > 0 && <li>{procesado.duplicados.length} ya estaban en Palanca: no se repiten.</li>}
                {parecidos.size > 0 && (
                  <li>
                    {parecidos.size} parecen ya apuntados a mano (mismo día e importe).{' '}
                    <label className="ih-check">
                      <input type="checkbox" checked={incluirParecidos} onChange={(e) => setIncluirParecidos(e.target.checked)} /> Importarlos igualmente
                    </label>
                  </li>
                )}
                {procesado.errores.length > 0 && <li>{procesado.errores.length} filas no se entienden y se saltan (p. ej. fila {procesado.errores[0].fila}: {procesado.errores[0].motivo}).</li>}
              </ul>
            )}
            {avisos.length > 0 && (
              <ul className="ih-notas aviso">
                {avisos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}

            <section className="ih-grupos" aria-label="Categorías por comercio">
              <header>
                <h3>Revisa las categorías</h3>
                <p>Las hemos puesto por ti. Cambiar una cambia todos los movimientos de ese comercio. Si el banco usa un nombre raro, tócalo y dinos cuál es: lo recordaremos siempre.</p>
              </header>
              <ul>
                {gruposVisibles.map((g) => {
                  const nombre = cambiosNombre[g.clave] ?? g.nombre
                  const recordado = !cambiosNombre[g.clave] && (g.origen === 'memoria' || g.origen === 'memoria-aprox')
                  return (
                  <li key={g.clave} className="ih-grupo">
                    <span className="ih-grupo-texto">
                      {editando === g.clave ? (
                        <input
                          className="ih-grupo-input"
                          defaultValue={nombre}
                          list="ih-conocidos"
                          aria-label={`Nombre real de ${g.nombre}`}
                          autoFocus
                          maxLength={60}
                          onBlur={(e) => renombrar(g, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                            if (e.key === 'Escape') setEditando(null)
                          }}
                        />
                      ) : (
                        <button type="button" className="ih-grupo-nombre" onClick={() => setEditando(g.clave)} aria-label={`Cambiar el nombre de ${nombre}`}>
                          {nombre}
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>
                        </button>
                      )}
                      <span className="ih-grupo-meta">
                        {recordado && <span className="ih-recordado">Reconocido</span>}
                        {g.n} {g.n === 1 ? 'movimiento' : 'movimientos'} · <span className={g.tipo}>{g.tipo === 'ingreso' ? '+' : '−'}{formatearEuros(Math.round(g.total))}</span>
                      </span>
                      {g.ejemplo && g.ejemplo.trim().toLowerCase() !== nombre.toLowerCase() && (
                        <span className="ih-grupo-banco">En el banco: {g.ejemplo.length > 38 ? `${g.ejemplo.slice(0, 36)}…` : g.ejemplo}</span>
                      )}
                    </span>
                    <select
                      aria-label={`Categoría de ${g.nombre}`}
                      value={cambiosCat[g.clave] ?? g.categoria}
                      onChange={(e) => setCambiosCat({ ...cambiosCat, [g.clave]: e.target.value })}
                    >
                      {[...new Set([cambiosCat[g.clave] ?? g.categoria, ...opcionesCat(g.tipo)])].map((c) => (
                        <option key={c} value={c}>{etiquetaCategoria(c, g.tipo)}</option>
                      ))}
                    </select>
                  </li>
                  )
                })}
              </ul>
              <datalist id="ih-conocidos">
                {conocidos.slice(0, 300).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {grupos.length > 10 && (
                <button type="button" className="link" onClick={() => setVerTodosGrupos((v) => !v)}>
                  {verTodosGrupos ? 'Ver menos' : `Ver los ${grupos.length} comercios`}
                </button>
              )}
            </section>

            <details className="ih-lista">
              <summary>Ver los movimientos</summary>
              <ul>
                {finales.slice(0, 60).map((f) => (
                  <li key={f._i}>
                    <span>{fechaRelativa(f.fecha)} · {f.nota || '—'}</span>
                    <span className={f.tipo === 'ingreso' ? 'ingreso' : ''}>{f.tipo === 'ingreso' ? '+' : '−'}{formatearEuros(f.importe)}</span>
                  </li>
                ))}
              </ul>
              {finales.length > 60 && <p className="ayuda">…y {finales.length - 60} más.</p>}
            </details>

            <button type="button" className="ih-importar" disabled={guardando || finales.length === 0} onClick={importar}>
              {guardando ? 'Importando…' : `Importar ${finales.length} ${finales.length === 1 ? 'movimiento' : 'movimientos'}`}
            </button>
          </>
        )}
        {procesado && !resumenPrevio && <p className="ayuda">No hay movimientos nuevos que importar: ya los tenías todos.</p>}
      </div>
    )
  } else if (paso === 'listo' && resultado) {
    const r = resultado.resumen
    contenido = (
      <div className="ih-listo fade-in-up">
        <span className="ih-listo-icono" aria-hidden="true"><Icono nombre="check" tam={22} /></span>
        <h2 className="ih-titulo">Tu historial ya está en Palanca</h2>
        <p className="ih-sub">
          {r.n} movimientos de {r.meses} {r.meses === 1 ? 'mes' : 'meses'} ({formatearFecha(r.desde)} – {formatearFecha(r.hasta)}).
        </p>
        <div className="ih-kpis">
          <div><span>Gastas al mes</span><strong>{formatearEuros(Math.round(r.gastoMedio))}</strong></div>
          <div><span>Ingresas al mes</span><strong>{formatearEuros(Math.round(r.ingresoMedio))}</strong></div>
          {r.tasaAhorro !== null && <div><span>Ahorras</span><strong className={r.tasaAhorro >= 0 ? 'ingreso' : 'gasto'}>{r.tasaAhorro} %</strong></div>}
        </div>
        {r.topCategorias.length > 0 && (
          <div className="ih-top">
            <span className="ini-subtitulo">Donde más se te va (al mes)</span>
            {r.topCategorias.map((c) => (
              <div key={c.nombre} className="ih-top-fila">
                <span>{etiquetaCategoria(c.nombre)}</span>
                <span className="ih-top-barra"><span style={{ width: `${Math.max(3, c.pct)}%` }} /></span>
                <strong>{formatearEuros(Math.round(c.mensual))}</strong>
              </div>
            ))}
          </div>
        )}
        {resultado.detectadas.length > 0 && (
          <button type="button" className="ih-hallazgo" onClick={() => onIrA?.('suscripciones')}>
            <span>
              <strong>{resultado.detectadas.length} {resultado.detectadas.length === 1 ? 'pago periódico' : 'pagos periódicos'}</strong> detectados:{' '}
              {formatearEuros(Math.round(resultado.anualSuscripciones))} al año.
              {resultado.plan.negociable.max > 0 && (
                <> Negociando algunos podrías ahorrar <strong className="ingreso">hasta {formatearEuros(resultado.plan.negociable.max)} al año</strong>.</>
              )}
            </span>
            <Icono nombre="chevron" tam={16} />
          </button>
        )}
        <div className="ih-listo-acc">
          <button type="button" className="ih-importar" onClick={() => onIrA?.('dashboard')}>Ver mi inicio</button>
          {resultado.detectadas.length > 0 && (
            <button type="button" className="ih-boton secundario" onClick={() => onIrA?.('suscripciones')}>Revisar suscripciones y recibos</button>
          )}
          <button type="button" className="link" onClick={() => { setResultado(null); reiniciar() }}>Importar más</button>
        </div>
      </div>
    )
  } else {
    contenido = <Elegir activoCapturas={activoCapturas} onArchivo={onArchivo} onCapturas={onCapturas} error={error} />
  }

  return (
    <div className="ih vista">
      {contenido}
      {paso === 'elegir' && importaciones.length > 0 && (
        <div className="importador-historial">
          <span className="ini-subtitulo">Importaciones anteriores</span>
          {importaciones.map((lote) => (
            <div key={lote.id} className="importador-lote">
              <span className="importador-lote-info">
                {lote.nombre} · {lote.count} movimientos · {new Date(lote.fecha).toLocaleDateString('es-ES')}
              </span>
              <button type="button" className="btn-eliminar" onClick={() => deshacer(lote)}>Deshacer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
