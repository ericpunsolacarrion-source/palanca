// Datos de la pantalla Patrimonio (v5). Lógica pura sobre las reglas únicas
// del motor (movimientosUtils / categorias): aquí no se inventa valor de
// mercado; lo invertido es lo APORTADO (a coste), como en todo Palanca.
import { esInversion } from './categorias'
import { centimosDe } from './movimientosUtils'

/**
 * Lo aportado (neto de retiradas) en cada plataforma, en euros, de mayor a
 * menor. Las plataformas que quedan a cero o en negativo (sacaste más de lo
 * que Palanca sabe que aportaste) no se listan.
 * @returns [[nombre, euros], …]
 */
export function aportadoPorPlataforma(movimientos) {
  const mapa = new Map()
  for (const a of movimientos) {
    if (!esInversion(a)) continue
    const nombre = a.fuente?.nombre ?? 'Sin especificar'
    mapa.set(nombre, (mapa.get(nombre) ?? 0) + (a.tipo === 'ingreso' ? -1 : 1) * centimosDe(a))
  }
  return [...mapa.entries()]
    .filter(([, c]) => c > 0)
    .map(([n, c]) => [n, c / 100])
    .sort((a, b) => b[1] - a[1])
}

/**
 * Cambio del patrimonio frente a hace `k` meses (cierre de aquel mes) a partir
 * de la serie de evolucionPatrimonio (del más antiguo al actual).
 * @returns { valor, pct } | null si no hay ese mes en la serie o era 0.
 */
export function cambioDesde(serie, k) {
  if (!serie || serie.length <= k) return null
  const ahora = serie[serie.length - 1].valor
  const antes = serie[serie.length - 1 - k].valor
  const valor = Math.round((ahora - antes) * 100) / 100
  return { valor, pct: antes > 0 ? (valor / antes) * 100 : null }
}

/**
 * Quita los meses del principio en que aún no había datos (patrimonio 0 antes
 * del primer movimiento), dejando UN mes a cero como punto de partida. Así el
 * gráfico no pinta una línea plana de meses vacíos. Nunca menos de 2 puntos.
 */
export function recortarInicio(serie, valor = (p) => p.valor) {
  const primero = serie.findIndex((p) => valor(p) !== 0)
  if (primero <= 1) return serie
  const desde = Math.min(primero - 1, serie.length - 2)
  return serie.slice(Math.max(0, desde))
}
