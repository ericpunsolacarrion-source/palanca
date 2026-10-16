import { describe, expect, it } from 'vitest'
import { categoriaParaLugar, delModo, fijoDesdeApunte, importesDelLugar, lugaresConocidos, sugerirLugares } from './apunte'

const cat = (id, nombre) => ({ id, nombre })
const COMIDA = cat('c1', 'Comida')
const TRANSPORTE = cat('c2', 'Transporte')
const OCIO = cat('c3', 'Ocio')
const NOMINA = cat('i1', 'Nomina')
const AJUSTE = cat('a1', 'Ajuste')
const mov = (fecha, importe, nota, categoria, tipo = 'gasto', fuente = null) => ({ id: `${fecha}${nota}${importe}`, tipo, fecha, importe, nota, categoria, categoria_id: categoria.id, fuente })
const movimientos = [
  mov('2026-09-04', 58.2, 'COMPRA TARJ. MERCADONA VALENCIA', COMIDA),
  mov('2026-09-11', 61.4, 'MERCADONA VALENCIA', COMIDA),
  mov('2026-10-04', 60.49, 'MERCADONA VALENCIA', COMIDA),
  mov('2026-09-07', 52, 'REPSOL ESTACION DE SERVICIO', TRANSPORTE),
  mov('2026-09-08', 13.99, 'NETFLIX.COM', OCIO),
  mov('2026-10-08', 13.99, 'NETFLIX.COM', OCIO),
  mov('2026-09-28', 2400, 'NOMINA CONSULTORA', NOMINA, 'ingreso'),
  mov('2023-11-01', 4500, 'Saldo inicial', AJUSTE, 'ingreso'),
]

describe('apuntar: "¿dónde?"', () => {
  const lugares = lugaresConocidos(movimientos, 'gasto')
  it('agrupa por comercio real (lo importado y lo apuntado son lo mismo)', () => {
    const m = lugares.find((l) => l.nombre === 'Mercadona')
    expect(m).toMatchObject({ veces: 3, categoriaId: 'c1', importe: 60.49, ultima: '2026-10-04' })
  })
  it('sugiere lo que empieza igual, y lo más usado primero', () => {
    expect(sugerirLugares(lugares, 'merc').map((l) => l.nombre)).toEqual(['Mercadona'])
    expect(sugerirLugares(lugares, '').map((l) => l.nombre)[0]).toBe('Mercadona')
    expect(sugerirLugares(lugares, 'net')[0]).toMatchObject({ nombre: 'Netflix', importe: 13.99 })
  })
  it('el saldo inicial (Ajuste) nunca se sugiere ni se repite', () => {
    expect(delModo(movimientos, 'ingreso').map((m) => m.nota)).toEqual(['NOMINA CONSULTORA'])
  })
  it('categoría: la que usas ahí; si es nuevo, la del motor (si es tuya)', () => {
    const categorias = [COMIDA, TRANSPORTE, OCIO]
    expect(categoriaParaLugar('mercadona', { modo: 'gasto', movimientos, categorias })).toMatchObject({ id: 'c1', origen: 'tuya' })
    expect(categoriaParaLugar('Cepsa', { modo: 'gasto', movimientos, categorias })).toMatchObject({ id: 'c2', origen: 'motor' })
    expect(categoriaParaLugar('Casa de Paco', { modo: 'gasto', movimientos, categorias })).toBe(null)
    expect(categoriaParaLugar('Restaurante La Mar', { modo: 'gasto', movimientos, categorias })).toBe(null) // "Restaurantes" no es categoría suya
  })
  it('importes habituales de ese sitio', () => {
    expect(importesDelLugar(movimientos, 'gasto', 'Netflix')).toEqual([13.99])
  })
  it('"Se repite" crea el fijo con este mes ya pagado', () => {
    expect(fijoDesdeApunte({ tipo: 'gasto', nombre: 'Netflix', importe: 13.99, categoriaId: 'c3', categoriaNombre: 'Ocio', fuenteId: 'f1', fecha: '2026-10-08', periodoMeses: 1 }))
      .toMatchObject({ diaMes: 8, mesInicio: 10, periodoMeses: 1, mesesYaPagados: ['2026-10'] })
  })
})
