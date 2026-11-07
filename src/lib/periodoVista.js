// Vista previa del ajuste «Mi mes empieza el día…»: cómo quedarían los últimos
// periodos con otro día de inicio, SIN cambiar la configuración activa ni
// tocar ningún movimiento (solo se reagrupan para enseñarlo).
import { totalesDe } from './movimientosUtils'
import { isoDe, normalizarDiaInicio, periodoDe, rangoPeriodo, sumarMeses } from './periodo'

const FMT = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const corto = (iso) => FMT.format(new Date(`${iso}T12:00:00`)).replace('.', '')

export function vistaPreviaPeriodos(movimientos, diaInicio, n = 4, hoy = new Date()) {
  const dia = normalizarDiaInicio(diaInicio)
  const hoyIso = isoDe(hoy)
  const actual = periodoDe(hoyIso, dia)
  const claves = Array.from({ length: n }, (_, i) => sumarMeses(actual, -i))
  const grupos = new Map(claves.map((c) => [c, []]))
  for (const m of movimientos) {
    if (m.fecha > hoyIso) continue
    const c = periodoDe(m.fecha, dia)
    if (grupos.has(c)) grupos.get(c).push(m)
  }
  return claves.map((clave) => {
    const movs = grupos.get(clave)
    const t = totalesDe(movs)
    const { desde, hasta } = rangoPeriodo(clave, dia)
    return { clave, desde, hasta, rango: `${corto(desde)} – ${corto(hasta)}`, actual: clave === actual, n: movs.length, ingresos: t.ingresos, gastos: t.gastos, ahorro: t.ahorro, ratioAhorro: t.ratioAhorro }
  })
}

// Día de inicio guardado para un usuario: la columna perfiles.dia_inicio_periodo
// si existe; si no (migración pendiente), el ajuste de este dispositivo; y si
// no hay nada, 1 (mes natural): así funcionan los perfiles existentes.
export const claveLSDiaInicio = (usuarioId) => `palanca_dia_inicio_periodo_${usuarioId}`
export function diaInicioDePerfil(perfil, usuarioId) {
  if (perfil && 'dia_inicio_periodo' in perfil) return normalizarDiaInicio(perfil.dia_inicio_periodo)
  if (!usuarioId) return 1
  try {
    return normalizarDiaInicio(localStorage.getItem(claveLSDiaInicio(usuarioId)))
  } catch {
    return 1
  }
}
