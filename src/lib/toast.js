// Toast minimalista sin dependencias: cualquier módulo lanza toast('...')
// y el componente <Toaster/> (montado una vez en App) lo muestra.
// tipo: 'ok' (por defecto) | 'error'
// accion (opcional): { texto, onAccion } → botón de acción (p.ej. "Deshacer").
// La función viaja en el detail del evento (en memoria, no se serializa).
export function toast(mensaje, tipo = 'ok', accion = null) {
  window.dispatchEvent(new CustomEvent('palanca-toast', { detail: { mensaje, tipo, accion } }))
}
