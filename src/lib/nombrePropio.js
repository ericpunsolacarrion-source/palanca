// "lucía" o "LUCÍA DE LA FUENTE" → "Lucía" / "Lucía de la Fuente". Solo toca
// nombres escritos todo en minúsculas o todo en mayúsculas: si la persona ya
// lo escribió con su forma ("McArthur", "de Juan"), se respeta tal cual.
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'i', 'da', 'do', 'dos', 'van', 'von'])

export function nombrePropio(texto) {
  const t = String(texto ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return ''
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t
  return t
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.replace(/(^|[-'])(\p{L})/gu, (_, s, l) => s + l.toUpperCase())))
    .join(' ')
}
