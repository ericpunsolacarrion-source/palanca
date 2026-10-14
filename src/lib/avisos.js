// Avisos de dinero que está a punto de salir: cobros inminentes, renovaciones
// de suscripciones no mensuales y subidas de precio detectadas. Lógica pura y
// testeable: la consumen la tarjeta del dashboard y la notificación local.
//
// Tono (ver ESTADO-PLATAFORMA): nunca alarmista; informa con tiempo para
// decidir ("¿sigues usándola?"), no riñe.

import { formatearEuros } from './categorias'
import { cobrosProximos, periodoDe } from './periodicidad'
import { detectarSuscripciones } from './suscripciones'

const DIAS_COBRO = 3 // cobros mensuales: avisar con 3 días
const DIAS_RENOVACION = 14 // anuales/semestrales…: avisar con 2 semanas
const DIAS_SUBIDA = 45 // una subida de precio es noticia ~1,5 meses

/**
 * @param recurrentes items de useRecurrentes (Base)
 * @param movimientos histórico completo
 * @returns [{ id, tipo: 'cobro'|'renovacion'|'subida', titulo, detalle, importe, dias, urgente }]
 *          ordenados por urgencia.
 */
export function calcularAvisos(recurrentes = [], movimientos = [], hoy = new Date(), { descartadas = new Set() } = {}) {
  const avisos = []
  const gastos = recurrentes.filter((r) => r.tipo === 'gasto')

  for (const c of cobrosProximos(gastos, DIAS_RENOVACION, hoy)) {
    // Renovación = periodos largos (semestral/anual: seguros, Prime, dominios…).
    // Bimestrales/trimestrales (agua, luz) se avisan como un cobro más.
    const renovacion = periodoDe(c.rec).meses >= 6
    // Su día ya ha llegado: se pide confirmarlo (con su fecha de cobro).
    const porConfirmar = c.dias <= 0
    if (renovacion) {
      avisos.push({
        id: `renovacion:${c.rec.id}:${c.mes}`,
        tipo: 'renovacion',
        recId: c.rec.id,
        porConfirmar,
        titulo: porConfirmar ? `${c.rec.nombre} se renueva ${c.dias === 0 ? 'hoy' : c.texto}` : `${c.rec.nombre} se renueva ${c.texto}`,
        detalle: `${formatearEuros(c.importe)} · ${periodoDe(c.rec).etiqueta.toLowerCase()}. Buen momento para ver si te compensa.`,
        importe: c.importe,
        dias: c.dias,
        urgente: c.dias <= 3,
      })
    } else if (c.dias <= DIAS_COBRO) {
      avisos.push({
        id: `cobro:${c.rec.id}:${c.mes}`,
        tipo: 'cobro',
        recId: c.rec.id,
        porConfirmar,
        titulo:
          c.dias === 0
            ? `Hoy se cobra ${c.rec.nombre}`
            : c.dias < 0
              ? `${c.rec.nombre} · se cobró ${c.texto}`
              : `${c.rec.nombre} · ${c.texto}`,
        detalle: porConfirmar ? `${formatearEuros(c.importe)} · ¿te lo han cobrado?` : formatearEuros(c.importe),
        importe: c.importe,
        dias: c.dias,
        urgente: c.dias <= 1,
      })
    }
  }

  // Ingresos fijos (nómina…): solo cuando ya toca, para confirmar que han llegado.
  for (const c of cobrosProximos(recurrentes.filter((r) => r.tipo === 'ingreso'), 0, hoy)) {
    avisos.push({
      id: `ingreso:${c.rec.id}:${c.mes}`,
      tipo: 'ingreso',
      recId: c.rec.id,
      porConfirmar: true,
      titulo: c.dias === 0 ? `Hoy entra ${c.rec.nombre}` : `${c.rec.nombre} · debía entrar ${c.texto}`,
      detalle: `${formatearEuros(c.importe)} · ¿lo has recibido?`,
      importe: c.importe,
      dias: c.dias,
      urgente: false,
    })
  }

  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  // Los comercios que el usuario marcó "No es una suscripción" no avisan.
  for (const d of detectarSuscripciones(movimientos, [], { hoy: hoyIso, descartadas })) {
    if (!d.subida) continue
    // Se mide desde que SUBIÓ (primer cargo con el precio nuevo), no desde el
    // último cargo: así el aviso dura ~1,5 meses y no reaparece cada mes.
    const dias = Math.round((new Date(`${hoyIso}T00:00:00`) - new Date(`${d.subida.desde}T00:00:00`)) / 86400000)
    if (dias > DIAS_SUBIDA) continue
    const extraAnual = Math.round((d.subida.ahora - d.subida.antes) * (12 / d.periodoMeses) * 100) / 100
    avisos.push({
      // Un id por SUBIDA (precio anterior → nuevo): descartarlo es definitivo.
      id: `subida:${d.clave}:${d.subida.antes}->${d.subida.ahora}`,
      tipo: 'subida',
      titulo: `${d.nombre} ha subido de precio`,
      detalle: `De ${formatearEuros(d.subida.antes)} a ${formatearEuros(d.subida.ahora)} (+${formatearEuros(extraAnual)} al año)`,
      importe: d.subida.ahora,
      dias: -dias,
      urgente: false,
    })
  }

  const orden = { cobro: 0, renovacion: 1, ingreso: 2, subida: 3 }
  return avisos.sort((a, b) => Number(b.urgente) - Number(a.urgente) || a.dias - b.dias || orden[a.tipo] - orden[b.tipo])
}

// Lo que merece una NOTIFICACIÓN del sistema (más estricto que la tarjeta):
// cobros de hoy/mañana, renovaciones a ≤3 días y subidas de precio.
export function avisosNotificables(avisos) {
  return avisos.filter((a) => a.urgente || a.tipo === 'subida')
}
