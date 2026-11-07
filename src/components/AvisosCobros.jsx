import { useEffect, useMemo, useState } from 'react'
import { avisosNotificables, calcularAvisos } from '../lib/avisos'
import { EVENTO_DESCARTES, leerDescartadas } from '../lib/suscripciones'
import Icono from './Icono'
import Avatar from './v5/Avatar'
import AjustesAvisos from './v5/AjustesAvisos'
import { esV5 } from '../lib/diseno'
import { formatearEuros } from '../lib/categorias'
import { claveMesActual } from '../lib/movimientosUtils'
import { guardarSilencio, iosSinInstalar, leerSilencio, permisoActual, puedeNotificar } from '../lib/notificaciones'

// Tarjeta del dashboard: lo que está a punto de salir de tu cuenta (cobros de
// los próximos días, renovaciones y subidas de precio). Además, si el usuario
// lo permite, lanza una NOTIFICACIÓN del sistema al abrir la app (una vez por
// aviso). Es local: no hay servidor de push todavía, así que solo avisa cuando
// la app se abre (ver docs/ESTADO.md, siguiente paso: web push real).
const claveVistos = (usuarioId) => `palanca_avisos_notificados_${usuarioId}`
const claveCerrados = (usuarioId) => `palanca_avisos_cerrados_${usuarioId}`

function leerSet(clave) {
  try {
    const arr = JSON.parse(localStorage.getItem(clave) || '[]')
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}
function guardarSet(clave, set) {
  try {
    // Solo los últimos 200: los ids llevan mes/fecha, los viejos ya no vuelven.
    localStorage.setItem(clave, JSON.stringify([...set].slice(-200)))
  } catch {
    // sin persistencia: no pasa nada
  }
}


async function notificar(titulo, cuerpo, tag) {
  const opciones = { body: cuerpo, tag, icon: '/pwa-192.png', badge: '/pwa-192.png' }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return await reg.showNotification(titulo, opciones)
  } catch {
    // sin service worker: se usa la API directa
  }
  try {
    new Notification(titulo, opciones)
  } catch {
    // algunos navegadores móviles solo permiten notificar vía service worker
  }
}

const ICONO = { cobro: 'fijos', renovacion: 'calendario', subida: 'sube', ingreso: 'baja', negociar: 'presupuesto' }

// Estado del aviso, para distinguir de un vistazo lo pendiente de lo próximo.
function estadoAviso(a) {
  if (a.tipo === 'subida') return { t: 'Subida', c: 'aviso' }
  if (a.tipo === 'negociar') return { t: 'Negociar', c: 'info' }
  if (a.porConfirmar) return { t: a.dias < 0 ? 'Sin confirmar' : 'Por confirmar', c: 'aviso' }
  if (a.dias === 1) return { t: 'Mañana', c: 'info' }
  if (a.dias > 1) return { t: `En ${a.dias} días`, c: 'neutro' }
  return null
}

export default function AvisosCobros({ cargando, usuarioId, recurrentes, movimientos, onVerSuscripciones, onConfirmar, avisosRenovacion = null, recordatoriosEmail = null, onAbrirCuenta }) {
  const v5 = esV5()
  const [cerrados, setCerrados] = useState(() => leerSet(claveCerrados(usuarioId)))
  const [permiso, setPermiso] = useState(() => permisoActual())
  const [silenciado, setSilenciado] = useState(() => leerSilencio(usuarioId))
  const [ajustes, setAjustes] = useState(false)
  const [pidiendo, setPidiendo] = useState(false)
  // El permiso puede cambiar fuera (ajustes del navegador): se relee al volver.
  useEffect(() => {
    const releer = () => setPermiso(permisoActual())
    window.addEventListener('focus', releer)
    document.addEventListener('visibilitychange', releer)
    return () => {
      window.removeEventListener('focus', releer)
      document.removeEventListener('visibilitychange', releer)
    }
  }, [])

  // Comercios descartados en Fijos ("No es una suscripción"): sin avisos.
  const [descartadas, setDescartadas] = useState(() => leerDescartadas(usuarioId))
  useEffect(() => {
    const refrescar = () => setDescartadas(leerDescartadas(usuarioId))
    window.addEventListener(EVENTO_DESCARTES, refrescar)
    return () => window.removeEventListener(EVENTO_DESCARTES, refrescar)
  }, [usuarioId])

  const avisos = useMemo(
    () => calcularAvisos(recurrentes, movimientos, new Date(), { descartadas, avisosRenovacion }).filter((a) => !cerrados.has(a.id)),
    [recurrentes, movimientos, cerrados, descartadas, avisosRenovacion],
  )

  // Notificación del sistema: una sola vez por aviso.
  useEffect(() => {
    if (!puedeNotificar(permiso, silenciado)) return
    const vistos = leerSet(claveVistos(usuarioId))
    const nuevos = avisosNotificables(avisos).filter((a) => !vistos.has(a.id))
    if (nuevos.length === 0) return
    if (nuevos.length === 1) notificar(nuevos[0].titulo, nuevos[0].detalle, nuevos[0].id)
    else notificar(`${nuevos.length} avisos de tus suscripciones`, nuevos.map((a) => a.titulo).join(' · '), 'palanca-avisos')
    nuevos.forEach((a) => vistos.add(a.id))
    guardarSet(claveVistos(usuarioId), vistos)
  }, [avisos, permiso, silenciado, usuarioId])

  // Solo se pide permiso aquí, cuando el usuario lo confirma (nunca al entrar).
  async function activarAvisos() {
    if (permisoActual() === 'unsupported') return
    setPidiendo(true)
    let resultado = 'default'
    try {
      resultado = await Notification.requestPermission()
    } catch {
      resultado = permisoActual()
    }
    setPidiendo(false)
    setPermiso(resultado)
    if (resultado === 'granted') {
      guardarSilencio(usuarioId, false)
      setSilenciado(false)
      notificar('Avisos de Palanca activados', 'Así te avisaremos de cobros, renovaciones y subidas de precio.', 'palanca-prueba')
    }
  }
  function silenciar(valor) {
    guardarSilencio(usuarioId, valor)
    setSilenciado(valor)
  }
  const ajustesAvisos = ajustes && (
    <AjustesAvisos
      permiso={permiso}
      silenciado={silenciado}
      ios={iosSinInstalar()}
      pidiendo={pidiendo}
      onActivar={activarAvisos}
      onSilenciar={silenciar}
      recordatoriosEmail={recordatoriosEmail}
      onAbrirCuenta={onAbrirCuenta ? () => { setAjustes(false); onAbrirCuenta() } : undefined}
      onCerrar={() => setAjustes(false)}
    />
  )
  // Fijos de gasto ya cobrados este mes (lo «realizado»).
  const mesActual = claveMesActual() // hora local (no UTC: el día 1 a las 00:30 ya es el mes nuevo)
  const cobrados = recurrentes.filter((r) => r.tipo === 'gasto' && r.activo !== false && r.aplicadoEn === mesActual)
  const totalCobrado = cobrados.reduce((s, r) => s + Math.round(Number(r.importe) * 100), 0) / 100

  function cerrar(id) {
    const nuevo = new Set(cerrados).add(id)
    setCerrados(nuevo)
    guardarSet(claveCerrados(usuarioId), nuevo)
  }

  if (cargando) return null

  // Sin compromisos aún: invitación (el gancho de entrada al producto).
  if (recurrentes.length === 0) {
    return (
      <button type="button" className="av-invitacion fade-in-up" onClick={onVerSuscripciones}>
        <span className="av-invitacion-icono" aria-hidden="true"><Icono nombre="fijos" tam={18} /></span>
        <span className="av-invitacion-texto">
          <strong>¿Cuánto pagas al año en suscripciones?</strong>
          <span>Importa tu extracto y lo detectamos por ti en un minuto.</span>
        </span>
        <span className="av-flecha" aria-hidden="true"><Icono nombre="chevron" tam={16} /></span>
      </button>
    )
  }

  if (avisos.length === 0) return null

  return (
    <section className="av fade-in-up" aria-label="Avisos de cobros">
      <header className="av-cab">
        <span className="av-titulo">Avisos</span>
        <button type="button" className="link" onClick={onVerSuscripciones}>
          Ver fijos
        </button>
      </header>
      <ul className="av-lista">
        {avisos.slice(0, 3).map((a) => (
          <li key={a.id} className={`av-item ${a.tipo} ${a.urgente ? 'urgente' : ''}`}>
            {v5 ? (
              <Avatar
                nombre={a.marca}
                tam={36}
                siNoHayMarca={
                  <span className="v5-avatar neutro" style={{ width: 36, height: 36, borderRadius: 10 }} aria-hidden="true">
                    <Icono nombre={ICONO[a.tipo]} tam={17} />
                  </span>
                }
              />
            ) : (
              <span className="av-icono" aria-hidden="true"><Icono nombre={ICONO[a.tipo]} tam={16} /></span>
            )}
            <span className="av-texto">
              <span className="av-item-titulo">{a.titulo}</span>
              <span className="av-item-detalle">
                {v5 && estadoAviso(a) && <span className={`v5-insignia v5-mini ${estadoAviso(a).c}`}>{estadoAviso(a).t}</span>}
                {a.detalle}
              </span>
            </span>
            {a.tipo === 'negociar' ? (
              <button type="button" className="av-confirmar av-secundario" onClick={onVerSuscripciones}>
                Ver cómo
              </button>
            ) : a.porConfirmar && onConfirmar ? (
              <button type="button" className="av-confirmar" onClick={() => onConfirmar(a.recId)}>
                Confirmar
              </button>
            ) : (
              <button type="button" className="av-cerrar" aria-label="Descartar aviso" onClick={() => cerrar(a.id)}>
                <Icono nombre="cerrar" tam={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {avisos.length > 3 && (
        <p className="av-mas">y {avisos.length - 3 === 1 ? 'otro aviso' : `${avisos.length - 3} avisos más`}</p>
      )}
      {v5 && cobrados.length > 0 && (
        <p className="av-realizados">
          <Icono nombre="check" tam={14} /> Este mes ya se han cobrado {cobrados.length} {cobrados.length === 1 ? 'fijo' : 'fijos'} · <span className="num">{formatearEuros(totalCobrado)}</span>
        </p>
      )}
      {v5 ? (
        <button type="button" className="av-activar" onClick={() => setAjustes(true)}>
          {permiso === 'granted' && !silenciado ? 'Avisos en este dispositivo: activados · Ajustes' : permiso === 'granted' ? 'Avisos pausados en este dispositivo · Ajustes' : 'Recibir avisos'}
        </button>
      ) : (
        permiso === 'default' && (
          <button type="button" className="av-activar" onClick={activarAvisos}>
            Activar avisos en este móvil
          </button>
        )
      )}
      {ajustesAvisos}
    </section>
  )
}
