import { esAjuste, esInversion } from './categorias'

// Clave de mes ('2026-07') a partir de la fecha del movimiento.
// SIEMPRE se agrupa por `fecha` (cuando ocurrió), nunca por created_at.
export function claveMes(fechaIso) {
  return fechaIso.slice(0, 7)
}

export function claveMesActual() {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
}

// Fecha de hoy en formato 'YYYY-MM-DD' con componentes LOCALES. Usar esto para
// el valor por defecto de los formularios: toISOString() da la fecha UTC, que
// a última hora del día cae en otro día/mes que el filtro local del dashboard.
export function hoyIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function filtrarMesActual(movimientos) {
  const clave = claveMesActual()
  return movimientos.filter((m) => claveMes(m.fecha) === clave)
}

// Movimientos de un mes concreto (clave 'YYYY-MM'). Base del selector de
// periodo global del dashboard.
export function filtrarPorMes(movimientos, clave) {
  return movimientos.filter((m) => claveMes(m.fecha) === clave)
}

// Etiqueta legible de un mes ('2026-07' → 'Julio 2026'). Formato configurable.
export function etiquetaMes(clave, opciones = { month: 'long', year: 'numeric' }) {
  const [y, m] = clave.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const s = new Intl.DateTimeFormat('es-ES', opciones).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Rango CONTIGUO de meses desde el primer movimiento hasta el mes actual,
// del más reciente al más antiguo. Siempre incluye el mes actual (aunque no
// haya datos), para que el selector permita volver a "hoy".
export function rangoMeses(movimientos) {
  const ahora = new Date()
  const cursor = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  let fin = new Date(cursor)
  for (const m of movimientos) {
    const [y, mm] = m.fecha.slice(0, 7).split('-').map(Number)
    const d = new Date(y, mm - 1, 1)
    if (d < fin) fin = d
  }
  const claves = []
  while (cursor >= fin) {
    claves.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
    cursor.setMonth(cursor.getMonth() - 1)
  }
  return claves // más reciente primero
}

// Últimos N meses terminando en `claveFin` (por defecto el mes actual):
// [{clave, etiqueta}]. Permite anclar las series temporales a un mes elegido.
export function ultimosNMeses(n, claveFin = claveMesActual()) {
  const [fy, fm] = claveFin.split('-').map(Number)
  const base = new Date(fy, fm - 1, 1)
  const meses = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const etiqueta = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d).replace('.', '')
    meses.push({ clave, etiqueta })
  }
  return meses
}

// Regla única de la app (ver CLAUDE.md):
//   gasto   = solo consumo (excluye inversión)
//   ahorro  = ingresos - gastos de consumo (la inversión ES parte del ahorro)
//   invertido = movimientos de gasto con categoría "Inversion"
export function totalesDe(movimientos) {
  let ingresos = 0
  let gastos = 0
  let invertido = 0
  for (const m of movimientos) {
    // Los ajustes de saldo no son flujo mensual: no cuentan como ingreso ni gasto.
    if (esAjuste(m)) continue
    const importe = Number(m.importe)
    if (m.tipo === 'ingreso') ingresos += importe
    else if (esInversion(m)) invertido += importe
    else gastos += importe
  }
  const ahorro = ingresos - gastos
  const ratioAhorro = ingresos > 0 ? (ahorro / ingresos) * 100 : 0
  return { ingresos, gastos, invertido, ahorro, ratioAhorro }
}

// ── Modelo de DOS BOLSAS (stock acumulado) ──────────────────────────────────
// - Bolsa de INVERSIÓN = Σ aportaciones (categoría Inversion). Explícita.
// - Bolsa de LIQUIDEZ (ahorro disponible) = Σ(ingresos − gastos − invertido)
//   + Σ ajustes. Derivada: el dinero del superávit que no se invirtió, más el
//   saldo inicial y las reconciliaciones (movimientos de categoría Ajuste).
// - PATRIMONIO TOTAL = Inversión + Liquidez.
// Fuente única. La liquidez solo es fiable si el usuario reconcilia (ver saldo).
export function bolsas(movimientos) {
  let liquidez = 0 // ingresos − gastos − invertido (+ ajustes)
  let invertido = 0
  let ajusteTotal = 0
  for (const m of movimientos) {
    const importe = Number(m.importe)
    if (esAjuste(m)) {
      const signo = m.tipo === 'ingreso' ? 1 : -1
      ajusteTotal += signo * importe
      liquidez += signo * importe
      continue
    }
    if (m.tipo === 'ingreso') liquidez += importe
    else if (esInversion(m)) {
      invertido += importe
      liquidez -= importe // el dinero pasa de líquido a invertido
    } else liquidez -= importe
  }
  return {
    bolsaInversion: invertido,
    bolsaLiquidez: liquidez,
    patrimonio: invertido + liquidez,
    ajusteTotal,
  }
}

// Fecha (ISO) del último ajuste de saldo registrado, o null si nunca se ha
// reconciliado. Sirve para el indicador de fiabilidad de la liquidez.
export function ultimaReconciliacion(movimientos) {
  let ultima = null
  for (const m of movimientos) {
    if (!esAjuste(m)) continue
    const cuando = m.created_at || m.fecha
    if (cuando && (!ultima || cuando > ultima)) ultima = cuando
  }
  return ultima
}

// Agrega por mes los últimos N meses terminando en `claveFin` (por defecto el
// mes actual). Meses sin datos quedan a cero.
export function agregarPorMes(movimientos, n, claveFin) {
  const meses = ultimosNMeses(n, claveFin)
  const mapa = new Map(meses.map((m) => [m.clave, []]))
  for (const mov of movimientos) {
    const clave = claveMes(mov.fecha)
    if (mapa.has(clave)) mapa.get(clave).push(mov)
  }
  return meses.map((m) => ({ ...m, ...totalesDe(mapa.get(m.clave)) }))
}

export function formatearFecha(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-')
  return `${dia}/${mes}/${anio}`
}

// Porcentaje en formato español: 92,3%
export function formatearPorcentaje(valor, decimales = 1) {
  const seguro = Number.isFinite(valor) ? valor : 0
  return `${seguro.toLocaleString('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}%`
}

// Formato compacto para etiquetas de gráfico: 1234 -> "1,2k"
export function formatearCompacto(valor) {
  if (valor >= 1000) {
    const k = valor / 1000
    return `${k.toLocaleString('es-ES', { maximumFractionDigits: 1 })}k`
  }
  return String(Math.round(valor))
}

// Ahorro mensual medio de los meses con ingresos (suaviza el ruido de un solo
// mes). Base de la proyección de futuro del dashboard. Devuelve también cuántos
// meses con actividad hay, para decidir si desbloquear la proyección.
export function resumenMensualMedio(movimientos) {
  const porMes = new Map()
  for (const m of movimientos) {
    const clave = claveMes(m.fecha)
    if (!porMes.has(clave)) porMes.set(clave, [])
    porMes.get(clave).push(m)
  }

  let sumaAhorro = 0
  let sumaInvertido = 0
  let mesesConIngresos = 0
  for (const movs of porMes.values()) {
    const t = totalesDe(movs)
    if (t.ingresos > 0) {
      sumaAhorro += t.ahorro
      sumaInvertido += t.invertido
      mesesConIngresos += 1
    }
  }

  return {
    mesesConDatos: porMes.size,
    mesesConIngresos,
    ahorroMedio: mesesConIngresos > 0 ? sumaAhorro / mesesConIngresos : 0,
    invertidoMedio: mesesConIngresos > 0 ? sumaInvertido / mesesConIngresos : 0,
  }
}

// Ritmo mensual (media) con el que crece cada bolsa, según el tipo de objetivo.
// Base de la proyección "a tu ritmo lo alcanzarías en N meses" de Objetivos:
//  - liquidez  = superávit mensual que NO se invierte (va a ahorro líquido)
//  - inversion = media de aportaciones a inversión al mes
//  - patrimonio = todo el superávit mensual (líquido + inversión)
// Fuente única; deriva de resumenMensualMedio (medias sobre meses con ingresos).
export function ritmoMensualPorTipo(movimientos) {
  const { ahorroMedio, invertidoMedio } = resumenMensualMedio(movimientos)
  return {
    liquidez: Math.max(0, ahorroMedio - invertidoMedio),
    inversion: Math.max(0, invertidoMedio),
    patrimonio: Math.max(0, ahorroMedio),
  }
}

// Ingreso mensual medio de los últimos N meses (solo meses con ingresos), para
// contextualizar "lo que cobras" frente a un mes suelto. Fuente única.
export function ingresoMensualMedio(movimientos, n = 12) {
  const meses = agregarPorMes(movimientos, n).filter((m) => m.ingresos > 0)
  if (meses.length === 0) return { media: 0, meses: 0 }
  const suma = meses.reduce((a, m) => a + m.ingresos, 0)
  return { media: suma / meses.length, meses: meses.length }
}

// Compara el mes actual con el anterior y devuelve microcomparativas
// ("estás ahorrando un X% más que el mes pasado"). Solo comparaciones con uno
// mismo, nunca con otros usuarios. Devuelve [] si no hay base para comparar.
export function comparativasConMesAnterior(movimientos) {
  const meses = agregarPorMes(movimientos, 2)
  const anterior = meses[0]
  const actual = meses[1]

  // Sin datos en el mes anterior no hay con qué comparar.
  if (anterior.ingresos === 0 && anterior.gastos === 0 && anterior.invertido === 0) return []

  const avisos = []
  const variacion = (hoy, antes) => (antes === 0 ? null : ((hoy - antes) / antes) * 100)

  // Ahorro
  const vAhorro = variacion(actual.ahorro, anterior.ahorro)
  if (vAhorro !== null && Math.abs(vAhorro) >= 5 && anterior.ahorro > 0) {
    avisos.push({
      tono: vAhorro >= 0 ? 'bien' : 'mal',
      texto:
        vAhorro >= 0
          ? `Estás ahorrando un ${Math.round(Math.abs(vAhorro))}% más que el mes pasado`
          : `Estás ahorrando un ${Math.round(Math.abs(vAhorro))}% menos que el mes pasado`,
    })
  }

  // Gasto de consumo
  const vGasto = variacion(actual.gastos, anterior.gastos)
  if (vGasto !== null && Math.abs(vGasto) >= 5) {
    avisos.push({
      tono: vGasto <= 0 ? 'bien' : 'mal',
      texto:
        vGasto <= 0
          ? `Has gastado un ${Math.round(Math.abs(vGasto))}% menos que el mes pasado`
          : `Has gastado un ${Math.round(Math.abs(vGasto))}% más que el mes pasado`,
    })
  }

  // Inversión
  if (actual.invertido > anterior.invertido && anterior.invertido >= 0) {
    const vInv = variacion(actual.invertido, anterior.invertido)
    if (anterior.invertido === 0 && actual.invertido > 0) {
      avisos.push({ tono: 'bien', texto: 'Este mes has empezado a invertir. ¡Buen paso!' })
    } else if (vInv !== null && vInv >= 5) {
      avisos.push({ tono: 'bien', texto: `Has invertido un ${Math.round(vInv)}% más que el mes pasado` })
    }
  }

  return avisos.slice(0, 2) // como mucho 2, para no saturar el dashboard
}

// Categoría de gasto donde más ha cambiado el consumo respecto al mes anterior.
export function cambioPorCategoria(movimientos) {
  const clavePrev = ultimosNMeses(2)[0].clave
  const claveAct = claveMesActual()

  const sumaPorCat = (clave) => {
    const mapa = new Map()
    for (const m of movimientos) {
      if (m.tipo !== 'gasto' || esInversion(m) || claveMes(m.fecha) !== clave) continue
      const nombre = m.categoria?.nombre ?? 'Sin categoría'
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + Number(m.importe))
    }
    return mapa
  }

  const prev = sumaPorCat(clavePrev)
  const act = sumaPorCat(claveAct)
  if (prev.size === 0) return null

  let mejor = null
  for (const [nombre, antes] of prev) {
    const ahora = act.get(nombre) ?? 0
    if (antes <= 0) continue
    const pct = ((ahora - antes) / antes) * 100
    if (pct <= -15 && (mejor === null || pct < mejor.pct)) {
      mejor = { nombre, pct, tono: 'bien' }
    }
  }
  return mejor
}

// Gasto mensual estimado = media del gasto de consumo de los meses con
// actividad. Cuantos más meses, más fiable. Fuente única.
export function estimacionGastoMensual(movimientos) {
  const porMes = new Map()
  for (const m of movimientos) {
    const clave = claveMes(m.fecha)
    if (!porMes.has(clave)) porMes.set(clave, [])
    porMes.get(clave).push(m)
  }

  let sumaGasto = 0
  let mesesConActividad = 0
  for (const movs of porMes.values()) {
    const t = totalesDe(movs)
    if (t.ingresos > 0 || t.gastos > 0) {
      sumaGasto += t.gastos
      mesesConActividad += 1
    }
  }

  return {
    estimacion: mesesConActividad > 0 ? sumaGasto / mesesConActividad : 0,
    mesesUsados: mesesConActividad,
    // Con menos de 2 meses la media es poco representativa: se marca provisional.
    provisional: mesesConActividad < 2,
  }
}

// Progreso hacia un objetivo de logro (ej. inversión mensual). El porcentaje
// es REAL y PUEDE superar el 100 %: si el objetivo es 300 € e inviertes 600 €,
// pct = 200. `barra` sí se limita a 100 para no desbordar el ancho; usa
// `superado` para resaltarlo como logro. Fuente única de esta lógica.
// (No aplicar a presupuestos de gasto, donde pasarse es un aviso, no un logro.)
export function progresoObjetivo(conseguido, objetivo) {
  if (!objetivo || objetivo <= 0) return { pct: 0, barra: 0, superado: false }
  const pct = (Number(conseguido) / Number(objetivo)) * 100
  return { pct, barra: Math.min(pct, 100), superado: pct > 100 }
}

// Valor futuro de un capital inicial + aportaciones mensuales con interés
// compuesto. rentabilidadAnual en % (0 = dinero parado). Fuente única para
// el simulador y para la proyección del dashboard.
export function proyectarInteresCompuesto({ inicial = 0, mensual = 0, anios, rentabilidadAnual = 0 }) {
  const meses = Math.round(anios * 12)
  const r = rentabilidadAnual / 100 / 12
  const aportado = inicial + mensual * meses
  if (r === 0) {
    return { valorFinal: aportado, aportado, intereses: 0 }
  }
  const factor = (Math.pow(1 + r, meses) - 1) / r
  const valorFinal = inicial * Math.pow(1 + r, meses) + mensual * factor
  return { valorFinal, aportado, intereses: valorFinal - aportado }
}
