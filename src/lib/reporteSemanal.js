import { claveMes, totalesDe } from './movimientosUtils'
import { formatearEuros } from './categorias'

// ── Reporte semanal por usuario ────────────────────────────────────────────
// Genera el CONTENIDO de un resumen semanal (gasto, ahorro, inversión + 1
// insight personalizado). Es JS puro y agnóstico de React/DOM, para poder
// llamarlo también desde una Supabase Edge Function (ver docs/REPORTE_SEMANAL.md).
// Espera movimientos con { tipo, importe, fecha, categoria: { nombre } }.

// Formatea con componentes LOCALES (evita el desfase de un día que provoca
// toISOString en zonas horarias con offset positivo).
function ymd(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha)
  d.setDate(d.getDate() + dias)
  return d
}

// Rango de la última semana COMPLETA lunes→domingo anterior a `hoy`.
export function rangoSemanaAnterior(hoy = new Date()) {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const diaSemana = (d.getDay() + 6) % 7 // 0 = lunes
  const lunesEsta = sumarDias(d, -diaSemana)
  const lunesAnterior = sumarDias(lunesEsta, -7)
  const domingoAnterior = sumarDias(lunesAnterior, 6)
  return { desde: ymd(lunesAnterior), hasta: ymd(domingoAnterior) }
}

function enRango(movimientos, desde, hasta) {
  return movimientos.filter((m) => m.fecha >= desde && m.fecha <= hasta)
}

function variacionPct(hoy, antes) {
  if (antes === 0) return null
  return ((hoy - antes) / antes) * 100
}

// Elige 1 insight personalizado y accionable a partir de la semana y su previa.
function construirInsight(actual, anterior) {
  if (actual.ingresos === 0 && actual.gastos === 0 && actual.invertido === 0) {
    return 'No registraste movimientos esta semana. Anotar aunque sea un gasto te ayuda a no perder el hilo.'
  }
  if (actual.invertido > 0) {
    return `Invertiste ${formatearEuros(actual.invertido)} esta semana: ese dinero empieza a trabajar por ti desde hoy.`
  }
  const vGasto = variacionPct(actual.gastos, anterior.gastos)
  if (vGasto !== null && vGasto <= -10) {
    return `Gastaste un ${Math.round(Math.abs(vGasto))}% menos que la semana anterior. Ese margen es ideal para ahorrar o invertir.`
  }
  if (vGasto !== null && vGasto >= 15) {
    return `Esta semana gastaste un ${Math.round(vGasto)}% más que la anterior. Revisa tus gastos variables para reequilibrar.`
  }
  if (actual.ahorro > 0) {
    return `Ahorraste ${formatearEuros(actual.ahorro)} esta semana. Constancia es la palanca del largo plazo.`
  }
  return 'Esta semana gastaste más de lo que ingresaste. Un pequeño ajuste en gastos variables le da la vuelta.'
}

// Devuelve el reporte estructurado + textos listos para el email.
export function generarReporteSemanal(movimientos, hoy = new Date()) {
  const { desde, hasta } = rangoSemanaAnterior(hoy)
  const semana = totalesDe(enRango(movimientos, desde, hasta))

  // Semana previa (para comparar): los 7 días anteriores al rango.
  const lunesRango = new Date(`${desde}T00:00:00`)
  const prevDesde = ymd(sumarDias(lunesRango, -7))
  const prevHasta = ymd(sumarDias(lunesRango, -1))
  const semanaPrevia = totalesDe(enRango(movimientos, prevDesde, prevHasta))

  const hayActividad =
    semana.ingresos > 0 || semana.gastos > 0 || semana.invertido > 0

  const insight = construirInsight(semana, semanaPrevia)

  const asunto = hayActividad
    ? `Tu semana en Palanca: ${formatearEuros(semana.ahorro)} de ahorro`
    : 'Tu semana en Palanca'

  const textoPlano = [
    `Resumen del ${desde} al ${hasta}`,
    '',
    `Ingresos: ${formatearEuros(semana.ingresos)}`,
    `Gastos: ${formatearEuros(semana.gastos)}`,
    `Ahorro: ${formatearEuros(semana.ahorro)}`,
    `Invertido: ${formatearEuros(semana.invertido)}`,
    '',
    insight,
    '',
    'Abre Palanca para ver tu proyección de futuro: https://palanca-zeta.vercel.app',
  ].join('\n')

  return {
    periodo: { desde, hasta },
    mesReferencia: claveMes(hasta),
    ingresos: semana.ingresos,
    gastos: semana.gastos,
    ahorro: semana.ahorro,
    invertido: semana.invertido,
    comparativaGastoPct: variacionPct(semana.gastos, semanaPrevia.gastos),
    insight,
    asunto,
    textoPlano,
  }
}

// HTML mínimo para el cuerpo del email (colores del sistema de Palanca).
export function reporteAHtml(reporte) {
  const fila = (etiqueta, valor, color) =>
    `<tr><td style="padding:6px 0;color:#a8adc0">${etiqueta}</td>` +
    `<td style="padding:6px 0;text-align:right;font-weight:700;color:${color}">${formatearEuros(valor)}</td></tr>`

  return `<div style="background:#0a0b10;color:#f5f6fa;font-family:system-ui,sans-serif;padding:24px;border-radius:16px;max-width:480px">
  <h2 style="margin:0 0 4px">Tu semana en Palanca</h2>
  <p style="margin:0 0 16px;color:#a8adc0;font-size:13px">${reporte.periodo.desde} — ${reporte.periodo.hasta}</p>
  <table style="width:100%;border-collapse:collapse;font-size:15px">
    ${fila('Ingresos', reporte.ingresos, '#34e89e')}
    ${fila('Gastos', reporte.gastos, '#ff5d7e')}
    ${fila('Ahorro', reporte.ahorro, '#34e89e')}
    ${fila('Invertido', reporte.invertido, '#f5b93d')}
  </table>
  <p style="margin:16px 0;padding:12px 14px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.25);border-radius:12px;font-size:14px">${reporte.insight}</p>
  <a href="https://palanca-zeta.vercel.app" style="display:inline-block;padding:12px 20px;border-radius:8px;background:linear-gradient(90deg,#8b5cf6,#22d3ee);color:#fff;text-decoration:none;font-weight:600">Abrir Palanca</a>
</div>`
}
