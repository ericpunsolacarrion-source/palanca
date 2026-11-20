// PLANTILLA DE PALANCA: el Excel con columnas fijas que cualquiera puede
// rellenar (o pedir a su asistente de IA que rellene) para traer su historial
// entero, inversión incluida. Columnas, en este orden:
//   Fecha | Tipo | Concepto | Categoría | Importe | Plataforma | Activo
// El importe va siempre en positivo: lo que entra o sale lo dice el TIPO.
// Aquí vive solo la traducción de cada tipo a las reglas del motor
// (CLAUDE.md «Reglas de cálculo»); la lectura y validación es la de
// importarCsv.js, que ya usa el importador de extractos.
import {
  CATEGORIA_DESDE_AHORRO,
  CATEGORIA_INVERSION,
  CATEGORIA_TRASPASO,
} from './categorias'

export const COLUMNAS_PLANTILLA = ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Importe', 'Plataforma', 'Activo']

const sinTildes = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// Tipo de la plantilla → cómo lo guarda Palanca.
//   tipo: 'gasto' | 'ingreso' del movimiento
//   categoria: categoría fija (si el tipo la impone)
//   inversion: cuenta en la bolsa de inversión (compra = gasto, venta = ingreso)
const TIPOS = [
  { nombre: 'Gasto', claves: ['gasto', 'expense'], tipo: 'gasto' },
  { nombre: 'Ingreso', claves: ['ingreso', 'income'], tipo: 'ingreso' },
  { nombre: 'Devolución', claves: ['devolucion', 'reembolso'], tipo: 'ingreso', categoria: 'Devoluciones' },
  { nombre: 'Traspaso a ahorro', claves: ['traspaso a ahorro', 'traspaso'], tipo: 'gasto', categoria: CATEGORIA_TRASPASO },
  { nombre: 'Desde ahorro', claves: ['desde ahorro'], tipo: 'ingreso', categoria: CATEGORIA_DESDE_AHORRO },
  // Banco → bróker: el dinero sigue siendo tuyo y aún no está invertido
  // (efectivo en el bróker). Neutro, como un traspaso a tu ahorro.
  { nombre: 'Aportación al bróker', claves: ['aportacion al broker', 'aportacion'], tipo: 'gasto', categoria: CATEGORIA_TRASPASO },
  { nombre: 'Retirada del bróker', claves: ['retirada del broker', 'retirada'], tipo: 'ingreso', categoria: CATEGORIA_DESDE_AHORRO },
  { nombre: 'Compra inversión', claves: ['compra inversion', 'compra', 'inversion'], tipo: 'gasto', inversion: true },
  { nombre: 'Venta inversión', claves: ['venta inversion', 'venta'], tipo: 'ingreso', inversion: true },
  { nombre: 'Interés', claves: ['interes', 'intereses'], tipo: 'ingreso', categoria: 'Intereses' },
  { nombre: 'Dividendo', claves: ['dividendo', 'dividendos'], tipo: 'ingreso', categoria: 'Dividendos' },
]
export const TIPOS_PLANTILLA = TIPOS.map((t) => t.nombre)

const PORCLAVE = new Map(TIPOS.flatMap((t) => t.claves.map((c) => [c, t])))

// Tipos que solo existen en la plantilla (no en un extracto ni en el CSV de
// «Descargar mis datos»): si aparecen, el archivo es una plantilla.
const SOLO_PLANTILLA = new Set(
  TIPOS.filter((t) => t.nombre !== 'Gasto' && t.nombre !== 'Ingreso' && t.nombre !== 'Compra inversión').flatMap((t) => t.claves).concat(['compra inversion']),
)

export function tipoDePlantilla(valor) {
  return PORCLAVE.get(sinTildes(valor)) ?? null
}

// ¿Estas filas son de la plantilla? Tiene la columna Activo, o en la columna
// Tipo aparece algún tipo que solo usa la plantilla.
export function esPlantilla(mapeo, filas) {
  if ((mapeo.activo ?? -1) >= 0 && (mapeo.tipo ?? -1) >= 0) return true
  if (!((mapeo.tipo ?? -1) >= 0)) return false
  return filas.some((f) => SOLO_PLANTILLA.has(sinTildes(f[mapeo.tipo])))
}

// Traduce una fila de la plantilla. `conSigno`: importe leído con su signo.
// En la plantilla el importe va en positivo; si viene negativo se interpreta
// lo más razonable: un gasto negativo es una devolución y un ingreso negativo
// (p. ej. un ajuste de nómina) es un gasto. En el resto se toma el valor.
// Devuelve { tipo, categoria, esInversion } o null si el tipo no existe.
export function traducirTipoPlantilla(valor, conSigno, categoriaFila) {
  const t = tipoDePlantilla(valor)
  if (!t) return null
  if (conSigno < 0 && t.nombre === 'Gasto') return { tipo: 'ingreso', categoria: 'Devoluciones', esInversion: false }
  if (conSigno < 0 && t.nombre === 'Ingreso') return { tipo: 'gasto', categoria: categoriaFila || 'Otros', esInversion: false }
  if (t.inversion) return { tipo: t.tipo, categoria: CATEGORIA_INVERSION, esInversion: true }
  return { tipo: t.tipo, categoria: t.categoria ?? categoriaFila ?? '', esInversion: false }
}

// Texto para pegar en el asistente de IA (Claude, ChatGPT…) y que convierta
// cualquier Excel de finanzas al formato de la plantilla.
export const INSTRUCCIONES_ASISTENTE = `Convierte mi Excel de finanzas al formato de importación de Palanca. Crea un archivo .xlsx con una pestaña llamada «Movimientos» y estas columnas, en este orden: Fecha | Tipo | Concepto | Categoría | Importe | Plataforma | Activo.

Reglas generales:
- Una fila por movimiento real. Nada de totales, subtotales, resúmenes ni fórmulas: solo valores.
- Fecha en dd/mm/aaaa: la fecha real en que se movió el dinero. Las filas sin fecha o con fecha futura (previsiones) no las pongas: lístamelas aparte.
- Importe siempre positivo, en euros (convierte otras monedas al cambio de ese día), con coma decimal y sin «€».
- Concepto: texto corto y estable. Si regeneras el archivo, no cambies el concepto de las filas que ya existían.

Tipo (exactamente uno de estos):
- Gasto: solo mi parte si era compartido. Sacar del cajero = Gasto con categoría «Efectivo», salvo que ya apunte en qué gasté ese efectivo (entonces no lo pongas). Si pago con la tarjeta del bróker, también es Gasto.
- Ingreso: la nómina, siempre el neto que llega al banco.
- Devolución: reembolsos de compras o bizums que me devuelven parte de algo que pagué.
- Traspaso a ahorro / Desde ahorro: mover dinero entre mis propias cuentas (por ejemplo, a la cuenta de ahorro). Las transferencias entre dos cuentas corrientes mías no las pongas.
- Aportación al bróker / Retirada del bróker: transferencias entre mi banco y el bróker.
- Compra inversión: comprar acciones, ETF o fondos; el importe es el total pagado, comisión incluida.
- Venta inversión: el importe es lo realmente recibido.
- Interés / Dividendo: lo cobrado.

Categoría: obligatoria en Gasto, Ingreso y Devolución; vacía en el resto. Usa preferiblemente: Comida, Restaurantes, Transporte, Vivienda, Suministros, Suscripciones, Seguros, Compras, Salud, Ocio, Deporte, Viajes, Educación, Impuestos, Efectivo, Otros (gastos); Nómina, Otros ingresos (ingresos). Si alguna mía no encaja, deja mi nombre.

Plataforma (por ejemplo, Trade Republic) y Activo (por ejemplo, NVIDIA): solo en las filas de inversión y del bróker.

Inversiones anteriores: si al empezar el Excel ya tenía acciones o fondos, añade una «Compra inversión» por cada posición con la fecha de la primera fila y lo que me costaron.

Al final, dime: 1) la lista de filas dudosas, sumadas dos veces o que has dejado fuera, y por qué; 2) la fecha del último movimiento; 3) cuánto dinero tenía en el banco y en efectivo en el bróker en esa fecha, según mis datos (lo confirmaré yo).`
