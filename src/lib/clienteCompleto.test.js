import { describe, expect, it } from 'vitest'
import { generarClienteCompleto, objetivosCliente, presupuestoCliente } from './clienteCompleto'
import { esDemo } from './datosDemo'
import { bolsas, totalesDe } from './movimientosUtils'
import { esDevolucion, esInversion, esRetiradaInversion, esTraspaso } from './categorias'

const HOY = new Date(2026, 10, 5)
const hoyIso = '2026-11-05'

describe('cliente completo (3 años)', () => {
  const c = generarClienteCompleto(HOY)
  const m = c.movimientos

  it('cubre 36 meses sin fechas futuras y con ids de ejemplo', () => {
    const meses = new Set(m.map((x) => x.fecha.slice(0, 7)))
    expect(meses.size).toBe(36)
    expect(m.every((x) => x.fecha <= hoyIso)).toBe(true)
    expect(m.every((x) => esDemo(x.id))).toBe(true)
    expect(new Set(m.map((x) => x.id)).size).toBe(m.length)
    expect(m.length).toBeGreaterThan(1000)
  })

  it('usa todo: devoluciones, traspasos, inversión en 4 plataformas con retirada y ajustes', () => {
    expect(m.some(esDevolucion)).toBe(true)
    expect(m.filter(esTraspaso).some((x) => x.tipo === 'ingreso')).toBe(true)
    expect(m.some(esRetiradaInversion)).toBe(true)
    const plataformas = new Set(m.filter(esInversion).map((x) => x.fuente?.nombre))
    expect([...plataformas].sort()).toEqual(['Coinbase', 'Indexa Capital', 'MyInvestor', 'Trade Republic'])
    expect(m.filter((x) => x.categoria.nombre === 'Ajuste').length).toBeGreaterThan(5)
  })

  it('las cuentas cuadran: ahorra y su patrimonio crece', () => {
    const t = totalesDe(m)
    expect(t.ingresos).toBeGreaterThan(t.gastos)
    const b = bolsas(m, hoyIso)
    expect(b.bolsaLiquidez).toBeGreaterThan(0)
    expect(b.bolsaInversion).toBeGreaterThan(10000)
    expect(b.patrimonio).toBeGreaterThan(20000)
  })

  it('fijos con varias periodicidades, uno inactivo y Spotify pendiente hoy', () => {
    const r = c.recurrentes
    expect(new Set(r.map((x) => x.periodoMeses))).toEqual(new Set([1, 2, 3, 12]))
    expect(r.some((x) => !x.activo)).toBe(true)
    const spotify = r.find((x) => x.nombre === 'Spotify')
    expect(spotify.diaMes).toBe(5)
    expect(spotify.aplicadoEn).toBeNull()
    expect(r.find((x) => x.nombre === 'Netflix').mesesAplicados.length).toBe(35) // el día 8 aún no ha llegado
  })

  it('presupuesto y objetivos configurados y de solo lectura', async () => {
    const avisos = []
    const p = presupuestoCliente((t) => avisos.push(t))
    expect(p.configurado).toBe(true)
    expect(await p.guardarPresupuesto('tasa', 30)).toBe(false)
    const o = objetivosCliente((t) => avisos.push(t), HOY)
    expect(o.objetivos.length).toBe(3)
    expect(o.objetivos.every((x) => esDemo(x.id))).toBe(true)
    expect(await o.crear({ nombre: 'x', importeObjetivo: 1 })).toBeNull()
    expect(avisos.length).toBe(2)
  })

  it('es estable: los mismos datos en cada visita', () => {
    expect(generarClienteCompleto(HOY).movimientos.map((x) => x.importe)).toEqual(m.map((x) => x.importe))
  })
})
