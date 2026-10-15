// Revisión de una importación (extracto o capturas) ANTES de guardar, y el
// resumen de "tu historial" DESPUÉS. Lógica pura y testeable; la pantalla es
// components/ImportarHistorial.jsx.
//
// Idea clave: revisar 300 filas una a una nadie lo hace. Se revisa por
// COMERCIO: "Mercadona · 52 movimientos → Comida". Cambiar uno cambia todos.

import { normalizarComercio } from './suscripciones'
import { esConsumo } from './movimientosUtils'
import { CATEGORIA_INVERSION } from './categorias'

// Movimientos leídos de capturas → forma canónica del importador.
export function filasDeCapturas(movimientos) {
  return movimientos.map((m) => ({
    fecha: m.fecha,
    tipo: m.importe < 0 ? 'gasto' : 'ingreso',
    importe: Math.abs(Number(m.importe)),
    nota: m.concepto || '',
    categoria: '',
    plataforma: '',
    esInversion: false,
  }))
}

// Asigna categoría sugerida a las filas que no traen una (el categorizador
// aprende del historial del usuario). Respeta la categoría del archivo.
export function categorizarFilas(filas, categorizador) {
  return filas.map((f) => {
    if (f.categoria) return { ...f, sugerida: false }
    const c = categorizador({ nota: f.nota, tipo: f.tipo })
    const esInv = c.categoria === CATEGORIA_INVERSION
    return { ...f, categoria: c.categoria, esInversion: f.esInversion || esInv, sugerida: true, negociable: c.negociable }
  })
}

const nombreBonito = (t) =>
  String(t)
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase())

/**
 * Agrupa por comercio (y tipo): [{ clave, nombre, tipo, n, total, categoria,
 * indices }] de más a menos movimientos. `categoria` = la más frecuente del grupo.
 */
export function agruparPorComercio(filas) {
  const grupos = new Map()
  filas.forEach((f, i) => {
    const comercio = normalizarComercio(f.nota) || 'sin concepto'
    const clave = `${f.tipo}|${comercio}`
    const g = grupos.get(clave) ?? { clave, nombre: comercio === 'sin concepto' ? 'Sin concepto' : nombreBonito(comercio), tipo: f.tipo, n: 0, total: 0, indices: [], cats: new Map() }
    g.n += 1
    g.total += f.importe
    g.indices.push(i)
    g.cats.set(f.categoria, (g.cats.get(f.categoria) ?? 0) + 1)
    grupos.set(clave, g)
  })
  return [...grupos.values()]
    .map(({ cats, ...g }) => ({ ...g, total: Math.round(g.total * 100) / 100, categoria: [...cats.entries()].sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => b.n - a.n || b.total - a.total)
}

/**
 * Filas que PARECEN ya apuntadas a mano (mismo día, tipo e importe que un
 * movimiento existente, aunque el concepto se escriba distinto: "Mercadona"
 * frente a "COMPRA TARJ. MERCADONA"). Se proponen excluidas por defecto.
 */
export function indicesParecidos(filas, existentes) {
  const claves = new Map()
  for (const m of existentes) {
    const tipo = m.tipo === 'ingreso' ? 'ingreso' : 'gasto'
    const k = `${m.fecha}|${tipo}|${Number(m.importe).toFixed(2)}`
    claves.set(k, (claves.get(k) ?? 0) + 1)
  }
  const usados = new Map()
  const res = new Set()
  filas.forEach((f, i) => {
    const k = `${f.fecha}|${f.tipo}|${Number(f.importe).toFixed(2)}`
    const hay = claves.get(k) ?? 0
    const u = usados.get(k) ?? 0
    // Tantos como existan: si tenías apuntado UN café de 1,50 € ese día y el
    // banco trae dos, solo uno se marca como ya apuntado.
    if (u < hay) {
      res.add(i)
      usados.set(k, u + 1)
    }
  })
  return res
}

/**
 * Resumen del historial importado: periodo, medias mensuales y en qué se va.
 * (Sobre las filas importadas; mismas reglas que el motor: el consumo excluye
 * inversión, ajustes y traspasos.)
 */
export function resumenHistorial(filas) {
  if (filas.length === 0) return null
  const fechas = filas.map((f) => f.fecha).sort()
  const desde = fechas[0]
  const hasta = fechas.at(-1)
  const [y1, m1] = desde.split('-').map(Number)
  const [y2, m2] = hasta.split('-').map(Number)
  const meses = (y2 - y1) * 12 + (m2 - m1) + 1
  let ingresos = 0
  let gastos = 0
  const porCat = new Map()
  for (const f of filas) {
    const cent = Math.round(f.importe * 100)
    const mov = { tipo: f.tipo, categoria: { nombre: f.esInversion ? CATEGORIA_INVERSION : f.categoria } }
    if (f.tipo === 'ingreso') ingresos += cent
    else if (esConsumo(mov)) {
      gastos += cent
      porCat.set(f.categoria, (porCat.get(f.categoria) ?? 0) + cent)
    }
  }
  const top = [...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  return {
    desde,
    hasta,
    meses,
    n: filas.length,
    ingresoMedio: Math.round(ingresos / meses) / 100,
    gastoMedio: Math.round(gastos / meses) / 100,
    tasaAhorro: ingresos > 0 ? Math.round(((ingresos - gastos) / ingresos) * 100) : null,
    topCategorias: top.map(([nombre, c]) => ({ nombre, mensual: Math.round(c / meses) / 100, pct: gastos > 0 ? Math.round((c / gastos) * 100) : 0 })),
  }
}

// Filas canónicas → forma de movimiento (para detectar suscripciones en lo
// importado junto con lo que ya había).
export const comoMovimiento = (f) => ({ tipo: f.tipo, importe: f.importe, fecha: f.fecha, nota: f.nota, categoria: { nombre: f.esInversion ? CATEGORIA_INVERSION : f.categoria } })
