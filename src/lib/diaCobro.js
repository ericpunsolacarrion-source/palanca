// ── DÍA DE COBRO DE LA NÓMINA → DÍA DE INICIO DEL PERIODO ───────────────────
// Parte del motor (determinista, sin IA). Ver docs/PERIODO.md §6.
//
// 1) Declarado: en el alta el usuario dice qué día cobra.
//    diaInicioDesdeCobro(d): d ≤ 5 → 1 (cobra a principio de mes: el mes
//    natural ya junta la nómina con sus gastos); d de 6 a 28 → d; d ≥ 29 → 28
//    (el periodo empieza el 28 y la nómina del 29–31 cae dentro).
//
// 2) Detectado: con los movimientos (apuntados o de extractos importados) se
//    busca el día HABITUAL de la nómina y si a veces llega ANTES (fin de semana,
//    festivo: el 26 o el 27 en vez del 28). El periodo empieza el día MÁS
//    TEMPRANO en que ha llegado, para que la nómina caiga siempre en el periodo
//    que paga. Los retrasos no importan (ya caen en su periodo).
//
// Reglas de la detección (últimos 12 meses hasta hoy):
//  - Ingresos que cuentan como ingreso (no traspasos, ajustes, devoluciones ni
//    retiradas de inversión). Si hay nómina con categoría «Nomina» en 3 meses o
//    más, solo esa; si no, todos los ingresos.
//  - Solo los «grandes»: ≥ 60 % de la mediana del mayor ingreso de cada mes
//    (un Bizum de 30 € no es la nómina).
//  - Día habitual d0 = el día con más ingresos grandes a ±2 días (circular: el
//    30 y el 1 están a 2 días). Desempate: el más repetido exacto, luego el menor.
//  - Adelantos = ingresos grandes de 1 a 5 días ANTES de d0. Una paga extra que
//    llega 8 o 12 días antes no es un adelanto y se ignora.
//  - Hacen falta 3 meses distintos con la nómina cerca de d0 (±5 días); si no,
//    no se detecta nada (null) y se queda lo declarado.
import { esAjuste, esDevolucion, esRetiradaInversion, esTraspaso } from './categorias'
import { isoDe, normalizarDiaInicio } from './periodo'

const MARGEN_AGRUPAR = 2
const MAX_ADELANTO = 5
const MIN_MESES = 3

export function diaInicioDesdeCobro(dia) {
  const d = Number(dia)
  if (!Number.isInteger(d) || d < 1 || d > 31) return 1
  if (d <= 5) return 1
  return normalizarDiaInicio(Math.min(d, 28))
}

// Distancia circular «cuántos días antes de b cae a» en un mes de 31 días.
const antes = (a, b) => (b - a + 31) % 31
const cerca = (a, b) => Math.min(antes(a, b), antes(b, a))

const cuentaComoIngreso = (m) => m.tipo === 'ingreso' && !esAjuste(m) && !esTraspaso(m) && !esDevolucion(m) && !esRetiradaInversion(m) && m.categoria?.nombre !== 'Inversion'

export function detectarCobroNomina(movimientos, hoy = new Date()) {
  const hasta = isoDe(hoy)
  const desde = isoDe(new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate() + 1))
  const ingresos = movimientos.filter((m) => cuentaComoIngreso(m) && m.fecha >= desde && m.fecha <= hasta)
  const mesesNomina = new Set(ingresos.filter((m) => m.categoria?.nombre === 'Nomina').map((m) => m.fecha.slice(0, 7)))
  const base = mesesNomina.size >= MIN_MESES ? ingresos.filter((m) => m.categoria?.nombre === 'Nomina') : ingresos
  if (!base.length) return null

  // Solo los ingresos grandes del mes.
  const mayorPorMes = new Map()
  for (const m of base) {
    const k = m.fecha.slice(0, 7)
    mayorPorMes.set(k, Math.max(mayorPorMes.get(k) ?? 0, Number(m.importe)))
  }
  const mayores = [...mayorPorMes.values()].sort((a, b) => a - b)
  const mediana = mayores[Math.floor(mayores.length / 2)]
  const grandes = base.filter((m) => Number(m.importe) >= mediana * 0.6).map((m) => ({ fecha: m.fecha, dia: Number(m.fecha.slice(8, 10)) }))

  // Día habitual.
  let d0 = null
  let mejor = [-1, -1]
  for (let d = 1; d <= 31; d++) {
    const cercanos = grandes.filter((g) => cerca(g.dia, d) <= MARGEN_AGRUPAR).length
    const exactos = grandes.filter((g) => g.dia === d).length
    if (cercanos > mejor[0] || (cercanos === mejor[0] && exactos > mejor[1])) {
      mejor = [cercanos, exactos]
      d0 = d
    }
  }
  const delCiclo = grandes.filter((g) => cerca(g.dia, d0) <= MAX_ADELANTO)
  const meses = new Set(delCiclo.map((g) => g.fecha.slice(0, 7))).size
  if (meses < MIN_MESES) return null

  const adelantos = delCiclo.filter((g) => antes(g.dia, d0) >= 1 && antes(g.dia, d0) <= MAX_ADELANTO).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  const maxAntes = adelantos.reduce((s, g) => Math.max(s, antes(g.dia, d0)), 0)
  const masTemprano = ((d0 - maxAntes - 1 + 31) % 31) + 1
  return {
    diaHabitual: d0,
    diaMasTemprano: masTemprano,
    diaInicio: diaInicioDesdeCobro(masTemprano),
    meses,
    adelantos: adelantos.map((g) => g.fecha),
  }
}
