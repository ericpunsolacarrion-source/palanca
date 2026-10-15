import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { PERFIL_LAURA, csvLaura, movimientosLaura } from './clienteFulcro'
import { PREGUNTAS, crearCalculadora } from './preguntasFulcro'
import { detectarMapeo, leerFilasTexto, procesarFilas, tablaDesdeFilas } from './importarCsv'
import { categorizarFilas, comoMovimiento } from './revisionImportacion'
import { crearCategorizador } from './categorizar'
import { respuestaLocal } from './respuestasLocales'

// Laura (3 años de movimientos) importada con el importador real, y la batería
// de preguntas a Fulcro. Las que tienen cifra se responden al momento y deben
// dar EXACTAMENTE la cifra correcta. Con INFORME=1 se reescriben
// docs/FULCRO-PREGUNTAS.md y docs/pruebas/laura-3-anios.csv.

const HOY = new Date(2026, 9, 15, 12)
beforeAll(() => vi.setSystemTime(HOY))
afterAll(() => vi.useRealTimers())

function importarLaura() {
  const evs = movimientosLaura(HOY)
  const csv = csvLaura(evs)
  const tabla = tablaDesdeFilas(leerFilasTexto(csv))
  const r = procesarFilas(tabla.filas, detectarMapeo(tabla.cabeceras), new Set())
  const movs = categorizarFilas(r.validas, crearCategorizador([]))
    .map(comoMovimiento)
    .map((m, i) => ({ ...m, id: `l${i}`, importe_centimos: Math.round(m.importe * 100), fuente: r.validas[i].plataforma ? { nombre: r.validas[i].plataforma } : null }))
  return { evs, csv, r, movs }
}

describe('Laura: 3 años importados y preguntas a Fulcro', () => {
  const { evs, csv, r, movs } = importarLaura()
  const k = crearCalculadora(evs, HOY)

  it('el CSV entra entero, sin errores ni duplicados', () => {
    expect(r.errores).toEqual([])
    expect(r.duplicados).toEqual([])
    expect(r.validas).toHaveLength(evs.length)
  })

  it.each(PREGUNTAS.filter((q) => q.cifra))('#$n $pregunta → cifra exacta', (q) => {
    const resp = respuestaLocal(q.pregunta, { movimientos: movs, hoy: HOY })
    expect(resp, 'debería responderse al momento').not.toBeNull()
    expect(resp.replace(/ /g, ' ')).toContain(k.eur(q.cifra(k)))
  })

  it.runIf(process.env.INFORME)('escribe el informe para Eric', () => {
    writeFileSync('docs/pruebas/laura-3-anios.csv', csv)
    const filas = PREGUNTAS.map((q) => {
      const resp = respuestaLocal(q.pregunta, { movimientos: movs, hoy: HOY })
      const correcta = q.cifra ? `**${k.eur(q.cifra(k))}**${q.nota ? `. ${q.nota}` : ''}` : q.criterio(k)
      return { ...q, correcta, como: resp == null ? 'IA' : 'Al momento' }
    })
    const bloques = [...new Set(filas.map((f) => f.bloque))]
    const md = [
      '# Preguntas a Fulcro: batería de prueba con Laura',
      '',
      `> Generado con \`INFORME=1 npx vitest run src/lib/clienteFulcro.test.js\` el ${HOY.toLocaleDateString('es-ES')}. Las respuestas correctas están calculadas directamente de los movimientos de Laura.`,
      '',
      '## La clienta',
      `**${PERFIL_LAURA.nombre}**, nacida en ${PERFIL_LAURA.anioNacimiento}, Valencia. Objetivo: *${PERFIL_LAURA.objetivo}*.`,
      `${evs.length} movimientos desde noviembre de 2023: nómina (2.100 → 2.250 → 2.400 €, pagas extra en junio y diciembre), alquiler (850 → 875 → 900 €), súper semanal, gasolina, restaurantes, recibos, suscripciones que suben de precio, seguros anuales, viajes en verano, regalos en Navidad, 300 €/mes a la cuenta de ahorro (y 800 € de vuelta en agosto de 2025), 150–200 €/mes a un fondo (y una retirada de 1.000 € en abril de 2026), dos devoluciones e intereses.`,
      '',
      '## Cómo prepararlo (una vez)',
      '1. En la versión de prueba, **crea una cuenta nueva** (por ejemplo `ericpunsolacarrion+laura@gmail.com`: llega a tu mismo correo). En el alta: nombre Laura, saldo de hoy **0** (el saldo inicial ya va en el archivo) y año 1992.',
      '2. Pulsa **Empezar con mis datos** y ve a **Movimientos → Importar → Extracto del banco**.',
      '3. Elige `laura-3-anios.csv` (descárgalo de GitHub: docs/pruebas). Revisa y pulsa **Importar**.',
      '4. Opcional, para las preguntas de fijos: en **Fijos**, pulsa **Añadir** en los cargos periódicos detectados.',
      '',
      '## Cómo reportar',
      'Para cada pregunta, copia la respuesta de Fulcro (o haz captura) y dime el **número**, si la cifra coincide con la correcta y qué le falta. "Al momento" = la contesta la app sin IA (gratis, exacta); "IA" = la contesta Fulcro con la IA.',
      '',
      ...bloques.flatMap((b) => [
        `## ${b}`,
        '',
        '| # | Pregunta | Respuesta correcta | Hoy |',
        '|---|---|---|---|',
        ...filas.filter((f) => f.bloque === b).map((f) => `| ${f.n} | ${f.pregunta} | ${f.correcta.replace(/\|/g, '/')} | ${f.como} |`),
        '',
      ]),
    ].join('\n')
    writeFileSync('docs/FULCRO-PREGUNTAS.md', md)
  })
})
