import { describe, expect, it } from 'vitest'
import { costeAnualTotal, detectarSuscripciones, normalizarComercio } from './suscripciones'

const g = (fecha, importe, nota, extra = {}) => ({
  tipo: 'gasto',
  importe,
  fecha,
  nota,
  categoria: { nombre: 'Ocio' },
  ...extra,
})

const HOY = '2026-06-20'

describe('normalizarComercio', () => {
  it('limpia el ruido de los conceptos bancarios', () => {
    expect(normalizarComercio('COMPRA TARJ. NETFLIX.COM 12/03')).toBe('netflix')
    expect(normalizarComercio('Recibo Vodafone España SAU 123456')).toBe('vodafone espana')
    expect(normalizarComercio('SPOTIFY AB')).toBe('spotify')
    expect(normalizarComercio('')).toBe('')
  })
})

describe('detectarSuscripciones', () => {
  const netflix = [
    g('2026-02-12', 12.99, 'COMPRA TARJ. NETFLIX.COM 12/02'),
    g('2026-03-12', 12.99, 'COMPRA TARJ. NETFLIX.COM 12/03'),
    g('2026-04-12', 12.99, 'COMPRA TARJ. NETFLIX.COM 12/04'),
    g('2026-05-12', 13.99, 'COMPRA TARJ. NETFLIX.COM 12/05'),
    g('2026-06-12', 13.99, 'COMPRA TARJ. NETFLIX.COM 12/06'),
  ]

  it('detecta una suscripción mensual con su subida de precio', () => {
    const [d] = detectarSuscripciones(netflix, [], { hoy: HOY })
    expect(d).toMatchObject({
      clave: 'netflix',
      nombre: 'Netflix',
      periodicidad: 'mensual',
      importe: 13.99,
      costeAnual: 167.88,
      diaMes: 12,
      nCargos: 5,
      subida: { antes: 12.99, ahora: 13.99 },
      proximaFecha: '2026-07-12',
    })
  })

  it('detecta una anual con solo dos cargos', () => {
    const prime = [g('2025-03-03', 49.9, 'AMAZON PRIME'), g('2026-03-03', 49.9, 'AMAZON PRIME')]
    const [d] = detectarSuscripciones(prime, [], { hoy: HOY })
    expect(d).toMatchObject({ periodicidad: 'anual', costeAnual: 49.9, proximaFecha: '2027-03-03' })
  })

  it('ignora compras irregulares (supermercado) e importes muy variables', () => {
    const super_ = [
      g('2026-03-01', 54.2, 'MERCADONA'),
      g('2026-03-04', 12.1, 'MERCADONA'),
      g('2026-03-15', 80.0, 'MERCADONA'),
      g('2026-04-02', 33.0, 'MERCADONA'),
    ]
    expect(detectarSuscripciones(super_, [], { hoy: HOY })).toEqual([])
  })

  it('ignora lo que ya no se cobra (cancelada)', () => {
    const viejo = netflix.map((m) => ({ ...m, fecha: m.fecha.replace('2026', '2025') }))
    expect(detectarSuscripciones(viejo, [], { hoy: HOY })).toEqual([])
  })

  it('no repite lo que ya está en Base ni lo descartado', () => {
    expect(detectarSuscripciones(netflix, [{ nombre: 'Netflix' }], { hoy: HOY })).toEqual([])
    expect(detectarSuscripciones(netflix, [], { hoy: HOY, descartadas: new Set(['netflix']) })).toEqual([])
  })

  it('no cuenta inversiones, ajustes ni ingresos', () => {
    const inv = netflix.map((m) => ({ ...m, categoria: { nombre: 'Inversion' } }))
    const ing = netflix.map((m) => ({ ...m, tipo: 'ingreso' }))
    expect(detectarSuscripciones([...inv, ...ing], [], { hoy: HOY })).toEqual([])
  })

  it('usa la fuente (concepto) si existe y suma el coste anual exacto', () => {
    const spotify = [1, 2, 3].map((i) =>
      g(`2026-0${i + 3}-01`, 10.99, null, { fuente: { id: 'f1', nombre: 'Spotify' }, fuente_id: 'f1' }),
    )
    const res = detectarSuscripciones([...netflix, ...spotify], [], { hoy: HOY })
    expect(res.map((d) => d.nombre)).toEqual(['Netflix', 'Spotify'])
    expect(costeAnualTotal(res)).toBe(299.76) // 167,88 + 131,88
    expect(detectarSuscripciones(spotify, [{ nombre: 'Otro', fuenteId: 'f1' }], { hoy: HOY })).toEqual([])
  })
})
