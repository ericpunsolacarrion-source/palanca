// Estados del calendario de Base (v5). Lógica pura sobre periodicidad.js.
import { estadoCobro } from './periodicidad'

// Estado de un cobro en un mes concreto (el actual usa estadoCobro: el mismo
// que la lista y los avisos).
export function estadoEnMes(rec, clave, claveHoy, hoy = new Date()) {
  const confirmados = rec.mesesAplicados ?? (rec.aplicadoEn ? [rec.aplicadoEn] : [])
  if (clave === claveHoy) {
    const e = estadoCobro(rec, hoy)
    return e === 'hecho' ? 'pagado' : e === 'confirmar' ? 'confirmar' : 'pendiente'
  }
  if (confirmados.includes(clave)) return 'pagado'
  return clave < claveHoy ? 'sin-confirmar' : 'previsto'
}

export const TEXTO_ESTADO = {
  pagado: { texto: 'Pagado', clase: 'bien' },
  confirmar: { texto: 'Por confirmar', clase: 'aviso' },
  pendiente: { texto: 'Pendiente', clase: '' },
  'sin-confirmar': { texto: 'Sin confirmar', clase: '' },
  previsto: { texto: 'Previsto', clase: '' },
}
