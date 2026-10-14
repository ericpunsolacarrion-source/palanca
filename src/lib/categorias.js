// Categorías de partida al completar el onboarding (el usuario puede
// añadir más después, ej. "Dividendos" o "Alquiler" como ingreso).
export const CATEGORIAS_INICIALES = {
  ingreso: ['Nomina'],
  // 'Ahorro' ya no viene de serie: apartar dinero no es un gasto (ver
  // CATEGORIA_TRASPASO). Quien la tenga de antes la conserva.
  gasto: ['Vivienda', 'Comida', 'Ocio', 'Transporte', 'Inversion'],
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

// Nombre reservado para TRASPASOS a tu propio ahorro (p. ej. pasar dinero a la
// cuenta de ahorro). El dinero sigue siendo tuyo: no es consumo, no penaliza el
// ratio de ahorro y NO cambia el patrimonio (contrato MOTOR.md E4, traspaso
// neutro). Solución provisional por nombre hasta la Fase 2 (nodos/cuentas).
export const CATEGORIA_TRASPASO = 'Ahorro'

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

// Solo los de tipo gasto: un INGRESO llamado "Ahorro" (p. ej. intereses) sigue
// siendo un ingreso normal.
export function esTraspaso(movimiento) {
  return movimiento.tipo === 'gasto' && movimiento.categoria?.nombre === CATEGORIA_TRASPASO
}

// Color ESTABLE para una categoría (paleta --cat-1..6 de index.css), para un
// punto de reconocimiento visual en los chips. Mismo nombre → siempre el mismo
// color. Es decorativo (no semántico): solo ayuda a distinguir de un vistazo.
export function colorDeCategoria(nombre) {
  const s = String(nombre || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 6
  return `var(--cat-${h + 1})`
}
