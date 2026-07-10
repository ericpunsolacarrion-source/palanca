import { useEffect, useRef, useState } from 'react'
import { formatearImporteVivo, importeANumero, limpiarImporte, numeroAImporte } from '../lib/importe'

// Campo de importe con separador de miles EN VIVO mientras se teclea.
// - `value`: número (o null/'') controlado por el padre.
// - `onValueChange(numero|null)`: se llama con el valor numérico real.
// El display se formatea (1.000.000, 1.234,56) y el cursor se conserva.
export default function InputImporte({
  value,
  onValueChange,
  className = '',
  placeholder = '0,00',
  autoFocus = false,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}) {
  const ref = useRef(null)
  const [texto, setTexto] = useState(() => formatearImporteVivo(numeroAImporte(value)))

  // Resincroniza el texto cuando el valor cambia por fuera (reset, duplicar…),
  // no mientras el usuario teclea (ahí value ya coincide con lo tecleado).
  useEffect(() => {
    const numTexto = importeANumero(limpiarImporte(texto))
    const numValor = value === '' || value === null || value === undefined ? null : Number(value)
    if (numTexto !== numValor) {
      setTexto(formatearImporteVivo(numeroAImporte(value)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleChange(e) {
    const input = e.target
    const bruto = input.value
    const cursor = input.selectionStart ?? bruto.length
    // Nº de caracteres significativos (dígitos y coma) antes del cursor.
    const signifAntes = bruto.slice(0, cursor).replace(/[^\d,]/g, '').length

    const limpio = limpiarImporte(bruto)
    const nuevoTexto = formatearImporteVivo(limpio)
    setTexto(nuevoTexto)
    onValueChange(importeANumero(limpio))

    // Reposiciona el cursor tras el mismo nº de caracteres significativos.
    requestAnimationFrame(() => {
      if (!ref.current) return
      let pos = 0
      let contados = 0
      while (pos < nuevoTexto.length && contados < signifAntes) {
        if (/[\d,]/.test(nuevoTexto[pos])) contados += 1
        pos += 1
      }
      ref.current.setSelectionRange(pos, pos)
    })
  }

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      aria-label={ariaLabel}
      value={texto}
      onChange={handleChange}
    />
  )
}
