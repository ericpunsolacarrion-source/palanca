import { describe, expect, it } from 'vitest'
import { contextoParaPregunta } from './contextoFulcro'
import { claveMesActual, ultimosNMeses } from './movimientosUtils'

const [m2, m1, m0] = ultimosNMeses(3).map((m) => m.clave) // hace 2 meses, el pasado, este
const g = (fecha, importe, cat, nota) => ({ tipo: 'gasto', importe, fecha, nota, categoria: { nombre: cat } })
const MOVS = [
  g(`${m0}-03`, 50.2, 'Comida', 'COMPRA TARJ. MERCADONA 03/10'),
  g(`${m0}-09`, 20.1, 'Comida', 'LIDL'),
  g(`${m1}-04`, 60, 'Comida', 'MERCADONA'),
  g(`${m2}-02`, 13.99, 'Ocio', 'NETFLIX.COM'),
  { tipo: 'ingreso', importe: 2000, fecha: `${m0}-01`, categoria: { nombre: 'Nomina' } },
  g(`${m0}-05`, 100, 'Ajuste', 'Ajuste de saldo'), // no es consumo: nunca aparece
]

describe('contextoParaPregunta', () => {
  it('sin nada concreto en la pregunta → null (basta el resumen)', () => {
    expect(contextoParaPregunta('¿Voy bien este mes?', MOVS)).toBeNull()
  })

  it('categoría mencionada → evolución y comercios donde se va', () => {
    const d = contextoParaPregunta('¿Cuánto gasto en comida?', MOVS)
    const cat = d.categorias[0]
    expect(cat.categoria).toBe('Comida')
    expect(cat.ultimos6Meses.at(-1)).toEqual({ mes: m0, total: 70.3 })
    expect(cat.principalesComerciosUltimos3Meses[0]).toEqual({ comercio: 'mercadona', total: 110.2 })
  })

  it('comercio mencionado → compras, total y ticket medio', () => {
    const d = contextoParaPregunta('y en Mercadona qué tal?', MOVS)
    expect(d.comercios[0]).toMatchObject({ comercio: 'mercadona', compras12Meses: 2, total12Meses: 110.2, ticketMedio: 55.1 })
  })

  it('mes mencionado → totales y desglose de ese mes', () => {
    const nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    const nombre = nombres[Number(claveMesActual().slice(5, 7)) - 1]
    const d = contextoParaPregunta(`¿Qué pasó en ${nombre}?`, MOVS)
    expect(d.meses[0]).toMatchObject({ mes: m0, ingresos: 2000, gastos: 70.3 })
    expect(d.meses[0].gastoPorCategoria).toEqual({ Comida: 70.3 }) // el ajuste no cuenta
  })
})
