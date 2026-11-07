// Avisos de Inicio y «Recibir avisos» (v5): logos de marca con alternativa,
// estados, y el flujo de permisos REAL del navegador en tres casos: lo concede,
// lo deniega o no existe la API. El navegador se controla con un sustituto de
// window.Notification solo en esta prueba (la app usa la API de verdad).
import { chromium } from 'playwright'

const sustituto = (modo) => `(() => {
  window.__pedido = 0; window.__mostradas = []
  if ('${modo}' === 'sin-api') { delete window.Notification; return }
  let permiso = '${modo}' === 'denied' ? 'denied' : (localStorage.getItem('__permiso') || 'default')
  class N { constructor(t, o) { window.__mostradas.push(t) } static get permission() { return permiso } static async requestPermission() { window.__pedido++; permiso = 'granted'; localStorage.setItem('__permiso', 'granted'); return permiso } }
  window.Notification = N
  if (navigator.serviceWorker) navigator.serviceWorker.getRegistration = async () => undefined
})()`

export async function avisos({ url, navegador = {} }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  const ok = (c, m) => {
    console.log(c ? '  ✓' : '  ✗', m)
    if (!c) fallos.push('Avisos: ' + m)
  }
  const abrir = async (modo) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } })
    await ctx.addInitScript(sustituto(modo))
    const p = await ctx.newPage()
    const err = []
    p.on('pageerror', (e) => err.push(e.message))
    await p.goto(url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(800)
    for (let i = 0; i < 20; i++) {
      const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
      if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break
    }
    return { ctx, p, err }
  }
  try {
    // 1) Concede el permiso.
    const { ctx, p, err } = await abrir('default')
    ok((await p.evaluate(() => window.__pedido)) === 0, 'No pide permiso al entrar en la app')
    const items = p.locator('.av-item')
    ok((await items.count()) > 0, `Hay avisos (${await items.count()})`)
    ok((await p.locator('.av-item img[data-logo]').count()) >= 1, 'Las marcas reconocidas llevan su logo (Spotify…)')
    const estados = await p.locator('.av-item .v5-insignia').allInnerTexts()
    ok(estados.length > 0 && estados.some((t) => /confirmar|Mañana|días/.test(t)), 'Cada aviso dice su estado: ' + estados.join(', '))
    await p.getByRole('button', { name: 'Recibir avisos' }).click()
    await p.waitForTimeout(300)
    const panel = p.locator('.v5-avisos-ajustes')
    ok((await panel.count()) === 1, 'Se abre la explicación de avisos')
    ok((await panel.innerText()).includes('Cobros de tus fijos') && (await panel.innerText()).includes('Subidas de precio'), 'Explica qué avisos hay')
    ok((await panel.locator('[data-estado]').getAttribute('data-estado')) === 'sin-activar', 'Estado real: sin activar')
    ok((await p.evaluate(() => window.__pedido)) === 0, 'Abrir la explicación aún no pide permiso')
    await p.getByRole('button', { name: 'Activar notificaciones' }).click()
    await p.waitForTimeout(400)
    ok((await p.evaluate(() => window.__pedido)) === 1, 'Al confirmar se pide el permiso del navegador (una vez)')
    ok((await panel.locator('[data-estado]').getAttribute('data-estado')) === 'activas', 'Tras conceder: «Activadas»')
    ok((await p.evaluate(() => window.__mostradas.length)) >= 1, 'Se lanza una notificación real de prueba')
    await p.getByRole('button', { name: 'Pausar en este dispositivo' }).click()
    ok((await panel.locator('[data-estado]').getAttribute('data-estado')) === 'silenciadas', 'Se puede pausar en Palanca')
    await p.keyboard.press('Escape')
    await p.reload({ waitUntil: 'networkidle' })
    await p.waitForTimeout(800)
    ok((await p.getByRole('button', { name: /Avisos pausados en este dispositivo/ }).count()) === 1, 'La pausa se recuerda al recargar')
    ok(err.length === 0, 'Sin errores en consola ' + err.join(' | '))
    await ctx.close()

    // 2) Permiso denegado en el navegador.
    const d = await abrir('denied')
    await d.p.getByRole('button', { name: 'Recibir avisos' }).click()
    await d.p.waitForTimeout(300)
    ok((await d.p.locator('[data-estado]').getAttribute('data-estado')) === 'bloqueadas', 'Denegado: «Bloqueadas» con cómo desbloquearlas')
    ok((await d.p.getByRole('button', { name: 'Activar notificaciones' }).count()) === 0, 'Denegado: sin botón que no puede funcionar')
    await d.ctx.close()

    // 3) Navegador sin notificaciones.
    const u = await abrir('sin-api')
    await u.p.getByRole('button', { name: 'Recibir avisos' }).click()
    await u.p.waitForTimeout(300)
    ok((await u.p.locator('[data-estado]').getAttribute('data-estado')) === 'no-disponible', 'Sin API: «No disponibles» (sin simular)')
    ok(u.err.length === 0, 'Sin errores sin API ' + u.err.join(' | '))
    await u.ctx.close()
  } catch (e) {
    fallos.push('Avisos: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
