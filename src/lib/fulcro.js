// Abrir Fulcro (el consultor) desde cualquier pantalla, opcionalmente con una
// pregunta ya hecha. Vive aquí (y no en Consultor.jsx) para no cargar el chat
// entero en el arranque: Consultor se descarga bajo demanda.
export const EVENTO_FULCRO = 'palanca-fulcro'

export function preguntarAFulcro(pregunta = null) {
  window.dispatchEvent(new CustomEvent(EVENTO_FULCRO, { detail: pregunta ? { pregunta } : {} }))
}
