import { describe, expect, it } from 'vitest'
import { aportadoPorPlataforma, cambioDesde } from './patrimonio'

const inv = (importe, fuente, tipo = 'gasto') => ({ tipo, importe, importe_centimos: Math.round(importe * 100), categoria: { nombre: 'Inversion' }, fuente: fuente ? { nombre: fuente } : null, fecha: '2026-10-01' })

describe('patrimonio: aportado por plataforma', () => {
  it('suma aportaciones y resta retiradas al céntimo', () => {
    const r = aportadoPorPlataforma([inv(100.1, 'MyInvestor'), inv(0.2, 'MyInvestor'), inv(50, 'Trade Republic'), inv(20, 'Trade Republic', 'ingreso')])
    expect(r).toEqual([
      ['MyInvestor', 100.3],
      ['Trade Republic', 30],
    ])
  })
  it('ignora lo que no es inversión y las plataformas a cero o negativas', () => {
    const r = aportadoPorPlataforma([{ tipo: 'gasto', importe: 10, categoria: { nombre: 'Comida' }, fecha: '2026-10-01' }, inv(10, 'X'), inv(15, 'X', 'ingreso'), inv(5, null)])
    expect(r).toEqual([['Sin especificar', 5]])
  })
})

describe('patrimonio: cambio frente a hace k meses', () => {
  const serie = [{ valor: 1000 }, { valor: 1100 }, { valor: 1210 }]
  it('calcula valor y porcentaje', () => {
    expect(cambioDesde(serie, 1)).toEqual({ valor: 110, pct: 10 })
    expect(cambioDesde(serie, 2).valor).toBe(210)
  })
  it('sin historia suficiente o base cero', () => {
    expect(cambioDesde(serie, 3)).toBeNull()
    expect(cambioDesde([{ valor: 0 }, { valor: 50 }], 1)).toEqual({ valor: 50, pct: null })
  })
})

import { recortarInicio } from './patrimonio'
describe('patrimonio: recortar meses vacíos del principio', () => {
  it('deja un único mes a cero antes del primero con datos', () => {
    const s = [0, 0, 0, 5, 7].map((valor) => ({ valor }))
    expect(recortarInicio(s).map((p) => p.valor)).toEqual([0, 5, 7])
  })
  it('sin ceros al principio no toca nada; nunca menos de 2 puntos', () => {
    expect(recortarInicio([{ valor: 1 }, { valor: 2 }]).length).toBe(2)
    expect(recortarInicio([0, 0, 0, 9].map((valor) => ({ valor }))).length).toBe(2)
  })
})
