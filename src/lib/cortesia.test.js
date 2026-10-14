import { describe, expect, it } from 'vitest'
import { respuestaDeCortesia } from './contextoFulcro'

describe('respuestaDeCortesia (sin gastar IA)', () => {
  it.each(['Hola', '¡Hola!', 'buenas tardes', 'Gracias!!', 'muchas gracias', 'vale', 'Perfecto.'])('"%s" se responde localmente', (t) => {
    expect(respuestaDeCortesia(t)).toBeTruthy()
  })
  it.each(['Hola, ¿voy bien este mes?', '¿Cuánto gasto en comida?', 'vale y cuánto me queda de presupuesto'])('"%s" va a la IA', (t) => {
    expect(respuestaDeCortesia(t)).toBeNull()
  })
})
