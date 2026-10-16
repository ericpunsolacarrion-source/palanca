import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { movimientosLaura, csvLaura } from './clienteFulcro'
import { detectarMapeo, leerFilasTexto, procesarFilas, tablaDesdeFilas } from './importarCsv'
import { categorizarFilas, comoMovimiento } from './revisionImportacion'
import { crearCategorizador } from './categorizar'
import { consultaLocal } from './respuestasLocales'

// Lo que Eric reportó probando a Laura (16-10-2026): cada caso, con su arreglo.
const AYER = new Date(2026, 9, 15, 12)
const HOY = new Date(2026, 9, 16, 12)
beforeAll(() => vi.setSystemTime(HOY))
afterAll(() => vi.useRealTimers())

const tabla = tablaDesdeFilas(leerFilasTexto(csvLaura(movimientosLaura(AYER))))
const r = procesarFilas(tabla.filas, detectarMapeo(tabla.cabeceras), new Set())
const movimientos = categorizarFilas(r.validas, crearCategorizador([]))
  .map(comoMovimiento)
  .map((m, i) => ({ ...m, id: `l${i}`, importe_centimos: Math.round(m.importe * 100), fuente: r.validas[i].plataforma ? { nombre: r.validas[i].plataforma } : null }))
const preguntar = (q) => {
  const x = consultaLocal(q, { movimientos, hoy: HOY })
  return { ...x, texto: x?.texto.replace(/ /g, ' ') }
}

describe('reportes de Eric con Laura', () => {
  it('"estos seis meses": meses completos con fechas y la suma con el mes en curso', () => {
    const { texto } = preguntar('cuanto he gastado estos seis meses')
    expect(texto).toContain('(del 01/04/2026 al 30/09/2026) has gastado **10.621,29 €**')
    expect(texto).toContain('Con lo que va de octubre (1.430,80 € hasta el 16/10/2026): **12.052,09 €**')
  })
  it('"incluido este mes" no es un comercio: 6 meses + el actual', () => {
    expect(preguntar('¿cuánto he gastado en los últimos 6 meses incluido este mes?').texto).toContain('(del 01/04/2026 al 16/10/2026) has gastado **12.052,09 €**')
  })
  it('la media mensual es la cifra principal', () => {
    const x = preguntar('¿Cuánto gasto al mes de media?')
    expect(x.tarjeta.cifra).toBe(1757.02)
    expect(x.texto).toMatch(/^De media gastas \*\*1\.757,02 € al mes\*\*/)
  })
  it('ingresos: cuántos y de dónde, y lo que no cuenta', () => {
    const { texto, tarjeta } = preguntar('¿Cuánto ingresé el año pasado?')
    expect(texto).toContain('han entrado **31.621 €** en 18 ingresos')
    expect(texto).toContain('Nómina: **27.000 €** (12 veces, de Consultora Levante)')
    expect(texto).toContain('No cuentan como ingreso: dinero traído de tu ahorro (800 €)')
    expect(tarjeta.accion).toBe('analisis')
  })
  it('"¿en qué gasto más?" sin periodo = los últimos 12 meses; con periodo, ese', () => {
    expect(preguntar('¿En qué gasto más?').texto).toContain('En los últimos 12 meses completos')
    expect(preguntar('¿En qué gasto más este mes?').texto).toMatch(/^Este mes/)
  })
  it('qué mes ahorro más: el de cada año y el habitual', () => {
    const { texto } = preguntar('¿Qué mes ahorré más?')
    expect(texto).toContain('- En 2025: junio, 2.943,16 €')
    expect(texto).toContain('Normalmente, el que más: **junio**')
  })
  it('suscripciones: cuándo subió el precio, igual para Netflix y Spotify', () => {
    expect(preguntar('¿Cuánto he pagado de Netflix hasta ahora?').texto).toContain('Subió de 12,99 € a **13,99 €** el 08/02/2025')
    const s = preguntar('¿Cuánto he pagado de Spotify este año?').texto
    expect(s).toContain('11,99 € cada mes (de enero a octubre)')
    expect(s).toContain('Subió de 10,99 € a **11,99 €** el 10/07/2025')
  })
  it('último pago de Mercadona, se escriba como se escriba', () => {
    for (const q of ['¿Cuándo pagué el mercadona por última vez?', 'cuándo fue la última vez que compré en mercadona', 'ultima compra mercadona', 'Cuando fui al MERCADONA por ultima vez']) {
      expect(preguntar(q).texto, q).toContain('**11/10/2026** (hace 5 días)')
    }
  })
  it('una categoría dice qué tiene dentro', () => {
    expect(preguntar('¿Cuánto me gasto en transporte al mes?').texto).toMatch(/Qué entra en Transporte \(último año\): Repsol .* · Itv 47 €/)
  })
  it('restaurantes: frente al año anterior, ticket medio y frecuencia', () => {
    const { texto } = preguntar('¿Cuánto he gastado en restaurantes este año?')
    expect(texto).toContain('Mismo periodo del año anterior: 713,53 € (+2 %)')
    expect(texto).toContain('Ticket medio: 25,15 €')
  })
})
