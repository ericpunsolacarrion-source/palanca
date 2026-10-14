// Pruebas de ESTRÉS del motor: datos vacíos, sucios, extremos y enormes.
// Objetivo: ninguna función pública lanza una excepción ni devuelve NaN /
// Infinity con datos reales "feos", y el rendimiento aguanta años de historial.
import { describe, expect, it } from 'vitest'
import {
  agregarPorMes,
  bolsas,
  comparativasConMesAnterior,
  estimacionGastoMensual,
  gastoPorCategoria,
  predecirMesFuturo,
  rangoMeses,
  resumenMensualMedio,
  ritmoMensualPorTipo,
  totalesDe,
  ultimosNMeses,
} from './movimientosUtils'
import { detectarSuscripciones, normalizarComercio } from './suscripciones'
import { cobrosProximos, costeAnual, costeMensual, proximoCobro, textoCalendario, tocaEnMes } from './periodicidad'
import { calcularAvisos } from './avisos'
import { construirResumenIA } from './resumenParaIA'
import { contextoParaPregunta, respuestaDeCortesia } from './contextoFulcro'
import { parseCsv, parseImporte, procesarCsv, detectarMapeo } from './importarCsv'
import { pildorasDashboard } from './pildoras'

// Recorre un objeto y falla si encuentra NaN o ±Infinity en cualquier número.
function sinNumerosRotos(valor, ruta = 'raíz') {
  if (typeof valor === 'number') {
    expect(Number.isFinite(valor), `${ruta} = ${valor}`).toBe(true)
  } else if (Array.isArray(valor)) {
    valor.forEach((v, i) => sinNumerosRotos(v, `${ruta}[${i}]`))
  } else if (valor && typeof valor === 'object' && !(valor instanceof Set) && !(valor instanceof Map)) {
    for (const [k, v] of Object.entries(valor)) sinNumerosRotos(v, `${ruta}.${k}`)
  }
}

const mes = ultimosNMeses(3).map((m) => m.clave)
const SUCIOS = [
  { tipo: 'gasto', importe: '12.50', fecha: `${mes[2]}-01`, categoria: { nombre: 'Comida' } }, // importe en string
  { tipo: 'gasto', importe: null, fecha: `${mes[2]}-02`, categoria: { nombre: 'Comida' } }, // importe nulo
  { tipo: 'gasto', importe: 'abc', fecha: `${mes[2]}-03`, categoria: null }, // basura + sin categoría
  { tipo: 'gasto', importe: 0, fecha: `${mes[2]}-04`, categoria: { nombre: 'Ocio' } }, // cero
  { tipo: 'ingreso', importe: 1e9, fecha: `${mes[1]}-01`, categoria: { nombre: 'Nomina' } }, // enorme
  { tipo: 'gasto', importe: 0.01, fecha: `${mes[1]}-31`, categoria: { nombre: 'Ocio' }, nota: '' }, // día 31
  { tipo: 'gasto', importe: 5, fecha: `${mes[0]}-15`, categoria: { nombre: '' }, fuente: { nombre: null } },
  { tipo: 'gasto', importe: 7, fecha: '2019-02-28', categoria: { nombre: 'Inversion' } }, // muy antiguo
  { tipo: 'gasto', importe: 9, fecha: '2099-01-01', categoria: { nombre: 'Comida' } }, // futuro
  { tipo: 'raro', importe: 3, fecha: `${mes[2]}-05`, categoria: { nombre: 'Comida' } }, // tipo desconocido
  { tipo: 'gasto', importe: 3, importe_centimos: '300', fecha: `${mes[2]}-06`, categoria: { nombre: 'Ahorro' } },
]

describe('motor con datos vacíos', () => {
  it('nada lanza ni devuelve NaN', () => {
    sinNumerosRotos(totalesDe([]))
    sinNumerosRotos(bolsas([]))
    sinNumerosRotos(agregarPorMes([], 12))
    sinNumerosRotos(resumenMensualMedio([]))
    sinNumerosRotos(ritmoMensualPorTipo([]))
    sinNumerosRotos(estimacionGastoMensual([]))
    sinNumerosRotos(predecirMesFuturo([], '2027-03'))
    expect(comparativasConMesAnterior([])).toEqual([])
    expect(detectarSuscripciones([])).toEqual([])
    expect(cobrosProximos([])).toEqual([])
    expect(calcularAvisos()).toEqual([])
    expect(contextoParaPregunta('¿cuánto gasto en comida?', [])).toBeNull()
    sinNumerosRotos(construirResumenIA([]))
    expect(rangoMeses([]).length).toBe(1)
    expect(pildorasDashboard({ movimientos: [], movimientosMes: [] })).toBeInstanceOf(Array)
  })
})

describe('motor con datos sucios', () => {
  it('importes en texto, nulos, basura, ceros y extremos no rompen nada', () => {
    sinNumerosRotos(totalesDe(SUCIOS))
    sinNumerosRotos(bolsas(SUCIOS))
    sinNumerosRotos(agregarPorMes(SUCIOS, 12))
    sinNumerosRotos([...gastoPorCategoria(SUCIOS).values()])
    sinNumerosRotos(resumenMensualMedio(SUCIOS))
    sinNumerosRotos(estimacionGastoMensual(SUCIOS))
    sinNumerosRotos(predecirMesFuturo(SUCIOS, mes[2]))
    sinNumerosRotos(construirResumenIA(SUCIOS, { recurrentes: [{ id: 'x', nombre: null, tipo: 'gasto', activo: true, importe: 'nope' }] }))
    sinNumerosRotos(contextoParaPregunta('comida ocio octubre', SUCIOS))
    expect(() => comparativasConMesAnterior(SUCIOS)).not.toThrow()
    expect(() => detectarSuscripciones(SUCIOS)).not.toThrow()
    expect(() => pildorasDashboard({ movimientos: SUCIOS, movimientosMes: SUCIOS })).not.toThrow()
  })

  it('el traspaso a Ahorro con importe_centimos en texto sigue siendo neutro', () => {
    const conAhorro = totalesDe(SUCIOS)
    const sinAhorro = totalesDe(SUCIOS.filter((m) => m.categoria?.nombre !== 'Ahorro'))
    expect(conAhorro).toEqual(sinAhorro)
  })
})

describe('periodicidad con valores fuera de rango', () => {
  it.each([
    { periodoMeses: 7, mesInicio: 3, diaMes: 5 }, // periodo no admitido → mensual
    { periodoMeses: 12, mesInicio: 0, diaMes: 40 }, // mes 0 y día 40
    { periodoMeses: '3', mesInicio: '13', diaMes: '-2' }, // strings y negativos
    { periodoMeses: null, mesInicio: null, diaMes: null },
    {},
  ])('%j no rompe', (rec) => {
    const r = { nombre: 'X', activo: true, importe: 10, mesesAplicados: [], ...rec }
    expect(() => proximoCobro(r)).not.toThrow()
    expect(() => tocaEnMes(r, '2026-10')).not.toThrow()
    expect(() => textoCalendario(r)).not.toThrow()
    sinNumerosRotos([costeMensual(r), costeAnual(r)])
    const p = proximoCobro(r)
    if (p) expect(p.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('textos raros', () => {
  it.each(['', '   ', '¿?¿?', '💸💸💸', 'a'.repeat(5000), '<script>alert(1)</script>', 'DROP TABLE movimientos;', 'ñandú ÁÉÍÓÚ'])(
    'cortesía, comercio y contexto aguantan %#',
    (t) => {
      expect(() => respuestaDeCortesia(t)).not.toThrow()
      expect(() => normalizarComercio(t)).not.toThrow()
      expect(() => contextoParaPregunta(t, SUCIOS)).not.toThrow()
    },
  )
})

describe('importador CSV con ficheros hostiles', () => {
  it.each([
    '',
    '\n\n\n',
    'fecha;importe',
    'solo una cabecera rara',
    'fecha,importe\n"sin cerrar,12',
    'fecha,importe\n31/02/2026,10', // fecha imposible
    'fecha,importe\n2026-13-01,10',
    'fecha,importe\n01/01/2026,1e400', // infinito
    'fecha,importe\n01/01/2026,-0',
    'fecha;importe;tipo\n01/01/2026;12,5;transferencia', // tipo desconocido
  ])('%j no lanza y clasifica bien', (csv) => {
    const { cabeceras } = parseCsv(csv)
    const r = procesarCsv(csv, detectarMapeo(cabeceras), new Set())
    expect(r.validas.length + r.errores.length + r.duplicados.length).toBe(parseCsv(csv).filas.length)
    for (const v of r.validas) {
      expect(v.importe).toBeGreaterThan(0)
      expect(Number.isFinite(v.importe)).toBe(true)
    }
  })
  it('importe infinito o -0 se rechaza', () => {
    expect(parseImporte('1e400')).toBeNull()
    expect(parseImporte('-0')).toBeNull()
  })
})

describe('rendimiento con años de historial', () => {
  it('50.000 movimientos: resumen de Fulcro, detector y avisos en tiempo razonable', () => {
    const grande = []
    const meses = ultimosNMeses(60).map((m) => m.clave)
    const comercios = ['MERCADONA', 'LIDL', 'NETFLIX.COM', 'REPSOL', 'AMAZON', 'BAR PACO', 'ZARA', 'RENFE']
    for (let i = 0; i < 50000; i += 1) {
      const m = meses[i % meses.length]
      grande.push({
        tipo: i % 25 === 0 ? 'ingreso' : 'gasto',
        importe: 5 + (i % 97),
        fecha: `${m}-${String(1 + (i % 28)).padStart(2, '0')}`,
        categoria: { nombre: ['Comida', 'Ocio', 'Transporte', 'Vivienda'][i % 4] },
        nota: comercios[i % comercios.length],
      })
    }
    const t0 = performance.now()
    sinNumerosRotos(construirResumenIA(grande, { recurrentes: [] }))
    const t1 = performance.now()
    detectarSuscripciones(grande)
    calcularAvisos([], grande)
    contextoParaPregunta('¿cuánto gasto en Mercadona y en comida en marzo?', grande)
    const t2 = performance.now()
    // Márgenes generosos para máquinas lentas; en local tarda decenas de ms.
    expect(t1 - t0).toBeLessThan(2500)
    expect(t2 - t1).toBeLessThan(2500)
  })
})
