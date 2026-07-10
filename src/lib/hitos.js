import { totalesDe } from './movimientosUtils'

// Definición de hitos. Cada uno se celebra UNA sola vez por usuario.
export const HITOS = {
  primera_inversion: {
    icono: '▲',
    titulo: 'Primera inversión',
    mensaje: 'Has puesto tu dinero a trabajar por primera vez. Así empieza el interés compuesto.',
  },
  ahorro_20: {
    icono: '◆',
    titulo: '20% de ahorro',
    mensaje: 'Has ahorrado más del 20% de tus ingresos este mes. Un ritmo excelente.',
  },
  dias_7: {
    icono: '✦',
    titulo: '7 días registrando',
    mensaje: 'Llevas 7 días distintos registrando tus finanzas. La constancia es la palanca.',
  },
  objetivo_inversion: {
    icono: '◎',
    titulo: 'Objetivo de inversión',
    mensaje: 'Has cumplido tu objetivo de inversión de este mes. ¡Sigue así!',
  },
}

// Días distintos (por fecha de registro) en los que el usuario ha registrado algo.
function diasActivos(movimientos) {
  const dias = new Set()
  for (const m of movimientos) {
    if (m.created_at) dias.add(m.created_at.slice(0, 10))
  }
  return dias.size
}

// Devuelve el conjunto de ids de hitos ALCANZADOS con el estado actual.
export function detectarHitos({ movimientos, movimientosMes, objetivoInversion }) {
  const alcanzados = new Set()
  const totalMes = totalesDe(movimientosMes)

  const invertidoTotal = movimientos.reduce(
    (s, m) => s + (m.tipo === 'gasto' && m.categoria?.nombre === 'Inversion' ? Number(m.importe) : 0),
    0,
  )
  if (invertidoTotal > 0) alcanzados.add('primera_inversion')

  if (totalMes.ingresos > 0 && totalMes.ratioAhorro >= 20) alcanzados.add('ahorro_20')

  if (diasActivos(movimientos) >= 7) alcanzados.add('dias_7')

  if (objetivoInversion > 0 && totalMes.invertido >= objetivoInversion) {
    alcanzados.add('objetivo_inversion')
  }

  return alcanzados
}

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

// Marca como "vistos" todos los hitos ya alcanzados sin celebrar. Se llama la
// primera vez que un usuario abre la app tras añadir esta función, para no
// celebrar retroactivamente lo que ya tenía.
function baselineHecho(usuarioId) {
  return localStorage.getItem(`${claveStorage(usuarioId)}_baseline`) === '1'
}
function marcarBaseline(usuarioId) {
  localStorage.setItem(`${claveStorage(usuarioId)}_baseline`, '1')
}

// Devuelve el hito recién alcanzado (para celebrar) o null, SIN marcarlo como
// visto (eso se hace al cerrar la celebración, para que sea estable ante
// remontajes). En el primer arranque solo fija la baseline.
export function detectarNuevoHito(usuarioId, estado) {
  const alcanzados = detectarHitos(estado)

  if (!baselineHecho(usuarioId)) {
    guardarVistos(usuarioId, alcanzados)
    marcarBaseline(usuarioId)
    return null
  }

  const vistos = leerVistos(usuarioId)
  const nuevos = [...alcanzados].filter((id) => !vistos.has(id))
  if (nuevos.length === 0) return null

  const id = nuevos[0]
  return { id, ...HITOS[id] }
}

// Se llama al cerrar la celebración: marca el hito como visto para no repetirlo.
export function marcarHitoVisto(usuarioId, id) {
  const vistos = leerVistos(usuarioId)
  vistos.add(id)
  guardarVistos(usuarioId, vistos)
}
