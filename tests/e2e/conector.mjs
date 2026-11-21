// Conector de Claude: la pantalla de permiso (OAuth) que abre Supabase en
// /oauth/consent?authorization_id=…; Permitir / No permitir vuelven a Claude, y
// una solicitud caducada se explica. Móvil y ordenador.
import { chromium } from 'playwright'

export async function conector({ url, navegador = {}, salida = null }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  const base = new URL(url)
  const ruta = (q) => `${base.origin}/oauth/consent?${q}${base.search ? `&${base.search.slice(1)}` : ''}`
  try {
    for (const ancho of [390, 1280]) {
      const ok = (c, m) => {
        console.log(c ? '  ✓' : '  ✗', `[${ancho}] ${m}`)
        if (!c) fallos.push(`Conector [${ancho}]: ${m}`)
      }
      for (const [accion, esperado] of [['Permitir', 'oauth_vuelta=ok'], ['No permitir', 'oauth_vuelta=no']]) {
        const p = await b.newPage({ viewport: { width: ancho, height: 900 } })
        const err = []
        p.on('pageerror', (e) => err.push(e.message))
        await p.goto(ruta('authorization_id=abc123'), { waitUntil: 'networkidle' })
        const pantalla = p.getByTestId('consentimiento-claude')
        await pantalla.waitFor({ timeout: 5000 })
        const txt = await pantalla.innerText()
        ok(/Conectar Claude con tu Palanca/.test(txt), `Pide permiso para Claude (${accion})`)
        ok(/siempre enseñándote antes/.test(txt) && /nunca los de otra persona/.test(txt), 'Explica qué podrá hacer y que solo ve tus datos')
        if (salida && ancho === 390 && accion === 'Permitir') await p.screenshot({ path: `${salida}/conector-permiso.png`, fullPage: true })
        await pantalla.getByRole('button', { name: accion, exact: true }).click()
        await p.waitForURL(new RegExp(esperado), { timeout: 5000 }).catch(() => {})
        ok(p.url().includes(esperado), `${accion} vuelve a Claude con la respuesta`)
        ok(err.length === 0, 'Sin errores en consola ' + err.join(' | '))
        await p.close()
      }
      const p = await b.newPage({ viewport: { width: ancho, height: 900 } })
      await p.goto(ruta('authorization_id=caducada'), { waitUntil: 'networkidle' })
      const t = await p.getByTestId('consentimiento-claude').innerText()
      ok(/caducado o no es válida/.test(t), 'Una solicitud caducada se explica')
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Sin desbordes horizontales')
      await p.close()
    }
  } catch (e) {
    fallos.push('Conector: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
