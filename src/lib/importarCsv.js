// Lógica pura del importador CSV: parseo, detección de columnas y validación
// robusta fila a fila. La UI vive en components/ImportadorCsv.jsx.

// Columnas esperadas (formato documentado para el usuario).
export const COLUMNAS = ['fecha', 'tipo', 'categoria', 'concepto', 'importe', 'plataforma']
// 'tipo' es opcional: en extractos bancarios lo deduce el signo del importe.
export const COLUMNAS_REQUERIDAS = ['fecha', 'importe']

// --- Parser CSV con soporte de comillas ---
export function parseCsv(texto) {
  const lineas = String(texto)
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
  if (lineas.length === 0) return { cabeceras: [], filas: [] }
  const sep = detectarSeparador(lineas[0])
  const cabeceras = splitLinea(lineas[0].replace(/^\uFEFF/, ''), sep)
  const filas = lineas.slice(1).map((l) => splitLinea(l, sep))
  return { cabeceras, filas }
}

// Excel en español exporta con ';' (la coma es el decimal). Se elige el
// separador más frecuente de la cabecera (fuera de comillas): ';', tab o ','.
function detectarSeparador(cabecera) {
  const sinComillas = cabecera.replace(/"[^"]*"/g, '')
  const cuenta = (c) => sinComillas.split(c).length - 1
  const candidatos = [';', '\t', ',']
  let mejor = ','
  let max = 0
  for (const c of candidatos) {
    if (cuenta(c) > max) {
      max = cuenta(c)
      mejor = c
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

// Adivina, para cada columna canónica, el índice en las cabeceras del CSV.
export function detectarMapeo(cabeceras) {
  const alias = {
    fecha: ['fecha', 'date', 'dia'],
    tipo: ['tipo', 'type'],
    categoria: ['categoria', 'category', 'cat'],
    concepto: ['concepto', 'nota', 'descripcion', 'description', 'concept'],
    importe: ['importe', 'amount', 'cantidad', 'valor', 'monto'],
    plataforma: ['plataforma', 'fuente', 'platform', 'broker'],
  }
  const norm = cabeceras.map(normaliza)
  const mapeo = {}
  for (const col of COLUMNAS) {
    mapeo[col] = norm.findIndex((h) => alias[col].includes(h))
  }
  return mapeo
}

// Fecha → 'YYYY-MM-DD' o null. Acepta YYYY-MM-DD y DD/MM/YYYY (o con guiones).
export function parseFecha(valor) {
  const s = String(valor || '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  let y
  let mo
  let d
  if (m) {
    ;[, y, mo, d] = m
  } else if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) {
    ;[, d, mo, y] = m
  } else {
    return null
  }
  const yy = Number(y)
  const mm = Number(mo)
  const dd = Number(d)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime()) || fecha.getUTCMonth() + 1 !== mm) return null
  return iso
}

// Importe CON signo (acepta "1.234,56", "1234.56", "1,50", "1.234", "-45,30",
// "(45,30)") → número o null. El formato por defecto es el español.
export function parseImporteConSigno(valor) {
  let s = String(valor || '').trim().replace(/[€\s\u00a0]/g, '')
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

  const conSigno = parseImporteConSigno(get('importe'))
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
  const plataforma = String(get('plataforma') || '').trim()
  if (esInversion) categoria = 'Inversion'
  else if (normaliza(categoria) === 'inversion') esInversion = true
  if (!categoria) categoria = tipo === 'ingreso' ? 'Nomina' : 'Otros'

  const nota = String(get('concepto') || '').trim()

  return {
    ok: true,
    mov: { fecha, tipo, categoria, nota, importe, plataforma, esInversion },
  }
}

// Clave para detectar duplicados frente a los movimientos existentes.
export function claveDuplicado({ fecha, tipo, importe, nota }) {
  return `${fecha}|${tipo}|${Number(importe).toFixed(2)}|${(nota || '').toLowerCase()}`
}

// Procesa todo el CSV: valida, separa válidas/erróneas y marca duplicados.
export function procesarCsv(texto, mapeo, clavesExistentes) {
  const { filas } = parseCsv(texto)
  const validas = []
  const errores = []
  const duplicados = []
  const clavesLote = new Set()
  // ¿El fichero expresa los gastos con signo negativo? Entonces, en filas sin
  // tipo, los positivos son ingresos (formato típico de extracto bancario).
  const signoDecideTipo =
    mapeo.importe >= 0 && filas.some((c) => (parseImporteConSigno(c[mapeo.importe]) ?? 0) < 0)

  filas.forEach((campos, i) => {
    const res = validarFila(campos, mapeo, { signoDecideTipo })
    if (!res.ok) {
      errores.push({ fila: i + 2, motivo: res.motivo, campos })
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
