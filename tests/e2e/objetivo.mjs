// Objetivo de inversión (Análisis v5): «¿Cuánto quieres invertir este mes?»,
// solo este mes o todos, y los próximos meses. Comprueba que NO crea
// movimientos, que «solo este mes» no toca el objetivo general y que cada mes
// muestra el suyo.
import { chromium } from 'playwright'

export async function objetivo({ url, navegador = {} }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
  const err = []
  p.on('pageerror', (e) => err.push(e.message))
  const ok = (c, m) => {
    console.log(c ? '  ✓' : '  ✗', m)
    if (!c) fallos.push('Objetivo: ' + m)
  }
  const numMovs = async () => {
    await p.locator('[data-pestana="movimientos"]:visible').first().click()
    await p.waitForTimeout(500)
    return Number((await p.locator('.v5-movs-resumen b').first().innerText()).replace(/\D/g, ''))
  }
  const irAnalisis = async () => {
    await p.locator('[data-pestana="dashboard"]:visible').first().click()
    await p.waitForTimeout(400)
    await p.getByRole('tab', { name: 'Análisis' }).click()
    await p.waitForTimeout(600)
  }
  try {
    await p.goto(url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(700)
    for (let i = 0; i < 20; i++) {
      const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
      if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break
    }
    const antes = await numMovs()
    await irAnalisis()
    const tarjeta = p.locator('.v5-ana-inv')
    ok((await tarjeta.innerText()).includes('200'), 'Muestra el objetivo general (200 €)')
    await tarjeta.getByRole('button', { name: 'Editar' }).click()
    await p.waitForTimeout(300)
    ok((await p.getByText('¿Cuánto quieres invertir este mes?').count()) === 1, 'Pregunta «¿Cuánto quieres invertir este mes?»')
    await p.locator('#obj-inv-mes').fill('350')
    await p.getByRole('radio', { name: /Solo para/ }).click()
    const futuros = p.locator('.v5-obj-futuros input')
    ok((await futuros.count()) === 5, 'Ofrece los 5 próximos meses')
    await futuros.first().fill('500')
    await p.getByRole('button', { name: 'Guardar objetivo' }).click()
    await p.waitForTimeout(600)
    const txt = await tarjeta.innerText()
    ok(txt.includes('350') && /Objetivo de /.test(txt), 'Este mes usa su objetivo propio (350 €)')
    await tarjeta.getByRole('button', { name: 'Editar' }).click()
    await p.waitForTimeout(300)
    const panel = await p.locator('.v5-obj-form').innerText()
    ok(panel.includes('200'), 'El objetivo general sigue en 200 € (no se pisó)')
    ok((await p.locator('.v5-obj-futuros input').first().inputValue()).includes('500'), 'El mes siguiente guarda su 500 €')
    await p.getByRole('button', { name: 'Cancelar' }).click()
    const despues = await numMovs()
    ok(antes === despues, `No crea movimientos (${antes} → ${despues})`)
    ok(err.length === 0, 'Sin errores en consola ' + err.join(' | '))
  } catch (e) {
    fallos.push('Objetivo: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
