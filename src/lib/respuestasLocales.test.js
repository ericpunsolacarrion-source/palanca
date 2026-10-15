import { describe, expect, it } from 'vitest'
import { respuestaLocal } from './respuestasLocales'

const HOY = new Date(2026, 9, 15) // 15/10/2026
let n = 0
const mov = (tipo, cat, importe, fecha, nota) => ({ id: `m${++n}`, tipo, importe, importe_centimos: Math.round(importe * 100), fecha, nota, categoria: { nombre: cat }, fuente: null })
const movimientos = [
  mov('ingreso', 'Nomina', 2000, '2026-10-01', 'NOMINA'),
  mov('ingreso', 'Nomina', 2000, '2026-09-01', 'NOMINA'),
  mov('gasto', 'Transporte', 60, '2026-07-10', 'REPSOL ESTACION'),
  mov('gasto', 'Transporte', 64, '2026-08-11', 'CEPSA'),
  mov('gasto', 'Transporte', 50.5, '2026-09-12', 'BP OIL'),
  mov('gasto', 'Transporte', 40, '2026-10-05', 'GALP'),
  mov('gasto', 'Transporte', 12, '2026-09-20', 'PARKING CENTRO'),
  mov('gasto', 'Suscripciones', 10.99, '2026-08-05', 'Spotify'),
  mov('gasto', 'Suscripciones', 10.99, '2026-09-05', 'Spotify'),
  mov('gasto', 'Suscripciones', 10.99, '2026-10-05', 'Spotify'),
  mov('gasto', 'Compras', 39, '2026-10-02', 'SHOPIFY* TIENDA'),
  mov('gasto', 'Seguros', 180, '2026-03-01', 'SEGURO MOTO MAPFRE'),
  mov('gasto', 'Seguros', 420, '2026-04-01', 'SEGURO COCHE AXA'),
  mov('gasto', 'Comida', 85.4, '2026-10-03', 'MERCADONA'),
  mov('gasto', 'Comida', 30, '2026-10-12', 'LIDL'),
  mov('gasto', 'Inversion', 200, '2026-10-10', 'Indexa'),
  mov('gasto', 'Ajuste', 500, '2026-10-01', 'Saldo inicial'),
]
const recurrentes = [
  { id: 'r1', tipo: 'gasto', nombre: 'Spotify', importe: 10.99, periodoMeses: 1, diaMes: 5, activo: true, mesesAplicados: ['2026-10'] },
  { id: 'r2', tipo: 'gasto', nombre: 'Seguro moto', importe: 180, periodoMeses: 12, mesInicio: 3, diaMes: 1, activo: true },
  { id: 'r3', tipo: 'gasto', nombre: 'Alquiler', importe: 750, periodoMeses: 1, diaMes: 2, activo: true, mesesAplicados: ['2026-10'] },
]
const r = (q) => {
  const t = respuestaLocal(q, { movimientos, recurrentes, hoy: HOY })
  return t == null ? t : t.replace(/\u00a0/g, ' ')
}

describe('respuestas al momento (ejemplos de Eric)', () => {
  it('gasolina los tres últimos meses: suma Repsol/Cepsa/BP, sin parking ni este mes', () => {
    const t = r('¿Cuánto he gastado en gasolina los tres últimos meses?')
    expect(t).toContain('**174,50 €**') // 60 + 64 + 50,50
    expect(t).toContain('3 pagos')
    expect(t).toContain('julio 60 €')
    expect(t).toContain('58,17 € al mes')
  })
  it('lo pagado hasta ahora de Spotify', () => {
    const t = r('Cuánto he pagado hasta ahora de Spotify')
    expect(t).toContain('**32,97 €**')
    expect(t).toMatch(/^Desde el 05\/08\/2026 has pagado \*\*32,97 €\*\* en \*\*Spotify\*\*/)
  })
  it('Shopify (comercio con asterisco)', () => {
    expect(r('¿cuánto he pagado de shopify?')).toContain('**39 €**')
  })
  it('seguro de moto: solo el de la moto, no el del coche', () => {
    const t = r('¿Cuánto he pagado del seguro de moto?')
    expect(t).toContain('**180 €**')
    expect(t).not.toContain('600')
  })
  it('cuándo me cobran el seguro de moto', () => {
    expect(r('¿Cuándo me cobran el seguro de moto?')).toContain('01/03/2027')
  })
})

describe('otras preguntas de datos', () => {
  it('gasto del mes sin "qué": consumo sin inversión ni ajustes', () => {
    // octubre: 40 + 10,99 + 39 + 85,40 + 30 = 205,39
    expect(r('¿Cuánto he gastado este mes?')).toContain('**205,39 €**')
  })
  it('categoría del usuario ("comida")', () => {
    expect(r('cuanto llevo gastado en comida este mes')).toContain('**115,40 €**')
  })
  it('presente sin periodo → media de 3 meses', () => {
    expect(r('¿Cuánto gasto en gasolina?')).toContain('58,17 € al mes')
  })
  it('en qué gasto más', () => {
    const t = r('¿En qué gasto más este mes?')
    expect(t.split('\n')[1]).toContain('Comida')
  })
  it('fijos al mes (anual prorrateado)', () => {
    // 10,99 + 180/12 + 750 = 775,99
    expect(r('¿Cuánto pago en fijos al mes?')).toContain('**775,99 € al mes**')
  })
  it('ahorro e ingresos del mes', () => {
    expect(r('¿Cuánto he ahorrado este mes?')).toContain('**1.794,61 €**')
    expect(r('¿Cuánto he ingresado este mes?')).toContain('**2.000 €**')
  })
  it('invertido', () => {
    expect(r('¿Cuánto he invertido este año?')).toContain('**200 €**')
  })
  it('mes por nombre', () => {
    expect(r('¿Cuánto gasté en agosto?')).toContain('**74,99 €**')
  })
  it('algo que no existe: lo dice, sin inventar', () => {
    expect(r('¿Cuánto he gastado en Netflix?')).toContain('No veo gastos de **Netflix**')
  })
  it('último pago', () => {
    expect(r('¿Cuándo fue el último pago de Spotify?')).toContain('05/10/2026')
  })
})

describe('lo que va a la IA (null)', () => {
  for (const q of [
    '¿Cómo voy este mes?',
    '¿Me conviene cambiar de compañía de luz?',
    '¿Cómo puedo ahorrar más?',
    '¿Cuánto debería ahorrar al mes?',
    '¿Cuánto puedo gastar hoy?',
    '¿Qué es un fondo indexado?',
    '¿Por qué he gastado tanto en agosto?',
    'Hazme un plan para llegar a mi objetivo',
  ]) {
    it(q, () => expect(r(q)).toBe(null))
  }
})

describe('robustez', () => {
  it('nunca lanza, con preguntas raras o aleatorias y datos de ejemplo', async () => {
    const { generarDemo } = await import('./datosDemo')
    const demo = generarDemo()
    const piezas = ['cuánto', 'he', 'gastado', 'pagado', 'en', 'de', 'gasolina', 'spotify', 'los', 'últimos', '3', 'meses', 'este', 'año', 'mes pasado', 'agosto', '¿', '?', 'comida', 'fijos', 'cuándo', 'cobran', 'ahorrado', 'invertido', 'qué', 'más', '😀', '%', '""', '\n']
    let semilla = 7
    const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648)
    for (let i = 0; i < 2000; i++) {
      const q = Array.from({ length: 1 + Math.floor(azar() * 9) }, () => piezas[Math.floor(azar() * piezas.length)]).join(' ')
      const t = respuestaLocal(q, { movimientos: demo.movimientos, recurrentes: demo.recurrentes, hoy: HOY })
      if (t != null) {
        expect(typeof t).toBe('string')
        expect(t).not.toMatch(/NaN|undefined|null|Infinity/)
      }
    }
    expect(respuestaLocal('', {})).toBe(null)
    expect(respuestaLocal('¿cuánto he gastado este mes?', {})).toContain('No has apuntado')
  })
})
