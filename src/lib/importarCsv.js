// Lógica pura del importador CSV: parseo, detección de columnas y validación
// robusta fila a fila. La UI vive en components/ImportadorCsv.jsx.

// Columnas que entendemos. 'cargo'/'abono' cubren los extractos que separan
// salidas y entradas en dos columnas (Debe/Haber) en vez de un importe con signo.
export const COLUMNAS = ['fecha', 'tipo', 'categoria', 'concepto', 'importe', 'cargo', 'abono', 'plataforma', 'estado']
// 'tipo' es opcional: en extractos bancarios lo deduce el signo del importe.
export const COLUMNAS_REQUERIDAS = ['fecha', 'importe']

// ¿Falta algo imprescindible? Fecha, y un importe (o al menos cargo/abono).
export function faltanColumnas(mapeo) {
  const tiene = (c) => (mapeo[c] ?? -1) >= 0
  const faltan = []
  if (!tiene('fecha')) faltan.push('fecha')
  if (!tiene('importe') && !tiene('cargo') && !tiene('abono')) faltan.push('importe')
  return faltan
}

// --- Lectura del texto: todas las líneas, con el separador mayoritario ---
export function leerFilasTexto(texto) {
  const lineas = String(texto ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
  if (lineas.length === 0) return []
  const sep = detectarSeparador(lineas.slice(0, 40))
  return lineas.map((l) => splitLinea(l, sep))
}

// Los extractos del banco traen antes de la tabla líneas de información
// (titular, cuenta, periodo…). La cabecera es la primera fila (de las 40
// primeras) que nombra al menos dos columnas que reconocemos; si ninguna lo
// hace, la primera fila.
export function detectarFilaCabecera(filas) {
  let mejor = 0
  let puntos = 0
  for (let i = 0; i < Math.min(filas.length, 40); i += 1) {
    const reconocidas = new Set(filas[i].map(columnaDeCabecera).filter(Boolean))
    if (reconocidas.size >= 2 && reconocidas.size > puntos) {
      mejor = i
      puntos = reconocidas.size
      if (reconocidas.has('fecha') && (reconocidas.has('importe') || reconocidas.has('cargo'))) break
    }
  }
  return mejor
}

// Filas (arrays de celdas, de CSV, Excel o HTML) → { cabeceras, filas } con la
// cabecera ya localizada. `inicio` = índice de la cabecera (para nº de fila).
export function tablaDesdeFilas(filas) {
  if (!filas.length) return { cabeceras: [], filas: [], inicio: 0 }
  const inicio = detectarFilaCabecera(filas)
  const cabeceras = filas[inicio].map((c) => String(c ?? '').trim())
  const datos = filas
    .slice(inicio + 1)
    .filter((f) => f.some((c) => String(c ?? '').trim() !== ''))
  return { cabeceras, filas: datos, inicio }
}

// --- Parser CSV con soporte de comillas ---
export function parseCsv(texto) {
  const { cabeceras, filas } = tablaDesdeFilas(leerFilasTexto(texto))
  return { cabeceras, filas }
}

// Excel en español exporta con ';' (la coma es el decimal). Se elige el
// separador más frecuente (fuera de comillas) en las primeras líneas: ';',
// tab o ','. Se mira la línea con más separadores, no solo la primera, porque
// la primera de un extracto suele ser un título.
function detectarSeparador(lineas) {
  const candidatos = [';', '\t', ',']
  let mejor = ','
  let max = 0
  for (const linea of lineas) {
    const sinComillas = linea.replace(/"[^"]*"/g, '')
    for (const c of candidatos) {
      const n = sinComillas.split(c).length - 1
      if (n > max) {
        max = n
        mejor = c
      }
    }
  }
  return mejor
}

function splitLinea(linea, sep = ',') {
  const campos = []
  let actual = ''
  let comillas = false
  for (let i = 0; i < linea.length; i += 1) {
    const ch = linea[i]
    if (ch === '"') {
      if (comillas && linea[i + 1] === '"') {
        actual += '"'
        i += 1
      } else comillas = !comillas
    } else if (ch === sep && !comillas) {
      campos.push(actual)
      actual = ''
    } else actual += ch
  }
  campos.push(actual)
  return campos.map((c) => c.trim())
}

const DIACRITICOS = /[̀-ͯ]/g
function normaliza(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .trim()
}

// ¿Qué columna canónica es esta cabecera? (nombres reales de extractos
// españoles: "F. Valor", "Fecha operación", "Importe (EUR)", "Cargo", "Haber"…)
export function columnaDeCabecera(cabecera) {
  const h = normaliza(cabecera).replace(/[().:_]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!h || /^saldo|disponible|divisa|moneda|^n[ºo°]? ?(de )?(cuenta|tarjeta)|referencia/.test(h)) return null
  if (/^(f |fecha|date|dia\b)|\bdate$/.test(h)) return 'fecha' // "Started Date" (Revolut)
  if (/^(estado|state|status)$/.test(h)) return 'estado'
  if (/^(cargo|cargos|debe|debito|salidas?|gastos?)$/.test(h)) return 'cargo'
  if (/^(abono|abonos|haber|credito|entradas?|ingresos?)$/.test(h)) return 'abono'
  if (/importe|amount|cantidad|monto|^valor$|^euros?$|^eur$/.test(h)) return 'importe'
  if (/^categoria|category|^cat$/.test(h)) return 'categoria'
  if (/^tipo$|^type$|^tipo de movimiento$/.test(h)) return 'tipo'
  // "cuenta": la columna del CSV de Palanca (Descargar mis datos) con la plataforma.
  if (/plataforma|broker|^fuente$|^platform$|^cuenta$/.test(h)) return 'plataforma'
  if (/concepto|descripcion|description|detalle|^movimiento|operacion|comercio|beneficiario|observaciones|^nota|^concept|establecimiento/.test(h)) return 'concepto'
  return null
}

// Adivina, para cada columna canónica, el índice en las cabeceras. Si hay
// varias candidatas (p. ej. "Fecha operación" y "Fecha valor"), la primera.
export function detectarMapeo(cabeceras) {
  const mapeo = Object.fromEntries(COLUMNAS.map((c) => [c, -1]))
  cabeceras.forEach((cab, i) => {
    const col = columnaDeCabecera(cab)
    if (col && mapeo[col] < 0) mapeo[col] = i
  })
  return mapeo
}

// Fecha → 'YYYY-MM-DD' o null. Acepta YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY,
// DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY, con hora detrás o sin ella, objetos Date y
// el número de serie de Excel (días desde 1899-12-30).
export function parseFecha(valor) {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null
    return componer(valor.getFullYear(), valor.getMonth() + 1, valor.getDate())
  }
  if (typeof valor === 'number') {
    if (valor < 20000 || valor > 80000) return null
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000)
    return componer(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  const s = String(valor || '')
    .trim()
    .replace(/[T\s].*$/, '') // "15/10/2026 10:23" o ISO con hora
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (m) return componer(Number(m[1]), Number(m[2]), Number(m[3]))
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (m) {
    const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return componer(anio, Number(m[2]), Number(m[1]))
  }
  return null
}

function componer(yy, mm, dd) {
  if (!(yy >= 1900 && yy <= 2100) || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  const fecha = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(fecha.getTime()) || fecha.getUTCMonth() + 1 !== mm || fecha.getUTCDate() !== dd) return null
  return iso
}

// Importe CON signo (acepta "1.234,56", "1234.56", "1,50", "1.234", "-45,30",
// "(45,30)") → número o null. El formato por defecto es el español.
export function parseImporteConSigno(valor) {
  // Celda numérica de Excel: ya es un número (no reinterpretar "1.234").
  if (typeof valor === 'number') return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null
  // Fuera el símbolo o el código de la moneda ("-32,57 EUR", "EUR 12.00").
  let s = String(valor || '').trim().replace(/\b(eur|euros?|usd|gbp)\b/gi, '').replace(/[€\s\u00a0]/g, '')
  if (!s) return null
  let negativo = false
  if (/^\(.*\)$/.test(s)) {
    negativo = true
    s = s.slice(1, -1)
  }
  if (s.startsWith('-') || s.startsWith('−')) {
    negativo = !negativo
    s = s.slice(1)
  } else if (s.startsWith('+')) s = s.slice(1)
  if (s.endsWith('-')) {
    negativo = !negativo
    s = s.slice(0, -1)
  }
  if (!/^[\d.,]+$/.test(s)) return null
  const puntos = (s.match(/\./g) || []).length
  const comas = (s.match(/,/g) || []).length
  if (puntos && comas) {
    // El último separador es el decimal.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (comas) {
    // Varias comas → miles ("1,234,567"); una sola → decimal español ("1,50").
    s = comas > 1 ? s.replace(/,/g, '') : s.replace(',', '.')
  } else if (puntos) {
    // Varios puntos, o uno seguido de exactamente 3 cifras → miles español
    // ("1.234" = mil doscientos). Si no, decimal ("12.5", "1234.56").
    if (puntos > 1 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, '')
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  const r = Math.round(n * 100) / 100
  return negativo ? -r : r
}

// Importe en valor absoluto (> 0) o null. El signo lo interpreta validarFila.
export function parseImporte(valor) {
  const n = parseImporteConSigno(valor)
  return n === null || n === 0 ? null : Math.abs(n)
}

// Valida una fila (array de campos) según el mapeo. Devuelve
// {ok, mov?, motivo?}. `mov` es canónico: {fecha, tipo, categoria, nota, importe, plataforma, esInversion}.
export function validarFila(campos, mapeo, { signoDecideTipo = false } = {}) {
  const get = (col) => (mapeo[col] >= 0 ? campos[mapeo[col]] : undefined)

  const fecha = parseFecha(get('fecha'))
  if (!fecha) return { ok: false, motivo: 'fecha inválida' }
  // Operaciones que no llegaron a hacerse (Revolut: REVERTED, DECLINED…).
  const estado = normaliza(get('estado'))
  if (estado && OPERACION_NO_HECHA.test(estado)) return { ok: false, motivo: `operación no completada (${get('estado')})` }
  // Cargos programados que aún no han ocurrido: no son movimientos todavía.
  const h = new Date()
  const hoy = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
  if (fecha > hoy) return { ok: false, motivo: 'fecha futura (aún no ha ocurrido)' }

  // Importe con signo, o columnas separadas de cargo (sale) y abono (entra).
  let conSigno = parseImporteConSigno(get('importe'))
  if ((conSigno === null || conSigno === 0) && (mapeo.cargo >= 0 || mapeo.abono >= 0)) {
    const abono = Math.abs(parseImporteConSigno(get('abono')) ?? 0)
    const cargo = Math.abs(parseImporteConSigno(get('cargo')) ?? 0)
    conSigno = Math.round((abono - cargo) * 100) / 100
  }
  if (conSigno === null || conSigno === 0) return { ok: false, motivo: 'importe no válido' }
  const importe = Math.abs(conSigno)

  let tipoRaw = normaliza(get('tipo'))
  // Extractos bancarios: sin tipo, un importe negativo es un gasto. Uno positivo
  // solo se toma como ingreso si el fichero usa signos (`signoDecideTipo`, lo
  // decide procesarCsv); si no, se mantiene el comportamiento clásico (gasto).
  if (tipoRaw === '') tipoRaw = conSigno < 0 || !signoDecideTipo ? 'gasto' : 'ingreso'
  let tipo
  let esInversion = false
  if (tipoRaw === 'ingreso' || tipoRaw === 'income') tipo = 'ingreso'
  else if (tipoRaw === 'inversion' || tipoRaw === 'inversión') {
    tipo = 'gasto'
    esInversion = true
  } else if (tipoRaw === 'gasto' || tipoRaw === 'expense' || tipoRaw === '') tipo = 'gasto'
  else return { ok: false, motivo: `tipo desconocido ("${get('tipo')}")` }

  let categoria = String(get('categoria') || '').trim()
  // En un extracto del BANCO (sin columna de tipo) su categoría es solo una
  // pista: "Alimentación" de ING no debe crear otra categoría junto a "Comida".
  // La plantilla de Palanca (con tipo) sí manda.
  let categoriaBanco = ''
  if (!(mapeo.tipo >= 0) && categoria && normaliza(categoria) !== 'inversion') {
    categoriaBanco = categoria
    categoria = ''
  }
  const plataforma = String(get('plataforma') || '').trim()
  if (esInversion) categoria = 'Inversion'
  else if (normaliza(categoria) === 'inversion') esInversion = true
  // Sin categoría en el fichero: queda vacía y la sugiere el categorizador
  // (lib/categorizar.js) a partir del concepto y del historial del usuario.

  const nota = String(get('concepto') || '').trim()

  return {
    ok: true,
    mov: { fecha, tipo, categoria, nota, importe, plataforma, esInversion, ...(categoriaBanco ? { categoriaBanco } : {}) },
  }
}

const OPERACION_NO_HECHA = /revert|declin|fail|rechaz|denegad|anulad|cancel|pending|pendiente/
const TIPOS_CONOCIDOS = new Set(['ingreso', 'income', 'gasto', 'expense', 'inversion', 'inversión'])

// Clave para detectar duplicados frente a los movimientos existentes.
export function claveDuplicado({ fecha, tipo, importe, nota }) {
  return `${fecha}|${tipo}|${Number(importe).toFixed(2)}|${(nota || '').toLowerCase()}`
}

// Procesa filas ya leídas (CSV, Excel, HTML o capturas): valida, separa
// válidas/erróneas y marca duplicados. `inicio` = fila de la cabecera, para
// dar el nº de fila real del archivo en los errores.
export function procesarFilas(filas, mapeo, clavesExistentes, { inicio = 0 } = {}) {
  const validas = []
  const errores = []
  const duplicados = []
  const clavesLote = new Set()
  // ¿El fichero expresa los gastos con signo negativo (o en columna de cargo)?
  // Entonces, en filas sin tipo, los positivos son ingresos.
  const signoDecideTipo =
    mapeo.cargo >= 0 ||
    mapeo.abono >= 0 ||
    (mapeo.importe >= 0 && filas.some((c) => (parseImporteConSigno(c[mapeo.importe]) ?? 0) < 0))

  // Una columna "tipo" que no dice gasto/ingreso (Revolut: CARD_PAYMENT,
  // TOPUP…) no sirve: manda el signo.
  if (mapeo.tipo >= 0) {
    const valores = filas.map((c) => normaliza(c[mapeo.tipo])).filter(Boolean)
    const entendidos = valores.filter((v) => TIPOS_CONOCIDOS.has(v)).length
    if (valores.length && entendidos < valores.length / 2) mapeo = { ...mapeo, tipo: -1 }
  }

  filas.forEach((campos, i) => {
    const res = validarFila(campos, mapeo, { signoDecideTipo })
    if (!res.ok) {
      errores.push({ fila: inicio + i + 2, motivo: res.motivo, campos })
      return
    }
    const clave = claveDuplicado(res.mov)
    if (clavesExistentes.has(clave) || clavesLote.has(clave)) {
      duplicados.push(res.mov)
      return
    }
    clavesLote.add(clave)
    validas.push(res.mov)
  })

  return { validas, errores, duplicados }
}

// Procesa todo el CSV (texto): localiza la cabecera y procesa sus filas.
export function procesarCsv(texto, mapeo, clavesExistentes) {
  const { filas, inicio } = tablaDesdeFilas(leerFilasTexto(texto))
  return procesarFilas(filas, mapeo, clavesExistentes, { inicio })
}
