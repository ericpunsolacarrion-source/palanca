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

// Configuración del periodo de un usuario: { dia, cobro, auto }.
//  - dia:   día de inicio del periodo (1 = mes natural).
//  - cobro: día de cobro de la nómina que dijo en el alta (o null).
//  - auto:  si Palanca ajusta el día de inicio solo, según cuándo llega la
//           nómina de verdad (detectarCobroNomina). Se apaga al elegirlo a mano.
// Fuente: columnas de perfiles si existen; si no (migración pendiente), el
// navegador; y si no hay nada, { dia: 1, cobro: null, auto: false }: así los
// perfiles existentes siguen exactamente igual.
export const claveLSDiaInicio = (usuarioId) => `palanca_dia_inicio_periodo_${usuarioId}`
export const claveLSPeriodo = (usuarioId) => `palanca_periodo_${usuarioId}`
const cobroValido = (c) => (Number.isInteger(Number(c)) && Number(c) >= 1 && Number(c) <= 31 && c !== null && c !== '' ? Number(c) : null)

export function configPeriodoDePerfil(perfil, usuarioId) {
  if (perfil && 'dia_inicio_periodo' in perfil) {
    return { dia: normalizarDiaInicio(perfil.dia_inicio_periodo), cobro: cobroValido(perfil.dia_cobro_nomina), auto: perfil.periodo_automatico === true }
  }
  const base = { dia: 1, cobro: null, auto: false }
  if (!usuarioId) return base
  try {
    const j = JSON.parse(localStorage.getItem(claveLSPeriodo(usuarioId)) || 'null')
    if (j) return { dia: normalizarDiaInicio(j.dia), cobro: cobroValido(j.cobro), auto: j.auto === true }
    return { ...base, dia: normalizarDiaInicio(localStorage.getItem(claveLSDiaInicio(usuarioId))) }
  } catch {
    return base
  }
}

export function diaInicioDePerfil(perfil, usuarioId) {
  return configPeriodoDePerfil(perfil, usuarioId).dia
}
