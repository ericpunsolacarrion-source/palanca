// Toast minimalista sin dependencias: cualquier módulo lanza toast('...')
// y el componente <Toaster/> (montado una vez en App) lo muestra.
// tipo: 'ok' (por defecto) | 'error'
export function toast(mensaje, tipo = 'ok') {
  window.dispatchEvent(new CustomEvent('palanca-toast', { detail: { mensaje, tipo } }))
}
