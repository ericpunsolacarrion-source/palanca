import { esInversion } from './categorias'

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

// Últimos N meses terminando en el actual: [{clave, etiqueta}]
export function ultimosNMeses(n) {
  const ahora = new Date()
  const meses = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
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
    const importe = Number(m.importe)
    if (m.tipo === 'ingreso') ingresos += importe
    else if (esInversion(m)) invertido += importe
    else gastos += importe
  }
  const ahorro = ingresos - gastos
  const ratioAhorro = ingresos > 0 ? (ahorro / ingresos) * 100 : 0
  return { ingresos, gastos, invertido, ahorro, ratioAhorro }
}

// Agrega por mes los últimos N meses (meses sin datos quedan a cero).
export function agregarPorMes(movimientos, n) {
  const meses = ultimosNMeses(n)
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
