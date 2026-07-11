import { agregarPorMes, totalesDe } from './movimientosUtils'

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de logros por niveles, fácilmente ampliable: cada logro es una
// entrada del array HITOS con {id, categoria, icono, titulo, mensaje, metric,
// meta}. Se "alcanza" cuando la métrica del usuario >= meta. Para añadir uno
// nuevo basta con añadir una entrada (y, si hace falta, una métrica nueva en
// calcularMetricas). Cada logro se celebra UNA vez por usuario.
// ─────────────────────────────────────────────────────────────────────────────

export const HITOS = [
  // Ahorro acumulado
  { id: 'ahorro_200', categoria: 'Ahorro', icono: '◆', meta: 200, metric: 'ahorroAcumulado',
    titulo: 'Primeros 200 €', mensaje: 'Has acumulado 200 € de ahorro. El primer peldaño está puesto.' },
  { id: 'ahorro_500', categoria: 'Ahorro', icono: '◆', meta: 500, metric: 'ahorroAcumulado',
    titulo: '500 € ahorrados', mensaje: 'Ya llevas 500 € ahorrados. Esto empieza a coger forma.' },
  { id: 'ahorro_1000', categoria: 'Ahorro', icono: '◆', meta: 1000, metric: 'ahorroAcumulado',
    titulo: '1.000 € ahorrados', mensaje: 'Tu primer millar ahorrado. Un colchón de verdad.' },
  { id: 'ahorro_2500', categoria: 'Ahorro', icono: '◆', meta: 2500, metric: 'ahorroAcumulado',
    titulo: '2.500 € ahorrados', mensaje: 'Vas en serio: 2.500 € acumulados.' },
  { id: 'ahorro_5000', categoria: 'Ahorro', icono: '◆', meta: 5000, metric: 'ahorroAcumulado',
    titulo: '5.000 € ahorrados', mensaje: 'Cinco mil euros ahorrados. Esto ya es una palanca.' },
  { id: 'ahorro_10000', categoria: 'Ahorro', icono: '◆', meta: 10000, metric: 'ahorroAcumulado',
    titulo: '10.000 € ahorrados', mensaje: 'Diez mil euros. Un colchón sólido y una base para invertir.' },
  { id: 'ahorro_25000', categoria: 'Ahorro', icono: '◆', meta: 25000, metric: 'ahorroAcumulado',
    titulo: '25.000 € ahorrados', mensaje: '25.000 € ahorrados. Muy poca gente llega aquí a tu edad.' },
  { id: 'ahorro_50000', categoria: 'Ahorro', icono: '◆', meta: 50000, metric: 'ahorroAcumulado',
    titulo: '50.000 € ahorrados', mensaje: 'Medio objetivo de mucha gente, ya conseguido. Imparable.' },

  // Inversión acumulada
  { id: 'primera_inversion', categoria: 'Inversión', icono: '▲', meta: 0.01, metric: 'invertidoTotal',
    titulo: 'Primera inversión', mensaje: 'Has puesto tu dinero a trabajar por primera vez. Así empieza el interés compuesto.' },
  { id: 'inversion_1000', categoria: 'Inversión', icono: '▲', meta: 1000, metric: 'invertidoTotal',
    titulo: '1.000 € invertidos', mensaje: 'Ya has invertido 1.000 €. El tiempo empieza a trabajar a tu favor.' },
  { id: 'inversion_5000', categoria: 'Inversión', icono: '▲', meta: 5000, metric: 'invertidoTotal',
    titulo: '5.000 € invertidos', mensaje: '5.000 € invertidos. El interés compuesto ya se nota.' },
  { id: 'inversion_10000', categoria: 'Inversión', icono: '▲', meta: 10000, metric: 'invertidoTotal',
    titulo: '10.000 € invertidos', mensaje: 'Diez mil euros invertidos. Tu dinero ya trabaja de verdad.' },
  { id: 'inversion_25000', categoria: 'Inversión', icono: '▲', meta: 25000, metric: 'invertidoTotal',
    titulo: '25.000 € invertidos', mensaje: '25.000 € invertidos. La bola de nieve coge velocidad.' },
  { id: 'inversion_50000', categoria: 'Inversión', icono: '▲', meta: 50000, metric: 'invertidoTotal',
    titulo: '50.000 € invertidos', mensaje: '50.000 € invertidos. Estás construyendo libertad futura.' },

  // Constancia
  { id: 'dias_7', categoria: 'Constancia', icono: '✦', meta: 7, metric: 'diasActivos',
    titulo: '7 días registrando', mensaje: 'Llevas 7 días distintos registrando tus finanzas. La constancia es la palanca.' },
  { id: 'dias_30', categoria: 'Constancia', icono: '✦', meta: 30, metric: 'diasActivos',
    titulo: '30 días registrando', mensaje: '30 días registrando. Ya es un hábito, no un esfuerzo.' },
  { id: 'ahorro_20', categoria: 'Constancia', icono: '◇', meta: 20, metric: 'ratioAhorroMes',
    titulo: '20% de ahorro', mensaje: 'Has ahorrado más del 20% de tus ingresos este mes. Un ritmo excelente.' },
  { id: 'meses_3_ahorro', categoria: 'Constancia', icono: '◇', meta: 3, metric: 'mesesSeguidosAhorrando',
    titulo: '3 meses ahorrando', mensaje: 'Tres meses seguidos cerrando en positivo. Eso construye patrimonio.' },
  { id: 'objetivo_inversion', categoria: 'Constancia', icono: '◎', meta: 1, metric: 'objetivoInversionCumplido',
    titulo: 'Objetivo de inversión', mensaje: 'Has cumplido tu objetivo de inversión de este mes. ¡Sigue así!' },

  // Objetivos de ahorro completados
  { id: 'objetivo_1', categoria: 'Objetivos', icono: '★', meta: 1, metric: 'objetivosCompletados',
    titulo: 'Primer objetivo cumplido', mensaje: 'Has completado tu primer objetivo de ahorro. Fijar metas funciona.' },
  { id: 'objetivo_3', categoria: 'Objetivos', icono: '★', meta: 3, metric: 'objetivosCompletados',
    titulo: '3 objetivos cumplidos', mensaje: 'Tres objetivos de ahorro completados. Eres constante de verdad.' },
]

export const CATEGORIAS_HITOS = ['Ahorro', 'Inversión', 'Constancia', 'Objetivos']

// Días distintos (por fecha de registro) en los que el usuario registró algo.
function diasActivos(movimientos) {
  const dias = new Set()
  for (const m of movimientos) {
    if (m.created_at) dias.add(m.created_at.slice(0, 10))
  }
  return dias.size
}

// Racha de meses consecutivos (terminando en el actual) cerrando en positivo.
function mesesSeguidosAhorrando(movimientos) {
  const meses = agregarPorMes(movimientos, 24)
  let racha = 0
  for (let i = meses.length - 1; i >= 0; i -= 1) {
    const m = meses[i]
    if (m.ingresos > 0 && m.ahorro > 0) racha += 1
    else if (m.ingresos > 0 || m.gastos > 0 || m.invertido > 0) break
    else break
  }
  return racha
}

export function calcularMetricas({ movimientos, movimientosMes, objetivoInversion = 0, objetivos = [] }) {
  const totalHist = totalesDe(movimientos)
  const totalMes = totalesDe(movimientosMes)
  const objetivosCompletados = objetivos.filter(
    (o) => Number(o.importe_actual) >= Number(o.importe_objetivo),
  ).length

  return {
    ahorroAcumulado: Math.max(0, totalHist.ahorro),
    invertidoTotal: totalHist.invertido,
    diasActivos: diasActivos(movimientos),
    ratioAhorroMes: totalMes.ingresos > 0 ? totalMes.ratioAhorro : 0,
    mesesSeguidosAhorrando: mesesSeguidosAhorrando(movimientos),
    objetivoInversionCumplido: objetivoInversion > 0 && totalMes.invertido >= objetivoInversion ? 1 : 0,
    objetivosCompletados,
  }
}

// Conjunto de ids de hitos alcanzados con el estado actual.
export function detectarHitos(estado) {
  const m = calcularMetricas(estado)
  const alcanzados = new Set()
  for (const hito of HITOS) {
    if ((m[hito.metric] ?? 0) >= hito.meta) alcanzados.add(hito.id)
  }
  return alcanzados
}

// Estado completo para la pantalla "camino de logros": cada hito con su valor,
// progreso (0..1) y si está desbloqueado.
export function estadoLogros(estado) {
  const m = calcularMetricas(estado)
  return HITOS.map((hito) => {
    const valor = m[hito.metric] ?? 0
    return {
      ...hito,
      valor,
      alcanzado: valor >= hito.meta,
      progreso: Math.min(valor / hito.meta, 1),
    }
  })
}

// ── Persistencia de celebraciones vistas ────────────────────────────────────
const claveStorage = (usuarioId) => `palanca_hitos_${usuarioId}`

function leerVistos(usuarioId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(claveStorage(usuarioId)) || '[]'))
  } catch {
    return new Set()
  }
}

function guardarVistos(usuarioId, set) {
  localStorage.setItem(claveStorage(usuarioId), JSON.stringify([...set]))
}

function baselineHecho(usuarioId) {
  return localStorage.getItem(`${claveStorage(usuarioId)}_baseline`) === '1'
}
function marcarBaseline(usuarioId) {
  localStorage.setItem(`${claveStorage(usuarioId)}_baseline`, '1')
}

// Hito recién alcanzado (para celebrar) o null. En el primer arranque solo fija
// la baseline (no celebra retroactivamente lo que el usuario ya tenía).
export function detectarNuevoHito(usuarioId, estado) {
  const alcanzados = detectarHitos(estado)

  if (!baselineHecho(usuarioId)) {
    guardarVistos(usuarioId, alcanzados)
    marcarBaseline(usuarioId)
    return null
  }

  const vistos = leerVistos(usuarioId)
  const nuevos = HITOS.filter((h) => alcanzados.has(h.id) && !vistos.has(h.id))
  if (nuevos.length === 0) return null
  return nuevos[0]
}

export function marcarHitoVisto(usuarioId, id) {
  const vistos = leerVistos(usuarioId)
  vistos.add(id)
  guardarVistos(usuarioId, vistos)
}

// Marca TODOS los hitos ya alcanzados como vistos (al cerrar una celebración en
// cadena o para no acumular pendientes tras ver el camino).
export function marcarTodosVistos(usuarioId, estado) {
  const alcanzados = detectarHitos(estado)
  guardarVistos(usuarioId, alcanzados)
  marcarBaseline(usuarioId)
}
