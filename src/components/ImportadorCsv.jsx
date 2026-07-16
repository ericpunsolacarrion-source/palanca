import { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CATEGORIA_INVERSION, esInversion, formatearEuros } from '../lib/categorias'
import { claveDuplicado, COLUMNAS, COLUMNAS_REQUERIDAS, detectarMapeo, parseCsv, procesarCsv } from '../lib/importarCsv'
import { deducirMapeoIA } from '../lib/mapearColumnasIA'
import { useImportaciones } from '../lib/useImportaciones'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'

const ETIQUETA_COL = {
  fecha: 'Fecha',
  tipo: 'Tipo',
  categoria: 'Categoría',
  concepto: 'Concepto',
  importe: 'Importe',
  plataforma: 'Plataforma',
}

export default function ImportadorCsv({ usuarioId, movimientos, onImportado }) {
  const inputRef = useRef(null)
  const [texto, setTexto] = useState(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [cabeceras, setCabeceras] = useState([])
  const [filasMuestra, setFilasMuestra] = useState([])
  const [mapeo, setMapeo] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [mapeandoIA, setMapeandoIA] = useState(false)
  const [avisoIA, setAvisoIA] = useState(null)
  const { items: importaciones, registrar, quitar } = useImportaciones(usuarioId)

  // Claves de los movimientos ya existentes, para detectar duplicados.
  const clavesExistentes = useMemo(() => {
    const set = new Set()
    for (const m of movimientos) {
      set.add(
        claveDuplicado({
          fecha: m.fecha,
          tipo: esInversion(m) ? 'gasto' : m.tipo,
          importe: m.importe,
          nota: m.nota,
        }),
      )
    }
    return set
  }, [movimientos])

  const resultado = useMemo(() => {
    if (!texto) return null
    return procesarCsv(texto, mapeo, clavesExistentes)
  }, [texto, mapeo, clavesExistentes])

  function onArchivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setNombreArchivo(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const contenido = String(reader.result)
      const { cabeceras: cab, filas } = parseCsv(contenido)
      setCabeceras(cab)
      setFilasMuestra(filas.slice(0, 3))
      setMapeo(detectarMapeo(cab))
      setAvisoIA(null)
      setTexto(contenido)
    }
    reader.readAsText(file)
  }

  function reiniciar() {
    setTexto(null)
    setNombreArchivo('')
    setCabeceras([])
    setFilasMuestra([])
    setMapeo({})
    setAvisoIA(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Deduce el mapeo con IA enviando SOLO cabeceras + 2-3 filas de ejemplo a
  // nuestro backend. El resto del archivo nunca sale del navegador.
  async function deducirIA() {
    setMapeandoIA(true)
    setAvisoIA(null)
    const r = await deducirMapeoIA(cabeceras, filasMuestra)
    setMapeandoIA(false)
    if (r.ok) {
      setMapeo(r.mapeo)
      setAvisoIA({ tono: 'ok', texto: 'Columnas deducidas. Revísalas abajo antes de importar.' })
    } else if (r.code === 'sin_configurar') {
      setAvisoIA({ tono: 'info', texto: 'El asistente con IA no está activado. Puedes asignar las columnas a mano.' })
    } else {
      setAvisoIA({ tono: 'err', texto: 'No se han podido deducir las columnas. Asígnalas a mano abajo.' })
    }
  }

  const faltanRequeridas = COLUMNAS_REQUERIDAS.filter((c) => (mapeo[c] ?? -1) < 0)

  async function idsDeCategorias(validas) {
    // Carga categorías existentes y crea las que falten.
    const { data: existentes } = await supabase
      .from('categorias')
      .select('id, tipo, nombre')
      .eq('usuario_id', usuarioId)
    const mapa = {}
    for (const c of existentes ?? []) mapa[`${c.tipo}|${c.nombre}`] = c.id

    const necesarias = new Set()
    for (const v of validas) {
      const nombre = v.esInversion ? CATEGORIA_INVERSION : v.categoria
      necesarias.add(`${v.tipo}|${nombre}`)
    }
    const aCrear = [...necesarias]
      .filter((k) => !mapa[k])
      .map((k) => {
        const [tipo, nombre] = k.split('|')
        return { usuario_id: usuarioId, tipo, nombre }
      })
    if (aCrear.length > 0) {
      const { data } = await supabase.from('categorias').insert(aCrear).select('id, tipo, nombre')
      for (const c of data ?? []) mapa[`${c.tipo}|${c.nombre}`] = c.id
    }
    return mapa
  }

  async function idsDeFuentes(validas) {
    const { data: existentes } = await supabase
      .from('fuentes')
      .select('id, nombre')
      .eq('usuario_id', usuarioId)
    const mapa = {}
    for (const f of existentes ?? []) mapa[f.nombre] = f.id
    const necesarias = new Set()
    for (const v of validas) if (v.esInversion && v.plataforma) necesarias.add(v.plataforma)
    const aCrear = [...necesarias]
      .filter((n) => !mapa[n])
      .map((nombre) => ({ usuario_id: usuarioId, tipo: 'gasto', nombre }))
    if (aCrear.length > 0) {
      const { data } = await supabase.from('fuentes').insert(aCrear).select('id, nombre')
      for (const f of data ?? []) mapa[f.nombre] = f.id
    }
    return mapa
  }

  async function confirmarImportacion() {
    if (!resultado || resultado.validas.length === 0) return
    setGuardando(true)
    try {
      const catMap = await idsDeCategorias(resultado.validas)
      const fuenteMap = await idsDeFuentes(resultado.validas)

      const filas = resultado.validas.map((v) => ({
        usuario_id: usuarioId,
        tipo: v.tipo,
        categoria_id: catMap[`${v.tipo}|${v.esInversion ? CATEGORIA_INVERSION : v.categoria}`] ?? null,
        fuente_id: v.esInversion && v.plataforma ? fuenteMap[v.plataforma] ?? null : null,
        importe: v.importe,
        fecha: v.fecha,
        es_fijo: false,
        nota: v.nota || null,
      }))

      const ids = []
      for (let i = 0; i < filas.length; i += 200) {
        const lote = filas.slice(i, i + 200)
        const { data, error } = await supabase.from('movimientos').insert(lote).select('id')
        if (error) throw error
        for (const r of data ?? []) ids.push(r.id)
      }

      registrar({ nombre: nombreArchivo, ids })
      toast(`Importados ${ids.length} movimientos`)
      reiniciar()
      onImportado?.()
    } catch (e) {
      console.error(e)
      toast('No se ha podido importar. Inténtalo de nuevo.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function deshacer(lote) {
    if (!(await confirmar(`¿Deshacer la importación de ${lote.count} movimientos?`))) return
    for (let i = 0; i < lote.ids.length; i += 200) {
      const trozo = lote.ids.slice(i, i + 200)
      const { error } = await supabase.from('movimientos').delete().in('id', trozo)
      if (error) {
        toast('No se ha podido deshacer del todo. Revisa tu conexión.', 'error')
        return
      }
    }
    quitar(lote.id)
    toast('Importación deshecha')
    onImportado?.()
  }

  return (
    <div className="importador vista">
      <p className="ayuda">
        Importa tu histórico desde un CSV (por ejemplo, exportado de tu Excel o de tu banco) y
        verás años de tus finanzas desde el primer momento. Se hace en tres pasos: eliges el
        archivo, revisas que las columnas estén bien y confirmas.
      </p>

      {/* Formato esperado */}
      <details className="info-pildora">
        <summary>Formato esperado y ejemplo</summary>
        <p>
          Una fila por movimiento, con una fila de cabecera. Columnas que entendemos:{' '}
          <strong>fecha</strong> (AAAA-MM-DD o DD/MM/AAAA), <strong>tipo</strong> (gasto, ingreso o
          inversion), <strong>categoria</strong>, <strong>concepto</strong> e{' '}
          <strong>importe</strong>. La <strong>plataforma</strong> es opcional (para inversiones).
        </p>
        <pre className="importador-ejemplo">
          fecha,tipo,categoria,concepto,importe{'\n'}
          2025-03-13,gasto,Suscripciones,claude,21.78{'\n'}
          2025-01-28,ingreso,Nomina,Nómina enero,470.00
        </pre>
        <p>
          ¿Tu Excel es un caos (columnas con otros nombres o en otro orden)? No pasa nada: tras
          subirlo podrás <strong>asignar cada columna a mano</strong> o pedir que se{' '}
          <strong>deduzcan automáticamente</strong>. Las filas que no se entiendan se descartan una
          a una, sin abortar el resto.
        </p>
      </details>

      {/* Privacidad: qué pasa con el archivo */}
      <details className="info-pildora">
        <summary>¿Qué pasa con mi archivo? (privacidad)</summary>
        <p>
          Tu archivo se procesa <strong>en tu propio navegador</strong>: el grueso de tus datos no
          se sube a ningún sitio ni se envía a ningún modelo de IA. Al confirmar, los movimientos se
          guardan directamente en tu base de datos.
        </p>
        <p>
          Solo si pulsas <strong>«Deducir columnas con IA»</strong> se envían, a nuestro propio
          servidor, <strong>únicamente las cabeceras y 2-3 filas de ejemplo</strong> —lo justo para
          adivinar qué columna es cada cosa—. El resto del archivo nunca sale de tu dispositivo y no
          se almacena.
        </p>
      </details>

      {!texto ? (
        <div className="importador-subir">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onArchivo}
            id="csv-file"
            className="importador-file"
          />
          <label htmlFor="csv-file" className="btn-nuevo-objetivo importador-boton">
            Elegir archivo CSV
          </label>
        </div>
      ) : (
        <div className="importador-preview">
          <div className="importador-archivo">
            <span>{nombreArchivo}</span>
            <button type="button" className="link" onClick={reiniciar}>
              Cambiar
            </button>
          </div>

          {/* Mapeo de columnas: asistido (IA) y siempre revisable a mano. Se
              abre solo si faltan columnas obligatorias; si no, queda plegado. */}
          <details className="info-pildora importador-mapeo-det" open={faltanRequeridas.length > 0}>
            <summary>
              {faltanRequeridas.length > 0
                ? 'Faltan columnas obligatorias: asígnalas'
                : 'Revisar o ajustar columnas'}
            </summary>

            <div className="importador-ia">
              <button
                type="button"
                className="btn-nuevo-objetivo importador-ia-btn"
                onClick={deducirIA}
                disabled={mapeandoIA}
              >
                {mapeandoIA ? 'Deduciendo…' : '✨ Deducir columnas con IA'}
              </button>
              <span className="importador-ia-nota">
                Solo se envían las cabeceras y 2-3 filas de ejemplo a nuestro servidor.
              </span>
            </div>
            {avisoIA && (
              <p
                className="ayuda importador-ia-aviso"
                style={{ color: avisoIA.tono === 'err' ? 'var(--gasto)' : avisoIA.tono === 'ok' ? 'var(--ingreso)' : 'var(--text)' }}
              >
                {avisoIA.texto}
              </p>
            )}

            {faltanRequeridas.length > 0 && (
              <p className="ayuda" style={{ color: 'var(--gasto)' }}>
                No hemos reconocido algunas columnas obligatorias (marcadas con *). Indícanos cuál es
                cada una:
              </p>
            )}

            <div className="importador-mapeo">
              {COLUMNAS.map((col) => (
                <label key={col} className="importador-map-fila">
                  <span>
                    {ETIQUETA_COL[col]}
                    {COLUMNAS_REQUERIDAS.includes(col) && ' *'}
                  </span>
                  <select
                    value={mapeo[col] ?? -1}
                    onChange={(e) => setMapeo({ ...mapeo, [col]: Number(e.target.value) })}
                  >
                    <option value={-1}>—</option>
                    {cabeceras.map((c, i) => (
                      <option key={i} value={i}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>

          {resultado && faltanRequeridas.length === 0 && (
            <>
              <div className="importador-resumen">
                <div className="ir-bloque ok">
                  <span className="ir-num">{resultado.validas.length}</span>
                  <span className="ir-label">se importarán</span>
                </div>
                <div className="ir-bloque dup">
                  <span className="ir-num">{resultado.duplicados.length}</span>
                  <span className="ir-label">duplicados (se omiten)</span>
                </div>
                <div className="ir-bloque err">
                  <span className="ir-num">{resultado.errores.length}</span>
                  <span className="ir-label">con errores</span>
                </div>
              </div>

              {resultado.errores.length > 0 && (
                <details className="info-pildora">
                  <summary>Ver filas descartadas ({resultado.errores.length})</summary>
                  <ul className="importador-errores">
                    {resultado.errores.slice(0, 30).map((e, i) => (
                      <li key={i}>
                        Fila {e.fila}: {e.motivo}
                      </li>
                    ))}
                    {resultado.errores.length > 30 && <li>…y {resultado.errores.length - 30} más</li>}
                  </ul>
                </details>
              )}

              {resultado.validas.length > 0 && (
                <div className="importador-tabla-scroll">
                  <table className="importador-tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Concepto</th>
                        <th>Categoría</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.validas.slice(0, 8).map((v, i) => (
                        <tr key={i}>
                          <td>{v.fecha}</td>
                          <td className="it-concepto">{v.nota || '—'}</td>
                          <td>{v.esInversion ? 'Inversión' : v.categoria}</td>
                          <td className={v.tipo === 'ingreso' ? 'ingreso' : v.esInversion ? 'inversion' : 'gasto'}>
                            {formatearEuros(v.importe)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultado.validas.length > 8 && (
                    <p className="ayuda">…y {resultado.validas.length - 8} filas más.</p>
                  )}
                </div>
              )}

              <button
                type="button"
                className="btn-guardar-movimiento"
                disabled={guardando || resultado.validas.length === 0}
                onClick={confirmarImportacion}
              >
                {guardando
                  ? 'Importando…'
                  : `Importar ${resultado.validas.length} movimiento${resultado.validas.length === 1 ? '' : 's'}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Importaciones anteriores (deshacer) */}
      {importaciones.length > 0 && (
        <div className="importador-historial">
          <span className="balance-etiqueta-principal">Importaciones realizadas</span>
          {importaciones.map((lote) => (
            <div key={lote.id} className="importador-lote">
              <span className="importador-lote-info">
                {lote.nombre} · {lote.count} movimientos ·{' '}
                {new Date(lote.fecha).toLocaleDateString('es-ES')}
              </span>
              <button type="button" className="btn-eliminar" onClick={() => deshacer(lote)}>
                Deshacer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
