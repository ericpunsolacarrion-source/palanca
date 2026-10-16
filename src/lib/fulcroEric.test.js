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
  it('seguro del coche: anual, por años y cuándo renueva (con plazo para no renovar)', () => {
    const { texto, tarjeta } = preguntar('¿Cuánto me cuesta el seguro del coche?')
    expect(texto).toContain('Por años: 2024 410 € · 2025 432 € · 2026 455 €')
    expect(texto).toContain('Renueva hacia el **18/03/2027**')
    expect(texto).toContain('Te ha subido un **11 %** en 2 años')
    expect(tarjeta.accion).toBe('fijos')
  })
  it('luz (cada 2 meses): media de 12 meses y consejo de revisar la tarifa', () => {
    const { texto } = preguntar('¿Cuánto pago de luz?')
    expect(texto).toContain('No es cada mes: 6 pagos al año')
    expect(texto).toContain('comparador de la CNMC')
  })
  it('viajes: agrupados por viaje, y preguntas por fechas exactas', () => {
    expect(preguntar('¿Cuánto me he gastado en viajes en 2025?').texto).toContain('Es 1 viaje: 05/07/2025–10/08/2025 (619,74 €)')
    expect(preguntar('cuanto gaste entre el 25 de julio y el 20 de agosto de 2025').texto).toMatch(/^Del 25\/07\/2025 al 20\/08\/2025 has gastado/)
    expect(preguntar('¿en qué gasté más del 01/08/2025 al 31/08/2025?').texto).toMatch(/^Del 01\/08\/2025 al 31\/08\/2025 has gastado \*\*2\.043,08 €\*\*/)
  })
  it('suscripciones sin fijos: botón para añadirlas en Fijos', () => {
    const { tarjeta } = preguntar('¿Cuánto pago en suscripciones al mes?')
    expect(tarjeta.accion).toBe('fijos')
    expect(tarjeta.accionTexto).toBe('Añadirlos en Fijos')
  })
  it('cuándo me cobran el seguro: con la ventana para llamar antes', () => {
    expect(preguntar('¿Cuándo me cobran el seguro del coche?').texto).toContain('El mejor momento para comparar: del 01/02/2027 al 16/02/2027')
  })
  it('subidas: Netflix no se negocia; Movistar y seguros sí; el alquiler aparte', () => {
    const s = preguntar('¿Qué suscripciones me han subido de precio?').texto
    expect(s).toContain('plan con anuncios')
    expect(s).toMatch(/sí se pueden negociar:\n- Movistar/)
    expect(s).not.toContain('Alquiler')
    expect(preguntar('¿Qué recibos me han subido?').texto).toContain('Alquiler: comprueba que la subida es la que permite tu contrato')
  })
  it('consejo con datos, sin IA', () => {
    expect(preguntar('¿Estoy ahorrando suficiente?').texto).toMatch(/^\*\*Sí, ahorras bien\*\*: de cada 100 € que entran, apartas \*\*36\*\*/)
    expect(preguntar('¿Tengo un buen fondo de emergencia?').texto).toContain('entre **5.271 € y 10.542 €**')
    expect(preguntar('¿Qué suscripción podría quitar?').texto).toContain('¿cuál has usado menos')
    expect(preguntar('¿Me compensa renegociar el seguro del coche?').texto).toMatch(/^\*\*Merece la pena intentarlo\*\*/)
    expect(preguntar('¿Me puedo permitir un viaje de 1.500 € en diciembre?').texto).toMatch(/^\*\*Sí\*\*/)
    expect(preguntar('¿Cómo puedo ahorrar más?').texto).toMatch(/podrías ahorrar entre \*\*\d/)
    expect(preguntar('¿En qué acciones invierto?').texto).toContain('No te puedo recomendar')
    expect(preguntar('¿Qué tiempo hará mañana?').texto).toContain('solo sé de tu dinero')
    expect(preguntar('Dame mi número de cuenta').texto).toContain('No veo ni guardo tus datos bancarios')
  })
  it('con objetivos: cuánto falta, y si son varios, que elija', () => {
    const x = consultaLocal('¿Estoy ahorrando suficiente?', {
      movimientos, hoy: HOY,
      objetivos: [{ nombre: 'Piso', faltan: 8000, fecha: null }, { nombre: 'Coche', faltan: 6000, fecha: '2027-03-01' }],
    }).texto.replace(/\u00a0/g, ' ')
    expect(x).toContain('«Piso»: te faltan **8.000 €**')
    expect(x).toContain('Para llegar a tu fecha harían falta')
    expect(x).toContain('¿cuál va primero?')
  })
  it('preguntas habituales que ya no gastan IA', () => {
    const casos = {
      'cuanto cobro al mes': 'Tu nómina es de **2.400 € al mes**',
      'cual es mi mayor gasto': 'el mayor fijo es Alquiler Piso, 900 €',
      'resumen del mes': 'tu nómina suele llegar hacia el día 28',
      'como cerre el mes pasado': 'Has ahorrado **668,90 €**',
      'que me cobran este mes': 'El siguiente: **Alquiler Piso**',
      'proximos cobros': 'En los próximos 30 días te cobran **1.067,86 €**',
      'como van mis inversiones': 'Palanca no conoce el valor de mercado',
      'cuanto me han devuelto': 'te han devuelto **69,94 €**',
      'cuanto necesito para jubilarme': '25 veces lo que gastas en un año',
      'cuanto tendre en 10 años': 'en 10 años tendrías unos **154.707 €**',
      'cuantas veces he ido a mercadona este mes': 'has ido **2 veces** a **Mercadona**',
      'cuanto dinero tengo en el banco': '**28.379,45 € disponibles**',
      'cuantos movimientos tengo': '**931 movimientos**',
    }
    for (const [q, esperado] of Object.entries(casos)) expect(preguntar(q).texto, q).toContain(esperado)
  })
})
