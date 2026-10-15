// Cliente de "importar con capturas": reduce cada captura en el propio móvil
// (menos datos y menos coste), las envía por lotes a /api/leer-capturas y
// fusiona lo leído. Las capturas consecutivas suelen SOLAPARSE (el final de
// una es el principio de la siguiente): un mismo movimiento leído en dos
// capturas distintas cuenta una vez; dos movimientos iguales en la MISMA
// captura (dos cafés de 1,50 € el mismo día) se respetan.
import { supabase } from './supabaseClient'

const LADO_MAX = 1568 // el modelo trabaja hasta este lado largo sin reescalar
const POR_LOTE = 4

const normalizar = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Fusiona movimientos leídos de varias capturas sin duplicar los solapes.
 * Entrada: [{ fecha, concepto, importe, captura }]. Para cada movimiento
 * (fecha + importe + concepto) se queda con el MÁXIMO de veces que aparece en
 * una sola captura, no con la suma.
 */
export function fusionarCapturas(movimientos) {
  const porClave = new Map() // clave → { mov, porCaptura: Map(captura → n) }
  for (const m of movimientos) {
    const clave = `${m.fecha}|${Number(m.importe).toFixed(2)}|${normalizar(m.concepto)}`
    const e = porClave.get(clave) ?? { mov: m, porCaptura: new Map() }
    e.porCaptura.set(m.captura, (e.porCaptura.get(m.captura) ?? 0) + 1)
    porClave.set(clave, e)
  }
  const resultado = []
  for (const { mov, porCaptura } of porClave.values()) {
    const veces = Math.max(...porCaptura.values())
    for (let i = 0; i < veces; i += 1) resultado.push({ fecha: mov.fecha, concepto: mov.concepto, importe: mov.importe })
  }
  return resultado.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
}

// Captura → JPEG reducido en base64 (lado largo ≤ 1568 px). Una captura de
// móvil pasa de ~2 MB a ~250 KB y se lee igual de bien.
export async function reducirImagen(file) {
  const bitmap = await createImageBitmap(file)
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  canvas.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close?.()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  return { tipo: 'image/jpeg', datos: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}

const hoyLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function capturasActivas() {
  try {
    const res = await fetch('/api/leer-capturas')
    if (!res.ok) return false
    return Boolean((await res.json()).activo)
  } catch {
    return false
  }
}

/**
 * Lee las capturas (File[]) y devuelve { movimientos, avisos }. onProgreso(n,
 * total) informa de cuántas lleva. Si un lote falla, sigue con el resto y lo
 * cuenta en avisos.
 */
export async function leerCapturas(files, onProgreso = () => {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const todos = []
  const avisos = []
  let hechas = 0
  for (let i = 0; i < files.length; i += POR_LOTE) {
    const lote = files.slice(i, i + POR_LOTE)
    let imagenes
    try {
      imagenes = await Promise.all(lote.map(reducirImagen))
    } catch {
      avisos.push(`No se han podido abrir ${lote.length === 1 ? 'una captura' : 'algunas capturas'}.`)
      hechas += lote.length
      onProgreso(hechas, files.length)
      continue
    }
    try {
      const res = await fetch('/api/leer-capturas', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ imagenes, hoy: hoyLocal() }),
      })
      const datos = await res.json().catch(() => ({}))
      if (!res.ok) {
        avisos.push(datos.error || 'No se han podido leer algunas capturas.')
        if (res.status === 429 || res.status === 503 || res.status === 401) break
      } else {
        // El nº de captura es relativo al lote: se pasa a global.
        for (const m of datos.movimientos ?? []) todos.push({ ...m, captura: i + (m.captura ?? 1) })
        avisos.push(...(datos.avisos ?? []))
      }
    } catch {
      avisos.push('Sin conexión al leer algunas capturas.')
    }
    hechas += lote.length
    onProgreso(hechas, files.length)
  }
  return { movimientos: fusionarCapturas(todos), avisos: [...new Set(avisos)] }
}
