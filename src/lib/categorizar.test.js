import { describe, expect, it } from 'vitest'
import { categorizar, crearCategorizador } from './categorizar'

const cat = (nota, tipo = 'gasto') => categorizar({ nota, tipo })

describe('categorización por reglas (comercios habituales en España)', () => {
  it.each([
    ['COMPRA TARJ. MERCADONA VALENCIA', 'Comida'],
    ['LIDL SUPERMERCADOS', 'Comida'],
    ['REPSOL E.S. 1234', 'Transporte'],
    ['RENFE VIAJEROS', 'Transporte'],
    ['GLOVO*PEDIDO', 'Restaurantes'],
    ['AMAZON EU SARL', 'Compras'],
    ['FARMACIA LOPEZ', 'Salud'],
    ['RYANAIR DAC', 'Viajes'],
    ['RECIBO ALQUILER PISO', 'Vivienda'],
    ['CAJERO 4B RETIRADA', 'Efectivo'],
    ['AEAT IRPF', 'Impuestos'],
    ['MYINVESTOR FONDOS', 'Inversion'],
    ['TRASPASO A CUENTA AHORRO', 'Ahorro'],
    ['Pago misterioso 123', 'Otros'],
  ])('%s → %s', (nota, esperado) => {
    expect(cat(nota).categoria).toBe(esperado)
  })

  it('marca suscripciones y recibos negociables', () => {
    expect(cat('NETFLIX.COM')).toMatchObject({ categoria: 'Suscripciones', fijo: 'suscripcion', negociable: 'digital' })
    expect(cat('RECIBO IBERDROLA CLIENTES')).toMatchObject({ categoria: 'Suministros', negociable: 'energia' })
    expect(cat('REPSOL LUZ Y GAS')).toMatchObject({ negociable: 'energia' })
    expect(cat('VODAFONE ESPANA')).toMatchObject({ negociable: 'telefonia' })
    expect(cat('MAPFRE SEGUROS AUTO')).toMatchObject({ categoria: 'Seguros', negociable: 'seguro' })
    expect(cat('COMISION MANTENIMIENTO')).toMatchObject({ negociable: 'banco' })
    expect(cat('BASIC-FIT SPAIN')).toMatchObject({ negociable: 'gimnasio' })
    expect(cat('CANAL DE ISABEL II')).toMatchObject({ negociable: 'agua' })
  })

  it('lo específico gana a lo genérico', () => {
    expect(cat('AMAZON PRIME').categoria).toBe('Suscripciones')
    expect(cat('Seguridad Social cuota autonomo').categoria).toBe('Impuestos')
    expect(cat('Card transaction 1234').categoria).toBe('Otros')
    expect(cat('Podologo Martinez').categoria).toBe('Otros')
  })

  it('ingresos', () => {
    expect(cat('NOMINA EMPRESA SL', 'ingreso').categoria).toBe('Nomina')
    expect(cat('PENSION INSS', 'ingreso').categoria).toBe('Pensión')
    expect(cat('BIZUM DE ANA', 'ingreso').categoria).toBe('Transferencias')
    expect(cat('DEVOLUCION AMAZON', 'ingreso').categoria).toBe('Devoluciones')
    expect(cat('Ingreso raro', 'ingreso').categoria).toBe('Otros ingresos')
  })
})

describe('aprende de tu historial', () => {
  it('si ya categorizaste ese comercio, usa tu categoría (la más frecuente)', () => {
    const historial = [
      { tipo: 'gasto', nota: 'MERCADONA', categoria: { nombre: 'Casa' } },
      { tipo: 'gasto', nota: 'Mercadona Valencia', categoria: { nombre: 'Casa' } },
      { tipo: 'gasto', nota: 'mercadona', categoria: { nombre: 'Comida' } },
    ]
    const c = crearCategorizador(historial)
    expect(c({ nota: 'COMPRA MERCADONA', tipo: 'gasto' })).toMatchObject({ categoria: 'Casa', origen: 'historial' })
    expect(c({ nota: 'LIDL', tipo: 'gasto' })).toMatchObject({ categoria: 'Comida', origen: 'regla' })
  })
  it('los ajustes no enseñan nada', () => {
    const c = crearCategorizador([{ tipo: 'gasto', nota: 'Netflix', categoria: { nombre: 'Ajuste' } }])
    expect(c({ nota: 'Netflix', tipo: 'gasto' }).categoria).toBe('Suscripciones')
  })
})
