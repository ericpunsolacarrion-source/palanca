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

/**
 * Filas de «Por categoría» con límites del usuario. Tres valores que NO se
 * mezclan: `limite` (lo que fijó el usuario, o null), `gastado` (este mes, por
 * la regla única de consumo) y `media` (lo que suele gastar en un mes entero).
 * Incluye las categorías con gasto este mes, las que tienen límite y las que
 * suelen tener gasto (media ≥ 5 €), para poder fijarles límite antes de gastar.
 * Los límites se guardan por id de categoría (si se renombra, se conserva) y,
 * si el id no aparece, se casan por nombre.
 * @param limites { [categoriaId]: { categoriaId, nombre, importe } }
 * @returns [{ categoriaId, nombre, gastado, media, limite, queda, pct, estado }]
 *   estado: 'sin-limite' | 'bien' | 'cerca' (≥ 85 %) | 'pasado'
 */
export function filasPorCategoria(historico, clave, limites = {}) {
  const base = categoriasFrenteAMediaTodas(historico, clave)
  const idDe = new Map()
  for (const m of historico) if (m.categoria?.nombre && m.categoria?.id) idDe.set(m.categoria.nombre, m.categoria.id)
  const porNombre = new Map(Object.values(limites).map((l) => [l.nombre, l]))
  const vistas = new Set()
  const filas = base.map((c) => {
    const id = idDe.get(c.nombre) ?? null
    const l = (id && limites[id]) || porNombre.get(c.nombre) || null
    if (l) vistas.add(l.categoriaId)
    return fila(id ?? l?.categoriaId ?? null, c.nombre, c.gastado, c.media, l?.importe ?? null)
  })
  // Límites de categorías sin gasto ni media (siguen visibles y editables).
  for (const l of Object.values(limites)) if (!vistas.has(l.categoriaId)) filas.push(fila(l.categoriaId, l.nombre, 0, null, l.importe))
  return filas
    .filter((f) => f.gastado > 0 || f.limite != null || (f.media ?? 0) >= 5)
    .sort((a, b) => b.gastado - a.gastado || (b.limite ?? 0) - (a.limite ?? 0) || (b.media ?? 0) - (a.media ?? 0))
}

function fila(categoriaId, nombre, gastado, media, limite) {
  const queda = limite == null ? null : Math.round((limite - gastado) * 100) / 100
  const pct = limite > 0 ? (gastado / limite) * 100 : null
  const estado = limite == null ? 'sin-limite' : pct > 100 ? 'pasado' : pct >= 85 ? 'cerca' : 'bien'
  return { categoriaId, nombre, gastado, media, limite, queda, pct, estado }
}

// Como categoriasFrenteAMedia pero conservando las categorías sin gasto este
// mes que sí tienen historia (para poder fijarles un límite).
function categoriasFrenteAMediaTodas(historico, clave, n = 3) {
  const [y, m] = clave.split('-').map(Number)
  const previos = []
  for (let k = 1; k <= 12 && previos.length < n; k += 1) {
    const d = new Date(y, m - 1 - k, 1)
    const c = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    const mapa = gastoPorCategoria(historico.filter((mv) => mv.fecha.slice(0, 7) === c))
    if ([...mapa.values()].some((v) => v > 0)) previos.push(mapa)
  }
  const actual = gastoPorCategoria(historico.filter((mv) => mv.fecha.slice(0, 7) === clave))
  const nombres = new Set([...actual.keys()])
  for (const mp of previos) for (const [k, v] of mp) if (v > 0) nombres.add(k)
  return [...nombres].map((nombre) => ({
    nombre,
    gastado: Math.round((actual.get(nombre) ?? 0) * 100) / 100,
    media: previos.length ? Math.round((previos.reduce((s, mp) => s + (mp.get(nombre) ?? 0), 0) / previos.length) * 100) / 100 : null,
  }))
}
