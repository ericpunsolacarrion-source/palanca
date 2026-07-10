import { esInversion } from './categorias'
import { agregarPorMes, claveMes, claveMesActual, totalesDe, ultimosNMeses } from './movimientosUtils'

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

// Inversión total por mes ('2026-07' -> importe), solo movimientos de inversión.
function invertidoPorMes(movimientos) {
  const mapa = new Map()
  for (const m of movimientos) {
    if (m.tipo === 'gasto' && esInversion(m)) {
      const clave = claveMes(m.fecha)
      mapa.set(clave, (mapa.get(clave) ?? 0) + Number(m.importe))
    }
  }
  return mapa
}

// Categoría de gasto (consumo) cuyo gasto de este mes se dispara más respecto a
// su propia media de los meses anteriores. Devuelve {nombre, actual, media} o null.
function categoriaDisparada(movimientos) {
  const meses = ultimosNMeses(7)
  const idx = new Map(meses.map((m, i) => [m.clave, i]))
  const porCat = new Map()
  for (const m of movimientos) {
    if (m.tipo !== 'gasto' || esInversion(m)) continue
    const i = idx.get(claveMes(m.fecha))
    if (i === undefined) continue
    const nombre = m.categoria?.nombre ?? 'Sin categoría'
    if (!porCat.has(nombre)) porCat.set(nombre, new Array(7).fill(0))
    porCat.get(nombre)[i] += Number(m.importe)
  }

  let mejor = null
  for (const [nombre, serie] of porCat) {
    const actual = serie[6]
    const previos = serie.slice(0, 6).filter((v) => v > 0)
    if (previos.length < 2 || actual <= 0) continue
    const media = previos.reduce((a, b) => a + b, 0) / previos.length
    if (media <= 0) continue
    const ratio = actual / media
    // Salto claro (>=50 %) y con importe relevante (evita ruido de cifras pequeñas).
    if (ratio >= 1.5 && actual - media >= 60) {
      if (mejor === null || ratio > mejor.ratio) mejor = { nombre, actual, media, ratio }
    }
  }
  return mejor
}

// Genera TODAS las píldoras relevantes para el estado actual, en orden de
// prioridad (más arriba = más importante). El selector elige la primera no
// descartada, así al cerrar una aparece la siguiente.
export function pildorasDashboard({ movimientos, movimientosMes, objetivoInversion = null }) {
  const total = totalesDe(movimientosMes)
  const candidatas = []

  // Sin ingresos aún no hay contexto que interpretar.
  if (total.ingresos === 0) return candidatas

  const invMes = invertidoPorMes(movimientos)
  const invertidoTotal = [...invMes.values()].reduce((a, b) => a + b, 0)
  const claveAct = claveMesActual()
  const [mesAnterior, mesActual] = agregarPorMes(movimientos, 2)

  // 1) Gastas más de lo que ingresas (urgente).
  if (total.ahorro < 0) {
    candidatas.push({
      id: 'gasto_mayor_ingreso',
      texto:
        'Este mes gastas más de lo que ingresas. Empieza por los gastos variables: son los más fáciles de ajustar.',
    })
  }

  // 2) Una categoría se ha disparado respecto a su media.
  const disparada = categoriaDisparada(movimientos)
  if (disparada) {
    const pct = Math.round((disparada.ratio - 1) * 100)
    candidatas.push({
      id: 'categoria_disparada',
      texto: `Tu gasto en ${disparada.nombre} este mes es un ${pct}% mayor que tu media. Échale un vistazo: quizá haya algo puntual o una fuga que puedas frenar.`,
    })
  }

  // 3) Tienes ahorro parado sin invertir nada todavía.
  if (invertidoTotal === 0 && total.ahorro > 0) {
    candidatas.push({
      id: 'ahorro_parado',
      texto:
        'El dinero parado pierde valor con la inflación. Invertir una parte, aunque sea poca, lo pone a crecer con el tiempo.',
      cta: { texto: 'Ver inversión', pestana: 'inversiones' },
    })
  }

  // 4) Acabas de hacer tu primera inversión (solo hay inversión en el mes actual).
  if (invMes.size === 1 && invMes.has(claveAct) && (invMes.get(claveAct) ?? 0) > 0) {
    candidatas.push({
      id: 'primera_inversion',
      texto:
        'Has hecho tu primera inversión. Lo importante no es la cantidad, sino el hábito: aportar poco pero constante es lo que construye tu patrimonio.',
    })
  }

  // 5) Tu ratio de ahorro sube respecto al mes pasado.
  if (
    mesAnterior.ingresos > 0 &&
    mesActual.ratioAhorro - mesAnterior.ratioAhorro >= 5 &&
    mesActual.ratioAhorro > 0
  ) {
    candidatas.push({
      id: 'ratio_subiendo',
      texto: `Tu ratio de ahorro ha subido respecto al mes pasado. Mantener esta tendencia es lo que, mes a mes, cambia tu futuro.`,
      cta: { texto: 'Proyectar futuro', pestana: 'simulador' },
    })
  }

  // 6) Constancia: has invertido los últimos 3 meses seguidos.
  const ultimos3 = ultimosNMeses(3)
  if (ultimos3.every((m) => (invMes.get(m.clave) ?? 0) > 0)) {
    candidatas.push({
      id: 'constancia_inversion',
      texto:
        'Llevas tres meses seguidos invirtiendo. Esa constancia, con el interés compuesto, es exactamente lo que marca la diferencia a largo plazo.',
      cta: { texto: 'Ver proyección', pestana: 'simulador' },
    })
  }

  // 7) Cumples de sobra tu objetivo de inversión mensual.
  if (objetivoInversion && total.invertido >= objetivoInversion * 1.2) {
    candidatas.push({
      id: 'objetivo_inversion_superado',
      texto:
        'Estás invirtiendo por encima de tu objetivo mensual. Si puedes mantenerlo, plantéate subir el objetivo: tu yo del futuro te lo agradecerá.',
    })
  }

  // 8) Excedente alto y sostenible.
  if (total.ratioAhorro >= 30) {
    candidatas.push({
      id: 'excedente_alto',
      texto:
        'Ahorras por encima del 30% de tus ingresos. Un excedente así, invertido con constancia, es lo que marca la diferencia a largo plazo.',
      cta: { texto: 'Proyectar futuro', pestana: 'simulador' },
    })
  }

  return candidatas
}

// Elige la píldora de mayor prioridad que el usuario no haya descartado.
export function elegirPildora(usuarioId, candidatas) {
  return candidatas.find((p) => !pildoraDescartada(usuarioId, p.id)) ?? null
}

// Píldora fija de la pantalla de inversión: qué es el interés compuesto.
export const PILDORA_INVERSION = {
  id: 'interes_compuesto',
  texto:
    'Interés compuesto: los intereses que ganas también generan intereses. Cuanto antes empieces, más trabaja el tiempo a tu favor.',
}
