// Panel de fundador: funnel de retención, cohortes y testers (palanca_funnel).
// Sin el SQL ejecutado, lo dice. Móvil (se consulta desde el teléfono) y ordenador.
import { chromium } from 'playwright'

export async function funnel({ url, navegador = {}, salida = null }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  try {
    for (const [ancho, ls] of [[390, {}], [1280, {}], [390, { mock_sin_funnel: '1' }]]) {
      const etq = `${ancho}${ls.mock_sin_funnel ? ' sin SQL' : ''}`
      const ok = (c, m) => {
        console.log(c ? '  ✓' : '  ✗', `[${etq}] ${m}`)
        if (!c) fallos.push(`Funnel [${etq}]: ${m}`)
      }
      const p = await b.newPage({ viewport: { width: ancho, height: 900 } })
      const err = []
      p.on('pageerror', (e) => err.push(e.message))
      await p.addInitScript((pares) => { for (const [k, v] of pares) localStorage.setItem(k, v) }, Object.entries(ls))
      await p.goto(url, { waitUntil: 'networkidle' })
      await p.waitForTimeout(700)
      for (let i = 0; i < 20; i++) {
        const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
        if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break
      }
      await p.getByRole('button', { name: /^Tu cuenta/ }).first().click()
      await p.getByRole('button', { name: /Métricas de Palanca/ }).click()
      await p.waitForTimeout(800)
      if (ls.mock_sin_funnel) {
        ok((await p.getByText('Falta el funnel de retención.').count()) === 1, 'Sin el SQL, explica qué ejecutar')
      } else {
        const s = p.getByTestId('pm-funnel')
        ok((await s.count()) === 1, 'Aparece «Funnel de retención»')
        const t = await s.innerText()
        ok(/Activación\s*1\s*1\/2 · 50 %/.test(t), 'Activación 1 de 2 elegibles (50 %)')
        ok(/Sigue el día 3\s*2\s*2\/3 · 67 %/.test(t), 'Día 3: 2 de 3 (67 %)')
        ok((await p.getByText('Cohortes por semana de alta').count()) === 1 && (await p.getByText('Tus testers').count()) === 1, 'Cohortes y lista de testers')
        const tabla = await p.locator('section.pm-bloque', { has: p.getByRole('heading', { name: 'Tus testers' }) }).innerText()
        ok(/bob@x\.com/.test(tabla) && /16 d/.test(tabla) && !/€/.test(tabla), 'Testers: correo, fechas y días sin actividad; ningún importe')
        if (salida && ancho === 390) await s.screenshot({ path: `${salida}/funnel.png` })
      }
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Sin desbordes horizontales')
      ok(err.length === 0, 'Sin errores en consola ' + err.join(' | '))
      await p.close()
    }
  } catch (e) {
    fallos.push('Funnel: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
