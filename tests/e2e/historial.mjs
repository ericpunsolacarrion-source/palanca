// Movimientos agrupados (Año → Mes → Movimientos) con el cliente completo de
// 3 años: plegado por defecto, expandir/contraer, recuentos y totales que
// cuadran con lo que se ve, búsqueda y pestañas planas, y el detalle editable.
import { chromium } from 'playwright'

const euros = (t) => Number(t.replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.'))

export async function historial({ url, navegador = {} }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
  const err = []
  p.on('pageerror', (e) => err.push(e.message))
  const ok = (c, m) => {
    console.log(c ? '  ✓' : '  ✗', m)
    if (!c) fallos.push('Historial: ' + m)
  }
  try {
    await p.goto(url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(700)
    for (let i = 0; i < 20; i++) {
      const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
      if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break
    }
    await p.getByRole('button', { name: /^Tu cuenta/ }).first().click()
    await p.getByRole('button', { name: 'Ver la app con datos de ejemplo' }).click()
    await p.waitForTimeout(500)
    const saltar = p.getByRole('button', { name: /^(Saltar|Cerrar)$/ })
    if (await saltar.count()) await saltar.first().click().catch(() => {})
    await p.locator('[data-pestana="movimientos"]:visible').first().click()
    await p.waitForTimeout(800)

    const bloques = p.locator('.v5-bloque')
    const abiertos = p.locator('.v5-bloque.abierto')
    ok((await abiertos.count()) === 1 && (await abiertos.first().innerText()).includes('En curso'), 'Solo el mes en curso abierto al entrar')
    const anios = p.locator('.v5-bloque-anio')
    ok((await anios.count()) >= 2, `Años anteriores agrupados (${await anios.count()})`)

    // Expandir un año → sus meses plegados.
    const anio = anios.first()
    await anio.locator('> .v5-bloque-cab').click()
    const mesesAnio = anio.locator('.v5-bloque-mes')
    ok((await mesesAnio.count()) === 12, `Al abrir ${(await anio.locator('> .v5-bloque-cab .v5-bloque-titulo').innerText()).split('\n')[0]} salen sus 12 meses`)
    ok((await anio.locator('.v5-tabla-fila').count()) === 0, 'Los meses del año empiezan plegados')

    // Expandir un mes → filas; el recuento y el «Sale» cuadran con las filas.
    const mes = mesesAnio.nth(3)
    const cab = await mes.locator('> .v5-bloque-cab').innerText()
    await mes.locator('> .v5-bloque-cab').click()
    const filas = mes.locator('.v5-tabla-fila')
    const n = Number(cab.match(/(\d+) movimientos?/)[1])
    ok((await filas.count()) === n, `Recuento del mes (${n}) = filas visibles (${await filas.count()})`)
    const importes = await filas.locator('.v5-col-importe').allInnerTexts()
    const clases = await filas.locator('.v5-col-importe').evaluateAll((els) => els.map((e) => e.className))
    let sale = 0
    importes.forEach((t, i) => { if (/\bgasto\b/.test(clases[i])) sale += Math.abs(euros(t)) })
    const saleCab = Math.abs(euros(cab.split('Sale')[1].split('€')[0]))
    // Las devoluciones restan del gasto (contra-gasto): se suman aparte.
    let dev = 0
    const cats = await filas.locator('.v5-etiqueta-cat').allInnerTexts()
    importes.forEach((t, i) => { if (/devoluc/i.test(cats[i])) dev += Math.abs(euros(t)) })
    ok(Math.round((sale - dev) * 100) === Math.round(saleCab * 100), `«Sale» del bloque (${saleCab}) = suma de sus gastos menos devoluciones (${(sale - dev).toFixed(2)})`)

    // Contraer: desaparecen sus filas (sin duplicados al volver a abrir).
    await mes.locator('> .v5-bloque-cab').click()
    ok((await mes.locator('.v5-tabla-fila').count()) === 0, 'Contraer oculta las filas')
    await mes.locator('> .v5-bloque-cab').click()
    ok((await mes.locator('.v5-tabla-fila').count()) === n, 'Reabrir no duplica filas')

    // El detalle sigue funcionando (editar/eliminar).
    await filas.first().click()
    await p.waitForTimeout(300)
    ok((await p.locator('.v5-movs-detalle').count()) === 1, 'Tocar un movimiento abre su detalle')

    // Gastos: mismo agrupado con «Gastado». Ingresos: lista plana.
    await p.getByRole('button', { name: 'Gastos', exact: true }).click()
    await p.waitForTimeout(400)
    ok((await p.locator('.v5-bloque-cifras.solo-gasto').count()) > 3, 'Gastos agrupado con su total «Gastado»')
    await p.getByRole('button', { name: 'Ingresos', exact: true }).click()
    await p.waitForTimeout(400)
    ok((await p.locator('.v5-bloque').count()) === 0 && (await p.locator('.v5-tabla-fila').count()) > 10, 'Ingresos: lista plana, sin agrupar')
    await p.getByRole('button', { name: 'Todos', exact: true }).click()

    // Buscar: resultados directos en lista plana.
    await p.getByLabel('Buscar en tus movimientos').fill('Netflix')
    await p.waitForTimeout(400)
    const filasBusqueda = await p.locator('.v5-tabla-fila').count()
    ok((await p.locator('.v5-bloque').count()) === 0 && filasBusqueda >= 30, `Buscar «Netflix» da la lista plana (${filasBusqueda} resultados)`)
    ok(err.length === 0, 'Sin errores en consola ' + err.join(' | '))
  } catch (e) {
    fallos.push('Historial: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
