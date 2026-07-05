import { esInversion } from './categorias'

// Clave de mes ('2026-07') a partir de la fecha del movimiento.
// SIEMPRE se agrupa por `fecha` (cuando ocurrió), nunca por created_at.
export function claveMes(fechaIso) {
  return fechaIso.slice(0, 7)
}

export function claveMesActual() {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
}

export function filtrarMesActual(movimientos) {
  const clave = claveMesActual()
  return movimientos.filter((m) => claveMes(m.fecha) === clave)
}

// Últimos N meses terminando en el actual: [{clave, etiqueta}]
export function ultimosNMeses(n) {
  const ahora = new Date()
  const meses = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const etiqueta = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d).replace('.', '')
    meses.push({ clave, etiqueta })
  }
  return meses
}

// Regla única de la app (ver CLAUDE.md):
//   gasto   = solo consumo (excluye inversión)
//   ahorro  = ingresos - gastos de consumo (la inversión ES parte del ahorro)
//   invertido = movimientos de gasto con categoría "Inversion"
export function totalesDe(movimientos) {
  let ingresos = 0
  let gastos = 0
  let invertido = 0
  for (const m of movimientos) {
    const importe = Number(m.importe)
    if (m.tipo === 'ingreso') ingresos += importe
    else if (esInversion(m)) invertido += importe
    else gastos += importe
  }
  const ahorro = ingresos - gastos
  const ratioAhorro = ingresos > 0 ? (ahorro / ingresos) * 100 : 0
  return { ingresos, gastos, invertido, ahorro, ratioAhorro }
}

// Agrega por mes los últimos N meses (meses sin datos quedan a cero).
export function agregarPorMes(movimientos, n) {
  const meses = ultimosNMeses(n)
  const mapa = new Map(meses.map((m) => [m.clave, []]))
  for (const mov of movimientos) {
    const clave = claveMes(mov.fecha)
    if (mapa.has(clave)) mapa.get(clave).push(mov)
  }
  return meses.map((m) => ({ ...m, ...totalesDe(mapa.get(m.clave)) }))
}

export function formatearFecha(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-')
  return `${dia}/${mes}/${anio}`
}

// Formato compacto para etiquetas de gráfico: 1234 -> "1,2k"
export function formatearCompacto(valor) {
  if (valor >= 1000) {
    const k = valor / 1000
    return `${k.toLocaleString('es-ES', { maximumFractionDigits: 1 })}k`
  }
  return String(Math.round(valor))
}
