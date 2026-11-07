// EQUIVALENCIA DÍA 1 (la prueba más importante del periodo financiero).
// Foto de las salidas de TODOS los módulos que agrupan por mes, tomada con el
// código anterior al periodo financiero (mes natural). Con día de inicio 1, el
// código nuevo debe dar exactamente lo mismo, al céntimo y en el mismo orden.
//   Regenerar la foto (solo si se cambia a propósito un cálculo):
//   GENERAR_FOTO=1 npx vitest run src/lib/periodo.equivalencia.test.js
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as U from './movimientosUtils'
import * as I from './inicio'
import * as A from './analisis'
import * as P from './presupuesto'
import { agruparHistorial } from './historial'
import { pildorasDashboard } from './pildoras'
import { contextoParaPregunta } from './contextoFulcro'
import { construirResumenIA } from './resumenParaIA'
import { consultaLocal, panoramaParaIA } from './respuestasLocales'
import { crearCalculadora, PREGUNTAS } from './preguntasFulcro'
import { resumenInversionMensual } from './patrimonio'
import { generarClienteCompleto } from './clienteCompleto'
import { movimientosLaura } from './clienteFulcro'
import { clienteSimulado, PERFILES, signo } from './clientesSimulados'

const RUTA = fileURLToPath(new URL('./__fotos__/periodo-dia1.json', import.meta.url))
// Fechas «hoy» que tocan los bordes: día 1, mitad, 28, fin de año, febrero, 31.
const HOYS = ['2026-11-01', '2026-11-07', '2026-10-28', '2026-12-31', '2027-02-28', '2026-03-31']
const PREGS = ['¿Cuánto he gastado este mes?', '¿Cuánto gasté el mes pasado?', '¿Cuánto llevo gastado este año?', '¿En qué gasto más?', '¿Cuánto he ahorrado este mes?', '¿Cuál es mi media de gasto mensual?', '¿Cuánto gasto en restaurantes al mes?', '¿Cómo voy este mes?']

const r2 = (x) => JSON.parse(JSON.stringify(x, (k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v instanceof Map ? Object.fromEntries(v) : v instanceof Set ? [...v] : v)))
const ids = (l) => l.map((m) => m.id)

function datasets(hoy) {
  const comoMovs = (evs, p) => evs.map((e, i) => ({ id: `${p}${i}`, tipo: signo(e) < 0 ? 'gasto' : 'ingreso', importe: e.importe, importe_centimos: Math.round(e.importe * 100), fecha: e.fecha, nota: e.comercio ?? e.texto ?? '', categoria: { nombre: e.cat } }))
  return {
    completo: generarClienteCompleto(hoy).movimientos,
    laura: movimientosLaura(hoy),
    ...Object.fromEntries(PERFILES.map((p) => [p.id, comoMovs(clienteSimulado(p, hoy).evs, p.id)])),
  }
}

function foto(hoyIso) {
  const hoy = new Date(`${hoyIso}T12:00:00`)
  vi.setSystemTime(hoy)
  const salida = {}
  for (const [nombre, movs] of Object.entries(datasets(hoy))) {
    if (!movs.length) continue
    const clave = U.claveMesActual()
    const anterior = U.ultimosNMeses(2)[0].clave
    const ctx = A.contextoMes(clave, hoy)
    const ctxAnt = A.contextoMes(anterior, hoy)
    const o = {}
    o.claveMesActual = clave
    o.mesActual = ids(U.filtrarMesActual(movs))
    o.porMesAnterior = ids(U.filtrarPorMes(movs, anterior))
    o.rangoMeses = U.rangoMeses(movs)
    o.agregar13 = U.agregarPorMes(movs, 13)
    o.agregarAnt = U.agregarPorMes(movs, 6, anterior)
    o.resumenMedio = U.resumenMensualMedio(movs)
    o.ingresoMedio = U.ingresoMensualMedio(movs)
    o.ritmo = U.ritmoMensualPorTipo(movs)
    o.comparativas = U.comparativasConMesAnterior(movs)
    o.cambioCat = U.cambioPorCategoria(movs)
    o.estimacion = U.estimacionGastoMensual(movs)
    o.diasRestantes = U.diasRestantesDelMes(hoy)
    o.bolsas = U.bolsas(movs, hoyIso)
    o.resumenDelMes = I.resumenDelMes(movs, hoy)
    o.balanceInicio = I.balanceInicio(movs, hoy)
    o.evolucion = I.evolucionPatrimonio(movs, 25, hoy)
    o.cambioPat = I.cambioPatrimonioMes(movs, hoy)
    o.referencia = A.referenciaHabitual(movs, ctx)
    o.categorias = A.categoriasComparadas(movs, ctx)
    o.insights = A.insightsDelMes(movs, ctx)
    o.insightsAnt = A.insightsDelMes(movs, ctxAnt)
    o.interanual = A.tasaInteranual(movs, ctx)
    o.periodos12 = A.comparativaPeriodos(movs, ctx, 12)
    o.periodos24 = A.comparativaPeriodos(movs, ctx, 24)
    o.constancia = A.constanciaInversion(movs, clave, 300, {})
    o.diaIngreso = A.diaIngresoHabitual(movs, clave)
    o.catsMedia = P.categoriasFrenteAMedia(movs, clave)
    o.filasLimites = P.filasPorCategoria(movs, clave, {})
    o.historial = agruparHistorial(movs, hoy).map((b) => ({ c: b.clave, n: b.n, t: b.totales, meses: b.meses?.map((m) => [m.clave, m.n]) }))
    o.inversion = resumenInversionMensual(U.agregarPorMes(movs.filter((m) => m.categoria?.nombre === 'Inversion'), 12), clave)
    o.pildoras = pildorasDashboard({ movimientos: movs, movimientosMes: U.filtrarMesActual(movs), objetivoInversion: 300 }).map((p) => p.id)
    o.contexto = PREGS.slice(0, 3).map((q) => contextoParaPregunta(q, movs))
    o.resumenIA = construirResumenIA(movs, {})
    o.panorama = panoramaParaIA(movs, { hoy })
    o.consultas = PREGS.map((q) => consultaLocal(q, { movimientos: movs, recurrentes: [], hoy })?.texto ?? null)
    const calc = crearCalculadora(movs.map((m) => ({ ...m, importe: Number(m.importe) * (m.tipo === 'gasto' ? -1 : 1) })), hoy)
    o.preguntas = PREGUNTAS.slice(0, 12).map((p) => {
      try {
        return p.cifra(calc)
      } catch {
        return 'error'
      }
    })
    salida[nombre] = r2(o)
  }
  return salida
}

describe('periodo financiero · equivalencia con día 1', () => {
  afterEach(() => vi.useRealTimers())
  it('todos los módulos dan lo mismo que antes, al céntimo', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const actual = Object.fromEntries(HOYS.map((h) => [h, foto(h)]))
    if (process.env.GENERAR_FOTO || !existsSync(RUTA)) {
      writeFileSync(RUTA, JSON.stringify(actual))
      return
    }
    const antes = JSON.parse(readFileSync(RUTA, 'utf8'))
    for (const h of HOYS) for (const n of Object.keys(antes[h])) for (const k of Object.keys(antes[h][n])) expect(actual[h][n][k], `${h} · ${n} · ${k}`).toEqual(antes[h][n][k])
  }, 120000)
})
