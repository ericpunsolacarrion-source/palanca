import { esInversion } from './categorias'

// Sugerencias para el alta rápida de movimientos, derivadas del histórico del
// usuario. Objetivo: registrar en el mínimo de toques posible.

// Filtra el histórico al tipo del modo actual ('gasto' | 'ingreso' | 'inversion').
function paraModo(movimientos, modo) {
  return movimientos.filter((m) => {
    if (modo === 'inversion') return m.tipo === 'gasto' && esInversion(m)
    if (modo === 'ingreso') return m.tipo === 'ingreso'
    return m.tipo === 'gasto' && !esInversion(m) // gasto de consumo
  })
}

// Categorías más usadas (para ordenar los chips: lo frecuente, primero).
// Devuelve un Map nombre -> veces.
export function frecuenciaCategorias(movimientos, modo) {
  const mapa = new Map()
  for (const m of paraModo(movimientos, modo)) {
    const nombre = m.categoria?.nombre
    if (!nombre) continue
    mapa.set(nombre, (mapa.get(nombre) ?? 0) + 1)
  }
  return mapa
}

// Movimientos recurrentes recientes para repetir en un toque. Agrupa por
// (categoría, fuente, importe) y prioriza los que más se repiten y más
// recientes. Devuelve [{ categoriaId, categoriaNombre, fuenteId, fuenteNombre,
// importe, esFijo, veces }].
export function frecuentesParaRepetir(movimientos, modo, max = 4) {
  const grupos = new Map()
  for (const m of paraModo(movimientos, modo)) {
    const importe = Number(m.importe)
    if (!(importe > 0)) continue
    const clave = `${m.categoria_id ?? m.categoria?.id ?? ''}|${m.fuente_id ?? m.fuente?.id ?? ''}|${importe}`
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        categoriaId: m.categoria_id ?? m.categoria?.id ?? null,
        categoriaNombre: m.categoria?.nombre ?? null,
        fuenteId: m.fuente_id ?? m.fuente?.id ?? null,
        fuenteNombre: m.fuente?.nombre ?? null,
        importe,
        esFijo: Boolean(m.es_fijo),
        veces: 0,
        ultima: m.fecha,
      })
    }
    const g = grupos.get(clave)
    g.veces += 1
    if (m.fecha > g.ultima) g.ultima = m.fecha
  }

  return [...grupos.values()]
    .sort((a, b) => b.veces - a.veces || (a.ultima < b.ultima ? 1 : -1))
    .slice(0, max)
}

// Importes más frecuentes del modo (y categoría si se pasa), para sugerir la
// cifra de un toque. Devuelve números ordenados por frecuencia.
export function importesFrecuentes(movimientos, modo, categoriaId = null, max = 3) {
  const mapa = new Map()
  for (const m of paraModo(movimientos, modo)) {
    if (categoriaId && (m.categoria_id ?? m.categoria?.id) !== categoriaId) continue
    const importe = Number(m.importe)
    if (!(importe > 0)) continue
    mapa.set(importe, (mapa.get(importe) ?? 0) + 1)
  }
  return [...mapa.entries()]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])
    .slice(0, max)
    .map(([importe]) => importe)
}
