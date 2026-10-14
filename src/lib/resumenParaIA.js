import { resumenDelMes } from './inicio'
import { cobrosProximos, estadoCobro, costeAnual, costeMensual, periodoDe } from './periodicidad'
import { calcularAvisos } from './avisos'
import { esInversion } from './categorias'
import {
  agregarPorMes,
  bolsas,
  claveMes,
  claveMesActual,
  diasRestantesDelMes,
  estimacionGastoMensual,
  filtrarMesActual,
  filtrarPorMes,
  gastoPorCategoria,
  limiteGastoPresupuesto,
  proyectarInteresCompuesto,
  resumenMensualMedio,
  ritmoMensualPorTipo,
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
  return Object.fromEntries(gastoPorCategoria(filtrarPorMes(movimientos, clave)))
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

// Presupuesto del mes (pestaña Presupuesto): límite de gasto según el método
// elegido, cuánto lleva gastado, cuánto le queda y a qué ritmo diario.
function resumenPresupuesto(p, tMes) {
  const limite = p?.configurado === false ? null : limiteGastoPresupuesto(p ?? {}, tMes.ingresos)
  if (limite == null) return { configurado: false }
  const diasRestantes = diasRestantesDelMes()
  const restante = limite - tMes.gastos
  return {
    configurado: true,
    metodo: p.metodo === 'fijo' ? 'gasto máximo fijo' : `tasa de ahorro objetivo del ${p.tasaAhorroObjetivo} %`,
    limiteGastoMes: Math.round(limite),
    gastadoMes: Math.round(tMes.gastos),
    restante: Math.round(restante),
    diasRestantesMes: diasRestantes,
    puedeGastarAlDia: restante > 0 ? Math.round(restante / diasRestantes) : 0,
    objetivoInversionMensual: p.objetivoInversionMensual ?? null,
  }
}

// Textos libres del usuario, recortados (coste y tope de tamaño).
const recortar = (t, n = 60) => String(t ?? '').slice(0, n)

function resumenFijos(recurrentes, movimientos, descartadas) {
  const activos = recurrentes.filter((r) => r.activo && r.tipo === 'gasto')
  const cent = (x) => Math.round(x * 100)
  return {
    nCompromisos: activos.length,
    costeMensualProrrateado: Math.round(activos.reduce((s, r) => s + cent(costeMensual(r)), 0) / 100),
    costeAnual: Math.round(activos.reduce((s, r) => s + cent(costeAnual(r)), 0) / 100),
    compromisos: activos.slice(0, 25).map((r) => ({
      nombre: recortar(r.nombre),
      importe: Number(r.importe) || 0,
      periodicidad: periodoDe(r).id,
      costeAnual: Math.round(costeAnual(r)),
    })),
    // Cobros cuyo día ya llegó y el usuario aún no ha confirmado en Fijos.
    porConfirmar: activos.filter((r) => estadoCobro(r) === 'confirmar').map((r) => recortar(r.nombre)),
    sinDiaDeCobro: activos.filter((r) => estadoCobro(r) === 'sin-dia').map((r) => recortar(r.nombre)),
    proximos30Dias: cobrosProximos(activos, 30).map((c) => ({ nombre: recortar(c.rec.nombre), importe: c.importe, cuando: c.texto })),
    avisos: calcularAvisos(recurrentes, movimientos, new Date(), { descartadas }).map((a) => `${a.titulo}: ${a.detalle}`),
  }
}

export function construirResumenIA(
  movimientos,
  { objetivos = [], objetivo, recurrentes = [], presupuesto = null, descartadas = new Set() } = {},
) {
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
  const ritmos = ritmoMensualPorTipo(movimientos)
  // Acotado (como los fijos): el resumen nunca debe superar el tope del servidor.
  const objetivosAhorro = objetivos.slice(0, 15).map((o) => {
    const tipo = o.tipo || 'liquidez'
    const actual = Math.round(valorBolsaPorTipo(bolsasCalc, tipo))
    const meta = Math.round(Number(o.importe_objetivo))
    const progresoPct = meta > 0 ? Math.round((actual / meta) * 100) : 0
    // A su ritmo real (media mensual de la bolsa que sigue), ¿cuándo llega?
    const ritmo = Math.round(ritmos[tipo] ?? 0)
    const falta = Math.max(0, meta - actual)
    return {
      nombre: recortar(o.nombre),
      tipo,
      objetivo: meta,
      actual,
      progresoPct,
      faltan: falta,
      ritmoMensual: ritmo,
      mesesParaAlcanzarloASuRitmo: falta === 0 ? 0 : ritmo > 0 ? Math.ceil(falta / ritmo) : null,
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
    objetivoUsuario: objetivo ? recortar(objetivo, 300) : null,
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
      // Su ingreso principal suele llegar más adelante este mes (p. ej. pensión
      // el 25): el mes no va "en negativo", solo va por delante del cobro.
      ...(() => {
        const r = resumenDelMes(movimientos)
        return r.ingresoPendiente ? { ingresoAunNoLlegado: true, diaIngresoHabitual: r.diaIngresoHabitual } : {}
      })(),
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
    },
    medias: {
      ahorroMensualMedio: Math.round(ahorroMedio),
      gastoMensualEstimado: Math.round(gastoEstimado),
      mesesDeHistorial: mesesUsados,
    },
    evolucion6Meses: evolucion,
    objetivosAhorro,
    presupuesto: resumenPresupuesto(presupuesto, tMes),
    // Lo que muestra la "Proyección de futuro" del dashboard: el ahorro medio
    // mensual sostenido 10 años, parado (0 %) o invertido (7 % anual, supuesto
    // ilustrativo, no una promesa).
    proyeccion10Anios: ahorroMedio > 0
      ? {
          ahorroMensualSupuesto: Math.round(ahorroMedio),
          dineroParado: Math.round(proyectarInteresCompuesto({ mensual: ahorroMedio, anios: 10 }).valorFinal),
          invertidoAl7: Math.round(proyectarInteresCompuesto({ mensual: ahorroMedio, anios: 10, rentabilidadAnual: 7 }).valorFinal),
        }
      : null,
    // Suscripciones y gastos fijos (pestaña Fijos): coste prorrateado, próximos
    // cobros y avisos (renovaciones, subidas de precio).
    fijos: resumenFijos(recurrentes, movimientos, descartadas),
    // Observaciones no alarmistas ya calculadas (base de proactividad, Fase 3).
    // Las que tocan liquidez/patrimonio no reconciliado ya llevan su reserva.
    insights,
  }
}
