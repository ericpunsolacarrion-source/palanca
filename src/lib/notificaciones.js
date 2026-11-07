// Estado REAL de los avisos de Palanca en este dispositivo (sin simular nada).
//  - Dentro de Palanca: siempre (tarjeta «Avisos» de Inicio).
//  - Notificaciones del navegador: solo si el navegador las admite y el
//    usuario da permiso. Hoy llegan cuando Palanca está ABIERTA (el aviso lo
//    lanza la propia app); con la app cerrada haría falta web push con
//    servidor (pendiente: docs/PENDIENTES.md).
//  - El usuario puede silenciarlas en Palanca sin tocar el permiso del navegador.
// Lógica pura y testeable: el componente solo pinta este estado.

export const claveSilencio = (usuarioId) => `palanca_avisos_silenciados_${usuarioId}`

/** Permiso actual: 'granted' | 'denied' | 'default' | 'unsupported'. */
export function permisoActual(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win || !('Notification' in win)) return 'unsupported'
  return win.Notification.permission
}

/** ¿Es un iPhone/iPad fuera de la app instalada? (allí no hay notificaciones web). */
export function iosSinInstalar(nav = typeof navigator !== 'undefined' ? navigator : undefined, win = typeof window !== 'undefined' ? window : undefined) {
  if (!nav) return false
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  const instalada = win?.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true
  return ios && !instalada
}

/**
 * Estado visible del canal «notificaciones de este dispositivo».
 * @returns { clave, etiqueta, tono: 'bien'|'aviso'|'info'|'neutro', explicacion, accion }
 *   accion: 'activar' | 'silenciar' | 'reanudar' | null
 */
export function estadoNotificaciones(permiso, silenciado = false, { ios = false } = {}) {
  if (permiso === 'unsupported') {
    return ios
      ? { clave: 'ios', etiqueta: 'Instala Palanca primero', tono: 'info', explicacion: 'En iPhone y iPad solo se pueden recibir notificaciones con Palanca instalada en la pantalla de inicio (Compartir → Añadir a pantalla de inicio).', accion: null }
      : { clave: 'no-disponible', etiqueta: 'No disponibles', tono: 'neutro', explicacion: 'Este navegador no permite notificaciones. Seguirás viendo tus avisos dentro de Palanca.', accion: null }
  }
  if (permiso === 'denied') {
    return { clave: 'bloqueadas', etiqueta: 'Bloqueadas', tono: 'aviso', explicacion: 'Las bloqueaste en el navegador. Para recibirlas, permite las notificaciones de este sitio en los ajustes del navegador y vuelve a abrir Palanca.', accion: null }
  }
  if (permiso === 'granted') {
    return silenciado
      ? { clave: 'silenciadas', etiqueta: 'Silenciadas', tono: 'neutro', explicacion: 'Tienes el permiso dado, pero las has pausado en Palanca.', accion: 'reanudar' }
      : { clave: 'activas', etiqueta: 'Activadas', tono: 'bien', explicacion: 'Te avisaremos en este dispositivo cuando abras Palanca y haya algo que mirar.', accion: 'silenciar' }
  }
  return { clave: 'sin-activar', etiqueta: 'Sin activar', tono: 'info', explicacion: 'El navegador te pedirá permiso. Puedes cambiarlo cuando quieras.', accion: 'activar' }
}

/** ¿Se debe lanzar una notificación del sistema? Solo con permiso y sin silencio. */
export const puedeNotificar = (permiso, silenciado) => permiso === 'granted' && !silenciado

export function leerSilencio(usuarioId) {
  try {
    return localStorage.getItem(claveSilencio(usuarioId)) === '1'
  } catch {
    return false
  }
}
export function guardarSilencio(usuarioId, valor) {
  try {
    if (valor) localStorage.setItem(claveSilencio(usuarioId), '1')
    else localStorage.removeItem(claveSilencio(usuarioId))
  } catch {
    /* sin almacenamiento: dura lo que la sesión */
  }
}
