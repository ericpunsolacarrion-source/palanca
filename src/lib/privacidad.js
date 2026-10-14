// Modo discreto ("ocultar importes"): para mirar la app con alguien al lado.
// Un único interruptor que leen los formateadores de importes
// (formatearEuros, formatearCompacto): así se oculta TODA la app a la vez, sin
// tocar cada pantalla. Se recuerda en este dispositivo.

const CLAVE = 'palanca_ocultar_importes'
export const MASCARA = '••••'
export const EVENTO_PRIVACIDAD = 'palanca-privacidad'

let oculto = (() => {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
})()

export const importesOcultos = () => oculto

export function fijarImportesOcultos(valor) {
  oculto = Boolean(valor)
  try {
    localStorage.setItem(CLAVE, oculto ? '1' : '0')
  } catch {
    // sin persistencia: dura esta sesión
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_PRIVACIDAD, { detail: oculto }))
  } catch {
    // fuera del navegador (tests)
  }
}
