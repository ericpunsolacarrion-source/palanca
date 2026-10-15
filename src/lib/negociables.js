// PLAN DE AHORRO de recibos: qué gastos fijos se pueden NEGOCIAR (luz, gas,
// teléfono, seguros, banco, gimnasio) y cuáles no (Netflix y compañía tienen
// precio fijo: ahí el ahorro es pausar o rotar; el agua no se cambia de
// compañía). Para cada uno: ahorro orientativo, el MOMENTO ideal, pasos y un
// guion de llamada con sus propios datos. Lógica pura y testeable.
//
// Las horquillas de ahorro son ORIENTATIVAS y conservadoras (se muestran así
// en la app): dependen de cada contrato y de cada compañía.

import { reglaPara } from './categorizar'
import { costeAnual, periodoDe, proximoCobro } from './periodicidad'
import { formatearEuros } from './categorias'

export const PALANCAS = {
  energia: {
    titulo: 'Luz y gas',
    negociable: true,
    ahorro: [0.08, 0.2],
    momento: 'Ahora: estos contratos no suelen tener permanencia (compruébalo en tu factura).',
    pasos: [
      'Busca en tu última factura la potencia contratada (kW) y tu consumo anual (kWh).',
      'Compara ofertas con tus datos en el comparador oficial de la CNMC.',
      'Llama a tu compañía con la mejor oferta delante y pide que la igualen.',
      'Si no la igualan, cambiarte es gratis y no te cortan la luz: lo gestiona la nueva compañía.',
    ],
    enlace: { texto: 'Comparador oficial de la CNMC', url: 'https://comparador.cnmc.gob.es/' },
  },
  telefonia: {
    titulo: 'Móvil e internet',
    negociable: true,
    ahorro: [0.1, 0.3],
    momento: 'Ahora, si no tienes permanencia; si la tienes, el mes antes de que acabe.',
    pasos: [
      'Mira qué usas de verdad: gigas al mes, líneas y si ves la tele de pago.',
      'Busca dos ofertas de otras compañías para lo mismo que tienes.',
      'Llama a tu compañía y pide hablar con el departamento de bajas (retención).',
      'Si no mejoran el precio, pide la portabilidad a la nueva: no te quedas sin servicio.',
    ],
  },
  seguro: {
    titulo: 'Seguros',
    negociable: true,
    ahorro: [0.1, 0.25],
    momento: 'Entre 45 y 30 días antes de la renovación: para no renovar, hay que avisar con al menos un mes.',
    pasos: [
      'Ten a mano tu póliza: coberturas, franquicia y fecha de renovación.',
      'Pide dos o tres presupuestos con las MISMAS coberturas.',
      'Llama a tu aseguradora con el mejor presupuesto y pide que lo igualen.',
      'Si no lo hacen, comunica por escrito que no renuevas, al menos un mes antes de la fecha.',
    ],
  },
  banco: {
    titulo: 'Comisiones del banco',
    negociable: true,
    ahorro: [1, 1],
    momento: 'Ya: es dinero que se puede dejar de pagar del todo.',
    pasos: [
      'Pregunta qué condiciones quitan la comisión (nómina, recibos, uso de la tarjeta…).',
      'Pide que te la devuelvan si la cumplías o si es la primera vez.',
      'Si no la quitan, hay cuentas sin comisiones: cambiar de banco es gratis.',
    ],
  },
  gimnasio: {
    titulo: 'Gimnasio',
    negociable: true,
    ahorro: [0, 0.4],
    momento: 'Cuando vayas menos de una vez por semana.',
    pasos: [
      'Cuenta cuántas veces fuiste el último mes.',
      'Pregunta por cuotas más baratas (horario valle, sin clases) o por congelar la cuota.',
      'Si no lo usas, date de baja: lo retomarás cuando lo vayas a aprovechar.',
    ],
  },
  agua: {
    titulo: 'Agua',
    negociable: false,
    ahorro: [0, 0.05],
    momento: 'No se puede cambiar de compañía: la da el municipio.',
    pasos: [
      'Revisa si tu ayuntamiento tiene bonificaciones (familia numerosa, tarifa social).',
      'Un consumo alto sin explicación puede ser una fuga: compara con el año anterior.',
    ],
  },
  digital: {
    titulo: 'Suscripciones digitales',
    negociable: false,
    ahorro: [0, 1],
    momento: 'Precio fijo: no se negocia, pero puedes pausarla o rotarla.',
    pasos: [
      '¿La has usado este mes? Si no, pausa o date de baja: se vuelve cuando quieras.',
      'Rota: una plataforma cada mes en vez de todas a la vez.',
      'Mira el plan con anuncios o el plan familiar compartido.',
    ],
  },
}

// Tipo de palanca de un compromiso de Fijos (por su nombre o su categoría).
export function tipoNegociable(rec) {
  if (!rec || rec.tipo === 'ingreso') return null
  const regla = reglaPara(rec.nombre) ?? reglaPara(rec.categoriaNombre)
  if (regla?.negociable) return regla.negociable
  const cat = String(rec.categoriaNombre ?? '').toLowerCase()
  if (cat.includes('seguro')) return 'seguro'
  if (cat.includes('suscrip')) return 'digital'
  return null
}

const DIA = 86400000
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Cuándo actuar. En seguros (y cualquier anual/semestral) cuenta la fecha de
// renovación: la ventana buena es de 45 a 30 días antes.
export function momentoParaNegociar(rec, tipo, hoy = new Date()) {
  const palanca = PALANCAS[tipo]
  if (!palanca) return null
  if (tipo === 'seguro' || (palanca.negociable && periodoDe(rec).meses >= 6)) {
    const p = proximoCobro(rec, hoy)
    if (p && !p.sinDia) {
      const renov = new Date(`${p.fecha}T00:00:00`)
      const desde = new Date(renov.getTime() - 45 * DIA)
      const hasta = new Date(renov.getTime() - 30 * DIA)
      const fmt = (d) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')
      if (p.dias < 30) return { texto: `Renueva el ${fmt(renov)}: aún puedes pedir que te mejoren el precio`, urgente: true, fecha: p.fecha }
      if (p.dias <= 45) return { texto: `Es el momento: renueva el ${fmt(renov)}. Actúa antes del ${fmt(hasta)}`, urgente: true, fecha: iso(hasta) }
      return { texto: `Apúntalo: el mejor momento es del ${fmt(desde)} al ${fmt(hasta)}`, urgente: false, fecha: iso(desde) }
    }
  }
  return { texto: palanca.momento, urgente: palanca.negociable && tipo === 'banco', fecha: null }
}

/**
 * Plan de ahorro de los compromisos activos. Devuelve:
 *  { items: [{ rec, tipo, palanca, costeAnual, ahorroMin, ahorroMax, momento }],
 *    negociable: { min, max, n },   // solo lo que se puede negociar
 *    digital: { costeAnual, n } }   // suscripciones de precio fijo
 */
export function planDeAhorro(recurrentes = [], hoy = new Date()) {
  const items = []
  for (const rec of recurrentes) {
    if (!rec.activo || rec.tipo !== 'gasto') continue
    const tipo = tipoNegociable(rec)
    if (!tipo) continue
    const palanca = PALANCAS[tipo]
    const anual = costeAnual(rec)
    if (!(anual > 0)) continue
    items.push({
      rec,
      tipo,
      palanca,
      costeAnual: anual,
      ahorroMin: Math.round(anual * palanca.ahorro[0]),
      ahorroMax: Math.round(anual * palanca.ahorro[1]),
      momento: momentoParaNegociar(rec, tipo, hoy),
    })
  }
  // Primero lo negociable que más puede ahorrar; las urgentes, antes.
  items.sort(
    (a, b) =>
      Number(b.palanca.negociable) - Number(a.palanca.negociable) ||
      Number(Boolean(b.momento?.urgente)) - Number(Boolean(a.momento?.urgente)) ||
      b.ahorroMax - a.ahorroMax,
  )
  const neg = items.filter((i) => i.palanca.negociable)
  const dig = items.filter((i) => i.tipo === 'digital')
  return {
    items,
    negociable: { min: neg.reduce((s, i) => s + i.ahorroMin, 0), max: neg.reduce((s, i) => s + i.ahorroMax, 0), n: neg.length },
    digital: { costeAnual: Math.round(dig.reduce((s, i) => s + i.costeAnual, 0)), n: dig.length },
  }
}

// Guion de llamada con SUS datos (copiable). Tono: educado, firme, concreto.
export function guionLlamada(rec, tipo, { antiguedad } = {}) {
  const importe = formatearEuros(Number(rec.importe))
  const periodo = periodoDe(rec)
  const cada = periodo.meses === 1 ? 'al mes' : periodo.meses === 12 ? 'al año' : `cada ${periodo.meses} meses`
  const cliente = antiguedad ? `Soy cliente desde hace ${antiguedad}` : 'Soy cliente vuestro'
  switch (tipo) {
    case 'energia':
      return `Hola. ${cliente} y pago unos ${importe} ${cada} de ${rec.nombre}. Estoy revisando mis gastos y he visto ofertas más baratas para mi consumo. Quería saber: ¿qué potencia y qué tarifa tengo contratadas? ¿Podéis ofrecerme una tarifa más barata sin permanencia? Si no, me plantearé cambiarme.`
    case 'telefonia':
      return `Hola. ${cliente} y pago ${importe} ${cada} por ${rec.nombre}. He visto ofertas de otras compañías por bastante menos con lo mismo, y estoy pensando en pedir la portabilidad. Antes de hacerlo quería saber qué podéis ofrecerme para quedarme. ¿Qué precio me podéis dejar?`
    case 'seguro':
      return `Hola. ${cliente}. Mi póliza (${rec.nombre}) se renueva pronto y pago ${importe} ${cada}. Tengo presupuestos más baratos con las mismas coberturas. ¿Podéis igualarlos o mejorarlos? Si no, os comunicaré que no renuevo.`
    case 'banco':
      return `Hola. ${cliente} y me estáis cobrando ${importe} ${cada} en comisiones. ¿Qué condiciones tengo que cumplir para no pagarlas? ¿Podéis devolverme las últimas? Si no, me plantearé cambiar de banco.`
    case 'gimnasio':
      return `Hola. Pago ${importe} ${cada} y ahora mismo voy poco. ¿Tenéis una cuota más barata (por ejemplo, horario de mañana o sin clases) o puedo congelar la cuota unos meses?`
    default:
      return null
  }
}

// ── Ahorro conseguido (lo que el usuario logra al negociar) ──────────────────
// Copia local (y cálculo); la fuente es la BD: lib/useAhorrosNegociados.js. Es la cifra de la que presumir: "Palanca te
// ha ahorrado X € al año".
const claveAhorros = (usuarioId) => `palanca_ahorros_negociados_${usuarioId}`

export function leerAhorros(usuarioId) {
  try {
    const arr = JSON.parse(localStorage.getItem(claveAhorros(usuarioId)) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function registrarAhorro(usuarioId, { recId, nombre, antes, despues, periodoMeses = 1 }) {
  const lista = leerAhorros(usuarioId).filter((a) => a.recId !== recId)
  const ahorroAnual = Math.round((Number(antes) - Number(despues)) * (12 / (Number(periodoMeses) || 1)) * 100) / 100
  if (!(ahorroAnual > 0)) return lista
  lista.push({ recId, nombre, antes: Number(antes), despues: Number(despues), ahorroAnual, fecha: iso(new Date()) })
  try {
    localStorage.setItem(claveAhorros(usuarioId), JSON.stringify(lista))
  } catch {
    // sin persistencia
  }
  return lista
}

export const totalAhorrado = (lista) => Math.round(lista.reduce((s, a) => s + (a.ahorroAnual || 0), 0))
