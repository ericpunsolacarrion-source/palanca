// Datos de la pantalla Presupuesto (v5). Lógica pura sobre las reglas únicas
// (gastoPorCategoria: consumo neto de devoluciones, sin inversión ni ajustes).
// No inventa presupuestos por categoría: compara cada categoría con LO QUE
// SUELES GASTAR en ella (media de los meses anteriores con gasto).
import { gastoPorCategoria } from './movimientosUtils'

const pad = (n) => String(n).padStart(2, '0')

/**
 * Gasto del mes `clave` ('YYYY-MM') por categoría frente a su media de hasta
 * `n` meses anteriores con algún gasto (busca hasta 12 meses atrás).
 * @returns [{ nombre, gastado, media, pctMedia }] ordenado por lo gastado.
 *   media = null si no hay meses previos con gasto; pctMedia = gastado/media·100.
 */
export function categoriasFrenteAMedia(historico, clave, n = 3) {
  const [y, m] = clave.split('-').map(Number)
  const delMes = historico.filter((mv) => mv.fecha.slice(0, 7) === clave)
  const previos = []
  for (let k = 1; k <= 12 && previos.length < n; k += 1) {
    const d = new Date(y, m - 1 - k, 1)
    const c = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    const mapa = gastoPorCategoria(historico.filter((mv) => mv.fecha.slice(0, 7) === c))
    if ([...mapa.values()].some((v) => v > 0)) previos.push(mapa)
  }
  const actual = gastoPorCategoria(delMes)
  const nombres = new Set([...actual.keys()])
  return [...nombres]
    .map((nombre) => {
      const gastado = Math.round((actual.get(nombre) ?? 0) * 100) / 100
      const media = previos.length ? Math.round((previos.reduce((s, mp) => s + (mp.get(nombre) ?? 0), 0) / previos.length) * 100) / 100 : null
      return { nombre, gastado, media, pctMedia: media > 0 ? (gastado / media) * 100 : null }
    })
    .filter((c) => c.gastado > 0)
    .sort((a, b) => b.gastado - a.gastado)
}
