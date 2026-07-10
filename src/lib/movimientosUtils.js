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

// Porcentaje en formato español: 92,3%
export function formatearPorcentaje(valor, decimales = 1) {
  const seguro = Number.isFinite(valor) ? valor : 0
  return `${seguro.toLocaleString('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}%`
}

// Formato compacto para etiquetas de gráfico: 1234 -> "1,2k"
export function formatearCompacto(valor) {
  if (valor >= 1000) {
    const k = valor / 1000
    return `${k.toLocaleString('es-ES', { maximumFractionDigits: 1 })}k`
  }
  return String(Math.round(valor))
}

// Ahorro mensual medio de los meses con ingresos (suaviza el ruido de un solo
// mes). Base de la proyección de futuro del dashboard. Devuelve también cuántos
// meses con actividad hay, para decidir si desbloquear la proyección.
export function resumenMensualMedio(movimientos) {
  const porMes = new Map()
  for (const m of movimientos) {
    const clave = claveMes(m.fecha)
    if (!porMes.has(clave)) porMes.set(clave, [])
    porMes.get(clave).push(m)
  }

  let sumaAhorro = 0
  let sumaInvertido = 0
  let mesesConIngresos = 0
  for (const movs of porMes.values()) {
    const t = totalesDe(movs)
    if (t.ingresos > 0) {
      sumaAhorro += t.ahorro
      sumaInvertido += t.invertido
      mesesConIngresos += 1
    }
  }

  return {
    mesesConDatos: porMes.size,
    mesesConIngresos,
    ahorroMedio: mesesConIngresos > 0 ? sumaAhorro / mesesConIngresos : 0,
    invertidoMedio: mesesConIngresos > 0 ? sumaInvertido / mesesConIngresos : 0,
  }
}

// Valor futuro de un capital inicial + aportaciones mensuales con interés
// compuesto. rentabilidadAnual en % (0 = dinero parado). Fuente única para
// el simulador y para la proyección del dashboard.
export function proyectarInteresCompuesto({ inicial = 0, mensual = 0, anios, rentabilidadAnual = 0 }) {
  const meses = Math.round(anios * 12)
  const r = rentabilidadAnual / 100 / 12
  const aportado = inicial + mensual * meses
  if (r === 0) {
    return { valorFinal: aportado, aportado, intereses: 0 }
  }
  const factor = (Math.pow(1 + r, meses) - 1) / r
  const valorFinal = inicial * Math.pow(1 + r, meses) + mensual * factor
  return { valorFinal, aportado, intereses: valorFinal - aportado }
}
