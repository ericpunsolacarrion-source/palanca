import { useLayoutEffect, useRef, useState } from 'react'

// Ancho real del contenedor (los gráficos se dibujan a su tamaño, sin escalar
// el texto). Arranca con una estimación para el primer pintado.
export function useAncho(inicial = 600) {
  const ref = useRef(null)
  const [ancho, setAncho] = useState(inicial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setAncho(el.clientWidth || inicial)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setAncho(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [inicial])
  return [ref, ancho]
}

// Ancho y alto reales del contenedor. Para gráficos que deben LLENAR su
// tarjeta (alto="auto"): el contenedor crece con flex y el gráfico se dibuja
// al alto disponible, con un mínimo legible. Sin ResizeObserver, la estimación.
export function useCaja(inicial = { ancho: 600, alto: 220 }) {
  const ref = useRef(null)
  const [caja, setCaja] = useState(inicial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setCaja({ ancho: el.clientWidth || inicial.ancho, alto: el.clientHeight || inicial.alto })
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setCaja({ ancho: Math.round(e.contentRect.width), alto: Math.round(e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, caja]
}
