// Historial de movimientos agrupado (Movimientos v5): Año → Mes → Movimientos.
// Solo PRESENTACIÓN: no copia ni modifica movimientos; cada bloque guarda las
// referencias de los suyos y sus totales salen de la regla única (totalesDe),
// así que siempre cuadran con la suma de lo que contienen.
//
// Orden: lo más reciente arriba.
//  - El mes en curso, abierto por defecto (aparece aunque no tenga movimientos).
//  - El resto de meses del año en curso, cada uno un bloque plegado.
//  - Los años anteriores, un bloque por año con sus meses dentro (plegados).
// Si hubiera movimientos con fecha futura (mes o año posterior), van arriba
// del mes en curso con la misma lógica.
import { totalesDe } from './movimientosUtils'

const pad = (n) => String(n).padStart(2, '0')

function bloqueMes(clave, movs) {
  return { tipo: 'mes', clave, n: movs.length, totales: totalesDe(movs), movimientos: movs }
}

/**
 * @param movimientos ya filtrados por la pestaña, en cualquier orden.
 * @returns [{ tipo: 'mes', clave, n, totales, movimientos, actual? } |
 *           { tipo: 'anio', clave: 'YYYY', n, totales, meses: [bloqueMes] }]
 *   Dentro de cada mes, los movimientos van por fecha descendente (estable).
 */
export function agruparHistorial(movimientos, hoy = new Date()) {
  const claveActual = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}`
  const anioActual = String(hoy.getFullYear())
  const porMes = new Map()
  for (const m of movimientos) {
    const c = m.fecha.slice(0, 7)
    if (!porMes.has(c)) porMes.set(c, [])
    porMes.get(c).push(m)
  }
  for (const l of porMes.values()) l.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
  if (!porMes.has(claveActual)) porMes.set(claveActual, [])

  const salida = []
  const porAnio = new Map()
  for (const clave of [...porMes.keys()].sort().reverse()) {
    const anio = clave.slice(0, 4)
    const bloque = bloqueMes(clave, porMes.get(clave))
    if (anio === anioActual) {
      if (clave === claveActual) bloque.actual = true
      salida.push(bloque)
    } else {
      if (!porAnio.has(anio)) {
        const grupo = { tipo: 'anio', clave: anio, meses: [] }
        porAnio.set(anio, grupo)
        salida.push(grupo)
      }
      porAnio.get(anio).meses.push(bloque)
    }
  }
  for (const g of porAnio.values()) {
    const todos = g.meses.flatMap((b) => b.movimientos)
    g.n = todos.length
    g.totales = totalesDe(todos)
  }
  // Años futuros arriba, luego el año en curso, luego los pasados.
  return salida.sort((a, b) => (a.clave.slice(0, 4) === b.clave.slice(0, 4) ? 0 : a.clave < b.clave ? 1 : -1))
}
