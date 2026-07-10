import { totalesDe } from './movimientosUtils'

// Píldoras educativas: breves, contextuales y descartables. Cada una se
// silencia de forma permanente al cerrarla (localStorage por usuario).

const claveStorage = (usuarioId) => `palanca_pildoras_${usuarioId}`

export function pildoraDescartada(usuarioId, id) {
  try {
    const set = new Set(JSON.parse(localStorage.getItem(claveStorage(usuarioId)) || '[]'))
    return set.has(id)
  } catch {
    return false
  }
}

export function descartarPildora(usuarioId, id) {
  try {
    const set = new Set(JSON.parse(localStorage.getItem(claveStorage(usuarioId)) || '[]'))
    set.add(id)
    localStorage.setItem(claveStorage(usuarioId), JSON.stringify([...set]))
  } catch {
    // sin persistencia, no pasa nada
  }
}

// Píldora más relevante para el dashboard según el estado del mes.
// Devuelve {id, texto, cta?} o null. Prioridad de arriba abajo.
export function pildoraDashboard({ movimientos, movimientosMes }) {
  const total = totalesDe(movimientosMes)
  const invertidoTotal = movimientos.reduce(
    (s, m) => s + (m.tipo === 'gasto' && m.categoria?.nombre === 'Inversion' ? Number(m.importe) : 0),
    0,
  )

  if (total.ingresos === 0) return null

  if (total.ahorro < 0) {
    return {
      id: 'gasto_mayor_ingreso',
      texto:
        'Este mes gastas más de lo que ingresas. Empieza por los gastos variables: son los más fáciles de ajustar.',
    }
  }

  if (invertidoTotal === 0 && total.ahorro > 0) {
    return {
      id: 'ahorro_parado',
      texto:
        'El dinero parado pierde valor con la inflación. Invertir una parte, aunque sea poca, lo pone a crecer con el tiempo.',
      cta: { texto: 'Ver inversión', pestana: 'inversiones' },
    }
  }

  if (total.ratioAhorro >= 30) {
    return {
      id: 'excedente_alto',
      texto:
        'Ahorras por encima del 30% de tus ingresos. Un excedente así, invertido con constancia, es lo que marca la diferencia a largo plazo.',
      cta: { texto: 'Proyectar futuro', pestana: 'simulador' },
    }
  }

  return null
}

// Píldora fija de la pantalla de inversión: qué es el interés compuesto.
export const PILDORA_INVERSION = {
  id: 'interes_compuesto',
  texto:
    'Interés compuesto: los intereses que ganas también generan intereses. Cuanto antes empieces, más trabaja el tiempo a tu favor.',
}
