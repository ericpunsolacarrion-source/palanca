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

// Nombre reservado para AJUSTES de saldo (saldo inicial y reconciliaciones).
// No son ingreso ni gasto de consumo: se excluyen del flujo mensual (tasa de
// ahorro, superávit) pero SÍ afectan a la bolsa de liquidez. El signo lo da el
// tipo del movimiento (ingreso = suma liquidez, gasto = resta liquidez).
export const CATEGORIA_AJUSTE = 'Ajuste'

// Formato español único para importes: punto de miles, coma decimal, € al
// final. Sin decimales cuando el importe es redondo (100.000 €) y con 2
// decimales cuando hay céntimos (1.234,56 €).
export function formatearEuros(valor) {
  const seguro = Number.isFinite(valor) ? valor : 0
  const esEntero = Number.isInteger(seguro)
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: esEntero ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(seguro)
}

export function esInversion(movimiento) {
  return movimiento.categoria?.nombre === CATEGORIA_INVERSION
}

export function esAjuste(movimiento) {
  return movimiento.categoria?.nombre === CATEGORIA_AJUSTE
}
