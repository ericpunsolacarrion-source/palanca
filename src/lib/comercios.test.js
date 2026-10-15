import { describe, expect, it } from 'vitest'
import { buscarParecido, claveComercio, crearDirectorio, distancia, marcaDe, mismaEtiqueta, nombreParaComercio } from './comercios'

describe('mismaEtiqueta: mayúsculas, acentos, plural, espacios', () => {
  it.each([
    ['Comida', 'comida'],
    ['Comida', ' COMIDA '],
    ['Educación', 'educacion'],
    ['Seguros', 'seguro'],
    ['Restaurantes', 'restaurante'],
    ['Mercadona', 'MERCADONA'],
  ])('%s = %s', (a, b) => expect(mismaEtiqueta(a, b)).toBe(true))
  it.each([
    ['Comida', 'Ocio'],
    ['Cine', 'Vino'],
    ['', ''],
  ])('%s ≠ %s', (a, b) => expect(mismaEtiqueta(a, b)).toBe(false))
})

describe('distancia y erratas', () => {
  it('cuenta sustituciones y transposiciones', () => {
    expect(distancia('mercadona', 'mercadoma')).toBe(1)
    expect(distancia('mercadona', 'mercadnoa')).toBe(1)
    expect(distancia('netflix', 'netflx')).toBe(1)
  })
  it('buscarParecido: exacto, errata, y nada en palabras cortas', () => {
    const cats = [{ nombre: 'Comida' }, { nombre: 'Transporte' }, { nombre: 'Ocio' }, { nombre: 'Cine' }]
    expect(buscarParecido('comida', cats)).toEqual({ item: cats[0], exacto: true })
    expect(buscarParecido('Trasnporte', cats)).toEqual({ item: cats[1], exacto: false })
    expect(buscarParecido('Comdia', cats)?.item).toBe(cats[0])
    expect(buscarParecido('Vino', cats)).toBe(null) // ≠ Cine (corta)
    expect(buscarParecido('Viajes', cats)).toBe(null)
  })
})

describe('claveComercio: no se pierde nada', () => {
  it.each([
    ['COMPRA TARJ. NETFLIX.COM 12/03', 'netflix'],
    ['PAGO TARJETA ALIPAM23', 'alipam'],
    ['COMPRA TARJ. MERCADONA VALENCIA', 'mercadona valencia'],
    ['PAYPAL *SPOTIFY', 'spotify'],
    ['SUMUP *BAR PACO', 'bar paco'],
    ['DEVOLUCION BAR PACO', 'bar paco'], // la devolución es del mismo comercio
    ['ANULACION COMPRA ZARA 12/03', 'zara'],
    ['RECIBO IBERDROLA CLIENTES', 'iberdrola clientes'],
    ['Mercadona', 'mercadona'],
    ['  mércadona  ', 'mercadona'],
    ['', ''],
  ])('%s → %s', (t, k) => expect(claveComercio(t)).toBe(k))
})

describe('marcas', () => {
  it.each([
    ['COMPRA TARJ. MERCADONA VALENCIA 03/10', 'Mercadona'],
    ['PAYPAL *NETFLIX.COM', 'Netflix'],
    ['APPLE.COM/BILL', 'Apple'],
    ['REPSOL LUZ Y GAS', 'Repsol Luz'],
    ['ESTACION REPSOL 1234', 'Repsol'],
    ['COMPRA TARJ DIA MADRID', 'Dia'],
    ['AMAZON PRIME VIDEO', 'Amazon Prime'],
    ['AMZN MKTP ES', 'Amazon'],
  ])('%s → %s', (t, m) => expect(marcaDe(t)).toBe(m))
  it.each(['RECIBO DIA 5', 'PAGO EN DIA FESTIVO 12', 'TRANSFERENCIA A JUAN'])('sin marca: %s', (t) => expect(marcaDe(t)).toBe(null))
})

describe('directorio: memoria del usuario (el caso ALIPAM23)', () => {
  const dir = crearDirectorio([{ clave: 'alipam', nombre: 'Mercadona', categoria: 'Comida' }])
  it('lo que el usuario dijo una vez se recuerda siempre', () => {
    const r = dir.identificar('PAGO TARJETA ALIPAM23')
    expect(r).toMatchObject({ nombre: 'Mercadona', categoria: 'Comida', origen: 'memoria' })
  })
  it('aunque el banco lo escriba distinto o cambie el número', () => {
    expect(dir.nombreDe('COMPRA TARJ ALIPAM 0457')).toBe('Mercadona')
    expect(dir.nombreDe('compra tarjeta alipam77')).toBe('Mercadona')
  })
  it('una errata pequeña de un concepto conocido también', () => {
    expect(dir.identificar('PAGO TARJETA ALIPAN23')).toMatchObject({ nombre: 'Mercadona', origen: 'memoria-aprox' })
  })
  it('agrupa: ALIPAM23 y "COMPRA MERCADONA" son el mismo comercio', () => {
    expect(dir.grupoDe('PAGO TARJETA ALIPAM23')).toBe(dir.grupoDe('COMPRA TARJ. MERCADONA VALENCIA'))
  })
  it('sin memoria: marca, lo apuntado, o el texto presentable', () => {
    const vacio = crearDirectorio([])
    expect(vacio.nombreDe('COMPRA TARJ. NETFLIX.COM 12/03')).toBe('Netflix')
    expect(vacio.nombreDe({ nota: null, fuente: { nombre: 'Panadería Lola' } })).toBe('Panadería Lola')
    expect(vacio.nombreDe('BAR LA ESQUINA 23')).toBe('Bar La Esquina')
    expect(vacio.nombreDe('cena con amigos')).toBe('cena con amigos')
    expect(vacio.nombreDe('')).toBe('')
  })
  it('la memoria manda sobre la marca (el usuario tiene la última palabra)', () => {
    const d = crearDirectorio([{ clave: 'amazon', nombre: 'Regalos Amazon' }])
    expect(d.nombreDe('AMAZON')).toBe('Regalos Amazon')
  })
})

describe('nombreParaComercio: lo que escribe el usuario a mano', () => {
  it('uno que ya tiene, aunque lo escriba con errata', () => {
    expect(nombreParaComercio('bar pacoo', ['Bar Paco'])).toEqual({ nombre: 'Bar Paco', de: 'tuyo', corregido: true })
  })
  it('una marca conocida, en minúsculas o con errata', () => {
    expect(nombreParaComercio('mercadona')).toMatchObject({ nombre: 'Mercadona', de: 'marca' })
    expect(nombreParaComercio('mercadoma')).toMatchObject({ nombre: 'Mercadona', corregido: true })
  })
  it('si no, con mayúscula inicial (y respetando lo que ya trae forma)', () => {
    expect(nombreParaComercio('frutería lola').nombre).toBe('Frutería Lola')
    expect(nombreParaComercio('La Tagliatella').nombre).toBe('La Tagliatella')
  })
})
