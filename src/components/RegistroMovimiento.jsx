import { useEffect, useMemo, useRef, useState } from 'react'
import Icono from './Icono'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import { useRecurrentes } from '../lib/useRecurrentes'
import { NUEVA_ETIQUETA, resolverEtiqueta } from '../lib/etiquetas'
import { confirmar } from '../lib/confirmar'
import { CATEGORIA_AJUSTE, CATEGORIA_INVERSION, etiquetaCategoria, formatearEuros } from '../lib/categorias'
import { SELECT_MOVIMIENTO, formatearFecha, hoyIso } from '../lib/movimientosUtils'
import { categoriaProbable, frecuenciaCategorias, frecuentesParaRepetir, importesFrecuentes } from '../lib/sugerencias'
import { REPETICIONES, categoriaParaLugar, fijoDesdeApunte, importesDelLugar, lugaresConocidos, sugerirLugares } from '../lib/apunte'
import { buscarParecido, mismaEtiqueta } from '../lib/comercios'
import { aCentimos } from '../lib/importe'
import { toast } from '../lib/toast'
import InputImporte from './InputImporte'
import InputFecha from './InputFecha'
import GastosRapidos from './GastosRapidos'
import { registrarEvento } from '../lib/analitica'

// APUNTAR: "45,90 € en Mercadona". Importe grande, "¿dónde?" con
// autocompletado de tus sitios (rellena la categoría y el importe habitual),
// categoría ya marcada y tres chips (fecha, se repite, nota). Pensado para
// apuntar en segundos y encadenar varios seguidos.

const MODOS = [
  { id: 'gasto', texto: 'Gasto' },
  { id: 'ingreso', texto: 'Ingreso' },
  { id: 'inversion', texto: 'Inversión' },
]
const TOAST_MODO = { gasto: 'Gasto guardado', ingreso: 'Ingreso guardado', inversion: 'Inversión guardada' }
const DONDE = {
  gasto: { label: '¿Dónde?', placeholder: 'Mercadona, gasolina…' },
  ingreso: { label: '¿De dónde?', placeholder: 'Nómina, Bizum…' },
  inversion: { label: '¿Plataforma?', placeholder: 'MyInvestor, Trade Republic…' },
}
const ayerIso = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function RegistroMovimiento({ usuarioId, movimientos = [], onGuardado, modoInicial }) {
  // modo: 'gasto' | 'ingreso' | 'inversion'. La inversión se guarda como
  // gasto + categoría "Inversion" (mismo registro que en la pantalla Inversión).
  const [modo, setModo] = useState(modoInicial ?? 'gasto')
  const [importe, setImporte] = useState(null)
  const [lugar, setLugar] = useState('')
  const [lugarFoco, setLugarFoco] = useState(false)
  const [categoriaId, setCategoriaId] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  // Quién eligió la categoría: el usuario a mano (no se toca), el "¿dónde?" o la sugerencia por importe.
  const [origenCategoria, setOrigenCategoria] = useState(null)
  const [verTodasCategorias, setVerTodasCategorias] = useState(false)
  const [fecha, setFecha] = useState(hoyIso())
  const [panel, setPanel] = useState(null) // 'fecha' | 'repite' | 'nota' | null
  const [repite, setRepite] = useState(null) // meses (1, 2, 3, 6, 12) o null
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const lugarRef = useRef(null)

  const esInversion = modo === 'inversion'
  const tipoDb = esInversion ? 'gasto' : modo

  const { items: categorias, crear: crearCategoria } = useEtiquetas('categorias', usuarioId, tipoDb)
  const { items: fuentes, crear: crearFuente } = useEtiquetas('fuentes', usuarioId, tipoDb)
  const { crear: crearFijo } = useRecurrentes(usuarioId)

  // Al cambiar de tipo, lo específico se limpia (el importe se mantiene).
  useEffect(() => {
    setLugar('')
    setCategoriaId('')
    setNuevaCategoria('')
    setOrigenCategoria(null)
    setVerTodasCategorias(false)
    setRepite(null)
    setPanel(null)
  }, [modo])

  // Categorías elegibles, las más usadas primero ("Inversion" y "Ajuste" no se eligen a mano).
  const categoriasOrdenadas = useMemo(() => {
    const freq = frecuenciaCategorias(movimientos, modo)
    return [...categorias]
      .filter((c) => c.nombre !== CATEGORIA_INVERSION && c.nombre !== CATEGORIA_AJUSTE)
      .sort((a, b) => (freq.get(b.nombre) ?? 0) - (freq.get(a.nombre) ?? 0))
  }, [categorias, movimientos, modo])

  // "¿Dónde?": tus sitios de este tipo y las sugerencias para lo escrito.
  const lugares = useMemo(() => lugaresConocidos(movimientos, modo), [movimientos, modo])
  const sugerencias = useMemo(() => (lugarFoco ? sugerirLugares(lugares, lugar, 5) : []), [lugares, lugar, lugarFoco])

  // Categoría automática: la del sitio escrito; si no, la más probable por importe.
  const categoriaDelLugar = useMemo(
    () => (esInversion ? null : categoriaParaLugar(lugar, { modo, movimientos, categorias: categoriasOrdenadas, lugares })),
    [lugar, modo, movimientos, categoriasOrdenadas, lugares, esInversion],
  )
  const categoriaPorImporte = useMemo(
    () => (esInversion ? null : categoriaProbable(movimientos, modo, importe)),
    [movimientos, modo, importe, esInversion],
  )
  useEffect(() => {
    if (esInversion || origenCategoria === 'manual') return
    if (categoriaDelLugar) {
      setCategoriaId(categoriaDelLugar.id)
      setOrigenCategoria('lugar')
    } else if (!lugar.trim()) {
      setCategoriaId(categoriaPorImporte ?? '')
      setOrigenCategoria(categoriaPorImporte ? 'importe' : null)
    }
  }, [categoriaDelLugar, categoriaPorImporte, lugar, origenCategoria, esInversion])

  // Chips de categoría en una fila: la elegida primero, luego las habituales.
  const VISIBLES = 8
  const catsFila = useMemo(() => {
    const sel = categoriasOrdenadas.find((c) => c.id === categoriaId)
    const resto = categoriasOrdenadas.filter((c) => c.id !== categoriaId)
    return (sel ? [sel, ...resto] : resto).slice(0, VISIBLES)
  }, [categoriasOrdenadas, categoriaId])
  const categoriaElegida = categoriasOrdenadas.find((c) => c.id === categoriaId)
  const parecida = nuevaCategoria.trim().length >= 3 ? buscarParecido(nuevaCategoria, categoriasOrdenadas) : null

  // Importes de un toque: los de ese sitio; si no, los de la categoría.
  const importesSugeridos = useMemo(() => {
    const delLugar = importesDelLugar(movimientos, modo, lugar.trim())
    if (delLugar.length) return delLugar
    return importesFrecuentes(movimientos, modo, categoriaId || null)
  }, [movimientos, modo, lugar, categoriaId])

  const repetibles = useMemo(() => frecuentesParaRepetir(movimientos, modo), [movimientos, modo])

  function elegirLugar(l) {
    setLugar(l.nombre)
    setLugarFoco(false)
    if (!esInversion && l.categoriaId && categoriasOrdenadas.some((c) => c.id === l.categoriaId) && origenCategoria !== 'manual') {
      setCategoriaId(l.categoriaId)
      setOrigenCategoria('lugar')
    }
    if (!(Number(importe) > 0) && l.importe > 0) setImporte(l.importe)
    lugarRef.current?.blur()
  }

  function elegirCategoria(id) {
    setCategoriaId(id)
    setOrigenCategoria('manual')
    setNuevaCategoria('')
  }

  // El "¿dónde?" se guarda como concepto (tabla fuentes): el que ya existe con
  // ese nombre o uno nuevo. Así el historial, Fulcro y Fijos lo reconocen.
  async function idDelLugar(nombre) {
    const limpio = String(nombre ?? '').trim()
    if (!limpio) return null
    const existente = fuentes.find((f) => mismaEtiqueta(f.nombre, limpio))
    if (existente) return existente.id
    const creada = await crearFuente(limpio)
    return creada?.id ?? null
  }

  async function categoriaInversionId() {
    const existente = categorias.find((c) => c.nombre === CATEGORIA_INVERSION)
    if (existente) return existente.id
    const creada = await crearCategoria(CATEGORIA_INVERSION)
    return creada?.id ?? null
  }

  // Deshacer al vuelo el último movimiento creado (desde el toast).
  async function deshacerUltimo(id) {
    const { error: errorDelete } = await supabase.from('movimientos').delete().eq('id', id)
    if (errorDelete) return toast('No se ha podido deshacer.', 'error')
    toast('Movimiento deshecho')
    onGuardado({ accion: 'borrar', ids: [id] })
  }
  const accionDeshacer = (fila) => (fila ? { texto: 'Deshacer', onAccion: () => deshacerUltimo(fila.id) } : null)

  async function insertar(datos) {
    const { data: fila, error: errorInsert } = await supabase.from('movimientos').insert(datos).select(SELECT_MOVIMIENTO).single()
    return { fila, errorInsert }
  }

  // Repetir en un toque (con fecha de hoy), con el nombre de verdad del sitio.
  const [duplicandoClave, setDuplicandoClave] = useState(null)
  async function duplicar(rep) {
    if (!rep.categoriaId) return
    const clave = `${rep.categoriaId}|${rep.fuenteId}|${rep.importe}`
    setDuplicandoClave(clave)
    const fuenteId = rep.fuenteId ?? (rep.comercio ? await idDelLugar(rep.comercio) : null)
    const { fila, errorInsert } = await insertar({
      usuario_id: usuarioId,
      tipo: tipoDb,
      categoria_id: rep.categoriaId,
      fuente_id: fuenteId,
      importe: rep.importe,
      importe_centimos: aCentimos(rep.importe),
      fecha: hoyIso(),
      es_fijo: esInversion ? false : rep.esFijo,
    })
    setDuplicandoClave(null)
    if (errorInsert) return toast('No se ha podido añadir. Inténtalo de nuevo.', 'error')
    registrarEvento('movimiento_rapido')
    onGuardado(fila ? { accion: 'crear', filas: [fila] } : undefined)
    toast(`Añadido: ${formatearEuros(rep.importe)}`, 'ok', accionDeshacer(fila))
  }

  // Accesos rápidos que define el usuario (Café 1,50 €…).
  const [registrandoRapidoId, setRegistrandoRapidoId] = useState(null)
  async function registrarRapido(item) {
    if (!item.categoriaId) return toast('Ese acceso no tiene categoría. Edítalo.', 'error')
    setRegistrandoRapidoId(item.id)
    const { fila, errorInsert } = await insertar({
      usuario_id: usuarioId,
      tipo: 'gasto',
      categoria_id: item.categoriaId,
      fuente_id: await idDelLugar(item.nombre),
      importe: Number(item.importe),
      importe_centimos: aCentimos(item.importe),
      fecha: hoyIso(),
      es_fijo: false,
    })
    setRegistrandoRapidoId(null)
    if (errorInsert) return toast('No se ha podido añadir. Inténtalo de nuevo.', 'error')
    registrarEvento('movimiento_rapido')
    onGuardado(fila ? { accion: 'crear', filas: [fila] } : undefined)
    toast(`${item.nombre}: ${formatearEuros(Number(item.importe))}`, 'ok', accionDeshacer(fila))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const importeNumero = Number(importe)
    if (!importe || !importeNumero || importeNumero <= 0) {
      setError('Pon el importe.')
      document.getElementById('importe')?.focus()
      return
    }
    if (!esInversion && !categoriaId) {
      setError('Elige una categoría.')
      return
    }

    // Un cero de más es el error más caro: si es ≥ 10.000 € y más del triple
    // de lo mayor que ha apuntado de ese tipo, se confirma antes de guardar.
    let mayorHabitual = 0
    for (const m of movimientos) {
      if (m.tipo === tipoDb && m.categoria?.nombre !== CATEGORIA_AJUSTE) mayorHabitual = Math.max(mayorHabitual, Number(m.importe) || 0)
    }
    if (importeNumero >= 10000 && importeNumero > mayorHabitual * 3 && !(await confirmar(`¿${formatearEuros(importeNumero)}? Es mucho más de lo que sueles apuntar. Revisa que no sobre ningún cero.`))) return

    // Doble toque: mismo importe, categoría y día hace menos de 90 s.
    if (!esInversion && categoriaId && categoriaId !== NUEVA_ETIQUETA) {
      const ahora = Date.now()
      const reciente = movimientos.some(
        (m) => Number(m.importe) === importeNumero && (m.categoria_id ?? m.categoria?.id) === categoriaId && m.fecha === fecha && m.created_at && ahora - new Date(m.created_at).getTime() < 90000,
      )
      if (reciente && !(await confirmar('¿Apuntar otro igual? Acabas de apuntar este importe en esta categoría hace un momento.'))) return
    }

    setGuardando(true)
    setError(null)

    let idCategoria
    if (esInversion) {
      idCategoria = await categoriaInversionId()
      if (!idCategoria) {
        setGuardando(false)
        return setError('No se ha podido preparar la categoría de inversión. Inténtalo de nuevo.')
      }
    } else {
      const r = await resolverEtiqueta(categoriaId, nuevaCategoria, crearCategoria, 'categoría', setError)
      if (!r.ok) return setGuardando(false)
      idCategoria = r.id
    }
    const fuenteId = await idDelLugar(lugar)

    const { fila, errorInsert } = await insertar({
      usuario_id: usuarioId,
      tipo: tipoDb,
      categoria_id: idCategoria,
      fuente_id: fuenteId,
      importe: importeNumero,
      importe_centimos: aCentimos(importeNumero),
      fecha,
      es_fijo: esInversion ? false : Boolean(repite),
      nota: nota.trim() || null,
    })
    if (errorInsert) {
      setGuardando(false)
      return setError('No se ha podido guardar. Inténtalo de nuevo.')
    }
    registrarEvento('movimiento')

    // "Se repite": además queda en Fijos (este mes ya pagado: es este cobro).
    let textoToast = TOAST_MODO[modo]
    if (repite && !esInversion) {
      const nombre = lugar.trim() || etiquetaCategoria(categoriaElegida?.nombre ?? nuevaCategoria) || 'Fijo'
      const id = await crearFijo(fijoDesdeApunte({ tipo: tipoDb, nombre, importe: importeNumero, categoriaId: idCategoria, categoriaNombre: categoriaElegida?.nombre ?? nuevaCategoria, fuenteId, fecha, periodoMeses: repite }))
      if (id) textoToast = `Guardado y añadido a Fijos (${REPETICIONES.find((r) => r.meses === repite)?.texto.toLowerCase()})`
    }
    setGuardando(false)

    // Varios seguidos: se limpia lo del movimiento; se mantienen tipo y fecha.
    setImporte(null)
    setLugar('')
    setNota('')
    setCategoriaId('')
    setNuevaCategoria('')
    setOrigenCategoria(null)
    setVerTodasCategorias(false)
    setRepite(null)
    setPanel(null)
    onGuardado(fila ? { accion: 'crear', filas: [fila] } : undefined)
    toast(textoToast, 'ok', accionDeshacer(fila))
    requestAnimationFrame(() => document.getElementById('importe')?.focus())
  }

  const hoy = hoyIso()
  const textoFecha = fecha === hoy ? 'Hoy' : fecha === ayerIso() ? 'Ayer' : formatearFecha(fecha)
  const textoRepite = repite ? REPETICIONES.find((r) => r.meses === repite)?.texto : 'Se repite'
  const nombreCat = esInversion ? 'Inversión' : categoriaElegida ? etiquetaCategoria(categoriaElegida.nombre) : nuevaCategoria.trim()
  const importeOk = Number(importe) > 0
  const textoBoton = guardando
    ? 'Guardando…'
    : importeOk
      ? `Guardar ${formatearEuros(Number(importe))}${nombreCat ? ` · ${nombreCat}` : ''}`
      : { gasto: 'Guardar gasto', ingreso: 'Guardar ingreso', inversion: 'Guardar inversión' }[modo]

  return (
    <form className={`apunte modo-${modo}`} onSubmit={handleSubmit}>
      <div className="apunte-tipo" role="tablist" aria-label="Tipo de movimiento" style={{ '--i': MODOS.findIndex((m) => m.id === modo) }}>
        <span className="apunte-tipo-marca" aria-hidden="true" />
        {MODOS.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={modo === m.id} className={modo === m.id ? 'activo' : ''} onClick={() => setModo(m.id)}>
            {m.texto}
          </button>
        ))}
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
      {modo !== 'gasto' && repetibles.length > 0 && (
        <div className="gastos-rapidos">
          <div className="gr-cabecera">
            <span className="repetir-titulo">Repetir</span>
          </div>
          <div className="repetir-chips">
            {repetibles.map((rep) => {
              const clave = `${rep.categoriaId}|${rep.fuenteId}|${rep.importe}`
              return (
                <button key={clave} type="button" className="repetir-chip" onClick={() => duplicar(rep)} disabled={duplicandoClave === clave}>
                  <Icono nombre="repetir" tam={14} className="repetir-chip-icono" />
                  <span className="repetir-chip-texto">
                    {rep.fuenteNombre || rep.comercio || etiquetaCategoria(rep.categoriaNombre ?? '') || 'Movimiento'} · {formatearEuros(rep.importe)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <label className="apunte-importe" htmlFor="importe">
        <InputImporte id="importe" value={importe} onValueChange={setImporte} autoFocus mostrarEuro={false} ajustarAncho aria-label="Importe" />
        <span className="apunte-euro" aria-hidden="true">€</span>
      </label>

      {!importeOk && importesSugeridos.length > 0 && (
        <div className="apunte-importes" role="group" aria-label="Importes habituales">
          {importesSugeridos.map((imp) => (
            <button key={imp} type="button" className="apunte-importe-chip" onClick={() => setImporte(imp)}>
              {formatearEuros(imp)}
            </button>
          ))}
        </div>
      )}

      <div className="apunte-lugar">
        <label className="apunte-lugar-campo" htmlFor="apunte-lugar">
          <Icono nombre="lugar" tam={18} />
          <input
            id="apunte-lugar"
            ref={lugarRef}
            type="text"
            value={lugar}
            onChange={(e) => {
              setLugar(e.target.value)
              setLugarFoco(true)
            }}
            onFocus={() => setLugarFoco(true)}
            onBlur={() => setTimeout(() => setLugarFoco(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (sugerencias[0] && lugar.trim()) elegirLugar(sugerencias[0])
                else lugarRef.current?.blur()
              }
            }}
            placeholder={`${DONDE[modo].label} ${DONDE[modo].placeholder}`}
            aria-label={DONDE[modo].label}
            autoComplete="off"
            enterKeyHint="done"
            maxLength={60}
          />
          {lugar && (
            <button type="button" className="apunte-limpiar" onClick={() => setLugar('')} aria-label="Borrar">
              <Icono nombre="cerrar" tam={14} />
            </button>
          )}
        </label>
        {sugerencias.length > 0 && (
          <ul className="apunte-sugerencias" role="listbox" aria-label="Sitios donde ya has apuntado">
            {sugerencias.map((l) => (
              <li key={l.nombre}>
                <button type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => elegirLugar(l)}>
                  <span className="apunte-sug-nombre">{l.nombre}</span>
                  <span className="apunte-sug-meta">
                    {l.categoriaNombre && !esInversion ? `${etiquetaCategoria(l.categoriaNombre)} · ` : ''}
                    {l.importe ? formatearEuros(l.importe) : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!esInversion && (
        <div className="apunte-cat">
          <div className="apunte-cat-cab">
            <span className="over">Categoría</span>
            {origenCategoria === 'lugar' && categoriaElegida && <span className="apunte-cat-auto">Elegida por el sitio</span>}
          </div>
          {!verTodasCategorias ? (
            <div className="apunte-cat-fila">
              {catsFila.map((c) => (
                <button key={c.id} type="button" className={`apunte-chip ${categoriaId === c.id ? 'activo' : ''}`} onClick={() => elegirCategoria(c.id)}>
                  {etiquetaCategoria(c.nombre)}
                </button>
              ))}
              <button type="button" className="apunte-chip apunte-chip-mas" onClick={() => setVerTodasCategorias(true)}>
                <Icono nombre="mas" tam={14} /> {categoriasOrdenadas.length > VISIBLES ? 'Más' : 'Nueva'}
              </button>
            </div>
          ) : (
            <div className="apunte-cat-todas">
              <div className="apunte-cat-rejilla">
                {categoriasOrdenadas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`apunte-chip ${categoriaId === c.id ? 'activo' : ''}`}
                    onClick={() => {
                      elegirCategoria(c.id)
                      setVerTodasCategorias(false)
                    }}
                  >
                    {etiquetaCategoria(c.nombre)}
                  </button>
                ))}
              </div>
              <input
                id="categoria-nueva"
                type="text"
                value={nuevaCategoria}
                onChange={(e) => {
                  const v = e.target.value
                  setNuevaCategoria(v)
                  setCategoriaId(v.trim() ? NUEVA_ETIQUETA : '')
                  setOrigenCategoria('manual')
                }}
                placeholder={modo === 'ingreso' ? 'Nueva categoría: Dividendos, Alquiler…' : 'Nueva categoría: Mascotas, Regalos…'}
                aria-label="Nueva categoría"
                maxLength={40}
              />
              {parecida && (
                <p className="etiqueta-parecida" role="status">
                  {parecida.exacto ? `Ya tienes «${etiquetaCategoria(parecida.item.nombre)}».` : `¿Querías decir «${etiquetaCategoria(parecida.item.nombre)}»?`}{' '}
                  <button type="button" className="link" onClick={() => { elegirCategoria(parecida.item.id); setVerTodasCategorias(false) }}>
                    Usar esa
                  </button>
                </p>
              )}
              <button type="button" className="link" onClick={() => setVerTodasCategorias(false)}>
                Listo
              </button>
            </div>
          )}
        </div>
      )}

      <div className="apunte-meta" role="group" aria-label="Detalles">
        <button type="button" className={`apunte-meta-chip ${panel === 'fecha' ? 'abierto' : ''} ${fecha !== hoy ? 'puesto' : ''}`} onClick={() => setPanel(panel === 'fecha' ? null : 'fecha')} aria-expanded={panel === 'fecha'}>
          <Icono nombre="calendario" tam={15} /> {textoFecha}
        </button>
        {!esInversion && (
          <button type="button" className={`apunte-meta-chip ${panel === 'repite' ? 'abierto' : ''} ${repite ? 'puesto' : ''}`} onClick={() => setPanel(panel === 'repite' ? null : 'repite')} aria-expanded={panel === 'repite'}>
            <Icono nombre="repetir" tam={15} /> {textoRepite}
          </button>
        )}
        <button type="button" className={`apunte-meta-chip ${panel === 'nota' ? 'abierto' : ''} ${nota.trim() ? 'puesto' : ''}`} onClick={() => setPanel(panel === 'nota' ? null : 'nota')} aria-expanded={panel === 'nota'}>
          <Icono nombre="nota" tam={15} /> {nota.trim() ? 'Con nota' : 'Nota'}
        </button>
      </div>

      {panel === 'fecha' && (
        <div className="apunte-panel">
          <div className="apunte-opciones">
            <button type="button" className={`apunte-chip ${fecha === hoy ? 'activo' : ''}`} onClick={() => { setFecha(hoy); setPanel(null) }}>
              Hoy
            </button>
            <button type="button" className={`apunte-chip ${fecha === ayerIso() ? 'activo' : ''}`} onClick={() => { setFecha(ayerIso()); setPanel(null) }}>
              Ayer
            </button>
          </div>
          <InputFecha id="fecha" value={fecha} onChange={setFecha} max={hoy} />
        </div>
      )}
      {panel === 'repite' && !esInversion && (
        <div className="apunte-panel">
          <div className="apunte-opciones">
            <button type="button" className={`apunte-chip ${!repite ? 'activo' : ''}`} onClick={() => { setRepite(null); setPanel(null) }}>
              No se repite
            </button>
            {REPETICIONES.map((r) => (
              <button key={r.meses} type="button" className={`apunte-chip ${repite === r.meses ? 'activo' : ''}`} onClick={() => { setRepite(r.meses); setPanel(null) }}>
                {r.texto}
              </button>
            ))}
          </div>
          <p className="apunte-ayuda">Lo apuntamos y lo añadimos a Fijos: te avisaremos el día {Number(fecha.slice(8, 10))} de cada cobro. Ideal para suscripciones, recibos o la nómina.</p>
        </div>
      )}
      {panel === 'nota' && (
        <div className="apunte-panel">
          <input id="nota" type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Cena con Laura, regalo de Ana…" autoFocus maxLength={200} />
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={guardando} className={`apunte-guardar ${importeOk ? 'listo' : ''}`}>
        {textoBoton}
      </button>
    </form>
  )
}
