// Análisis del mes (v5): lógica pura sobre las reglas únicas de cálculo
// (totalesDe, gastoPorCategoria). No calcula nada «a su manera»: agrupa por
// `fecha` y compara de forma JUSTA.
//  - Mes en curso: se compara HASTA EL MISMO DÍA en los meses anteriores. El
//    alquiler del día 2 o la nómina del día 28 no deben parecer «vas rapidísimo»
//    o «ahorras un 389 % más».
//  - Mes cerrado: meses completos.
// Si no hay meses suficientes con datos, se dice, en vez de inventar.
import { gastoPorCategoria, totalesDe } from './movimientosUtils'
import { esAjuste, formatearEuros } from './categorias'

const pad = (n) => String(n).padStart(2, '0')
const r2 = (v) => Math.round(v * 100) / 100
const claveDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const diasDe = (clave) => {
  const [y, m] = clave.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
const mesAnterior = (clave, k = 1) => {
  const [y, m] = clave.split('-').map(Number)
  return claveDe(new Date(y, m - 1 - k, 1))
}
const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const nombreMes = (clave) => NOMBRES_MES[Number(clave.slice(5, 7)) - 1]

/** Movimientos del mes `clave` hasta el día `dia` (incluido); sin `dia`, el mes entero. */
export function delMes(movimientos, clave, dia = null) {
  const tope = dia ? `${clave}-${pad(Math.min(dia, diasDe(clave)))}` : null
  return movimientos.filter((m) => m.fecha.slice(0, 7) === clave && (!tope || m.fecha <= tope))
}

const tieneDatos = (movs) => {
  const t = totalesDe(movs)
  return t.ingresos > 0 || t.gastos > 0 || t.invertido !== 0
}

/**
 * Contexto de comparación del mes `clave` visto el día `hoy`.
 * parcial = es el mes en curso (se compara hasta el mismo día).
 */
export function contextoMes(clave, hoy = new Date()) {
  const parcial = clave === claveDe(hoy)
  return { clave, parcial, dia: parcial ? hoy.getDate() : null, diasMes: diasDe(clave) }
}

/**
 * Meses anteriores con datos (hasta `n`, buscando hasta 12 atrás), cortados en
 * el mismo día si el mes es parcial. Devuelve sus totales y la media.
 */
export function referenciaHabitual(historico, ctx, n = 6) {
  const meses = []
  for (let k = 1; k <= 12 && meses.length < n; k += 1) {
    const c = mesAnterior(ctx.clave, k)
    const completo = delMes(historico, c)
    if (!tieneDatos(completo)) continue
    meses.push({ clave: c, totales: totalesDe(ctx.parcial ? delMes(historico, c, ctx.dia) : completo) })
  }
  if (meses.length === 0) return { meses, media: null }
  const suma = (k) => meses.reduce((s, m) => s + m.totales[k], 0) / meses.length
  const media = { ingresos: r2(suma('ingresos')), gastos: r2(suma('gastos')), invertido: r2(suma('invertido')), ahorro: r2(suma('ahorro')) }
  media.ratioAhorro = media.ingresos > 0 ? (media.ahorro / media.ingresos) * 100 : 0
  return { meses, media }
}

/**
 * Categorías de consumo del mes frente a lo habitual (a la misma altura del
 * mes si está en curso) y su tendencia de los meses cerrados anteriores.
 * @returns [{ nombre, gastado, habitual, dif, pct, serie, subiendo }]
 */
export function categoriasComparadas(historico, ctx, n = 6) {
  const actual = gastoPorCategoria(delMes(historico, ctx.clave, ctx.dia))
  const previos = []
  const completos = []
  for (let k = 1; k <= 12 && previos.length < n; k += 1) {
    const c = mesAnterior(ctx.clave, k)
    const completo = delMes(historico, c)
    if (!tieneDatos(completo)) continue
    previos.push(gastoPorCategoria(ctx.parcial ? delMes(historico, c, ctx.dia) : completo))
    completos.unshift({ clave: c, mapa: gastoPorCategoria(completo) })
  }
  const nombres = new Set([...actual.keys()])
  for (const mp of previos) for (const [k, v] of mp) if (v > 0) nombres.add(k)
  return [...nombres]
    .map((nombre) => {
      const gastado = r2(actual.get(nombre) ?? 0)
      const habitual = previos.length ? r2(previos.reduce((s, mp) => s + (mp.get(nombre) ?? 0), 0) / previos.length) : null
      const dif = habitual == null ? null : r2(gastado - habitual)
      const pct = habitual > 0 ? (dif / habitual) * 100 : null
      // Con qué frecuencia aparece (meses de referencia con gasto): separa lo
      // habitual (súper, gasolina) de lo puntual (un viaje, un regalo).
      const frecuencia = previos.length ? previos.filter((mp) => (mp.get(nombre) ?? 0) > 0).length / previos.length : 0
      const serie = completos.map((c) => ({ clave: c.clave, valor: r2(c.mapa.get(nombre) ?? 0) }))
      // «Subiendo»: los 3 últimos meses cerrados crecen uno tras otro y el
      // último queda al menos un 15 % por encima del primero (y > 20 €).
      const u = serie.slice(-3).map((s) => s.valor)
      const subiendo = u.length === 3 && u[0] > 0 && u[1] > u[0] && u[2] > u[1] && u[2] >= u[0] * 1.15 && u[2] - u[0] >= 20
      return { nombre, gastado, habitual, dif, pct, frecuencia, serie, subiendo }
    })
    .filter((c) => c.gastado > 0 || (c.habitual ?? 0) >= 5)
    .sort((a, b) => b.gastado - a.gastado || (b.habitual ?? 0) - (a.habitual ?? 0))
}

/** Día habitual del ingreso principal (mediana de los 3 meses previos con ingresos). */
export function diaIngresoHabitual(historico, clave) {
  const dias = []
  for (let k = 1; k <= 6 && dias.length < 3; k += 1) {
    const c = mesAnterior(clave, k)
    let mayor = null
    for (const m of historico) {
      if (m.tipo !== 'ingreso' || esAjuste(m) || m.fecha.slice(0, 7) !== c || m.categoria?.nombre === 'Inversion' || m.categoria?.nombre === 'Desde ahorro' || /^(devoluci|reembolso)/i.test(m.categoria?.nombre ?? '')) continue
      if (!mayor || Number(m.importe) > Number(mayor.importe)) mayor = m
    }
    if (mayor) dias.push(Number(mayor.fecha.slice(8, 10)))
  }
  dias.sort((a, b) => a - b)
  return dias.length ? dias[Math.floor(dias.length / 2)] : null
}

// Umbral de «variación normal»: por debajo, no es noticia.
const umbral = (base) => Math.max(25, Math.abs(base) * 0.08)

/**
 * Insights del mes: qué ha cambiado, frente a qué periodo, cuánto dinero es y
 * si es bueno, malo o normal. Solo con datos reales; si faltan, lo dice.
 * @returns [{ id, tono: 'bien'|'aviso'|'neutro'|'info', flecha?: 'sube'|'baja' (hacia dónde
 *   se movió la cifra; el tono dice si es bueno), titulo, detalle, importe? }]
 */
export function insightsDelMes(historico, ctx) {
  const actual = totalesDe(delMes(historico, ctx.clave, ctx.dia))
  const ref = referenciaHabitual(historico, ctx)
  const altura = ctx.parcial ? `a día ${ctx.dia}` : 'en el mes completo'
  const salida = []

  if (ref.meses.length < 2) {
    salida.push({
      id: 'faltan-datos',
      tono: 'info',
      titulo: 'Aún no hay meses suficientes para compararte',
      detalle: `Con ${ref.meses.length === 0 ? 'ningún mes' : 'un solo mes'} anterior con datos, una comparación no sería fiable. Aparecerá cuando tengas al menos 2.`,
    })
    return salida
  }

  // El ingreso principal aún no ha llegado: el ahorro «a estas alturas» no
  // significa nada todavía.
  const diaIngreso = diaIngresoHabitual(historico, ctx.clave)
  const ingresoPendiente = ctx.parcial && actual.ingresos === 0 && diaIngreso != null && diaIngreso > ctx.dia

  const m = ref.media
  const n = ref.meses.length
  const deTusMeses = `tu media de ${n} meses ${altura}`

  if (ingresoPendiente) {
    salida.push({ id: 'ingreso-pendiente', tono: 'info', titulo: `Tu ingreso principal suele llegar el día ${diaIngreso}`, detalle: 'Hasta entonces, el ahorro del mes no se puede comparar.' })
  } else {
    const dAhorro = r2(actual.ahorro - m.ahorro)
    const pctAhorro = m.ahorro > 100 ? (dAhorro / m.ahorro) * 100 : null
    const pctTxt = pctAhorro != null && Math.abs(pctAhorro) <= 300 ? ` (${dAhorro >= 0 ? '+' : '−'}${Math.round(Math.abs(pctAhorro))} %)` : ''
    if (Math.abs(dAhorro) < umbral(m.ahorro)) {
      salida.push({ id: 'ahorro', tono: 'neutro', titulo: 'Tu ahorro va en tu línea habitual', detalle: `${fmt(actual.ahorro)} frente a ${fmt(m.ahorro)} de ${deTusMeses}.`, importe: dAhorro })
    } else {
      salida.push({
        id: 'ahorro',
        tono: dAhorro > 0 ? 'bien' : 'aviso',
        flecha: dAhorro > 0 ? 'sube' : 'baja',
        titulo: `${ctx.parcial ? 'Llevas' : 'Ahorraste'} ${fmt(Math.abs(dAhorro))} ${dAhorro > 0 ? 'más' : 'menos'} que tu media${pctTxt}`,
        detalle: `${fmt(actual.ahorro)} frente a ${fmt(m.ahorro)} de ${deTusMeses}.`,
        importe: dAhorro,
      })
    }
  }

  const dGasto = r2(actual.gastos - m.gastos)
  if (Math.abs(dGasto) < umbral(m.gastos)) {
    salida.push({ id: 'gasto', tono: 'neutro', titulo: 'Tu gasto va en tu línea habitual', detalle: `${fmt(actual.gastos)} frente a ${fmt(m.gastos)} de ${deTusMeses}.`, importe: dGasto })
  } else {
    salida.push({
      id: 'gasto',
      tono: dGasto < 0 ? 'bien' : 'aviso',
      flecha: dGasto > 0 ? 'sube' : 'baja',
      titulo: `${ctx.parcial ? 'Llevas gastado' : 'Gastaste'} ${fmt(Math.abs(dGasto))} ${dGasto > 0 ? 'más' : 'menos'} de lo habitual`,
      detalle: `${fmt(actual.gastos)} frente a ${fmt(m.gastos)} de ${deTusMeses}.`,
      importe: -dGasto,
    })
  }

  // Frente al mes anterior (misma altura), solo si tiene datos.
  const ant = ref.meses.find((x) => x.clave === mesAnterior(ctx.clave))
  if (ant && !ingresoPendiente) {
    const d = r2(actual.ahorro - ant.totales.ahorro)
    if (Math.abs(d) >= umbral(ant.totales.ahorro)) {
      salida.push({
        id: 'mes-anterior',
        tono: d > 0 ? 'bien' : 'aviso',
        flecha: d > 0 ? 'sube' : 'baja',
        titulo: `${fmt(Math.abs(d))} ${d > 0 ? 'más' : 'menos'} ahorrado que en ${nombreMes(ant.clave)}`,
        detalle: `${capital(nombreMes(ant.clave))} ${ctx.parcial ? `a día ${ctx.dia}` : 'entero'}: ${fmt(ant.totales.ahorro)} · ${capital(nombreMes(ctx.clave))}: ${fmt(actual.ahorro)}.`,
        importe: d,
      })
    }
  }

  // Categorías: la que más se aleja por arriba y por abajo de lo habitual.
  const cats = categoriasComparadas(historico, ctx).filter((c) => c.habitual != null)
  const relevante = (c) => Math.abs(c.dif) >= Math.max(20, (c.habitual || 0) * 0.15)
  const arriba = cats.filter((c) => c.dif > 0 && relevante(c)).sort((a, b) => b.dif - a.dif)[0]
  // «Por debajo» solo en lo que sueles gastar casi todos los meses: no haber
  // hecho este mes el viaje de abril no es ahorrar.
  const abajo = cats.filter((c) => c.dif < 0 && relevante(c) && c.habitual >= 30 && c.frecuencia >= 0.5).sort((a, b) => a.dif - b.dif)[0]
  if (arriba) {
    salida.push({ id: `cat-${arriba.nombre}`, tono: 'aviso', flecha: 'sube', titulo: `${arriba.nombre}: ${fmt(arriba.dif)} por encima de lo habitual`, detalle: `${fmt(arriba.gastado)} frente a ${fmt(arriba.habitual)} de media ${altura}.`, importe: -arriba.dif })
  }
  if (abajo) {
    salida.push({ id: `cat-${abajo.nombre}`, tono: 'bien', flecha: 'baja', titulo: `${abajo.nombre}: ${fmt(Math.abs(abajo.dif))} por debajo de lo habitual`, detalle: `${fmt(abajo.gastado)} frente a ${fmt(abajo.habitual)} de media ${altura}.`, importe: -abajo.dif })
  }
  const sube = cats.find((c) => c.subiendo && c.nombre !== arriba?.nombre)
  if (sube) {
    const u = sube.serie.slice(-3)
    salida.push({ id: `sube-${sube.nombre}`, tono: 'aviso', flecha: 'sube', titulo: `${sube.nombre} sube por tercer mes seguido`, detalle: `De ${fmt(u[0].valor)} en ${nombreMes(u[0].clave)} a ${fmt(u[2].valor)} en ${nombreMes(u[2].clave)}.` })
  }
  return salida
}

/**
 * Serie de la proyección año a año (0…anios) para dos escenarios con la misma
 * aportación mensual: parado (0 %) e invertido (rentabilidad anual en %).
 * Usa la misma fórmula que proyectarInteresCompuesto (aportación al final de
 * cada mes, interés mensual = anual/12).
 */
export function serieProyeccion(mensual, anios, rentabilidadAnual) {
  const r = rentabilidadAnual / 100 / 12
  const puntos = []
  for (let a = 0; a <= anios; a += 1) {
    const meses = a * 12
    const parado = mensual * meses
    const invertido = r === 0 ? parado : mensual * ((Math.pow(1 + r, meses) - 1) / r)
    puntos.push({ anio: a, parado: r2(parado), invertido: r2(invertido) })
  }
  return puntos
}

// Formato corto para los textos (las cifras de pantalla usan formatearEuros).
// (respeta el modo «ocultar importes» porque pasa por formatearEuros).
function fmt(v) {
  return `${v < 0 ? '−' : ''}${formatearEuros(Math.round(Math.abs(v)))}`
}
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)
