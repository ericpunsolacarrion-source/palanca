// Lógica pura del importador CSV: parseo, detección de columnas y validación
// robusta fila a fila. La UI vive en components/ImportadorCsv.jsx.

// Columnas esperadas (formato documentado para el usuario).
export const COLUMNAS = ['fecha', 'tipo', 'categoria', 'concepto', 'importe', 'plataforma']
export const COLUMNAS_REQUERIDAS = ['fecha', 'tipo', 'importe']

// --- Parser CSV con soporte de comillas ---
export function parseCsv(texto) {
  const lineas = String(texto)
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
  if (lineas.length === 0) return { cabeceras: [], filas: [] }
  const cabeceras = splitLinea(lineas[0])
  const filas = lineas.slice(1).map((l) => splitLinea(l))
  return { cabeceras, filas }
}

function splitLinea(linea) {
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
    } else if (ch === ',' && !comillas) {
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

// Importe (acepta "1.234,56", "1234.56", "1,50") → número positivo o null.
export function parseImporte(valor) {
  let s = String(valor || '').trim().replace(/[€\s]/g, '')
  if (!s) return null
  if (s.includes(',') && s.includes('.')) {
    // El último separador es el decimal.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

// Valida una fila (array de campos) según el mapeo. Devuelve
// {ok, mov?, motivo?}. `mov` es canónico: {fecha, tipo, categoria, nota, importe, plataforma, esInversion}.
export function validarFila(campos, mapeo) {
  const get = (col) => (mapeo[col] >= 0 ? campos[mapeo[col]] : undefined)

  const fecha = parseFecha(get('fecha'))
  if (!fecha) return { ok: false, motivo: 'fecha inválida' }

  const importe = parseImporte(get('importe'))
  if (importe === null) return { ok: false, motivo: 'importe no válido' }

  const tipoRaw = normaliza(get('tipo'))
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

  filas.forEach((campos, i) => {
    const res = validarFila(campos, mapeo)
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
