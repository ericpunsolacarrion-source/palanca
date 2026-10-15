// Revisión de una importación (extracto o capturas) ANTES de guardar, y el
// resumen de "tu historial" DESPUÉS. Lógica pura y testeable; la pantalla es
// components/ImportarHistorial.jsx.
//
// Idea clave: revisar 300 filas una a una nadie lo hace. Se revisa por
// COMERCIO: "Mercadona · 52 movimientos → Comida". Cambiar uno cambia todos.

import { centimosDe, esConsumo } from './movimientosUtils'
import { CATEGORIA_INVERSION, esDevolucion } from './categorias'
import { claveComercio, directorio } from './comercios'

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

/**
 * Agrupa por COMERCIO REAL (y tipo): "PAGO TARJETA ALIPAM23" que el usuario ya
 * dijo que es Mercadona va con "COMPRA TARJ. MERCADONA". Devuelve
 * [{ clave, nombre, tipo, n, total, categoria, indices, ejemplo, claves, origen }]
 * de más a menos movimientos. `claves`: las claves de los textos del banco del
 * grupo (para recordar el nombre de todas). `categoria`: la más frecuente.
 */
export function agruparPorComercio(filas, dir = directorio()) {
  const grupos = new Map()
  filas.forEach((f, i) => {
    const id = dir.identificar(f.nota || '')
    const grupo = dir.grupoDe(f.nota || '') || 'sin concepto'
    const clave = `${f.tipo}|${grupo}`
    const g =
      grupos.get(clave) ??
      { clave, nombre: id.nombre || 'Sin concepto', tipo: f.tipo, n: 0, total: 0, indices: [], cats: new Map(), ejemplo: f.nota || '', claves: new Set(), origen: id.origen }
    g.n += 1
    g.total += f.importe
    g.indices.push(i)
    g.cats.set(f.categoria, (g.cats.get(f.categoria) ?? 0) + 1)
    const k = claveComercio(f.nota || '')
    if (k) g.claves.add(k)
    if (id.origen === 'memoria' || id.origen === 'memoria-aprox') g.origen = id.origen
    grupos.set(clave, g)
  })
  return [...grupos.values()]
    .map(({ cats, claves, ...g }) => ({
      ...g,
      claves: [...claves],
      total: Math.round(g.total * 100) / 100,
      categoria: [...cats.entries()].sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.n - a.n || b.total - a.total)
}

const DIA = 86400000
const diasEntre = (a, b) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DIA

/**
 * Filas que PARECEN ya apuntadas (se proponen fuera; el usuario puede incluirlas):
 *  - mismo día, tipo e importe (aunque el concepto se escriba distinto); o
 *  - mismo tipo e importe a ±3 días, si es el MISMO comercio, o si lo apuntado
 *    no dice de dónde es (gasto rápido), o era un fijo confirmado (el banco lo
 *    carga uno o dos días después). Importes pequeños (< 5 €): solo mismo día.
 * Cada movimiento existente cubre como mucho una fila (dos cafés iguales el
 * mismo día y uno apuntado → solo uno se marca).
 */
export function indicesParecidos(filas, existentes, dir = directorio()) {
  const tipoDe = (m) => (m.tipo === 'ingreso' ? 'ingreso' : 'gasto')
  const porImporte = new Map()
  for (const m of existentes) {
    const k = `${tipoDe(m)}|${centimosDe(m)}`
    if (!porImporte.has(k)) porImporte.set(k, [])
    porImporte.get(k).push({ m, grupo: dir.grupoDe(m), sinComercio: !m.nota && !m.fuente?.nombre, usado: false })
  }
  const res = new Set()
  // Primero las coincidencias exactas de día (las más seguras), luego las cercanas.
  for (const pasada of ['exacta', 'cercana']) {
    filas.forEach((f, i) => {
      if (res.has(i)) return
      const cent = Math.round(Number(f.importe) * 100)
      const candidatos = porImporte.get(`${f.tipo}|${cent}`)
      if (!candidatos) return
      const grupo = dir.grupoDe(f.nota || '')
      let mejor = null
      for (const c of candidatos) {
        if (c.usado) continue
        const d = diasEntre(c.m.fecha, f.fecha)
        if (pasada === 'exacta') {
          if (d === 0) {
            mejor = c
            break
          }
          continue
        }
        if (d > 3 || cent < 500) continue
        const encaja = (grupo && c.grupo === grupo) || c.sinComercio || c.m.es_fijo
        if (encaja && (!mejor || d < mejor.d)) mejor = { ...c, d, ref: c }
      }
      if (mejor) {
        ;(mejor.ref ?? mejor).usado = true
        res.add(i)
      }
    })
  }
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
    if (esDevolucion(mov)) gastos -= cent // contra-gasto, no ingreso (MOTOR.md E6)
    else if (f.tipo === 'ingreso') ingresos += cent
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
