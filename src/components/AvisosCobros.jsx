import { useEffect, useMemo, useState } from 'react'
import { avisosNotificables, calcularAvisos } from '../lib/avisos'
import { EVENTO_DESCARTES, leerDescartadas } from '../lib/suscripciones'
import Icono from './Icono'

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

const soportaNotificaciones = () => typeof window !== 'undefined' && 'Notification' in window

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

export default function AvisosCobros({ cargando, usuarioId, recurrentes, movimientos, onVerSuscripciones, onConfirmar }) {
  const [cerrados, setCerrados] = useState(() => leerSet(claveCerrados(usuarioId)))
  const [permiso, setPermiso] = useState(() => (soportaNotificaciones() ? Notification.permission : 'unsupported'))

  // Comercios descartados en Fijos ("No es una suscripción"): sin avisos.
  const [descartadas, setDescartadas] = useState(() => leerDescartadas(usuarioId))
  useEffect(() => {
    const refrescar = () => setDescartadas(leerDescartadas(usuarioId))
    window.addEventListener(EVENTO_DESCARTES, refrescar)
    return () => window.removeEventListener(EVENTO_DESCARTES, refrescar)
  }, [usuarioId])

  const avisos = useMemo(
    () => calcularAvisos(recurrentes, movimientos, new Date(), { descartadas }).filter((a) => !cerrados.has(a.id)),
    [recurrentes, movimientos, cerrados, descartadas],
  )

  // Notificación del sistema: una sola vez por aviso.
  useEffect(() => {
    if (permiso !== 'granted') return
    const vistos = leerSet(claveVistos(usuarioId))
    const nuevos = avisosNotificables(avisos).filter((a) => !vistos.has(a.id))
    if (nuevos.length === 0) return
    if (nuevos.length === 1) notificar(nuevos[0].titulo, nuevos[0].detalle, nuevos[0].id)
    else notificar(`${nuevos.length} avisos de tus suscripciones`, nuevos.map((a) => a.titulo).join(' · '), 'palanca-avisos')
    nuevos.forEach((a) => vistos.add(a.id))
    guardarSet(claveVistos(usuarioId), vistos)
  }, [avisos, permiso, usuarioId])

  async function activarAvisos() {
    if (!soportaNotificaciones()) return
    setPermiso(await Notification.requestPermission())
  }

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
            <span className="av-icono" aria-hidden="true"><Icono nombre={ICONO[a.tipo]} tam={16} /></span>
            <span className="av-texto">
              <span className="av-item-titulo">{a.titulo}</span>
              <span className="av-item-detalle">{a.detalle}</span>
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
      {permiso === 'default' && (
        <button type="button" className="av-activar" onClick={activarAvisos}>
          Activar avisos en este móvil
        </button>
      )}
    </section>
  )
}
