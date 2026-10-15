import { describe, expect, it } from 'vitest'
import { bolsas, centimosDe, gastoPorCategoria, totalesDe, hoyIso, claveMes } from './movimientosUtils'
import { esDevolucion, formatearEuros } from './categorias'
import { respuestaLocal } from './respuestasLocales'

// Contrato docs/MOTOR.md, comprobado sobre miles de historiales aleatorios con
// todo tipo de movimientos: consumo, ingresos, inversión, traspasos al ahorro,
// ajustes de saldo (ambos signos), devoluciones y fechas futuras.

let semilla = 12345
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648)
const elegir = (xs) => xs[Math.floor(azar() * xs.length)]
const pad = (n) => String(n).padStart(2, '0')

const CATS_GASTO = ['Comida', 'Ocio', 'Transporte', 'Compras', 'Vivienda']
const COMERCIOS = ['MERCADONA', 'AMAZON MKTP', 'REPSOL', 'ZARA', 'NETFLIX.COM', 'BAR PACO']

function historial(n, hoy) {
  const movs = []
  for (let i = 0; i < n; i += 1) {
    const r = azar()
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - Math.floor(azar() * 14), 1 + Math.floor(azar() * 28) + (azar() < 0.05 ? 40 : 0))
    const fecha = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const importe = Math.round((0.01 + azar() * 900) * 100) / 100
    const base = { id: `m${i}`, fecha, importe, importe_centimos: Math.round(importe * 100), fuente: null, created_at: `${fecha}T10:00:00Z` }
    if (r < 0.5) movs.push({ ...base, tipo: 'gasto', nota: elegir(COMERCIOS), categoria: { nombre: elegir(CATS_GASTO) } })
    else if (r < 0.65) movs.push({ ...base, tipo: 'ingreso', nota: 'NOMINA', categoria: { nombre: 'Nomina' } })
    else if (r < 0.72) movs.push({ ...base, tipo: 'gasto', nota: 'Indexa', categoria: { nombre: 'Inversion' } })
    else if (r < 0.78) movs.push({ ...base, tipo: 'gasto', nota: 'Traspaso', categoria: { nombre: 'Ahorro' } })
    else if (r < 0.83) movs.push({ ...base, tipo: elegir(['ingreso', 'gasto']), nota: 'Ajuste', categoria: { nombre: 'Ajuste' } })
    else if (r < 0.86) movs.push({ ...base, tipo: 'ingreso', nota: 'TRASPASO DESDE CUENTA AHORRO', categoria: { nombre: 'Desde ahorro' } })
    else if (r < 0.88) movs.push({ ...base, tipo: 'ingreso', nota: 'REEMBOLSO FONDO INDEXA', categoria: { nombre: 'Inversion' } })
    else movs.push({ ...base, tipo: 'ingreso', nota: `DEVOLUCION ${elegir(COMERCIOS)}`, categoria: { nombre: 'Devoluciones' } })
  }
  return movs
}

const suma = (xs) => xs.reduce((s, m) => s + centimosDe(m), 0)
const esCat = (m, n) => m.categoria?.nombre === n

describe('invariantes del motor (fuzz)', () => {
  const HOY = new Date()
  const hoy = hoyIso()

  it('E2/E3: patrimonio de hoy = Σ entradas − Σ salidas al exterior (al céntimo, sin fechas futuras)', () => {
    for (let k = 0; k < 400; k += 1) {
      const movs = historial(60, HOY)
      const vig = movs.filter((m) => m.fecha <= hoy)
      // Entran: ingresos (nómina, devoluciones, ajustes +). Salen: consumo y ajustes −.
      // Inversión, retiradas y traspasos son entre bolsas propias: no cruzan la
      // frontera (E4)… salvo lo que se retira POR ENCIMA de lo aportado hasta
      // ese día, que es ganancia que entra.
      const entradas = suma(vig.filter((m) => m.tipo === 'ingreso' && !esCat(m, 'Inversion') && !esCat(m, 'Desde ahorro')))
      const salidas = suma(vig.filter((m) => m.tipo === 'gasto' && !esCat(m, 'Inversion') && !esCat(m, 'Ahorro')))
      let bolsaInv = 0
      let ganancia = 0
      const orden = vig.filter((m) => esCat(m, 'Inversion')).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.tipo === 'ingreso') - (b.tipo === 'ingreso')))
      for (const m of orden) {
        if (m.tipo === 'gasto') bolsaInv += centimosDe(m)
        else (ganancia += Math.max(0, centimosDe(m) - bolsaInv)), (bolsaInv = Math.max(0, bolsaInv - centimosDe(m)))
      }
      const b = bolsas(movs, hoy)
      expect(Math.round(b.patrimonio * 100)).toBe(entradas - salidas + ganancia)
      expect(Math.round(b.bolsaInversion * 100)).toBe(bolsaInv)
      expect(b.bolsaInversion).toBeGreaterThanOrEqual(0)
    }
  })

  it('N2/E4: un traspaso (en cualquier sentido) o una inversión nunca cambian el patrimonio', () => {
    for (let k = 0; k < 200; k += 1) {
      const movs = historial(40, HOY)
      const antes = bolsas(movs, hoy).patrimonio
      const [tipo, cat] = elegir([['gasto', 'Ahorro'], ['gasto', 'Inversion'], ['ingreso', 'Desde ahorro']])
      const extra = { id: 'x', tipo, fecha: hoy, importe: 123.45, importe_centimos: 12345, categoria: { nombre: cat } }
      expect(bolsas([...movs, extra], hoy).patrimonio).toBe(antes)
    }
  })

  it('E6: una devolución no es ingreso; resta gasto. Ahorro = ingresos − gastos (exacto)', () => {
    for (let k = 0; k < 400; k += 1) {
      const movs = historial(60, HOY)
      const t = totalesDe(movs)
      const flujo = movs.filter((m) => !esCat(m, 'Ajuste') && !(m.tipo === 'gasto' && esCat(m, 'Ahorro')) && !esCat(m, 'Desde ahorro'))
      const ingresos = suma(flujo.filter((m) => m.tipo === 'ingreso' && !esDevolucion(m) && !esCat(m, 'Inversion')))
      const gastos = suma(flujo.filter((m) => m.tipo === 'gasto' && !esCat(m, 'Inversion'))) - suma(flujo.filter(esDevolucion))
      const invertido = suma(flujo.filter((m) => m.tipo === 'gasto' && esCat(m, 'Inversion'))) - suma(flujo.filter((m) => m.tipo === 'ingreso' && esCat(m, 'Inversion')))
      expect(Math.round(t.invertido * 100)).toBe(invertido)
      expect(Math.round(t.ingresos * 100)).toBe(ingresos)
      expect(Math.round(t.gastos * 100)).toBe(gastos)
      expect(Math.round(t.ahorro * 100)).toBe(ingresos - gastos)
    }
  })

  it('P2: la suma de los meses es exactamente la del total (no se pierde ni un céntimo)', () => {
    for (let k = 0; k < 200; k += 1) {
      const movs = historial(80, HOY)
      const porMes = new Map()
      for (const m of movs) {
        const c = claveMes(m.fecha)
        if (!porMes.has(c)) porMes.set(c, [])
        porMes.get(c).push(m)
      }
      let ahorro = 0
      for (const lista of porMes.values()) ahorro += Math.round(totalesDe(lista).ahorro * 100)
      expect(ahorro).toBe(Math.round(totalesDe(movs).ahorro * 100))
    }
  })

  it('el desglose por categorías cuadra al céntimo con el gasto (devoluciones reales: parte de una compra)', () => {
    for (let k = 0; k < 400; k += 1) {
      const compras = historial(50, HOY).filter((m) => m.tipo === 'gasto' && CATS_GASTO.includes(m.categoria.nombre))
      // Cada comercio, siempre en la misma categoría (como en la vida real).
      for (const c of compras) c.categoria = { nombre: CATS_GASTO[COMERCIOS.indexOf(c.nota) % CATS_GASTO.length] }
      const devoluciones = compras
        .filter(() => azar() < 0.2)
        .map((c, i) => {
          const imp = Math.max(0.01, Math.round(c.importe * azar() * 50) / 100)
          return { id: `d${i}`, tipo: 'ingreso', fecha: c.fecha, importe: imp, importe_centimos: Math.round(imp * 100), nota: `DEVOLUCION ${c.nota}`, fuente: null, categoria: { nombre: 'Devoluciones' } }
        })
      const movs = [...compras, ...devoluciones]
      const mapa = gastoPorCategoria(movs)
      const sumaCats = [...mapa.values()].reduce((s, v) => s + Math.round(v * 100), 0)
      expect(sumaCats).toBe(Math.round(totalesDe(movs).gastos * 100))
    }
  })

  it('el desglose nunca muestra categorías negativas o a cero (aunque se devuelva más de lo comprado)', () => {
    for (let k = 0; k < 200; k += 1) {
      const movs = historial(50, HOY)
      const mapa = gastoPorCategoria(movs)
      for (const v of mapa.values()) expect(v).toBeGreaterThan(0)
      const sumaCats = [...mapa.values()].reduce((s, v) => s + Math.round(v * 100), 0)
      expect(sumaCats).toBeGreaterThanOrEqual(Math.round(totalesDe(movs).gastos * 100))
    }
  })

  it('Fulcro al momento dice el mismo gasto del mes que el motor', () => {
    for (let k = 0; k < 100; k += 1) {
      const movs = historial(60, HOY)
      const mes = movs.filter((m) => m.fecha.slice(0, 7) === hoy.slice(0, 7) && m.fecha <= hoy)
      const t = respuestaLocal('¿Cuánto he gastado este mes?', { movimientos: movs, hoy: HOY })
      const gastos = totalesDe(mes).gastos
      if (mes.some((m) => m.tipo === 'gasto' && !esCat(m, 'Inversion') && !esCat(m, 'Ahorro') && !esCat(m, 'Ajuste'))) {
        expect(t).toContain(`**${formatearEuros(gastos)}**`)
      }
    }
  })
})

describe('retiradas de inversión y vuelta del ahorro (casos concretos)', () => {
  const m = (tipo, cat, importe, fecha) => ({ tipo, fecha, importe, importe_centimos: Math.round(importe * 100), nota: '', fuente: null, categoria: { nombre: cat } })
  it('rescatar un fondo pasa el dinero a liquidez: ni ingreso ni cambio de patrimonio', () => {
    const movs = [m('ingreso', 'Nomina', 2000, '2026-01-01'), m('gasto', 'Inversion', 1000, '2026-01-02'), m('ingreso', 'Inversion', 400, '2026-03-01')]
    expect(totalesDe(movs)).toMatchObject({ ingresos: 2000, gastos: 0, invertido: 600, ahorro: 2000 })
    expect(bolsas(movs)).toMatchObject({ bolsaInversion: 600, bolsaLiquidez: 1400, patrimonio: 2000 })
  })
  it('sacar más de lo aportado: el exceso es ganancia y la bolsa no queda negativa', () => {
    const movs = [m('gasto', 'Inversion', 1000, '2026-01-02'), m('ingreso', 'Inversion', 1250, '2026-06-01')]
    expect(bolsas(movs)).toMatchObject({ bolsaInversion: 0, patrimonio: 250 })
  })
  it('el orden de fecha manda, no el de la lista', () => {
    const movs = [m('ingreso', 'Inversion', 500, '2026-06-01'), m('gasto', 'Inversion', 500, '2026-01-01')]
    expect(bolsas(movs)).toMatchObject({ bolsaInversion: 0, patrimonio: 0 })
  })
  it('traer dinero de tu cuenta de ahorro no es un ingreso', () => {
    const movs = [m('ingreso', 'Nomina', 1500, '2026-01-01'), m('gasto', 'Ahorro', 500, '2026-01-02'), m('ingreso', 'Desde ahorro', 300, '2026-02-01')]
    expect(totalesDe(movs)).toMatchObject({ ingresos: 1500, gastos: 0, ahorro: 1500 })
    expect(bolsas(movs).patrimonio).toBe(1500)
  })
  it('un ingreso llamado "Ahorro" (intereses) sigue siendo ingreso', () => {
    expect(totalesDe([m('ingreso', 'Ahorro', 12, '2026-01-01')]).ingresos).toBe(12)
  })
})

describe('devoluciones (casos concretos)', () => {
  const m = (tipo, cat, importe, nota, fecha = '2026-10-05') => ({ tipo, fecha, importe, importe_centimos: Math.round(importe * 100), nota, fuente: null, categoria: { nombre: cat } })
  const movs = [
    m('ingreso', 'Nomina', 2000, 'NOMINA'),
    m('gasto', 'Compras', 100, 'AMAZON MKTP'),
    m('gasto', 'Comida', 50, 'MERCADONA'),
    m('ingreso', 'Devoluciones', 30, 'DEVOLUCION AMAZON MKTP'),
  ]
  it('no suma a ingresos y resta del gasto', () => {
    expect(totalesDe(movs)).toMatchObject({ ingresos: 2000, gastos: 120, ahorro: 1880 })
  })
  it('resta de la categoría del comercio que devuelve (Amazon → Compras)', () => {
    expect(Object.fromEntries(gastoPorCategoria(movs))).toEqual({ Compras: 70, Comida: 50 })
  })
  it('el patrimonio sí la cuenta como dinero que entra', () => {
    expect(bolsas(movs).patrimonio).toBe(2000 - 150 + 30)
  })
  it('una devolución mayor que lo comprado no deja categorías negativas', () => {
    const r = gastoPorCategoria([m('gasto', 'Compras', 10, 'ZARA'), m('ingreso', 'Devoluciones', 40, 'DEVOLUCION ZARA')])
    expect([...r.entries()]).toEqual([])
  })
  it('"Reembolso" y "devolución" (con tilde) también son devoluciones', () => {
    expect(esDevolucion(m('ingreso', 'Reembolsos', 1, 'x'))).toBe(true)
    expect(esDevolucion(m('ingreso', 'Devolución', 1, 'x'))).toBe(true)
    expect(esDevolucion(m('gasto', 'Devoluciones', 1, 'x'))).toBe(false)
  })
})
