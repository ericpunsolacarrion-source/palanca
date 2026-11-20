// Lee el extracto que exporta el banco, sea cual sea su formato, y lo
// devuelve como filas (arrays de celdas) para el motor del importador
// (importarCsv.js → tablaDesdeFilas / procesarFilas). Todo ocurre en el
// navegador: el archivo no sale del dispositivo.
//
//  · CSV / TXT ............ texto; si no es UTF-8 válido, se relee como
//                           Windows-1252 (muchos bancos exportan así: si no,
//                           "Recibo energía" saldría "Recibo energ�a").
//  · Excel moderno (.xlsx)  con read-excel-file (se descarga solo al usarlo).
//  · ".xls" que es HTML ... muy habitual en banca: es una tabla HTML con
//                           extensión de Excel; se lee la tabla.
//  · .xls binario antiguo . no se puede leer de forma segura en el navegador:
//                           se explica cómo convertirlo (o usar capturas).
import { columnaDeCabecera, leerFilasTexto, tablaDesdeFilas } from './importarCsv'

export class ArchivoNoSoportado extends Error {}

const FIRMA_OLE2 = [0xd0, 0xcf, 0x11, 0xe0] // .xls binario (Excel 97-2003)
const FIRMA_ZIP = [0x50, 0x4b, 0x03, 0x04] // .xlsx (es un zip)

const empiezaPor = (bytes, firma) => firma.every((b, i) => bytes[i] === b)

export function decodificarTexto(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  // Caracteres de reemplazo = no era UTF-8: se relee como Windows-1252.
  if (utf8.includes('�')) return new TextDecoder('windows-1252').decode(buffer)
  return utf8
}

// Tabla HTML → filas. Elige la tabla con más filas (la de movimientos).
export function filasDeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tablas = [...doc.querySelectorAll('table')]
  if (tablas.length === 0) return []
  const tabla = tablas.reduce((a, b) => (b.querySelectorAll('tr').length > a.querySelectorAll('tr').length ? b : a))
  return [...tabla.querySelectorAll('tr')].map((tr) =>
    [...tr.querySelectorAll('th,td')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()),
  )
}

// Un Excel con varias pestañas (p. ej. una por año, o la plantilla con su
// pestaña de ayuda): se juntan las pestañas cuya tabla tiene las MISMAS
// columnas reconocidas; si hay varios grupos, el de más filas. Las pestañas de
// texto (instrucciones, listas) no tienen columnas de movimientos y se ignoran.
export function unirHojas(hojas) {
  const grupos = new Map()
  for (const filas of hojas) {
    const t = tablaDesdeFilas(filas)
    const cols = t.cabeceras.map(columnaDeCabecera)
    if (!cols.includes('fecha') || t.filas.length === 0) continue
    const firma = cols.map((c) => c ?? '').join('|')
    const g = grupos.get(firma) ?? { cabecera: filas[t.inicio], filas: [], n: 0 }
    g.filas.push(...t.filas)
    g.n += 1
    grupos.set(firma, g)
  }
  if (grupos.size === 0) return { filas: hojas[0] ?? [], nHojas: hojas.length ? 1 : 0 }
  const mejor = [...grupos.values()].sort((a, b) => b.filas.length - a.filas.length)[0]
  return { filas: [mejor.cabecera, ...mejor.filas], nHojas: mejor.n }
}

export async function leerArchivoMovimientos(file) {
  const buffer = new Uint8Array(await file.arrayBuffer())
  const nombre = (file.name || '').toLowerCase()

  if (empiezaPor(buffer, FIRMA_ZIP)) {
    const { default: leerHojas } = await import('read-excel-file/universal')
    const hojas = await leerHojas(file)
    const limpia = (filas) => filas.map((f) => f.map((c) => (c === null || c === undefined ? '' : c)))
    const { filas, nHojas } = unirHojas(hojas.map((h) => limpia(h.data ?? [])))
    return { filas, formato: nHojas > 1 ? `Excel · ${nHojas} pestañas` : 'Excel' }
  }
  if (empiezaPor(buffer, FIRMA_OLE2)) {
    throw new ArchivoNoSoportado(
      'Es un Excel antiguo (.xls). Ábrelo en Excel, Numbers o Google Sheets y guárdalo como .xlsx o .csv, o importa con capturas.',
    )
  }
  const texto = decodificarTexto(buffer)
  if (/<table[\s>]/i.test(texto)) return { filas: filasDeHtml(texto), formato: 'Excel (HTML)' }
  if (nombre.endsWith('.pdf') || texto.startsWith('%PDF')) {
    throw new ArchivoNoSoportado('Los PDF no se pueden leer todavía. Descarga el extracto en Excel o CSV, o importa con capturas.')
  }
  return { filas: leerFilasTexto(texto), formato: 'CSV' }
}
