import { describe, expect, it } from 'vitest'
import { respuestaDeCortesia } from './contextoFulcro'

describe('respuestaDeCortesia (sin gastar IA)', () => {
  it.each(['Hola', '¡Hola!', 'buenas tardes', 'Hola Fulcro', 'Gracias!!', 'muchas gracias', 'mil gracias por todo', 'vale', 'Perfecto.', 'ok, genial'])('"%s" se responde localmente', (t) => {
    expect(respuestaDeCortesia(t)).toBeTruthy()
  })
  it.each(['Hola, ¿voy bien este mes?', 'Hola, ¿voy bien?', 'gracias, ¿y en ocio?', 'hola qué tal voy', '¿Cuánto gasto en comida?', 'vale y cuánto me queda de presupuesto', 'bien o mal?', 'gracioso'])('"%s" va a la IA', (t) => {
    expect(respuestaDeCortesia(t)).toBeNull()
  })
})
