import { useEffect, useRef, useState } from 'react'

export function useCountUp(valorFinal, duracionMs = 600) {
  const [valor, setValor] = useState(0)
  const inicioRef = useRef(null)
  const desdeRef = useRef(0)

  useEffect(() => {
    desdeRef.current = valor
    inicioRef.current = null
    let frame

    function animar(timestamp) {
      if (inicioRef.current === null) inicioRef.current = timestamp
      const progreso = Math.min((timestamp - inicioRef.current) / duracionMs, 1)
      const facilitado = 1 - Math.pow(1 - progreso, 3)
      setValor(desdeRef.current + (valorFinal - desdeRef.current) * facilitado)
      if (progreso < 1) frame = requestAnimationFrame(animar)
    }

    frame = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorFinal, duracionMs])

  return valor
}
