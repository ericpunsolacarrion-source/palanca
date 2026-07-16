// Cliente del asistente IA de mapeo de columnas del importador.
//
// PRIVACIDAD: envía SOLO las cabeceras y hasta 3 filas de ejemplo a nuestro
// propio backend (/api/mapear-columnas), nunca a un tercero ni el archivo
// completo. El resto del CSV se procesa después en el navegador de forma
// determinista. Degrada con elegancia si el endpoint no está configurado.
//
// Devuelve { ok, mapeo?, code? }.
export async function deducirMapeoIA(cabeceras, filas) {
  const muestras = (filas || []).slice(0, 3)
  try {
    const res = await fetch('/api/mapear-columnas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cabeceras, muestras }),
    })
    if (!res.ok) {
      const datos = await res.json().catch(() => ({}))
      return { ok: false, code: datos.code || 'error' }
    }
    const datos = await res.json()
    return datos.mapeo ? { ok: true, mapeo: datos.mapeo } : { ok: false, code: 'error' }
  } catch {
    return { ok: false, code: 'error' }
  }
}
