// ── PERIODO FINANCIERO ──────────────────────────────────────────────────────
// Fuente única del «mes» al que pertenece un movimiento. Ver docs/PERIODO.md.
//
// Definición formal
//   S = día de inicio del periodo, entero 1 ≤ S ≤ 28 (28 garantiza que el día
//       existe en todos los meses, febrero incluido; fuera de rango → 1).
//   periodoDe(fecha 'AAAA-MM-DD', S) → clave 'AAAA-MM':
//     · S = 1          → el mes natural de la fecha (fecha.slice(0, 7)).
//     · día(fecha) < S → el mes natural de la fecha.
//     · día(fecha) ≥ S → el mes natural SIGUIENTE (diciembre → enero del año
//                        siguiente).
//   El periodo K con inicio S va del día S del mes anterior a K hasta el día
//   S−1 del mes K, ambos incluidos (con S = 1: del 1 al último día de K).
//   Ejemplo: S = 28 → «noviembre 2026» = 28-10-2026 … 27-11-2026;
//            «enero 2027» = 28-12-2026 … 27-01-2027.
//
// Propiedades (comprobadas en periodo.test.js)
//   · Cada fecha pertenece a UN solo periodo: no hay huecos ni solapes.
//   · Con S = 1 el resultado es idéntico al mes natural.
//   · Solo reclasifica: nunca cambia la fecha, el importe ni el número de
//     movimientos, y el patrimonio (stock hasta una fecha) no depende de S.
//
// El día de inicio es un ajuste del usuario (perfiles.dia_inicio_periodo). Se
// fija una vez al cargar el perfil con configurarPeriodo(); todo el motor lee
// diaInicioPeriodo(). Cambiarlo NO toca datos: solo cómo se agrupan.

const pad = (n) => String(n).padStart(2, '0')

export function normalizarDiaInicio(dia) {
  const n = Number(dia)
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : 1
}

let DIA_INICIO = 1
export function configurarPeriodo(dia) {
  DIA_INICIO = normalizarDiaInicio(dia)
  return DIA_INICIO
}
export function diaInicioPeriodo() {
  return DIA_INICIO
}

// Mes natural, para lo que es calendario y no periodo (cobros fijos del día X,
// suscripciones, generadores de datos…).
export function mesNatural(fechaIso) {
  return fechaIso.slice(0, 7)
}

export function sumarMeses(clave, n) {
  const [y, m] = clave.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}

export function periodoDe(fechaIso, diaInicio = DIA_INICIO) {
  const s = normalizarDiaInicio(diaInicio)
  const natural = fechaIso.slice(0, 7)
  if (s === 1) return natural
  return Number(fechaIso.slice(8, 10)) >= s ? sumarMeses(natural, 1) : natural
}

export const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const diasDelMesNatural = (clave) => {
  const [y, m] = clave.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

// Primer y último día (ISO, incluidos) del periodo `clave`.
export function rangoPeriodo(clave, diaInicio = DIA_INICIO) {
  const s = normalizarDiaInicio(diaInicio)
  if (s === 1) return { desde: `${clave}-01`, hasta: `${clave}-${pad(diasDelMesNatural(clave))}` }
  return { desde: `${sumarMeses(clave, -1)}-${pad(s)}`, hasta: `${clave}-${pad(s - 1)}` }
}

// Número de días del periodo (28 a 31).
export function diasDelPeriodo(clave, diaInicio = DIA_INICIO) {
  const s = normalizarDiaInicio(diaInicio)
  return s === 1 ? diasDelMesNatural(clave) : diasDelMesNatural(sumarMeses(clave, -1))
}

// Posición 1-based de una fecha dentro de su periodo (con S = 1: el día del mes).
export function diaEnPeriodo(fechaIso, diaInicio = DIA_INICIO) {
  const s = normalizarDiaInicio(diaInicio)
  const d = Number(fechaIso.slice(8, 10))
  if (s === 1) return d
  return d >= s ? d - s + 1 : diasDelMesNatural(sumarMeses(fechaIso.slice(0, 7), -1)) - s + 1 + d
}

// Fecha ISO del día n (1-based) del periodo; se recorta al último día.
export function fechaEnPeriodo(clave, n, diaInicio = DIA_INICIO) {
  const { desde } = rangoPeriodo(clave, diaInicio)
  const [y, m, d] = desde.split('-').map(Number)
  const k = Math.max(1, Math.min(n, diasDelPeriodo(clave, diaInicio)))
  return isoDe(new Date(y, m - 1, d + k - 1))
}

// Periodo en curso según la fecha local de hoy.
export function periodoActual(hoy = new Date(), diaInicio = DIA_INICIO) {
  return periodoDe(isoDe(hoy), diaInicio)
}

// «28 oct – 27 nov» (vacío con S = 1, donde el periodo es el mes natural).
const FMT_CORTO = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
export function textoRangoPeriodo(clave, diaInicio = DIA_INICIO) {
  if (normalizarDiaInicio(diaInicio) === 1) return ''
  const { desde, hasta } = rangoPeriodo(clave, diaInicio)
  const f = (iso) => FMT_CORTO.format(new Date(`${iso}T12:00:00`)).replace('.', '')
  return `${f(desde)} – ${f(hasta)}`
}

// Mes natural en curso (hora local). Para lo que es calendario: los fijos se
// cobran «el día X de cada mes» y se marcan aplicados por mes natural.
export function mesNaturalActual(hoy = new Date()) {
  return isoDe(hoy).slice(0, 7)
}
