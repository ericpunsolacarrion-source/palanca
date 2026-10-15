// Abrir Fulcro (el consultor) desde cualquier pantalla, opcionalmente con una
// pregunta ya hecha. Vive aquí (y no en Consultor.jsx) para no cargar el chat
// entero en el arranque: Consultor se descarga bajo demanda.
export const EVENTO_FULCRO = 'palanca-fulcro'

export const EVENTO_FULCRO_CERRAR = 'palanca-fulcro-cerrar'

// Cerrar Fulcro desde fuera (p. ej. la demo, al pasar al siguiente paso).
export function cerrarFulcro() {
  window.dispatchEvent(new CustomEvent(EVENTO_FULCRO_CERRAR))
}

export function preguntarAFulcro(pregunta = null) {
  window.dispatchEvent(new CustomEvent(EVENTO_FULCRO, { detail: pregunta ? { pregunta } : {} }))
}
