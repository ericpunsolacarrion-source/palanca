// Categorías de partida al completar el onboarding (el usuario puede
// añadir más después, ej. "Dividendos" o "Alquiler" como ingreso).
export const CATEGORIAS_INICIALES = {
  ingreso: ['Nomina'],
  gasto: ['Vivienda', 'Comida', 'Ocio', 'Transporte', 'Ahorro', 'Inversion'],
}

// Nombre reservado: los movimientos con esta categoría se tratan como
// aportaciones a inversión, no como consumo, así que se excluyen de los
// totales de "gasto" en balance y presupuesto.
export const CATEGORIA_INVERSION = 'Inversion'

export function formatearEuros(valor) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor)
}

export function esInversion(movimiento) {
  return movimiento.categoria?.nombre === CATEGORIA_INVERSION
}
