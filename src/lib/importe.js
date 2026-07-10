// Formateo EN VIVO de campos de importe (formato español: punto de miles,
// coma decimal). Mantiene el valor numérico real por debajo para los cálculos.
// La UI usa <InputImporte>; estas funciones son la lógica pura y testeable.

// Deja solo dígitos y una coma decimal (máx. 2 decimales). Los puntos que
// escriba el usuario se tratan como separador de miles y se ignoran.
export function limpiarImporte(str) {
  let s = String(str ?? '').replace(/[^\d,]/g, '')
  const i = s.indexOf(',')
  if (i !== -1) {
    const enteros = s.slice(0, i).replace(/,/g, '')
    const decimales = s
      .slice(i + 1)
      .replace(/,/g, '')
      .slice(0, 2)
    s = `${enteros},${decimales}`
  }
  return s
}

// Da formato español a la cadena "limpia": 1000000 -> "1.000.000", "1234,5" -> "1.234,5".
export function formatearImporteVivo(limpio) {
  if (limpio === '' || limpio === undefined || limpio === null) return ''
  let cadena = String(limpio)
  const tieneComa = cadena.includes(',')
  let [enteros, decimales = ''] = cadena.split(',')
  // Sin parte entera (el usuario empezó por la coma): se asume 0.
  if (enteros === '') enteros = '0'
  // Quita ceros a la izquierda pero conserva un "0" solo.
  enteros = enteros.replace(/^0+(?=\d)/, '')
  const entFmt = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return tieneComa ? `${entFmt},${decimales}` : entFmt
}

// Cadena limpia ("1234,5") -> número (1234.5). '' -> null.
export function importeANumero(limpio) {
  if (limpio === '' || limpio === undefined || limpio === null) return null
  const n = Number(String(limpio).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Número -> cadena limpia para inicializar el input ("1,5"), sin separador de miles
// (el formateo lo hace formatearImporteVivo). null/'' -> ''.
export function numeroAImporte(valor) {
  if (valor === '' || valor === undefined || valor === null || !Number.isFinite(Number(valor))) {
    return ''
  }
  // Hasta 2 decimales, sin ceros de relleno; coma decimal.
  const redondeado = Math.round(Number(valor) * 100) / 100
  return String(redondeado).replace('.', ',')
}
