// Escenarios del periodo financiero (día de inicio ≠ 1) y sus invariantes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configurarPeriodo } from './periodo'
import * as U from './movimientosUtils'
import { balanceInicio, evolucionPatrimonio, resumenDelMes } from './inicio'
import { contextoMes, insightsDelMes } from './analisis'
import { agruparHistorial } from './historial'
import { consultaLocal } from './respuestasLocales'
import { generarClienteCompleto } from './clienteCompleto'
import { movimientosLaura } from './clienteFulcro'

let n = 0
const mov = (tipo, cat, importe, fecha) => ({ id: `e${++n}`, tipo, importe, importe_centimos: Math.round(importe * 100), fecha, categoria: { nombre: cat } })
const enDia = (iso) => vi.setSystemTime(new Date(`${iso}T12:00:00`))

// Nómina el 28 de cada mes, alquiler el 1, súper el 10 y un gasto el 30.
function nominaA28(desde = 2026, hasta = '2026-11-07') {
  const L = []
  for (let y = desde; y <= 2026; y++)
    for (let m = 1; m <= 12; m++) {
      const c = `${y}-${String(m).padStart(2, '0')}`
      const dias = new Date(y, m, 0).getDate()
      for (const [t, cat, imp, d] of [['ingreso', 'Nomina', 2000, 28], ['gasto', 'Vivienda', 800, 1], ['gasto', 'Comida', 200, 10], ['gasto', 'Ocio', 60, 30]]) {
        if (d > dias) continue
        const f = `${c}-${String(d).padStart(2, '0')}`
        if (f <= hasta) L.push(mov(t, cat, imp, f))
      }
    }
  return L
}

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }))
afterEach(() => {
  configurarPeriodo(1)
  vi.useRealTimers()
})

describe('nómina el día 28', () => {
  it('con inicio 28, la nómina del 28-oct paga noviembre; con día 1 cae en octubre', () => {
    enDia('2026-11-07')
    const L = nominaA28()
    configurarPeriodo(1)
    const nov1 = U.agregarPorMes(L, 2).at(-1)
    expect(nov1).toMatchObject({ clave: '2026-11', ingresos: 0 })
    expect(resumenDelMes(L).ingresoPendiente).toBe(true)

    configurarPeriodo(28)
    const [oct, nov] = U.agregarPorMes(L, 2)
    expect(nov).toMatchObject({ clave: '2026-11', ingresos: 2000 })
    // Octubre (28 sep – 27 oct): la nómina del 28-sep, alquiler 1-oct, súper 10-oct y ocio 30-sep.
    expect(oct).toMatchObject({ ingresos: 2000, gastos: 1060 })
    const r = resumenDelMes(L)
    expect(r).toMatchObject({ clave: '2026-11', dia: 11, diasMes: 31, ingresoPendiente: false })
    expect(r.diaIngresoHabitual).toBe(28) // se muestra el día real del mes
    // Presupuesto en porcentaje: con día 1 no habría base (0 €); con 28, sí.
    expect(U.limiteGastoPresupuesto({ metodo: 'tasa', tasaAhorroObjetivo: 20 }, U.totalesDe(U.filtrarMesActual(L)).ingresos)).toBe(1600)
    configurarPeriodo(1)
    expect(U.limiteGastoPresupuesto({ metodo: 'tasa', tasaAhorroObjetivo: 20 }, U.totalesDe(U.filtrarMesActual(L)).ingresos)).toBe(0)
  })

  it('Análisis no dice «aún no ha entrado nada» cuando el periodo ya cobró', () => {
    enDia('2026-11-07')
    configurarPeriodo(28)
    const ins = insightsDelMes(nominaA28(2025), contextoMes('2026-11'))
    expect(ins.find((i) => i.id === 'ingreso-pendiente')).toBeUndefined()
  })
})

describe('dos nóminas en el mismo periodo', () => {
  it('28-oct y 2-nov caen ambas en noviembre con inicio 28, y cada una solo una vez', () => {
    enDia('2026-11-20')
    const L = [mov('ingreso', 'Nomina', 1500, '2026-10-28'), mov('ingreso', 'Nomina', 400, '2026-11-02'), mov('gasto', 'Comida', 100, '2026-11-05')]
    configurarPeriodo(28)
    const del = U.filtrarMesActual(L)
    expect(del.map((m) => m.fecha)).toEqual(['2026-10-28', '2026-11-02', '2026-11-05'])
    expect(U.totalesDe(del)).toMatchObject({ ingresos: 1900, gastos: 100, ahorro: 1800 })
    configurarPeriodo(1)
    expect(U.totalesDe(U.filtrarMesActual(L)).ingresos).toBe(400)
  })
})

describe('gastos entre el 28 y el 31', () => {
  it('van con la nómina que los paga (periodo siguiente), con su fecha real intacta', () => {
    enDia('2026-11-07')
    const L = ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'].map((f) => mov('gasto', 'Ocio', 10, f))
    const copia = JSON.stringify(L)
    configurarPeriodo(28)
    expect(U.filtrarPorMes(L, '2026-11').map((m) => m.fecha)).toEqual(['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'])
    expect(U.filtrarPorMes(L, '2026-10').map((m) => m.fecha)).toEqual(['2026-10-27'])
    expect(JSON.stringify(L)).toBe(copia) // no se toca ningún movimiento
  })
})

describe('cambio de año', () => {
  it('con inicio 28, el 30-dic es enero del año siguiente en todos los módulos', () => {
    enDia('2027-01-05')
    configurarPeriodo(28)
    const L = [mov('ingreso', 'Nomina', 2000, '2026-12-28'), mov('gasto', 'Comida', 50, '2026-12-30'), mov('gasto', 'Comida', 70, '2026-12-20')]
    expect(U.claveMesActual()).toBe('2027-01')
    expect(U.totalesDe(U.filtrarMesActual(L))).toMatchObject({ ingresos: 2000, gastos: 50 })
    const h = agruparHistorial(L)
    expect(h[0]).toMatchObject({ tipo: 'mes', clave: '2027-01', n: 2, actual: true })
    expect(h[1]).toMatchObject({ tipo: 'anio', clave: '2026', n: 1 })
    expect(U.rangoMeses(L)).toEqual(['2027-01', '2026-12'])
    const r = consultaLocal('¿Cuánto he gastado este mes?', { movimientos: L, recurrentes: [], hoy: new Date() })
    expect(r?.texto).toMatch(/50/)
    expect(r?.texto).not.toMatch(/120/)
  })
})

describe('meses de distinta duración', () => {
  it('días del periodo y días restantes con febrero, 30 y 31 días', () => {
    configurarPeriodo(28)
    enDia('2027-03-01') // periodo «marzo» = 28 feb – 27 mar (28 días); 1-mar es su día 2
    expect(contextoMes('2027-03')).toMatchObject({ parcial: true, dia: 2, diasMes: 28 })
    expect(U.diasRestantesDelMes(new Date())).toBe(27)
    enDia('2026-12-27') // «diciembre» = 28 nov – 27 dic (30 días): último día
    expect(U.diasRestantesDelMes(new Date())).toBe(1)
    expect(contextoMes('2026-12').diasMes).toBe(30)
    configurarPeriodo(15)
    enDia('2026-11-15') // «diciembre» = 15 nov – 14 dic: primer día
    expect(U.claveMesActual()).toBe('2026-12')
    expect(contextoMes('2026-12')).toMatchObject({ dia: 1, diasMes: 30 })
  })
})

describe('periodos sin movimientos', () => {
  it('aparecen a cero y la serie sigue siendo contigua', () => {
    enDia('2026-11-07')
    configurarPeriodo(28)
    const L = [mov('gasto', 'Comida', 10, '2026-06-10'), mov('gasto', 'Comida', 20, '2026-10-29')]
    const s = U.agregarPorMes(L, 6)
    expect(s.map((m) => m.clave)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(s.map((m) => m.gastos)).toEqual([10, 0, 0, 0, 0, 20])
    expect(U.rangoMeses(L)).toHaveLength(6)
    expect(U.filtrarMesActual([])).toEqual([])
  })
})

describe('invariantes al cambiar el día de inicio', () => {
  const datasets = () => ({ completo: generarClienteCompleto(new Date('2026-11-07T12:00:00')).movimientos, laura: movimientosLaura(new Date('2026-11-07T12:00:00')) })
  it('patrimonio, número de movimientos y totales globales no cambian (1…28)', () => {
    enDia('2026-11-07')
    for (const [nombre, L] of Object.entries(datasets())) {
      const copia = JSON.stringify(L)
      configurarPeriodo(1)
      const base = U.bolsas(L, '2026-11-07')
      const totalBase = U.totalesDe(L.filter((m) => m.fecha <= '2026-11-07'))
      const fechas = ['2025-02-27', '2025-12-31', '2026-10-27', '2026-10-28', '2026-11-07']
      const patBase = fechas.map((f) => U.bolsas(L, f).patrimonio)
      for (const s of [1, 2, 10, 15, 25, 27, 28]) {
        configurarPeriodo(s)
        expect(U.bolsas(L, '2026-11-07'), `${nombre} S=${s}`).toEqual(base)
        expect(fechas.map((f) => U.bolsas(L, f).patrimonio)).toEqual(patBase)
        // Cada movimiento cae en un único periodo: la suma de los periodos es el total.
        const meses = U.rangoMeses(L).length
        const serie = U.agregarPorMes(L.filter((m) => m.fecha <= '2026-11-07'), meses + 1)
        const cent = (k) => Math.round(serie.reduce((a, m) => a + m[k] * 100, 0))
        expect(cent('ingresos')).toBe(Math.round(totalBase.ingresos * 100))
        expect(cent('gastos')).toBe(Math.round(totalBase.gastos * 100))
        expect(cent('invertido')).toBe(Math.round(totalBase.invertido * 100))
        const h = agruparHistorial(L)
        const nH = h.reduce((a, b) => a + b.n, 0)
        expect(nH, `${nombre} S=${s} movimientos`).toBe(L.length)
        // El patrimonio de cierre de periodo es el stock a su último día.
        const evo = evolucionPatrimonio(L, 3)
        expect(evo.at(-1).valor).toBe(base.patrimonio)
        expect(balanceInicio(L).clave).toMatch(/^\d{4}-\d{2}$/)
      }
      expect(JSON.stringify(L)).toBe(copia)
    }
  })
})
