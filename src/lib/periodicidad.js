// Periodicidad de los compromisos de Base (suscripciones, recibos, nómina…).
// Lógica pura y testeable: sin React ni BD.
//
// Modelo mínimo y robusto: `periodoMeses` ∈ {1, 2, 3, 6, 12} y, para los no
// mensuales, `mesInicio` (1–12) = un mes del año en que se cobra. Con eso se
// sabe en qué meses toca: (mes − mesInicio) múltiplo de periodoMeses. El día lo
// da `diaMes` (acotado al último día del mes). Las confirmaciones siguen siendo
// por mes ('YYYY-MM'): se confirma en el mes en que toca.

import { aCentimos } from './importe'

export const PERIODOS = [
  { meses: 1, id: 'mensual', etiqueta: 'Mensual', corta: '/mes' },
  { meses: 2, id: 'bimestral', etiqueta: 'Bimestral', corta: '/2 meses' },
  { meses: 3, id: 'trimestral', etiqueta: 'Trimestral', corta: '/trimestre' },
  { meses: 6, id: 'semestral', etiqueta: 'Semestral', corta: '/semestre' },
  { meses: 12, id: 'anual', etiqueta: 'Anual', corta: '/año' },
]

export function periodoDe(rec) {
  const meses = Number(rec?.periodoMeses) || 1
  return PERIODOS.find((p) => p.meses === meses) ?? PERIODOS[0]
}

const MESES_NOMBRE = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const pad = (n) => String(n).padStart(2, '0')
const claveDe = (y, m) => `${y}-${pad(m)}` // m: 1..12
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// ¿Toca cobrar este compromiso en el mes `clave` ('YYYY-MM')?
export function tocaEnMes(rec, clave) {
  const p = periodoDe(rec).meses
  if (p === 1) return true
  const mes = Number(clave.slice(5, 7))
  const inicio = Number(rec.mesInicio) || 1
  return (((mes - inicio) % p) + p) % p === 0
}

// Fecha del cobro dentro de un mes: el día habitual acotado al último día del
// mes, o el día 1 si no tiene día fijado.
function fechaEnMes(rec, y, m) {
  const ultimo = new Date(y, m, 0).getDate()
  const dia = Math.min(Number(rec.diaMes) || 1, ultimo)
  return new Date(y, m - 1, dia)
}

/**
 * Próximo cobro de un compromiso a partir de `hoy`.
 * Si toca este mes y aún no está confirmado, el próximo es el de este mes
 * (aunque el día ya haya pasado: "toca ya"). Si ya está confirmado o no toca,
 * busca el siguiente mes en que toca.
 * @returns { fecha: 'YYYY-MM-DD', mes: 'YYYY-MM', dias, texto } | null
 */
export function proximoCobro(rec, hoy = new Date()) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const confirmados = new Set(rec.mesesAplicados ?? (rec.aplicadoEn ? [rec.aplicadoEn] : []))
  for (let i = 0; i <= 24; i += 1) {
    const y = base.getFullYear() + Math.floor((base.getMonth() + i) / 12)
    const m = ((base.getMonth() + i) % 12) + 1
    const clave = claveDe(y, m)
    if (!tocaEnMes(rec, clave) || confirmados.has(clave)) continue
    const fecha = fechaEnMes(rec, y, m)
    const dias = Math.round((fecha - base) / 86400000)
    return { fecha: isoLocal(fecha), mes: clave, dias, texto: textoDias(dias, fecha, base) }
  }
  return null
}

function textoDias(dias, fecha, base) {
  if (dias < 0) return dias === -1 ? 'ayer' : `hace ${-dias} días`
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias <= 45) return `en ${dias} días`
  const mes = MESES_NOMBRE[fecha.getMonth()]
  return fecha.getFullYear() === base.getFullYear() ? `${fecha.getDate()} ${mes}` : `${mes} ${fecha.getFullYear()}`
}

// Coste prorrateado al MES (para sumar suscripciones de distinta periodicidad
// en una sola cifra mensual) y al AÑO. En céntimos internamente; euros fuera.
export function costeMensual(rec) {
  return Math.round((aCentimos(rec.importe) ?? 0) / periodoDe(rec).meses) / 100
}

export function costeAnual(rec) {
  return ((aCentimos(rec.importe) ?? 0) * (12 / periodoDe(rec).meses)) / 100
}

// Cobros previstos entre hoy y hoy+`dias` de una lista de compromisos activos.
// Incluye los atrasados de este mes aún sin confirmar (dias < 0). Ordenados por
// fecha. Fuente única del calendario y de los avisos.
export function cobrosProximos(recs, dias = 30, hoy = new Date()) {
  const lista = []
  for (const rec of recs) {
    if (!rec.activo) continue
    const p = proximoCobro(rec, hoy)
    if (p && p.dias <= dias) lista.push({ rec, ...p, importe: Number(rec.importe) })
  }
  return lista.sort((a, b) => a.dias - b.dias || b.importe - a.importe)
}

// Texto corto del calendario de cobro: "día 12", "trimestral · feb, may, ago, nov".
export function textoCalendario(rec) {
  const p = periodoDe(rec)
  const dia = rec.diaMes ? `día ${rec.diaMes}` : null
  if (p.meses === 1) return dia ?? 'mensual'
  const inicio = Number(rec.mesInicio) || 1
  const meses = []
  for (let k = 0; k < 12 / p.meses; k += 1) meses.push(((inicio - 1 + k * p.meses) % 12) + 1)
  meses.sort((a, b) => a - b)
  const nombres = meses.map((m) => MESES_NOMBRE[m - 1]).join(', ')
  return `${p.etiqueta.toLowerCase()} · ${nombres}${dia ? ` · ${dia}` : ''}`
}
