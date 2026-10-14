// Búsqueda en el historial: concepto, comercio, nota, categoría o importe
// ("mercadona", "netflix", "13,99"). Sin acentos ni mayúsculas.
const normalizar = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export function coincideBusqueda(m, consulta) {
  const q = normalizar(consulta).trim()
  if (!q) return true
  const importe = Number(m.importe)
  const textos = [
    m.nota,
    m.fuente?.nombre,
    m.categoria?.nombre,
    Number.isFinite(importe) ? importe.toFixed(2).replace('.', ',') : '',
    Number.isFinite(importe) ? String(importe) : '',
  ]
  const pajar = normalizar(textos.join(' '))
  return q.split(/\s+/).every((palabra) => pajar.includes(palabra))
}
