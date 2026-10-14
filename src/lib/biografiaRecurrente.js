// Biografía de un compromiso recurrente: su relación con tu dinero en el tiempo.
// Todo derivado de lo que Palanca ya sabe (created_at + meses confirmados). Puro
// y testeable; sin dependencias de React ni de la BD.

import { proximoCobro } from './periodicidad'

// Meses transcurridos desde que el compromiso existe: el más antiguo entre su
// alta (created_at) y su confirmación más vieja.
function mesesDesdeInicio(desdeIso, mesesAplicados, hoy) {
  const tiempos = []
  if (desdeIso) tiempos.push(new Date(desdeIso).getTime())
  if (Array.isArray(mesesAplicados) && mesesAplicados.length) {
    const min = [...mesesAplicados].sort()[0] // 'YYYY-MM'
    const [y, m] = min.split('-').map(Number)
    tiempos.push(new Date(y, m - 1, 1).getTime())
  }
  if (!tiempos.length) return 0
  const inicio = new Date(Math.min(...tiempos))
  return (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth())
}

// Texto humano y breve de antigüedad: "este mes" · "5 meses" · "2 años".
export function textoAntiguedad(meses) {
  if (meses < 1) return 'este mes'
  if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`
  const anios = Math.floor(meses / 12)
  return `${anios} ${anios === 1 ? 'año' : 'años'}`
}

// Biografía completa de un compromiso. `total` es una estimación honesta:
// nº de meses confirmados × importe actual (exacto en los fijos; aproximado si
// el importe varía, pero suficiente para transmitir el peso en el tiempo).
export function biografiaRecurrente(rec, hoy = new Date()) {
  const nPagos = Array.isArray(rec.mesesAplicados) ? rec.mesesAplicados.length : 0
  const meses = mesesDesdeInicio(rec.desde, rec.mesesAplicados, hoy)
  return {
    nPagos,
    meses,
    antiguedad: textoAntiguedad(meses),
    total: rec.totalCentimos != null ? rec.totalCentimos / 100 : nPagos * Number(rec.importe),
    // Consciente de la periodicidad (mensual, trimestral, anual…). Sin día
    // fijado en un mensual no hay fecha concreta que anunciar.
    proximo: rec.diaMes || (rec.periodoMeses ?? 1) > 1 ? proximoCobro(rec, hoy) : null,
  }
}
