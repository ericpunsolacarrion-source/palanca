import { esInversion } from './categorias'
import {
  agregarPorMes,
  bolsas,
  claveMes,
  claveMesActual,
  estimacionGastoMensual,
  filtrarMesActual,
  resumenMensualMedio,
  totalesDe,
  ultimaReconciliacion,
  valorBolsaPorTipo,
} from './movimientosUtils'

// Construye un resumen ESTRUCTURADO y compacto de la situación financiera del
// usuario para dárselo como contexto al consultor IA (Fulcro). PRIVACIDAD: no se
// envían movimientos en bruto ni nada identificable (nombre, email, conceptos,
// notas): solo AGREGADOS calculados con las reglas únicas de la app
// (movimientosUtils) — sumas por categoría genérica, medias y evolución.

// Meses entre una fecha ISO y el mes actual (0 = este mes). Para "hace N meses
// que no inviertes". Sobre la clave de mes, coherente con el resto de la app.
function mesesDesde(fechaIso) {
  if (!fechaIso) return null
  const [ay, am] = claveMes(fechaIso).split('-').map(Number)
  const [hy, hm] = claveMesActual().split('-').map(Number)
  return (hy - ay) * 12 + (hm - am)
}

// Suma de gasto de consumo por categoría en un mes concreto (clave 'YYYY-MM').
function gastoPorCategoriaMes(movimientos, clave) {
  const mapa = {}
  for (const m of movimientos) {
    if (m.tipo !== 'gasto' || esInversion(m) || claveMes(m.fecha) !== clave) continue
    const nombre = m.categoria?.nombre ?? 'Sin categoría'
    mapa[nombre] = (mapa[nombre] ?? 0) + Number(m.importe)
  }
  return mapa
}

// Categoría de consumo que más SUBE respecto al mes anterior (para insights).
// Devuelve { nombre, antes, ahora, pct } o null. Solo subidas relevantes.
function mayorSubidaCategoria(actual, previo) {
  let mejor = null
  for (const [nombre, ahora] of Object.entries(actual)) {
    const antes = previo[nombre] ?? 0
    const subida = ahora - antes
    if (antes > 0 && subida >= 30 && ahora >= antes * 1.3) {
      const pct = Math.round(((ahora - antes) / antes) * 100)
      if (!mejor || subida > mejor.subida) mejor = { nombre, antes, ahora, pct, subida }
    }
  }
  return mejor
}

// ── INSIGHTS (base para la proactividad — Fase 3) ───────────────────────────
// Observaciones precalculadas, NO alarmistas y siempre constructivas, que Fulcro
// puede tejer cuando el usuario abre el chat (nunca como notificación que
// interrumpa). HONESTIDAD SOBRE CIFRAS: ningún insight afirma una cifra de
// liquidez o patrimonio como hecho firme si el saldo no está reconciliado; en
// ese caso ya viene redactado con la reserva. Así la cautela del system prompt
// no se cuela por la puerta de atrás en los datos precalculados.
//
// EVOLUCIÓN FUTURA (proactividad real): estos mismos patrones podrán, cuando se
// decida, disparar avisos proactivos (p.ej. push o banner). Hoy solo se exponen
// aquí, bajo demanda. Para activarlos: persistir el estado "ya avisado" por
// patrón y umbral, y mover la evaluación a un punto que corra al cargar datos
// (App.jsx) en vez de solo al abrir Fulcro. La redacción con reserva ya es apta.
const RESERVA = 'según tus datos registrados, que conviene reconciliar para confirmarlo'

function construirInsights({ tasaEste, tasaMedia, tendencia, subidaCat, haceMesesInversion, objetivos, reconciliada }) {
  const insights = []

  // Tasa de ahorro a la baja (es un ratio, no una cifra de stock: sin reserva).
  if (tendencia === 'bajando' && tasaEste != null) {
    insights.push(
      `Tu tasa de ahorro este mes (${tasaEste}%) está por debajo de tu media reciente (${Math.round(tasaMedia)}%).`,
    )
  }

  // Categoría de consumo muy por encima de lo habitual (gasto real: sin reserva).
  if (subidaCat) {
    insights.push(
      `Tu gasto en ${subidaCat.nombre} ha subido un ${subidaCat.pct}% respecto al mes pasado.`,
    )
  }

  // Hace tiempo que no se invierte (la inversión es un hecho: sin reserva).
  if (haceMesesInversion != null && haceMesesInversion >= 3) {
    insights.push(`Hace ${haceMesesInversion} meses que no registras una aportación a inversión.`)
  }

  // Objetivo cerca de cumplirse. Si sigue liquidez/patrimonio y NO está
  // reconciliado, el progreso es una estimación → se redacta con la reserva.
  for (const o of objetivos) {
    if (o.cercaDeCumplir) {
      const base = `Tu objetivo "${o.nombre}" está al ${o.progresoPct}%.`
      insights.push(o.fiabilidadEstimada && !reconciliada ? `${base} (${RESERVA})` : base)
    }
  }

  return insights.slice(0, 4)
}

export function construirResumenIA(movimientos, { objetivos = [], objetivo } = {}) {
  const mes = filtrarMesActual(movimientos)
  const tMes = totalesDe(mes)
  const { ahorroMedio, invertidoMedio } = resumenMensualMedio(movimientos)
  const { estimacion: gastoEstimado, mesesUsados } = estimacionGastoMensual(movimientos)
  const bolsasCalc = bolsas(movimientos)
  const reconcISO = ultimaReconciliacion(movimientos)
  const reconciliada = reconcISO !== null

  // Gasto por categoría del mes actual y del anterior (solo consumo).
  const claveActual = claveMesActual()
  const clavePrevio = agregarPorMes(movimientos, 2)[0].clave
  const porCategoria = gastoPorCategoriaMes(movimientos, claveActual)
  const porCategoriaPrev = gastoPorCategoriaMes(movimientos, clavePrevio)
  const subidaCat = mayorSubidaCategoria(porCategoria, porCategoriaPrev)

  // Serie de tasa de ahorro (meses con ingresos) → media y tendencia.
  const serie = agregarPorMes(movimientos, 6).filter((m) => m.ingresos > 0)
  const tasaMedia = serie.length ? serie.reduce((a, m) => a + m.ratioAhorro, 0) / serie.length : 0
  const tasaEste = tMes.ingresos > 0 ? Math.round(tMes.ratioAhorro) : null
  const tendencia =
    tasaEste == null
      ? 'sin_datos'
      : tasaEste > tasaMedia + 3
        ? 'subiendo'
        : tasaEste < tasaMedia - 3
          ? 'bajando'
          : 'estable'

  // Ritmo de inversión y cuándo fue la última aportación.
  const invMovs = movimientos.filter((m) => m.tipo === 'gasto' && esInversion(m))
  const mesesInvirtiendo = new Set(invMovs.map((m) => claveMes(m.fecha))).size
  let ultimaInvFecha = null
  for (const m of invMovs) if (!ultimaInvFecha || m.fecha > ultimaInvFecha) ultimaInvFecha = m.fecha
  const haceMesesInversion = mesesDesde(ultimaInvFecha)

  // Evolución de los últimos 6 meses (ahorro y gasto por mes).
  const evolucion = agregarPorMes(movimientos, 6).map((x) => ({
    mes: x.clave,
    ingresos: Math.round(x.ingresos),
    gastos: Math.round(x.gastos),
    ahorro: Math.round(x.ahorro),
    invertido: Math.round(x.invertido),
    tasaAhorroPct: Math.round(x.ratioAhorro),
  }))

  // Objetivos: progreso REAL según la bolsa que sigue cada objetivo (por tipo),
  // no el campo importe_actual (vestigial). fiabilidadEstimada = el progreso
  // depende de la liquidez y el saldo no está reconciliado (dato a matizar).
  const objetivosAhorro = objetivos.map((o) => {
    const tipo = o.tipo || 'liquidez'
    const actual = Math.round(valorBolsaPorTipo(bolsasCalc, tipo))
    const meta = Math.round(Number(o.importe_objetivo))
    const progresoPct = meta > 0 ? Math.round((actual / meta) * 100) : 0
    return {
      nombre: o.nombre,
      tipo,
      objetivo: meta,
      actual,
      progresoPct,
      cercaDeCumplir: progresoPct >= 80 && progresoPct < 100,
      fiabilidadEstimada: tipo !== 'inversion' && !reconciliada,
      fecha: o.fecha_objetivo ?? null,
    }
  })

  const insights = construirInsights({
    tasaEste,
    tasaMedia,
    tendencia,
    subidaCat,
    haceMesesInversion,
    objetivos: objetivosAhorro,
    reconciliada,
  })

  return {
    moneda: 'EUR',
    objetivoUsuario: objetivo ?? null,
    mesActual: {
      clave: claveActual,
      ingresos: Math.round(tMes.ingresos),
      gastos: Math.round(tMes.gastos),
      ahorro: Math.round(tMes.ahorro),
      invertido: Math.round(tMes.invertido),
      ratioAhorroPct: Math.round(tMes.ratioAhorro),
      gastoPorCategoria: Object.fromEntries(
        Object.entries(porCategoria).map(([k, v]) => [k, Math.round(v)]),
      ),
    },
    tasaAhorro: {
      esteMesPct: tasaEste,
      mediaPct: Math.round(tasaMedia),
      tendencia, // 'subiendo' | 'bajando' | 'estable' | 'sin_datos'
    },
    inversion: {
      esteMes: Math.round(tMes.invertido),
      mediaMensual: Math.round(invertidoMedio),
      totalAcumulado: Math.round(bolsasCalc.bolsaInversion),
      mesesInvirtiendo,
      haceMesesUltimaAportacion: haceMesesInversion,
    },
    bolsas: {
      liquidez: Math.round(bolsasCalc.bolsaLiquidez),
      inversion: Math.round(bolsasCalc.bolsaInversion),
      patrimonio: Math.round(bolsasCalc.patrimonio),
    },
    // Fiabilidad de las cifras de stock: si el saldo NO está reconciliado, la
    // liquidez y el patrimonio son ESTIMACIONES a partir de lo registrado.
    fiabilidad: {
      liquidezReconciliada: reconciliada,
      ultimaReconciliacion: reconcISO,
      nota: reconciliada
        ? 'El saldo fue reconciliado; la liquidez y el patrimonio son fiables.'
        : 'La liquidez y el patrimonio son estimaciones a partir de lo registrado: el usuario aún no ha reconciliado su saldo real. No afirmes estas cifras como hechos.',
    },
    medias: {
      ahorroMensualMedio: Math.round(ahorroMedio),
      gastoMensualEstimado: Math.round(gastoEstimado),
      mesesDeHistorial: mesesUsados,
    },
    invertidoTotalAcumulado: Math.round(bolsasCalc.bolsaInversion),
    evolucion6Meses: evolucion,
    objetivosAhorro,
    // Observaciones no alarmistas ya calculadas (base de proactividad, Fase 3).
    // Las que tocan liquidez/patrimonio no reconciliado ya llevan su reserva.
    insights,
  }
}
