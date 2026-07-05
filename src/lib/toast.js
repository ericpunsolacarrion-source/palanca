// Toast minimalista sin dependencias: cualquier módulo lanza toast('...')
// y el componente <Toaster/> (montado una vez en App) lo muestra.
export function toast(mensaje) {
  window.dispatchEvent(new CustomEvent('palanca-toast', { detail: mensaje }))
}
