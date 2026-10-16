// Abrir Fulcro (el consultor) desde cualquier pantalla, opcionalmente con una
// pregunta ya hecha. Vive aquí (y no en Consultor.jsx) para no cargar el chat
// entero en el arranque: Consultor se descarga bajo demanda.
export const EVENTO_FULCRO = 'palanca-fulcro'

export const EVENTO_FULCRO_CERRAR = 'palanca-fulcro-cerrar'

// Cerrar Fulcro desde fuera (p. ej. la demo, al pasar al siguiente paso).
export function cerrarFulcro() {
  window.dispatchEvent(new CustomEvent(EVENTO_FULCRO_CERRAR))
}

// Ir a una pantalla desde una respuesta de Fulcro ("Ver en Análisis").
export const EVENTO_IR = 'palanca-ir'
export const DESTINOS = {
  analisis: { pestana: 'dashboard', vista: 'analisis', texto: 'Ver en Análisis' },
  fijos: { pestana: 'suscripciones', texto: 'Ir a Fijos' },
  plan: { pestana: 'presupuesto', texto: 'Ir a Plan' },
  simuladores: { pestana: 'presupuesto', clic: 'Simuladores', texto: 'Abrir Simuladores' },
  inversion: { pestana: 'inversiones', texto: 'Ir a Inversión' },
  movimientos: { pestana: 'movimientos', texto: 'Ver movimientos' },
}
export function irA(destino) {
  if (DESTINOS[destino]) window.dispatchEvent(new CustomEvent(EVENTO_IR, { detail: DESTINOS[destino] }))
}

export function preguntarAFulcro(pregunta = null) {
  window.dispatchEvent(new CustomEvent(EVENTO_FULCRO, { detail: pregunta ? { pregunta } : {} }))
}
