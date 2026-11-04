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
