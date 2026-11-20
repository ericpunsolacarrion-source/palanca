// Plantilla de Palanca: descargar, subir una plantilla rellena (con fechas como
// fecha de Excel y como texto, inversión y aportación al bróker), ver cómo lo
// contará Palanca, importar y cuadrar el saldo; el patrimonio de Inicio cuadra.
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const euros = (t) => Number(t.replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.'))

export async function plantilla({ url, navegador = {}, salida = null }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  try {
    for (const ancho of [390, 1280]) {
      const p = await b.newPage({ viewport: { width: ancho, height: 900 } })
      const err = []
      p.on('pageerror', (e) => err.push(e.message))
      const ok = (c, m) => {
        console.log(c ? '  ✓' : '  ✗', `[${ancho}] ${m}`)
        if (!c) fallos.push(`Plantilla [${ancho}]: ${m}`)
      }
      await p.addInitScript(() => { if (!sessionStorage.getItem('__ini')) { localStorage.setItem('mock_vacio', '1'); sessionStorage.setItem('__ini', '1') } })
      await p.goto(url, { waitUntil: 'networkidle' })
      await p.waitForTimeout(700)
      for (let i = 0; i < 20; i++) {
        const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
        if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break
      }
      // La visita guiada del primer día: fuera antes de empezar.
      await p.waitForTimeout(1500)
      const saltar = p.getByRole('button', { name: 'Saltar', exact: true })
      if (await saltar.count()) { await saltar.first().click(); await p.waitForTimeout(300) }
      await p.locator('[data-pestana="movimientos"]:visible').first().click()
      await p.waitForTimeout(500)
      await p.getByRole('button', { name: 'Importar', exact: true }).click()
      await p.waitForTimeout(500)
      const tarjeta = p.getByTestId('ih-plantilla')
      ok((await tarjeta.count()) === 1, 'Aparece «¿Llevas tus cuentas en un Excel?»')
      const href = await tarjeta.getByRole('link', { name: /Descargar plantilla/ }).getAttribute('href')
      const descarga = await p.request.get(new URL(href, url).toString())
      ok(descarga.ok() && (await descarga.body()).length > 5000, 'La plantilla se descarga (.xlsx)')
      await tarjeta.getByText('Ver las instrucciones').click()
      ok(/Compra inversión/.test(await tarjeta.locator('.ih-instrucciones').innerText()), 'Las instrucciones para la IA se pueden leer')
      if (salida && ancho === 390) await tarjeta.screenshot({ path: `${salida}/plantilla-tarjeta.png` })

      await tarjeta.locator('input[type=file]').setInputFiles(path.join(AQUI, 'fixtures', 'plantilla-rellena.xlsx'))
      await p.getByTestId('ih-desglose').waitFor({ timeout: 5000 })
      const des = await p.getByTestId('ih-desglose').innerText()
      ok(/Invertido \(compras − ventas\): 130,60/.test(des), `Invertido = compras − ventas (130,60 €)`)
      ok(/Gastos: 42,35/.test(des), 'Gastos 42,35 € (la devolución se descuenta en Palanca, la aportación no es gasto)')
      ok(/1\.453,12/.test(des), 'Ingresos 1.453,12 € (nómina + intereses)')
      ok(/1 aportación o traspaso entre tus cuentas/.test(des), 'La aportación al bróker se explica como neutra')
      ok(/1 filas no se entienden/.test(await p.locator('.ih-notas').first().innerText()), 'La fila sin fecha se salta y se avisa')
      if (salida && ancho === 390) await p.screenshot({ path: `${salida}/plantilla-revisar.png`, fullPage: true })

      await p.getByRole('button', { name: /^Importar 7 movimientos$/ }).click()
      const cuadrar = p.getByTestId('ih-cuadrar')
      await cuadrar.waitFor({ timeout: 5000 })
      ok(/05\/11\/2026/.test(await cuadrar.innerText()), 'Pide el saldo a la fecha del último movimiento (05/11/2026)')
      await cuadrar.getByLabel('Dinero en el banco').fill('2.000,00')
      await cuadrar.getByLabel('Efectivo en el bróker').fill('0,29')
      if (salida && ancho === 390) await cuadrar.screenshot({ path: `${salida}/plantilla-cuadrar.png` })
      await cuadrar.getByRole('button', { name: 'Cuadrar' }).click()
      await p.getByText('Saldo cuadrado.').waitFor({ timeout: 5000 })
      ok(true, 'Saldo cuadrado con un ajuste visible')

      await p.locator('[data-pestana="dashboard"]:visible').first().click()
      await p.waitForTimeout(800)
      const bolsasTxt = await p.locator('.v5-bolsa').allInnerTexts()
      const liquidez = euros(bolsasTxt.find((t) => /disponible|liquidez/i.test(t)) ?? bolsasTxt[0])
      const inversion = euros(bolsasTxt.find((t) => /invert/i.test(t)) ?? bolsasTxt[1])
      ok(Math.abs(liquidez - 2000.29) < 0.01, `Disponible = banco + bróker (${liquidez})`)
      ok(Math.abs(inversion - 130.6) < 0.01, `Invertido = compras − ventas (${inversion})`)
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Sin desbordes horizontales')
      ok(err.length === 0, 'Sin errores en consola ' + err.join(' | '))
      await p.close()
    }
  } catch (e) {
    fallos.push('Plantilla: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
