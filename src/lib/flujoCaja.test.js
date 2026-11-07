import { describe, expect, it } from 'vitest'
import { flujoDelMes } from './flujoCaja'
import { bolsas } from './movimientosUtils'
import { generarClienteCompleto } from './clienteCompleto'

let n = 0
const mov = (tipo, cat, importe, fecha, nota = '') => ({ id: `f${++n}`, tipo, importe, importe_centimos: Math.round(importe * 100), fecha, nota, categoria: { nombre: cat }, created_at: `${fecha}T10:00:${String(n % 60).padStart(2, '0')}Z` })
const rec = (o) => ({ id: o.id, tipo: 'gasto', activo: true, periodoMeses: 1, mesInicio: null, confirmar: false, mesesAplicados: [], ...o })
const HOY = new Date('2026-11-14T12:00:00')

const base = () => [
  mov('ingreso', 'Ajuste', 1000, '2026-10-01', 'Saldo inicial'),
  mov('ingreso', 'Nomina', 2000, '2026-11-01'),
  mov('gasto', 'Vivienda', 800, '2026-11-02'),
  mov('gasto', 'Comida', 45.37, '2026-11-02'),
  mov('gasto', 'Inversion', 300, '2026-11-05'),
  mov('gasto', 'Ahorro', 200, '2026-11-06'),
  mov('ingreso', 'Devoluciones', 10.5, '2026-11-09'),
  mov('gasto', 'Ocio', 25, '2026-11-20'), // apuntado con fecha futura
]
const fijos = () => [
  rec({ id: 'alq', nombre: 'Alquiler', importe: 800, diaMes: 2, categoriaNombre: 'Vivienda', mesesAplicados: ['2026-11'] }),
  rec({ id: 'luz', nombre: 'Luz', importe: 62.4, diaMes: 18, categoriaNombre: 'Suministros', confirmar: true }),
  rec({ id: 'gym', nombre: 'Gimnasio', importe: 29.99, diaMes: 10, categoriaNombre: 'Ocio' }), // ya tocaba: por confirmar
  rec({ id: 'tra', nombre: 'Traspaso a ahorro', importe: 150, diaMes: 25, categoriaNombre: 'Ahorro' }),
  rec({ id: 'nom', nombre: 'Nómina', tipo: 'ingreso', importe: 2000, diaMes: 28, categoriaNombre: 'Nomina' }),
  rec({ id: 'seg', nombre: 'Seguro', importe: 300, diaMes: 3, categoriaNombre: 'Seguros', periodoMeses: 12, mesInicio: 3 }), // no toca en noviembre
  rec({ id: 'sin', nombre: 'Sin día', importe: 9, diaMes: null }),
]

describe('flujo del mes en curso', () => {
  const L = base()
  const f = flujoDelMes({ movimientos: L, recurrentes: fijos(), clave: '2026-11', hoy: HOY })
  const reales = f.eventos.filter((e) => e.estado === 'realizado')
  const prev = f.eventos.filter((e) => e.estado !== 'realizado')

  it('el saldo inicial y el de hoy son los del motor (bolsas)', () => {
    expect(f.saldoInicial).toBe(bolsas(L, '2026-10-31').bolsaLiquidez)
    expect(f.saldoHoy).toBe(bolsas(L, '2026-11-14').bolsaLiquidez)
    expect(reales.at(-1).saldoDespues).toBe(f.saldoHoy) // la línea real acaba en el saldo de hoy
  })
  it('cada movimiento real mueve el saldo según el motor, encadenado y al céntimo', () => {
    expect(reales.map((e) => [e.fecha, e.delta])).toEqual([['2026-11-01', 2000], ['2026-11-02', -800], ['2026-11-02', -45.37], ['2026-11-05', -300], ['2026-11-06', 0], ['2026-11-09', 10.5]])
    for (let i = 1; i < reales.length; i++) expect(reales[i].saldoAntes).toBe(reales[i - 1].saldoDespues)
    expect(reales.find((e) => e.clase === 'traspaso').delta).toBe(0) // el traspaso no baja la liquidez
  })
  it('la previsión parte del saldo de hoy, en su fecha, sin repartir ni duplicar', () => {
    expect(prev[0].saldoAntes).toBe(f.saldoHoy) // la discontinua empieza donde acaba la continua
    for (let i = 1; i < prev.length; i++) expect(prev[i].saldoAntes).toBe(prev[i - 1].saldoDespues)
    expect(prev.map((e) => [e.fecha, e.nombre, e.delta, e.estado])).toEqual([
      ['2026-11-14', 'Gimnasio', -29.99, 'por-confirmar'],
      ['2026-11-18', 'Luz', -62.4, 'previsto'],
      ['2026-11-20', expect.any(String), -25, 'previsto'],
      ['2026-11-25', 'Traspaso a ahorro', 0, 'previsto'],
      ['2026-11-28', 'Nómina', 2000, 'previsto'],
    ])
    expect(prev.find((e) => e.nombre === 'Luz').aproximado).toBe(true)
    expect(f.eventos.some((e) => e.nombre === 'Alquiler')).toBe(false) // pagado: ya es el movimiento real
    expect(f.eventos.some((e) => e.nombre === 'Seguro')).toBe(false) // no toca este mes
    expect(f.sinDia.map((r) => r.id)).toEqual(['sin'])
    expect(f.saldoFinal).toBe(Math.round((f.saldoHoy - 29.99 - 62.4 - 25 + 2000) * 100) / 100)
  })
  it('no modifica movimientos ni compromisos', () => {
    const L2 = base()
    const R2 = fijos()
    const a = JSON.stringify([L2, R2])
    flujoDelMes({ movimientos: L2, recurrentes: R2, clave: '2026-11', hoy: HOY })
    expect(JSON.stringify([L2, R2])).toBe(a)
  })
})

describe('meses pasados y futuros', () => {
  it('mes pasado: solo real, sin previsión', () => {
    const f = flujoDelMes({ movimientos: base(), recurrentes: fijos(), clave: '2026-10', hoy: HOY })
    expect(f).toMatchObject({ tramo: 'pasado', finPrevisto: false, saldoInicial: 0, saldoFinal: 1000 })
    expect(f.eventos.every((e) => e.estado === 'realizado')).toBe(true)
  })
  it('mes futuro: encadena la previsión desde hoy y solo enseña sus eventos', () => {
    const L = base()
    const actual = flujoDelMes({ movimientos: L, recurrentes: fijos(), clave: '2026-11', hoy: HOY })
    const f = flujoDelMes({ movimientos: L, recurrentes: fijos(), clave: '2026-12', hoy: HOY })
    expect(f.tramo).toBe('futuro')
    expect(f.saldoInicial).toBe(actual.saldoFinal)
    expect(f.eventos.every((e) => e.fecha.startsWith('2026-12') && e.estado === 'previsto')).toBe(true)
    expect(f.eventos.map((e) => e.nombre)).toEqual(['Alquiler', 'Gimnasio', 'Luz', 'Traspaso a ahorro', 'Nómina'])
  })
  it('sin compromisos ni datos no inventa nada', () => {
    const f = flujoDelMes({ movimientos: [], recurrentes: [], clave: '2026-11', hoy: HOY })
    expect(f).toMatchObject({ saldoInicial: 0, saldoHoy: 0, saldoFinal: 0, eventos: [] })
  })
})

describe('cliente de 3 años', () => {
  it('cuadra con el motor en el mes en curso', () => {
    const hoy = new Date('2026-11-07T12:00:00')
    const c = generarClienteCompleto(hoy)
    const f = flujoDelMes({ movimientos: c.movimientos, recurrentes: c.recurrentes ?? [], clave: '2026-11', hoy })
    expect(f.saldoHoy).toBe(bolsas(c.movimientos, '2026-11-07').bolsaLiquidez)
    const r = f.eventos.filter((e) => e.estado === 'realizado')
    expect(r.length).toBe(c.movimientos.filter((m) => m.fecha >= '2026-11-01' && m.fecha <= '2026-11-07').length)
    if (r.length) expect(r.at(-1).saldoDespues).toBe(f.saldoHoy)
  })
})

describe('por periodo financiero (cobra el 28)', () => {
  it('el gráfico va del 28 al 27: la nómina del 28 abre el periodo y los fijos de dos meses naturales caen en su sitio', async () => {
    const { configurarPeriodo } = await import('./periodo')
    const { flujoDelMes: f } = await import('./flujoCaja')
    configurarPeriodo(28)
    try {
      const hoy = new Date('2026-11-07T12:00:00')
      const L = [mov('ingreso', 'Ajuste', 500, '2026-09-01'), mov('ingreso', 'Nomina', 2000, '2026-10-28'), mov('gasto', 'Vivienda', 800, '2026-11-02'), mov('gasto', 'Comida', 60, '2026-10-30')]
      const R = [rec({ id: 'luz', nombre: 'Luz', importe: 50, diaMes: 15, categoriaNombre: 'Suministros' }), rec({ id: 'nom', nombre: 'Nómina', tipo: 'ingreso', importe: 2000, diaMes: 28, categoriaNombre: 'Nomina' }), rec({ id: 'gym', nombre: 'Gym', importe: 30, diaMes: 29 })]
      const r = f({ movimientos: L, recurrentes: R, clave: '2026-11', hoy, periodo: true })
      expect(r).toMatchObject({ desde: '2026-10-28', hasta: '2026-11-27', dias: 31, diaHoy: 11, tramo: 'actual', saldoInicial: 500 })
      const reales = r.eventos.filter((e) => e.estado === 'realizado')
      expect(reales.map((e) => [e.fecha, e.dia, e.diaMes])).toEqual([['2026-10-28', 1, 28], ['2026-10-30', 3, 30], ['2026-11-02', 6, 2]])
      // Previstos: la luz del 15-nov; la nómina del 28-nov y el gym del 29-nov ya son del periodo siguiente.
      expect(r.eventos.filter((e) => e.estado !== 'realizado').map((e) => [e.nombre, e.fecha])).toEqual([['Luz', '2026-11-15']])
      // Con día 1 sería el mes natural, exactamente como antes.
      configurarPeriodo(1)
      const n = f({ movimientos: L, recurrentes: R, clave: '2026-11', hoy, periodo: true })
      const n0 = f({ movimientos: L, recurrentes: R, clave: '2026-11', hoy })
      expect(JSON.stringify(n.eventos)).toBe(JSON.stringify(n0.eventos))
      expect([n.desde, n.hasta, n.saldoInicial, n.saldoFinal]).toEqual([n0.desde, n0.hasta, n0.saldoInicial, n0.saldoFinal])
    } finally {
      configurarPeriodo(1)
    }
  })
})

describe('ritmo variable habitual', () => {
  it('media diaria de lo no fijo de los 3 periodos anteriores; los fijos no cuentan', async () => {
    const { ritmoVariableDiario } = await import('./flujoCaja')
    const L = []
    for (const c of ['2026-08', '2026-09', '2026-10']) {
      L.push(mov('gasto', 'Vivienda', 800, `${c}-02`, 'Alquiler piso'))
      L.push(mov('gasto', 'Comida', 310, `${c}-10`, 'Mercadona'))
    }
    const R = [rec({ id: 'alq', nombre: 'Alquiler piso', importe: 800, diaMes: 2, categoriaNombre: 'Vivienda' })]
    const r = ritmoVariableDiario(L, R, new Date('2026-11-07T12:00:00'))
    expect(r.periodos).toBe(3)
    expect(r.diario).toBe(Math.round((930 * 100) / 92) / 100) // 3 × 310 € entre 31+30+31 días
    expect(ritmoVariableDiario(L.slice(0, 2), R, new Date('2026-11-07T12:00:00'))).toBeNull()
  })
})
