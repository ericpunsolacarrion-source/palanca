import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { useEtiquetas } from '../lib/useEtiquetas'
import { useRecurrentes } from '../lib/useRecurrentes'
import { formatearEuros } from '../lib/categorias'
import { SELECT_MOVIMIENTO, claveMesActual, hoyIso } from '../lib/movimientosUtils'
import { biografiaRecurrente } from '../lib/biografiaRecurrente'
import { PERIODOS, costeAnual, costeMensual, periodoDe, textoCalendario, tocaEnMes } from '../lib/periodicidad'
import CalendarioCobros from './CalendarioCobros'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import InputImporte from './InputImporte'
import InputFecha from './InputFecha'
import SuscripcionesDetectadas from './SuscripcionesDetectadas'
import { aCentimos } from '../lib/importe'

// Fecha por defecto al confirmar: el día definido, en el mes en curso (acotado
// al último día del mes). Sin día definido, hoy.
function fechaDelMes(rec) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (rec.diaMes) {
    const ultimo = new Date(y, m + 1, 0).getDate()
    const d = Math.min(rec.diaMes, ultimo)
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    // Confirmar ANTES del día habitual no crea un movimiento con fecha futura
    // (inflaría el patrimonio de hoy y el selector no permite fechas futuras).
    const hoy = hoyIso()
    return iso > hoy ? hoy : iso
  }
  return hoyIso()
}

const signo = (tipo) => (tipo === 'ingreso' ? '+' : '−')

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ── Héroe: el peso de tu dinero fijo ────────────────────────────────────────
function Hero({ gastoMes, gastoAnual, nActivos, estado }) {
  return (
    <header className="tb-hero">
      <span className="tb-hero-label">Suscripciones y gastos fijos</span>
      <div className="tb-hero-cifra">
        {formatearEuros(gastoMes)}
        <span className="tb-hero-mes">/mes</span>
      </div>
      {gastoAnual > 0 && (
        <span className="tb-hero-anual">
          {formatearEuros(Math.round(gastoAnual))} al año · {nActivos} {nActivos === 1 ? 'compromiso' : 'compromisos'}
        </span>
      )}
      {estado && (
        <div className={`tb-hero-estado ${estado.tono}`}>
          {estado.tono === 'ok' && <span className="tb-estado-punto" aria-hidden="true" />}
          {estado.texto}
        </div>
      )}
    </header>
  )
}

// ── Fila de compromiso: nombre + biografía + importe + anillo de estado ──────
function CompromisoRow({ rec, mesActual, registrando, recien, onAbrir, onConfirmarRapido, onDesmarcar }) {
  const bio = useMemo(() => biografiaRecurrente(rec), [rec])
  const esIngreso = rec.tipo === 'ingreso'
  const hecho = rec.aplicadoEn === mesActual
  // No mensual y no le toca este mes: no hay nada que confirmar (sereno).
  const fueraDeMes = !hecho && !tocaEnMes(rec, mesActual)
  const toca = !hecho && !fueraDeMes && bio.proximo && bio.proximo.dias <= 0
  const periodo = periodoDe(rec)

  // Biografía compacta: "2 años · 360 € · en 4 días". Si está hecho, el anillo
  // ya lo comunica, así que no repetimos el estado en texto.
  const partes = []
  if (periodo.meses > 1) partes.push(periodo.etiqueta.toLowerCase())
  if (bio.meses >= 1) partes.push(bio.antiguedad)
  if (bio.total > 0) partes.push(formatearEuros(bio.total))
  if (!hecho && bio.proximo) partes.push(bio.proximo.texto)

  const estadoAnillo = hecho ? 'hecho' : toca ? 'toca' : fueraDeMes ? 'futuro' : 'pendiente'

  return (
    <div
      className={`tb-row ${hecho ? 'is-hecho' : ''} ${fueraDeMes ? 'is-futuro' : ''} ${!rec.activo ? 'is-pausado' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(rec)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onAbrir(rec)}
    >
      <button
        type="button"
        className={`tb-ring ${estadoAnillo} ${recien ? 'recien' : ''}`}
        disabled={registrando}
        aria-label={hecho ? `Deshacer ${rec.nombre}` : fueraDeMes ? `Ver ${rec.nombre}` : `Confirmar ${rec.nombre}`}
        onClick={(e) => {
          e.stopPropagation()
          if (hecho) return onDesmarcar(rec)
          if (fueraDeMes) return onAbrir(rec)
          onConfirmarRapido(rec)
        }}
      >
        <svg viewBox="0 0 24 24" className="tb-ring-check" aria-hidden="true">
          <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="tb-row-main">
        <span className="tb-row-nombre">{rec.nombre}</span>
        {partes.length > 0 && <span className="tb-row-bio">{partes.join('  ·  ')}</span>}
      </div>

      <span className={`tb-row-importe ${esIngreso ? 'ingreso' : 'gasto'}`}>
        {signo(rec.tipo)}
        {formatearEuros(Number(rec.importe))}
        {periodo.meses > 1 && <span className="tb-row-periodo">{periodo.corta}</span>}
      </span>
    </div>
  )
}

// ── Hoja de detalle: la biografía completa + acciones (progressive disclosure) ─
function DetalleSheet({ rec, mesActual, registrando, onCerrar, onRegistrar, onEditar, onPausar, onBorrar, onDesmarcar }) {
  const bio = useMemo(() => biografiaRecurrente(rec), [rec])
  const esIngreso = rec.tipo === 'ingreso'
  const hecho = rec.aplicadoEn === mesActual
  const fueraDeMes = !hecho && !tocaEnMes(rec, mesActual)
  const [importe, setImporte] = useState(Number(rec.importe))
  const [fecha, setFecha] = useState(() => fechaDelMes(rec))

  const datos = [
    { k: 'Antigüedad', v: bio.meses >= 1 ? bio.antiguedad : 'nuevo' },
    { k: 'Pagado en total', v: bio.total > 0 ? formatearEuros(bio.total) : '—' },
    { k: 'Veces registrado', v: bio.nPagos > 0 ? `${bio.nPagos} ${bio.nPagos === 1 ? 'vez' : 'veces'}` : '—' },
    { k: 'Próximo', v: hecho ? 'hecho este mes' : bio.proximo?.texto ?? '—' },
    { k: 'Cuándo', v: textoCalendario(rec) },
    { k: rec.tipo === 'ingreso' ? 'Al año' : 'Te cuesta al año', v: formatearEuros(costeAnual(rec)) },
  ]

  return createPortal(
    <div className="tb-sheet-back" onClick={onCerrar}>
      <div className="tb-sheet" role="dialog" aria-label={rec.nombre} onClick={(e) => e.stopPropagation()}>
        <div className="tb-sheet-tirador" aria-hidden="true" />

        <div className="tb-sheet-cab">
          <div>
            <span className="tb-sheet-nombre">{rec.nombre}</span>
            <span className="tb-sheet-cat">{rec.categoriaNombre}</span>
          </div>
          <span className={`tb-sheet-importe ${esIngreso ? 'ingreso' : 'gasto'}`}>
            {signo(rec.tipo)}
            {formatearEuros(Number(rec.importe))}
          </span>
        </div>

        <div className="tb-bio-grid">
          {datos.map((d) => (
            <div key={d.k} className="tb-bio-celda">
              <span className="tb-bio-valor">{d.v}</span>
              <span className="tb-bio-clave">{d.k}</span>
            </div>
          ))}
        </div>

        {rec.activo && fueraDeMes && (
          <p className="tb-hecho-nota tb-fuera-nota">Este mes no toca · próximo cobro {bio.proximo?.texto ?? '—'}</p>
        )}

        {rec.activo && !hecho && !fueraDeMes && (
          <div className="tb-confirmar">
            {rec.confirmar ? (
              <div className="tb-confirmar-campos">
                <label>
                  <span>Importe este mes</span>
                  <InputImporte value={importe} onValueChange={setImporte} />
                </label>
                <label>
                  <span>Fecha</span>
                  <InputFecha value={fecha} onChange={setFecha} max={hoyIso()} />
                </label>
              </div>
            ) : null}
            <button
              type="button"
              className="tb-confirmar-btn"
              disabled={registrando || (rec.confirmar && !(Number(importe) > 0))}
              onClick={() => onRegistrar(rec, rec.confirmar ? Number(importe) : Number(rec.importe), rec.confirmar ? fecha : fechaDelMes(rec))}
            >
              {registrando ? 'Registrando…' : `Confirmar ${signo(rec.tipo)}${formatearEuros(rec.confirmar ? Number(importe) || 0 : Number(rec.importe))}`}
            </button>
          </div>
        )}

        {hecho && (
          <div className="tb-hecho-fila">
            <span className="tb-hecho-nota">Registrado este mes ✓</span>
            <button type="button" className="tb-deshacer" onClick={() => onDesmarcar(rec)}>
              Deshacer
            </button>
          </div>
        )}

        <div className="tb-sheet-acc">
          <button type="button" onClick={() => onEditar(rec)}>Editar</button>
          <button type="button" onClick={() => onPausar(rec)}>{rec.activo ? 'Pausar' : 'Activar'}</button>
          <button type="button" className="peligro" onClick={() => onBorrar(rec)}>Borrar</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Formulario (alta / edición), en hoja ─────────────────────────────────────
function FormularioRecurrente({ inicial, categoriasGasto, categoriasIngreso, onGuardar, onCancelar }) {
  const [tipo, setTipo] = useState(inicial?.tipo ?? 'gasto')
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [importe, setImporte] = useState(inicial ? Number(inicial.importe) : null)
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '')
  const [diaMes, setDiaMes] = useState(inicial?.diaMes ? String(inicial.diaMes) : '')
  const [periodoMeses, setPeriodoMeses] = useState(inicial?.periodoMeses ?? 1)
  const [mesInicio, setMesInicio] = useState(inicial?.mesInicio ?? new Date().getMonth() + 1)
  const [confirmarImporte, setConfirmarImporte] = useState(
    inicial ? Boolean(inicial.confirmar) : (inicial?.tipo ?? 'gasto') === 'ingreso',
  )
  const [error, setError] = useState(null)
  const categorias = tipo === 'ingreso' ? categoriasIngreso : categoriasGasto

  function handleSubmit() {
    if (!nombre.trim()) return setError('Ponle un nombre.')
    if (!importe || Number(importe) <= 0) return setError('Pon el importe habitual.')
    if (!categoriaId) return setError('Elige una categoría.')
    const cat = categorias.find((c) => c.id === categoriaId)
    const diaNum = diaMes ? Math.min(31, Math.max(1, Math.round(Number(diaMes)))) : null
    onGuardar({
      tipo,
      nombre: nombre.trim(),
      importe: Number(importe),
      categoriaId,
      categoriaNombre: cat?.nombre ?? null,
      diaMes: diaNum,
      confirmar: confirmarImporte,
      periodoMeses,
      mesInicio: periodoMeses === 1 ? null : mesInicio,
    })
  }

  return createPortal(
    <div className="tb-sheet-back" onClick={onCancelar}>
      <div className="tb-sheet tb-form" role="dialog" aria-label="Compromiso" onClick={(e) => e.stopPropagation()}>
        <div className="tb-sheet-tirador" aria-hidden="true" />
        <div className="tipo-toggle tb-toggle">
          <button type="button" className={tipo === 'gasto' ? 'activo' : ''} onClick={() => { setTipo('gasto'); setCategoriaId(''); setConfirmarImporte(false) }}>Gasto</button>
          <button type="button" className={tipo === 'ingreso' ? 'activo' : ''} onClick={() => { setTipo('ingreso'); setCategoriaId(''); setConfirmarImporte(true) }}>Ingreso</button>
        </div>

        <input className="tb-input-nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={tipo === 'ingreso' ? 'Nómina' : 'Alquiler'} autoFocus />
        <InputImporte value={importe} onValueChange={setImporte} placeholder="Importe habitual" />

        <div className="chips-fila chips-fila-compacta" role="group" aria-label="Categoría">
          {categorias.map((c) => (
            <button key={c.id} type="button" className={`chip chip-sm ${categoriaId === c.id ? 'activo' : ''}`} onClick={() => setCategoriaId(c.id)}>{c.nombre}</button>
          ))}
        </div>

        <div className="chips-fila chips-fila-compacta tb-periodos" role="group" aria-label="Cada cuánto se cobra">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className={`chip chip-sm ${periodoMeses === p.meses ? 'activo' : ''}`} onClick={() => setPeriodoMeses(p.meses)}>{p.etiqueta}</button>
          ))}
        </div>

        {periodoMeses > 1 && (
          <label className="tb-mes-cobro">
            <span>{periodoMeses === 12 ? 'Mes en que se cobra' : 'Un mes en que se cobra'}</span>
            <select value={mesInicio} onChange={(e) => setMesInicio(Number(e.target.value))}>
              {MESES_LARGOS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>
        )}

        <div className="tb-form-fila">
          <label className="tb-dia">
            <span>Día del mes</span>
            <input type="number" min="1" max="31" inputMode="numeric" value={diaMes} onChange={(e) => setDiaMes(e.target.value)} placeholder="—" />
          </label>
          <label className="tb-check">
            <input type="checkbox" checked={confirmarImporte} onChange={(e) => setConfirmarImporte(e.target.checked)} />
            <span>Importe variable</span>
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        <div className="tb-sheet-acc tb-form-acc">
          <button type="button" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="tb-form-guardar" onClick={handleSubmit}>Guardar</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function Recurrentes({ usuarioId, movimientos, onRegistrado }) {
  const { items, cargando, crear, actualizar, eliminar, marcarAplicado, desmarcar } = useRecurrentes(usuarioId)
  const { items: categoriasGasto } = useEtiquetas('categorias', usuarioId, 'gasto')
  const { items: categoriasIngreso } = useEtiquetas('categorias', usuarioId, 'ingreso')
  const [detalle, setDetalle] = useState(null) // rec en hoja de detalle
  const [form, setForm] = useState(null) // { rec } edición | {} alta | null
  const [registrandoId, setRegistrandoId] = useState(null)
  const [recienId, setRecienId] = useState(null) // id recién confirmado (anima el sello)

  const mesActual = claveMesActual()

  async function registrar(rec, importe, fecha) {
    if (!importe || importe <= 0) return
    // Doble toque: un segundo registro crearía un movimiento huérfano (solo
    // hay una confirmación por mes).
    if (registrandoId) return
    setRegistrandoId(rec.id)
    const { data: filaNueva, error } = await supabase
      .from('movimientos')
      .insert({
        usuario_id: usuarioId,
        tipo: rec.tipo,
        categoria_id: rec.categoriaId,
        fuente_id: rec.fuenteId ?? null,
        importe,
        importe_centimos: aCentimos(importe),
        fecha: fecha || fechaDelMes(rec),
        es_fijo: true,
      })
      .select(SELECT_MOVIMIENTO)
      .single()
    setRegistrandoId(null)
    if (error) return toast('No se ha podido registrar. Inténtalo de nuevo.', 'error')
    marcarAplicado(rec.id, { movimientoId: filaNueva?.id ?? null, importeCentimos: aCentimos(importe) })
    setDetalle(null)
    setRecienId(rec.id)
    if (navigator.vibrate) navigator.vibrate(10)
    setTimeout(() => setRecienId((id) => (id === rec.id ? null : id)), 800)
    toast(`${rec.nombre} registrado`)
    onRegistrado?.(filaNueva ? { accion: 'crear', filas: [filaNueva] } : undefined)
  }

  function confirmarRapido(rec) {
    if (rec.confirmar || !tocaEnMes(rec, mesActual)) return setDetalle(rec) // variable → ajusta en la hoja
    registrar(rec, Number(rec.importe), fechaDelMes(rec))
  }

  // Segundo toque sobre el anillo verde: deshace TODO lo que hizo el primero
  // (borra el movimiento creado y la confirmación). Correspondencia 1:1.
  async function desmarcarRec(rec) {
    const movId = await desmarcar(rec.id)
    setRecienId(null)
    setDetalle(null)
    toast(`${rec.nombre} deshecho`)
    if (movId) onRegistrado?.({ accion: 'borrar', ids: [movId] })
  }

  async function borrar(rec) {
    if (await confirmar(`¿Borrar ${rec.nombre}? Se conserva tu histórico de movimientos.`)) {
      eliminar(rec.id)
      setDetalle(null)
    }
  }

  // Orden: primero lo que pide atención (pendiente/toca, por proximidad), luego
  // lo ya hecho este mes (sereno). Pausados al final.
  const ordenados = useMemo(() => {
    const activos = items.filter((r) => r.activo)
    const pausados = items.filter((r) => !r.activo)
    // Por proximidad real del cobro (consciente de la periodicidad); los que no
    // tocan este mes van después de los que sí.
    const diasA = (r) => biografiaRecurrente(r).proximo?.dias ?? 999
    const porToca = activos.filter((r) => r.aplicadoEn !== mesActual)
    const pend = porToca.filter((r) => tocaEnMes(r, mesActual)).sort((a, b) => diasA(a) - diasA(b))
    const futuros = porToca.filter((r) => !tocaEnMes(r, mesActual)).sort((a, b) => diasA(a) - diasA(b))
    const hechos = activos.filter((r) => r.aplicadoEn === mesActual)
    return [...pend, ...futuros, ...hechos, ...pausados]
  }, [items, mesActual])

  // Coste prorrateado: una anual de 120 € cuenta 10 €/mes (cifra mensual única).
  const { gastoMes, gastoAnual, nActivos } = useMemo(() => {
    const gastos = items.filter((r) => r.activo && r.tipo === 'gasto')
    return {
      gastoMes: gastos.reduce((s, r) => s + Math.round(costeMensual(r) * 100), 0) / 100,
      gastoAnual: gastos.reduce((s, r) => s + Math.round(costeAnual(r) * 100), 0) / 100,
      nActivos: gastos.length,
    }
  }, [items])

  const estado = useMemo(() => {
    const pend = items.filter((r) => r.activo && r.aplicadoEn !== mesActual && tocaEnMes(r, mesActual))
    if (items.filter((r) => r.activo).length === 0) return null
    if (pend.length === 0) return { tono: 'ok', texto: 'Todo al día este mes' }
    const prox = pend
      .map((r) => ({ r, p: biografiaRecurrente(r).proximo }))
      .filter((x) => x.p)
      .sort((a, b) => a.p.dias - b.p.dias)[0]
    if (prox) return { tono: 'aviso', texto: `Próximo · ${prox.r.nombre} · ${prox.p.texto}` }
    return { tono: 'aviso', texto: `${pend.length} sin confirmar este mes` }
  }, [items, mesActual])

  return (
    <div className="tubase vista fade-in-up">
      <Hero gastoMes={gastoMes} gastoAnual={gastoAnual} nActivos={nActivos} estado={estado} />

      {items.some((r) => r.activo) && <CalendarioCobros items={items} onAbrir={setDetalle} />}

      {!cargando && (
        <SuscripcionesDetectadas
          usuarioId={usuarioId}
          movimientos={movimientos}
          recurrentes={items}
          onAnadir={crear}
        />
      )}

      {cargando && items.length === 0 && (
        <div className="skeleton skeleton-linea" style={{ width: '70%', height: 44, marginTop: 24 }} />
      )}

      {!cargando && items.length === 0 && (
        <div className="tb-vacio">
          <p>Aún no has añadido tus gastos fijos.</p>
          <span>Alquiler, suscripciones, nómina… Empieza por uno, o importa el extracto de tu banco y los detectamos por ti.</span>
        </div>
      )}

      {ordenados.length > 0 && (
        <div className="tb-lista">
          {ordenados.map((rec) => (
            <CompromisoRow
              key={rec.id}
              rec={rec}
              mesActual={mesActual}
              registrando={registrandoId === rec.id}
              recien={recienId === rec.id}
              onAbrir={setDetalle}
              onConfirmarRapido={confirmarRapido}
              onDesmarcar={desmarcarRec}
            />
          ))}
        </div>
      )}

      <button type="button" className="tb-add" onClick={() => setForm({})}>
        <span aria-hidden="true">+</span> Añadir compromiso
      </button>

      {detalle && (
        <DetalleSheet
          rec={items.find((r) => r.id === detalle.id) ?? detalle}
          mesActual={mesActual}
          registrando={registrandoId === detalle.id}
          onCerrar={() => setDetalle(null)}
          onRegistrar={registrar}
          onEditar={(rec) => { setDetalle(null); setForm({ rec }) }}
          onPausar={(rec) => { actualizar(rec.id, { activo: !rec.activo }); setDetalle(null) }}
          onBorrar={borrar}
          onDesmarcar={desmarcarRec}
        />
      )}

      {form && (
        <FormularioRecurrente
          inicial={form.rec}
          categoriasGasto={categoriasGasto}
          categoriasIngreso={categoriasIngreso}
          onGuardar={(datos) => {
            if (form.rec) actualizar(form.rec.id, datos)
            else crear(datos)
            setForm(null)
          }}
          onCancelar={() => setForm(null)}
        />
      )}
    </div>
  )
}
