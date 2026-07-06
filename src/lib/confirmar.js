// Confirmación con modal propio (sustituye a window.confirm).
// Uso: const ok = await confirmar('¿Eliminar este movimiento?')
let resolverActual = null

export function confirmar(mensaje) {
  return new Promise((resolve) => {
    resolverActual?.(false) // si había otra abierta, se cancela
    resolverActual = resolve
    window.dispatchEvent(new CustomEvent('palanca-confirmar', { detail: mensaje }))
  })
}

export function resolverConfirmacion(valor) {
  resolverActual?.(valor)
  resolverActual = null
}
