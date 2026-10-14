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

describe('cortesía en contexto (segunda revisión)', () => {
  it.each(['Hola, ¿cuánto ahorro?', 'buenas, ¿y mi patrimonio?', 'gracias pero no entiendo', 'gracias, ¿y en ocio?'])('"%s" va a la IA', (t) => {
    expect(respuestaDeCortesia(t)).toBeNull()
  })
  it('"vale" tras una oferta de Fulcro va a la IA; tras una afirmación, local', () => {
    expect(respuestaDeCortesia('vale', '¿Quieres que te explique cómo funciona un fondo indexado?')).toBeNull()
    expect(respuestaDeCortesia('vale', 'Vas bien este mes.')).toBeTruthy()
    expect(respuestaDeCortesia('gracias', '¿Algo más?')).toBeTruthy() // las gracias no son un "sí"
  })
})
