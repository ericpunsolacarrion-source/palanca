// Base · saldo del mes: selector Gráfico/Calendario, línea real y prevista
// unidas en el saldo de hoy (= liquidez del Inicio), marcadores, etiquetas sin
// solapes, ficha con saldo antes → después y el calendario con los mismos datos.
// En ordenador y en móvil.
import { chromium } from 'playwright'

const euros = (t) => Number(t.replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.'))

export async function saldo({ url, navegador = {} }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  try {
    for (const ancho of [1440, 390]) {
      const p = await b.newPage({ viewport: { width: ancho, height: 1000 } })
      const err = []
      p.on('pageerror', (e) => err.push(e.message))
      const ok = (c, m) => {
        console.log(c ? '  ✓' : '  ✗', `[${ancho}] ${m}`)
        if (!c) fallos.push(`Saldo en Base [${ancho}]: ${m}`)
      }
      await p.addInitScript(() => localStorage.removeItem('palanca_base_vista'))
      await p.goto(url, { waitUntil: 'networkidle' })
      await p.waitForTimeout(700)
      for (let i = 0; i < 20; i++) {
        const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
        if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break
      }
      const liquidezInicio = euros(await p.locator('.v5-bolsa').first().locator('b').innerText())
      await p.locator('[data-pestana="suscripciones"]:visible').first().click()
      await p.waitForTimeout(900)
      const tarjeta = p.locator('.v5-cal')
      ok((await p.getByRole('tab', { name: 'Gráfico', selected: true }).count()) === 1, 'El gráfico es la vista por defecto')
      ok((await tarjeta.locator('.v5-saldo-real').count()) === 1 && (await tarjeta.locator('.v5-saldo-prev').count()) === 1, 'Línea continua (real) y discontinua (prevista)')
      ok(/(faltan? \d+ cobros?|todo pagado)/.test(await tarjeta.locator('.v5-saldo-titular').innerText()), 'Frase clara arriba («Aún faltan N cobros…»)')
      const hoy = euros(await tarjeta.locator('.v5-saldo-hoy').textContent())
      ok(hoy === Math.round(liquidezInicio), `El saldo de hoy (${hoy}) = la liquidez del Inicio (${liquidezInicio})`)
      // Las dos líneas se unen: el último punto de la real es el primero de la prevista.
      const [dReal, dPrev] = await Promise.all([tarjeta.locator('.v5-saldo-real').getAttribute('d'), tarjeta.locator('.v5-saldo-prev').getAttribute('d')])
      const nums = dReal.match(/-?[\d.]+/g).map(Number)
      const iniPrev = dPrev.match(/^M([\d.]+) ([\d.]+)/)
      ok(Math.abs(Number(iniPrev[1]) - nums.at(-2)) < 0.2 && Math.abs(Number(iniPrev[2]) - nums.at(-1)) < 0.2, 'Las dos líneas se unen en el saldo de hoy')
      // Logos de los cobros previstos, sin pisarse y sin textos debajo.
      const logos = tarjeta.locator('.v5-saldo-logo')
      ok((await logos.count()) >= 2, `Logos de los cobros previstos (${await logos.count()})`)
      ok((await tarjeta.locator('.v5-saldo-logo img, .v5-saldo-logo .v5-avatar').count()) >= 2, 'Cada logo es el de su compromiso (Avatar)')
      const cajas = await logos.evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { x: r.left, d: r.right, y: r.top, b: r.bottom } }))
      let solapes = 0
      for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) if (cajas[i].x < cajas[j].d - 1 && cajas[j].x < cajas[i].d - 1 && cajas[i].y < cajas[j].b - 1 && cajas[j].y < cajas[i].b - 1) solapes++
      ok(solapes === 0, 'Los logos no se pisan')
      ok((await tarjeta.locator('.v5-saldo-final').count()) === 1 && /€/.test(await tarjeta.locator('.v5-saldo-final').textContent()), 'Etiqueta con el saldo tras el último cobro y su fecha')
      // Ficha al tocar un logo: importe y saldo antes → después.
      await logos.first().click()
      await p.waitForTimeout(250)
      const ficha = tarjeta.locator('.v5-saldo-ficha')
      const txt = (await ficha.count()) ? await ficha.innerText() : ''
      ok(/Saldo .*€ → .*€/.test(txt) && /(Realizado|Previsto|Por confirmar)/.test(txt), 'La ficha muestra estado y saldo antes → después')
      await ficha.getByRole('button', { name: 'Cerrar' }).click()
      // Calendario con los mismos datos.
      await p.getByRole('tab', { name: 'Calendario' }).click()
      await p.waitForTimeout(300)
      ok((await tarjeta.locator('.v5-cal-rejilla').count()) === 1 && (await tarjeta.locator('.v5-saldo-real').count()) === 0, 'El selector cambia a Calendario')
      ok((await tarjeta.locator('.v5-cal-logo.previsto').count()) >= 1 && (await tarjeta.locator('.v5-cal-logo:not(.previsto)').count()) >= 1, 'El calendario distingue realizados y previstos')
      const nEventos = await tarjeta.locator('.v5-solo-lector tbody tr').count()
      ok(nEventos === 0, 'Sin tabla del gráfico en el calendario (no se duplica)')
      await p.getByRole('tab', { name: 'Gráfico' }).click()
      await p.waitForTimeout(300)
      ok((await tarjeta.locator('.v5-saldo-real').count()) === 1, 'Y vuelve al Gráfico')
      const ancho2 = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      ok(ancho2, 'Sin desbordes horizontales')
      ok(err.length === 0, 'Sin errores en consola ' + err.join(' | '))
      await p.close()
    }
  } catch (e) {
    fallos.push('Saldo en Base: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
