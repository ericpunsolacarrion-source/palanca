import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEtiquetas } from '../lib/useEtiquetas'
import { useRecurrentes } from '../lib/useRecurrentes'
import { formatearEuros } from '../lib/categorias'
import { claveMesActual, formatearFecha, hoyIso } from '../lib/movimientosUtils'
import { biografiaRecurrente } from '../lib/biografiaRecurrente'
import { PERIODOS, costeAnual, costeMensual, estadoCobro, fechaCobroEnMes, periodoDe, textoCalendario } from '../lib/periodicidad'
import CalendarioCobros from './CalendarioCobros'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import InputImporte from './InputImporte'
import SuscripcionesDetectadas from './SuscripcionesDetectadas'

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

// Anillo de estado según el cobro de este mes (ver estadoCobro).
const ANILLO = { hecho: 'hecho', confirmar: 'toca', 'sin-dia': 'toca', esperando: 'pendiente', 'no-toca': 'futuro' }

// Campo "día de cobro" (1–31): obligatorio, porque es lo que permite avisar y
// confirmar cada cobro en su día.
function CampoDia({ valor, onCambio, autoFocus = false }) {
  return (
    <label className="tb-dia-cobro">
      <span>Día de cobro</span>
      <span className="tb-dia-cobro-campo">
        <span aria-hidden="true">Día</span>
        <input
          type="number"
          min="1"
          max="31"
          inputMode="numeric"
          value={valor}
          onChange={(e) => onCambio(e.target.value.replace(/\D/g, '').slice(0, 2))}
          placeholder="—"
          autoFocus={autoFocus}
          aria-label="Día del mes en que se cobra"
        />
      </span>
      <small>Ese día te avisamos para que lo confirmes.</small>
    </label>
  )
}

const diaValido = (v) => {
  const n = Math.round(Number(v))
  return n >= 1 && n <= 31 ? n : null
}

// ── Fila de compromiso: nombre + biografía + importe + anillo de estado ──────
function CompromisoRow({ rec, registrando, recien, onAbrir, onConfirmarRapido, onDesmarcar }) {
  const bio = useMemo(() => biografiaRecurrente(rec), [rec])
  const esIngreso = rec.tipo === 'ingreso'
  const estado = rec.activo ? estadoCobro(rec) : 'no-toca'
  const periodo = periodoDe(rec)

  // Biografía compacta: "trimestral · 2 años · 360 € · ¿te lo han cobrado?".
  const partes = []
  if (periodo.meses > 1) partes.push(periodo.etiqueta.toLowerCase())
  if (bio.meses >= 1) partes.push(bio.antiguedad)
  if (bio.total > 0) partes.push(formatearEuros(bio.total))
  if (!rec.activo) partes.push('pausado')
  else if (estado === 'confirmar') partes.push(bio.proximo?.dias < 0 ? `se cobró ${bio.proximo.texto}` : 'se cobra hoy')
  else if (estado === 'sin-dia') partes.push('falta el día de cobro')
  else if (estado !== 'hecho' && bio.proximo) partes.push(bio.proximo.texto)

  const etiqueta = {
    hecho: `Deshacer ${rec.nombre}`,
    confirmar: `Confirmar ${rec.nombre}`,
    'sin-dia': `Poner el día de cobro de ${rec.nombre}`,
  }[estado] ?? `Ver ${rec.nombre}`

  return (
    <div
      className={`tb-row ${estado === 'hecho' ? 'is-hecho' : ''} ${estado === 'no-toca' || estado === 'esperando' ? 'is-futuro' : ''} ${!rec.activo ? 'is-pausado' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(rec)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onAbrir(rec)}
    >
      <button
        type="button"
        className={`tb-ring ${ANILLO[estado]} ${recien ? 'recien' : ''}`}
        disabled={registrando}
        aria-label={etiqueta}
        onClick={(e) => {
          e.stopPropagation()
          if (estado === 'hecho') return onDesmarcar(rec)
          if (estado === 'confirmar') return onConfirmarRapido(rec)
          onAbrir(rec)
        }}
      >
        <svg viewBox="0 0 24 24" className="tb-ring-check" aria-hidden="true">
          <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="tb-row-main">
        <span className="tb-row-nombre">{rec.nombre}</span>
        {partes.length > 0 && (
          <span className={`tb-row-bio ${estado === 'confirmar' || estado === 'sin-dia' ? 'atencion' : ''}`}>
            {partes.join('  ·  ')}
          </span>
        )}
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
function DetalleSheet({ rec, mesActual, registrando, onCerrar, onConfirmar, onGuardarDia, onEditar, onPausar, onBorrar, onDesmarcar }) {
  const bio = useMemo(() => biografiaRecurrente(rec), [rec])
  const esIngreso = rec.tipo === 'ingreso'
  const estado = rec.activo ? estadoCobro(rec) : 'no-toca'
  const [importe, setImporte] = useState(Number(rec.importe))
  const [dia, setDia] = useState(rec.diaMes ? String(rec.diaMes) : '')
  const [adelantado, setAdelantado] = useState(false) // "ya me lo han cobrado"
  const fechaCobro = fechaCobroEnMes(rec, mesActual)
  const importeValido = Number(importe) > 0
  const verbo = esIngreso ? 'ingresado' : 'cobrado'

  const datos = [
    { k: 'Antigüedad', v: bio.meses >= 1 ? bio.antiguedad : 'nuevo' },
    { k: 'Pagado en total', v: bio.total > 0 ? formatearEuros(bio.total) : '—' },
    { k: 'Veces registrado', v: bio.nPagos > 0 ? `${bio.nPagos} ${bio.nPagos === 1 ? 'vez' : 'veces'}` : '—' },
    { k: 'Próximo', v: estado === 'hecho' ? 'hecho este mes' : bio.proximo?.texto ?? '—' },
    { k: 'Cuándo', v: textoCalendario(rec) },
    { k: rec.tipo === 'ingreso' ? 'Al año' : 'Te cuesta al año', v: formatearEuros(costeAnual(rec)) },
  ]

  // Bloque de confirmación (cobro de hoy o pasado, o adelanto pedido).
  const confirmacion = (fecha, texto) => (
    <div className="tb-confirmar">
      {rec.confirmar && (
        <div className="tb-confirmar-campos">
          <label>
            <span>Importe de este mes</span>
            <InputImporte value={importe} onValueChange={setImporte} />
          </label>
        </div>
      )}
      <p className="tb-confirmar-fecha">{texto}</p>
      <button
        type="button"
        className="tb-confirmar-btn"
        disabled={registrando || !importeValido}
        onClick={() => onConfirmar(rec, { importe: Number(importe), fecha })}
      >
        {registrando ? 'Registrando…' : `Confirmar ${signo(rec.tipo)}${formatearEuros(Number(importe) || 0)}`}
      </button>
    </div>
  )

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

        {estado === 'sin-dia' && (
          <div className="tb-pedir-dia">
            <p>¿Qué día del mes se cobra? Lo necesitamos para avisarte y apuntarlo en su fecha.</p>
            <CampoDia valor={dia} onCambio={setDia} autoFocus />
            <button type="button" className="tb-confirmar-btn" disabled={!diaValido(dia)} onClick={() => onGuardarDia(rec, diaValido(dia))}>
              Guardar día
            </button>
          </div>
        )}

        {estado === 'confirmar' &&
          confirmacion(
            null,
            `¿Te lo han ${verbo}? Se apuntará el ${formatearFecha(fechaCobro)}, su día de cobro.`,
          )}

        {estado === 'esperando' &&
          (adelantado ? (
            confirmacion(hoyIso(), `Se apuntará con fecha de hoy, ${formatearFecha(hoyIso())}.`)
          ) : (
            <div className="tb-esperando">
              <p>
                Se cobra el <strong>{formatearFecha(fechaCobro)}</strong> ({bio.proximo?.texto}). Ese día te
                pediremos que lo confirmes.
              </p>
              <button type="button" className="link" onClick={() => setAdelantado(true)}>
                Ya me lo han {verbo}
              </button>
            </div>
          ))}

        {rec.activo && estado === 'no-toca' && (
          <p className="tb-hecho-nota tb-fuera-nota">Este mes no toca · próximo cobro {bio.proximo?.texto ?? '—'}</p>
        )}

        {estado === 'hecho' && (
          <div className="tb-hecho-fila">
            <span className="tb-hecho-nota">Confirmado este mes</span>
            <button type="button" className="tb-deshacer" onClick={() => onDesmarcar(rec)}>
              Deshacer
            </button>
          </div>
        )}

        <div className="tb-bio-grid">
          {datos.map((d) => (
            <div key={d.k} className="tb-bio-celda">
              <span className="tb-bio-valor">{d.v}</span>
              <span className="tb-bio-clave">{d.k}</span>
            </div>
          ))}
        </div>

        <div className="tb-sheet-acc">
          <button type="button" onClick={() => onEditar(rec)}>Editar</button>
          <button type="button" onClick={() => onPausar(rec)}>{rec.activo ? 'Pausar' : 'Reactivar'}</button>
          <button type="button" className="peligro" onClick={() => onBorrar(rec)}>Borrar</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Reactivar un compromiso pausado: vuelve a preguntar cuándo se cobra ──────
function ReactivarSheet({ rec, onGuardar, onCancelar }) {
  const [dia, setDia] = useState(rec.diaMes ? String(rec.diaMes) : '')
  const [mesInicio, setMesInicio] = useState(rec.mesInicio ?? new Date().getMonth() + 1)
  const periodo = periodoDe(rec)
  return createPortal(
    <div className="tb-sheet-back" onClick={onCancelar}>
      <div className="tb-sheet tb-form" role="dialog" aria-label={`Reactivar ${rec.nombre}`} onClick={(e) => e.stopPropagation()}>
        <div className="tb-sheet-tirador" aria-hidden="true" />
        <span className="tb-sheet-nombre">Reactivar {rec.nombre}</span>
        <p className="tb-pedir-texto">Tras una pausa el día de cobro suele cambiar. ¿Cuándo se cobrará ahora?</p>
        <CampoDia valor={dia} onCambio={setDia} autoFocus />
        {periodo.meses > 1 && (
          <label className="tb-mes-cobro">
            <span>{periodo.meses === 12 ? 'Mes en que se cobra' : 'Un mes en que se cobra'}</span>
            <select value={mesInicio} onChange={(e) => setMesInicio(Number(e.target.value))}>
              {MESES_LARGOS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>
        )}
        <div className="tb-sheet-acc tb-form-acc">
          <button type="button" onClick={onCancelar}>Cancelar</button>
          <button
            type="button"
            className="tb-form-guardar"
            disabled={!diaValido(dia)}
            onClick={() =>
              onGuardar(rec, {
                activo: true,
                diaMes: diaValido(dia),
                ...(periodo.meses > 1 ? { periodoMeses: periodo.meses, mesInicio } : {}),
              })
            }
          >
            Reactivar
          </button>
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
    if (!diaValido(diaMes)) return setError('¿Qué día del mes se cobra? (1–31)')
    if (!categoriaId) return setError('Elige una categoría.')
    const cat = categorias.find((c) => c.id === categoriaId)
    const diaNum = diaValido(diaMes)
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
          <CampoDia valor={diaMes} onCambio={setDiaMes} />
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

export default function Recurrentes({ usuarioId, movimientos, onRegistrado, abrirId = null, onAbierto }) {
  const { items, cargando, crear, actualizar, eliminar, confirmarCobro, desmarcar } = useRecurrentes(usuarioId)
  const { items: categoriasGasto } = useEtiquetas('categorias', usuarioId, 'gasto')
  const { items: categoriasIngreso } = useEtiquetas('categorias', usuarioId, 'ingreso')
  const [detalle, setDetalle] = useState(null) // rec en hoja de detalle
  const [form, setForm] = useState(null) // { rec } edición | {} alta | null
  const [reactivar, setReactivar] = useState(null) // rec pausado a reactivar
  const [registrandoId, setRegistrandoId] = useState(null)
  const [recienId, setRecienId] = useState(null) // id recién confirmado (anima el sello)

  const mesActual = claveMesActual()

  // Llegada desde el inicio con un compromiso concreto (p. ej. confirmar un
  // cobro de importe variable): abre su hoja en cuanto está cargado.
  useEffect(() => {
    if (!abrirId) return
    const rec = items.find((r) => r.id === abrirId)
    if (rec) {
      setDetalle(rec)
      onAbierto?.()
    }
  }, [abrirId, items, onAbierto])

  async function registrar(rec, opciones = {}) {
    // Doble toque: un segundo registro crearía un movimiento huérfano (solo
    // hay una confirmación por mes).
    if (registrandoId) return
    setRegistrandoId(rec.id)
    const fila = await confirmarCobro(rec, opciones)
    setRegistrandoId(null)
    if (!fila) return
    setDetalle(null)
    setRecienId(rec.id)
    if (navigator.vibrate) navigator.vibrate(10)
    setTimeout(() => setRecienId((id) => (id === rec.id ? null : id)), 800)
    toast(`${rec.nombre} confirmado`)
    onRegistrado?.({ accion: 'crear', filas: [fila] })
  }

  function confirmarRapido(rec) {
    // Importe variable → se ajusta en la hoja; si no, se confirma al momento.
    if (rec.confirmar || estadoCobro(rec) !== 'confirmar') return setDetalle(rec)
    registrar(rec)
  }

  async function guardarDia(rec, dia) {
    await actualizar(rec.id, { diaMes: dia })
    toast(`Día de cobro guardado: el ${dia} de cada ${periodoDe(rec).meses === 1 ? 'mes' : 'periodo'}`)
  }

  // Pausar es directo; reactivar vuelve a preguntar el día de cobro.
  function pausarOReactivar(rec) {
    setDetalle(null)
    if (rec.activo) {
      actualizar(rec.id, { activo: false })
      toast(`${rec.nombre} en pausa. Al reactivarlo te preguntaremos el día de cobro.`)
    } else setReactivar(rec)
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

  // Orden: primero lo que pide atención (por confirmar, sin día), luego lo que
  // está por llegar (por proximidad), lo que no toca este mes, lo ya hecho
  // (sereno) y, al final, lo pausado.
  const ordenados = useMemo(() => {
    const peso = { confirmar: 0, 'sin-dia': 1, esperando: 2, 'no-toca': 3, hecho: 4 }
    const diasA = (r) => biografiaRecurrente(r).proximo?.dias ?? 999
    const activos = items
      .filter((r) => r.activo)
      .sort((a, b) => peso[estadoCobro(a)] - peso[estadoCobro(b)] || diasA(a) - diasA(b))
    return [...activos, ...items.filter((r) => !r.activo)]
  }, [items])

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
    const activos = items.filter((r) => r.activo)
    if (activos.length === 0) return null
    const porConfirmar = activos.filter((r) => estadoCobro(r) === 'confirmar')
    if (porConfirmar.length === 1) return { tono: 'aviso', texto: `${porConfirmar[0].nombre} · por confirmar` }
    if (porConfirmar.length > 1) return { tono: 'aviso', texto: `${porConfirmar.length} cobros por confirmar` }
    const sinDia = activos.filter((r) => estadoCobro(r) === 'sin-dia')
    if (sinDia.length) return { tono: 'aviso', texto: `Falta el día de cobro de ${sinDia.length === 1 ? sinDia[0].nombre : `${sinDia.length} compromisos`}` }
    const prox = activos
      .filter((r) => estadoCobro(r) === 'esperando')
      .map((r) => ({ r, p: biografiaRecurrente(r).proximo }))
      .filter((x) => x.p)
      .sort((a, b) => a.p.dias - b.p.dias)[0]
    if (prox) return { tono: 'ok', texto: `Al día · próximo: ${prox.r.nombre}, ${prox.p.texto}` }
    return { tono: 'ok', texto: 'Todo al día este mes' }
  }, [items])

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
          onConfirmar={registrar}
          onGuardarDia={guardarDia}
          onEditar={(rec) => { setDetalle(null); setForm({ rec }) }}
          onPausar={pausarOReactivar}
          onBorrar={borrar}
          onDesmarcar={desmarcarRec}
        />
      )}

      {reactivar && (
        <ReactivarSheet
          rec={reactivar}
          onCancelar={() => setReactivar(null)}
          onGuardar={async (rec, campos) => {
            setReactivar(null)
            await actualizar(rec.id, campos)
            toast(`${rec.nombre} reactivado: se cobra el día ${campos.diaMes}`)
          }}
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
