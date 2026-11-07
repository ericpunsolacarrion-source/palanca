import { describe, expect, it } from 'vitest'
import { categoriasComparadas, contextoMes, delMes, diaIngresoHabitual, insightsDelMes, referenciaHabitual, serieProyeccion } from './analisis'
import { proyectarInteresCompuesto, totalesDe } from './movimientosUtils'

let n = 0
const mov = (tipo, cat, importe, fecha) => ({ id: `t${++n}`, tipo, importe, importe_centimos: Math.round(importe * 100), fecha, categoria: { nombre: cat } })

// Persona estable: nómina el 1, alquiler el 2, súper el 10 y el 20, ocio el 15.
function historia(meses, extra = []) {
  const L = []
  for (const c of meses) {
    L.push(mov('ingreso', 'Nomina', 2000, `${c}-01`))
    L.push(mov('gasto', 'Vivienda', 800, `${c}-02`))
    L.push(mov('gasto', 'Comida', 150, `${c}-10`))
    L.push(mov('gasto', 'Comida', 150, `${c}-20`))
    L.push(mov('gasto', 'Ocio', 100, `${c}-15`))
  }
  return [...L, ...extra]
}
const PREVIOS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']

describe('comparaciones justas', () => {
  it('mes en curso: compara hasta el mismo día, no contra meses enteros', () => {
    const h = historia([...PREVIOS, '2026-11'].map((c) => c)).filter((m) => m.fecha <= '2026-11-07')
    const ctx = contextoMes('2026-11', new Date(2026, 10, 7))
    expect(ctx).toMatchObject({ parcial: true, dia: 7 })
    const ref = referenciaHabitual(h, ctx)
    expect(ref.meses.length).toBe(6)
    // A día 7 de cada mes anterior: nómina y alquiler, nada más.
    expect(ref.media).toMatchObject({ ingresos: 2000, gastos: 800, ahorro: 1200 })
    const ins = insightsDelMes(h, ctx)
    // Mismo comportamiento que siempre: «en tu línea», sin porcentajes inflados.
    expect(ins.find((i) => i.id === 'ahorro')).toMatchObject({ tono: 'neutro' })
    expect(ins.find((i) => i.id === 'gasto')).toMatchObject({ tono: 'neutro' })
    expect(ins.some((i) => /389|%\)/.test(i.titulo))).toBe(false)
  })

  it('mes cerrado: compara meses completos y da el importe en euros', () => {
    const extra = [mov('gasto', 'Ocio', 240, '2026-10-25')]
    const h = historia(PREVIOS, extra)
    const ctx = contextoMes('2026-10', new Date(2026, 10, 7))
    expect(ctx.parcial).toBe(false)
    const ins = insightsDelMes(h, ctx)
    const gasto = ins.find((i) => i.id === 'gasto')
    expect(gasto.tono).toBe('aviso')
    expect(gasto.titulo).toMatch(/Gastaste 240\s€ más de lo habitual/) // 1.440 € frente a 1.200 € (media may-sep)
  })

  it('categorías: detecta la que se dispara y la que baja, con su media', () => {
    const extra = [mov('gasto', 'Ocio', 120, '2026-10-25')]
    const h = historia(PREVIOS, extra)
    const cats = categoriasComparadas(h, contextoMes('2026-10', new Date(2026, 10, 7)))
    const ocio = cats.find((c) => c.nombre === 'Ocio')
    expect(ocio).toMatchObject({ gastado: 220, habitual: 100, dif: 120 })
    expect(Math.round(ocio.pct)).toBe(120)
  })

  it('tendencia: «sube por tercer mes seguido» solo con 3 subidas reales', () => {
    const extra = [mov('gasto', 'Restaurantes', 80, '2026-07-12'), mov('gasto', 'Restaurantes', 110, '2026-08-12'), mov('gasto', 'Restaurantes', 150, '2026-09-12'), mov('gasto', 'Restaurantes', 40, '2026-10-12')]
    const h = historia(PREVIOS, extra)
    const ctx = contextoMes('2026-10', new Date(2026, 10, 7))
    // En octubre los 3 cerrados previos (jul-ago-sep) suben: 80 → 110 → 150.
    const r = categoriasComparadas(h, ctx).find((c) => c.nombre === 'Restaurantes')
    expect(r.subiendo).toBe(true)
    expect(insightsDelMes(h, ctx).some((i) => i.id === 'sube-Restaurantes')).toBe(true)
  })

  it('sin meses suficientes lo dice en vez de inventar', () => {
    const h = historia(['2026-10', '2026-11']).filter((m) => m.fecha <= '2026-11-07')
    const ins = insightsDelMes(h, contextoMes('2026-11', new Date(2026, 10, 7)))
    expect(ins).toHaveLength(1)
    expect(ins[0]).toMatchObject({ id: 'faltan-datos', tono: 'info' })
  })

  it('si el ingreso principal aún no ha llegado, no juzga el ahorro', () => {
    const L = []
    for (const c of PREVIOS) {
      L.push(mov('ingreso', 'Nomina', 2000, `${c}-28`))
      L.push(mov('gasto', 'Vivienda', 800, `${c}-02`))
    }
    L.push(mov('gasto', 'Vivienda', 800, '2026-11-02'))
    const ctx = contextoMes('2026-11', new Date(2026, 10, 7))
    expect(diaIngresoHabitual(L, '2026-11')).toBe(28)
    const ins = insightsDelMes(L, ctx)
    expect(ins.find((i) => i.id === 'ingreso-pendiente')).toBeTruthy()
    expect(ins.find((i) => i.id === 'ahorro')).toBeUndefined()
  })

  it('delMes respeta el corte por día y los totales siguen la regla única', () => {
    const h = historia(['2026-11'])
    expect(totalesDe(delMes(h, '2026-11', 12))).toMatchObject({ ingresos: 2000, gastos: 950 })
  })
})

describe('proyección', () => {
  it('la serie año a año coincide con la fórmula única del simulador', () => {
    for (const [mensual, anios, rent] of [[721.16, 10, 7], [300, 30, 5], [100, 5, 0]]) {
      const s = serieProyeccion(mensual, anios, rent)
      const f = proyectarInteresCompuesto({ mensual, anios, rentabilidadAnual: rent })
      expect(s).toHaveLength(anios + 1)
      expect(s[0]).toMatchObject({ parado: 0, invertido: 0 })
      expect(s.at(-1).invertido).toBeCloseTo(f.valorFinal, 1)
      expect(s.at(-1).parado).toBeCloseTo(mensual * anios * 12, 1)
    }
  })
  it('reproduce el ejemplo de la app: 721,16 €/mes 10 años al 7 %', () => {
    const s = serieProyeccion(721.16, 10, 7).at(-1)
    expect(s.parado).toBeCloseTo(86539.2, 0)
    expect(Math.abs(s.invertido - 124821.36)).toBeLessThan(2)
  })
})

describe('insights honestos', () => {
  it('un gasto puntual de otro mes (un viaje) no se presenta como ahorro', () => {
    const extra = [mov('gasto', 'Viajes', 600, '2026-06-03')]
    const h = historia([...PREVIOS, '2026-11'], extra).filter((m) => m.fecha <= '2026-11-07')
    const ins = insightsDelMes(h, contextoMes('2026-11', new Date(2026, 10, 7)))
    expect(ins.some((i) => i.id === 'cat-Viajes')).toBe(false)
  })
})

describe('objetivo de inversión por mes', () => {
  it('el mes con objetivo propio manda; si no, el general; sin ninguno, null', async () => {
    const { objetivoDelMes } = await import('./analisis')
    const planes = { '2026-12': { inversion_prevista: 600 }, '2027-01': { inversion_prevista: 0, ingreso_previsto: 2000 } }
    expect(objetivoDelMes('2026-12', 450, planes)).toEqual({ importe: 600, origen: 'mes' })
    expect(objetivoDelMes('2027-01', 450, planes)).toEqual({ importe: 450, origen: 'general' })
    expect(objetivoDelMes('2027-02', null, planes)).toEqual({ importe: null, origen: null })
  })
  it('constancia: cuenta los meses cerrados que cumplieron su objetivo', async () => {
    const { constanciaInversion } = await import('./analisis')
    const L = []
    const inv = { '2026-05': 450, '2026-06': 450, '2026-07': 200, '2026-08': 450, '2026-09': 500, '2026-10': 300 }
    for (const [c, v] of Object.entries(inv)) {
      L.push(mov('ingreso', 'Nomina', 2000, `${c}-01`))
      L.push(mov('gasto', 'Inversion', v, `${c}-02`))
    }
    const r = constanciaInversion(L, '2026-11', 450, { '2026-10': { inversion_prevista: 300 } })
    expect(r.meses.map((m) => m.cumplido)).toEqual([true, true, false, true, true, true])
    expect(r).toMatchObject({ cumplidos: 5, conObjetivo: 6 })
  })
  it('meses siguientes: cruza de año', async () => {
    const { mesesSiguientes } = await import('./analisis')
    expect(mesesSiguientes('2026-11', 3)).toEqual(['2026-12', '2027-01', '2027-02'])
  })
})

describe('comparaciones a largo plazo', () => {
  const anios = (desde, hasta, f) => {
    const L = []
    for (let y = desde; y <= hasta; y++) for (let m = 1; m <= 12; m++) {
      const c = `${y}-${String(m).padStart(2, '0')}`
      if (c > '2026-11') continue
      const { ing, gas, inv } = f(y, m)
      L.push(mov('ingreso', 'Nomina', ing, `${c}-01`))
      L.push(mov('gasto', 'Comida', gas, `${c}-10`))
      if (inv) L.push(mov('gasto', 'Inversion', inv, `${c}-02`))
    }
    return L
  }
  it('tasa interanual: mismo mes del año pasado y año móvil, en puntos', async () => {
    const { tasaInteranual } = await import('./analisis')
    const L = anios(2024, 2026, (y) => ({ ing: 2000, gas: y === 2026 ? 1400 : 1600 }))
    const r = tasaInteranual(L, contextoMes('2026-10', new Date(2026, 10, 7)))
    expect(Math.round(r.mes.actual)).toBe(30)
    expect(Math.round(r.mes.anterior)).toBe(20)
    expect(Math.round(r.mes.difPuntos)).toBe(10)
    expect(r.anio).toBeTruthy()
  })
  it('tasa interanual: sin el mismo mes del año pasado, no se compara', async () => {
    const { tasaInteranual } = await import('./analisis')
    const L = anios(2026, 2026, () => ({ ing: 2000, gas: 1500 }))
    const r = tasaInteranual(L, contextoMes('2026-10', new Date(2026, 10, 7)))
    expect(r.mes).toBeNull()
    expect(r.anio).toBeNull()
  })
  it('12 meses: compara medias mensuales y explica un gasto menor por menos ingresos', async () => {
    const { comparativaPeriodos } = await import('./analisis')
    const L = anios(2024, 2026, (y, m) => {
      const reciente = y === 2026 || (y === 2025 && m >= 11)
      return reciente ? { ing: 1500, gas: 1300 } : { ing: 2500, gas: 1700 }
    })
    const r = comparativaPeriodos(L, contextoMes('2026-11', new Date(2026, 10, 7)), 12)
    const gastos = r.find((x) => x.id === 'gastos')
    expect(gastos.tono).toBe('neutro')
    expect(gastos.detalle).toMatch(/ahorras menos/)
    expect(r.find((x) => x.id === 'ahorro').tono).toBe('aviso')
    expect(r.find((x) => x.id === 'ingresos').titulo).toMatch(/−1\.000\s€ al mes/)
  })
  it('24 meses sin historial suficiente: lo dice', async () => {
    const { comparativaPeriodos } = await import('./analisis')
    const L = anios(2025, 2026, () => ({ ing: 2000, gas: 1500 }))
    const r = comparativaPeriodos(L, contextoMes('2026-11', new Date(2026, 10, 7)), 24)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ id: 'faltan-datos', tono: 'info' })
  })
})
