import { describe, expect, it } from 'vitest'
import { bolsas, totalesDe } from './movimientosUtils'

// Tests de CARACTERIZACIÓN: fijan la lógica actual del motor (qué cuenta como
// ingreso/gasto/inversión/ajuste y los signos de las bolsas) antes de refactor.
// Con importes en euros enteros, float y céntimos-enteros coinciden exacto, así
// que estas aserciones deben seguir verdes ANTES y DESPUÉS de la migración.
// La regla única está en CLAUDE.md y en el contrato docs/MOTOR.md.

const m = (tipo, importe, nombre, fecha) => ({
  tipo,
  importe,
  categoria: { nombre },
  fecha,
})

// Un mes con: ingreso, gasto de consumo, aportación a inversión y dos ajustes.
const MES = [
  m('ingreso', 1000, 'Nomina', '2026-01-15'),
  m('gasto', 300, 'Comida', '2026-01-16'),
  m('gasto', 200, 'Inversion', '2026-01-17'), // inversión, no consumo
  m('ingreso', 50, 'Ajuste', '2026-01-10'), // ajuste +liquidez, fuera de flujo
  m('gasto', 20, 'Ajuste', '2026-01-11'), // ajuste −liquidez, fuera de flujo
]

describe('totalesDe (flujo mensual)', () => {
  it('excluye inversión del gasto y los ajustes del flujo', () => {
    const t = totalesDe(MES)
    expect(t.ingresos).toBe(1000)
    expect(t.gastos).toBe(300) // NO incluye la inversión
    expect(t.invertido).toBe(200)
    expect(t.ahorro).toBe(700) // ingresos − gastos de consumo
    expect(t.ratioAhorro).toBe(70)
  })

  it('sin movimientos, todo a cero y ratio 0', () => {
    const t = totalesDe([])
    expect(t).toMatchObject({ ingresos: 0, gastos: 0, invertido: 0, ahorro: 0, ratioAhorro: 0 })
  })
})

describe('bolsas (stock acumulado)', () => {
  it('la inversión pasa de líquido a invertido; los ajustes mueven liquidez', () => {
    const b = bolsas(MES)
    // liquidez = 1000 − 300 − 200(inversión) + 50 − 20(ajustes) = 530
    expect(b.bolsaLiquidez).toBe(530)
    expect(b.bolsaInversion).toBe(200)
    expect(b.patrimonio).toBe(730)
    expect(b.ajusteTotal).toBe(30)
  })

  it('patrimonio = liquidez + inversión (invariante E2 del contrato)', () => {
    const b = bolsas(MES)
    expect(b.patrimonio).toBe(b.bolsaLiquidez + b.bolsaInversion)
  })
})

// Escenario con céntimos: bloquea la LÓGICA (no la exactitud, que llega con el
// refactor a enteros). Se usa toBeCloseTo para tolerar la deriva de float actual.
describe('céntimos (lógica, tolerante a float por ahora)', () => {
  const CENT = [
    m('ingreso', 0.1, 'Nomina', '2026-02-01'),
    m('ingreso', 0.2, 'Nomina', '2026-02-02'),
    m('gasto', 0.1, 'Comida', '2026-02-03'),
  ]
  it('ingresos ≈ 0,30 y ahorro ≈ 0,20', () => {
    const t = totalesDe(CENT)
    expect(t.ingresos).toBeCloseTo(0.3, 10)
    expect(t.ahorro).toBeCloseTo(0.2, 10)
  })

  it('EXACTITUD: sin deriva de float tras sumar en céntimos', () => {
    const t = totalesDe(CENT)
    expect(t.ingresos).toBe(0.3) // no 0.30000000000000004
    expect(t.ahorro).toBe(0.2)
  })
})

// Lee la fila con la columna nueva importe_centimos (tras conmutar lecturas):
// el motor debe dar el mismo resultado que leyendo el importe en euros.
describe('lectura desde importe_centimos', () => {
  it('centimosDe prefiere importe_centimos si está presente', () => {
    const conCentimos = [
      { tipo: 'ingreso', importe: '999.99', importe_centimos: 100000, categoria: { nombre: 'Nomina' }, fecha: '2026-03-01' },
    ]
    // Usa 100000 céntimos (1000,00 €), NO el importe en euros (999,99).
    expect(totalesDe(conCentimos).ingresos).toBe(1000)
    expect(bolsas(conCentimos).bolsaLiquidez).toBe(1000)
  })
})
