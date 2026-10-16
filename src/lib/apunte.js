// APUNTAR UN MOVIMIENTO: "45,90 € en Mercadona". Lógica pura de la pantalla
// Movimientos → Nuevo: qué sugerir mientras escribes el "¿dónde?" y qué
// categoría poner sola. Usa la misma identidad de comercios que el importador
// (nombreComercio) y el mismo categorizador (memoria → historial → reglas).

import { CATEGORIA_AJUSTE, CATEGORIA_INVERSION, esAjuste, esInversion } from './categorias'
import { formaEtiqueta, mismaEtiqueta, nombreComercio } from './comercios'
import { crearCategorizador } from './categorizar'

const sinAcentos = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

// Movimientos del mismo tipo que lo que se apunta (como en sugerencias.js).
export function delModo(movimientos, modo) {
  return movimientos.filter((m) => {
    if (modo === 'inversion') return m.tipo === 'gasto' && esInversion(m)
    if (esAjuste(m)) return false // el saldo inicial no se "repite" ni se sugiere
    if (modo === 'ingreso') return m.tipo === 'ingreso' && !esInversion(m)
    return m.tipo === 'gasto' && !esInversion(m)
  })
}

/**
 * Sitios/conceptos donde ya has apuntado algo de este tipo, para el
 * autocompletado del "¿dónde?". Agrupa por comercio REAL (lo importado como
 * "COMPRA TARJ. MERCADONA VALENCIA" y lo apuntado como "Mercadona" son el mismo).
 * → [{ nombre, categoriaId, categoriaNombre, importe (el último), veces, ultima }]
 */
export function lugaresConocidos(movimientos, modo) {
  const grupos = new Map()
  for (const m of delModo(movimientos, modo)) {
    const nombre = modo === 'inversion' ? m.fuente?.nombre || nombreComercio(m) : nombreComercio(m)
    if (!nombre) continue
    const k = formaEtiqueta(nombre)
    const g = grupos.get(k) ?? { nombre, veces: 0, ultima: '', importe: null, cats: new Map() }
    g.veces += 1
    if (m.fecha >= g.ultima) {
      g.ultima = m.fecha
      g.importe = Number(m.importe)
    }
    const catId = m.categoria_id ?? m.categoria?.id
    if (catId) {
      const c = g.cats.get(catId) ?? { id: catId, nombre: m.categoria?.nombre ?? null, n: 0 }
      c.n += 1
      g.cats.set(catId, c)
    }
    grupos.set(k, g)
  }
  return [...grupos.values()].map((g) => {
    const cat = [...g.cats.values()].sort((a, b) => b.n - a.n)[0]
    return { nombre: g.nombre, categoriaId: cat?.id ?? null, categoriaNombre: cat?.nombre ?? null, importe: g.importe, veces: g.veces, ultima: g.ultima }
  })
}

/**
 * Sugerencias para lo que lleva escrito: primero lo que EMPIEZA igual, luego lo
 * que lo contiene en cualquier palabra; a igualdad, lo más usado y reciente.
 * Sin texto: los más habituales.
 */
export function sugerirLugares(lugares, texto, max = 5) {
  const t = sinAcentos(texto).trim()
  const orden = (a, b) => b.veces - a.veces || (a.ultima < b.ultima ? 1 : -1)
  if (!t) return [...lugares].sort(orden).slice(0, max)
  const puntuados = []
  for (const l of lugares) {
    const n = sinAcentos(l.nombre)
    if (n === t) continue // ya está escrito tal cual: no hace falta sugerirlo
    const p = n.startsWith(t) ? 2 : n.split(/[^a-z0-9ñ]+/).some((w) => w.startsWith(t)) ? 1 : 0
    if (p) puntuados.push({ l, p })
  }
  return puntuados.sort((a, b) => b.p - a.p || orden(a.l, b.l)).slice(0, max).map((x) => x.l)
}

/**
 * La categoría que toca para un "¿dónde?" escrito (o null si no se sabe):
 * la que usas siempre ahí → lo que ha aprendido el motor (memoria, historial,
 * reglas: "Repsol" → Transporte) si es una de TUS categorías.
 * → { id, nombre, origen: 'tuya' | 'motor' } o null
 */
export function categoriaParaLugar(texto, { modo, movimientos = [], categorias = [], lugares = null }) {
  const limpio = String(texto ?? '').trim()
  if (!limpio || modo === 'inversion') return null
  const conocidos = lugares ?? lugaresConocidos(movimientos, modo)
  const mismo = conocidos.find((l) => mismaEtiqueta(l.nombre, limpio))
  if (mismo?.categoriaId && categorias.some((c) => c.id === mismo.categoriaId)) {
    return { id: mismo.categoriaId, nombre: mismo.categoriaNombre, origen: 'tuya' }
  }
  const tipo = modo === 'ingreso' ? 'ingreso' : 'gasto'
  const r = crearCategorizador(movimientos)({ nota: limpio, tipo })
  if (!r || r.origen === 'defecto') return null
  const cat = categorias.find((c) => mismaEtiqueta(c.nombre, r.categoria) && c.nombre !== CATEGORIA_INVERSION && c.nombre !== CATEGORIA_AJUSTE)
  return cat ? { id: cat.id, nombre: cat.nombre, origen: 'motor' } : null
}

// Importes que sueles pagar en ese sitio (los más repetidos primero).
export function importesDelLugar(movimientos, modo, nombre, max = 3) {
  if (!nombre) return []
  const cuenta = new Map()
  for (const m of delModo(movimientos, modo)) {
    if (!mismaEtiqueta(modo === 'inversion' ? m.fuente?.nombre || nombreComercio(m) : nombreComercio(m), nombre)) continue
    const imp = Number(m.importe)
    if (imp > 0) cuenta.set(imp, (cuenta.get(imp) ?? 0) + 1)
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).slice(0, max).map(([i]) => i)
}

// "Se repite": periodicidades que se ofrecen al apuntar (las mismas que Fijos).
export const REPETICIONES = [
  { meses: 1, texto: 'Cada mes' },
  { meses: 2, texto: 'Cada 2 meses' },
  { meses: 3, texto: 'Cada 3 meses' },
  { meses: 6, texto: 'Cada 6 meses' },
  { meses: 12, texto: 'Cada año' },
]

// Datos del fijo que se crea al marcar "Se repite" (este mes ya queda pagado:
// el movimiento que se apunta ahora es el primer cobro, sin duplicarlo).
export function fijoDesdeApunte({ tipo, nombre, importe, categoriaId, categoriaNombre, fuenteId, fecha, periodoMeses }) {
  return {
    tipo,
    nombre,
    importe,
    categoriaId,
    categoriaNombre,
    fuenteId,
    diaMes: Number(fecha.slice(8, 10)),
    periodoMeses,
    mesInicio: Number(fecha.slice(5, 7)),
    mesesYaPagados: [fecha.slice(0, 7)],
  }
}
