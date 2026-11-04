// AUDITORÍA VISUAL: recorre todas las pantallas en móvil, tablet y ordenador y
// falla si encuentra algo que un cliente vería roto:
//  - la página se desborda en horizontal (scroll lateral);
//  - texto cortado sin querer (desborda su caja sin «…»);
//  - errores de la app en la consola;
//  - botones sin nombre (inservibles con lector de pantalla);
//  - texto con contraste por debajo de 4,5:1 (WCAG AA) en tamaño normal.
// Guarda una captura por pantalla y ancho en tests/e2e/salida/.
import { chromium } from 'playwright'

const ANCHOS = [
  { nombre: 'movil', w: 390, h: 844 },
  { nombre: 'tablet', w: 820, h: 1100 },
  { nombre: 'portatil', w: 1280, h: 800 },
  { nombre: 'ordenador', w: 1440, h: 900 },
  { nombre: 'monitor', w: 1920, h: 1080 },
]
// Navegación: menú lateral (ordenador) o barra inferior + subpestañas (móvil).
const ir = (id, sub) => async (p) => {
  const b = p.locator(`[data-pestana="${id}"]:visible`).first()
  if (await b.count()) return b.click()
  await p.locator('[data-pestana="presupuesto"]:visible').first().click()
  await p.waitForTimeout(250)
  await p.getByRole('tab', { name: sub, exact: true }).click()
}
const PANTALLAS = [
  { nombre: 'inicio', ir: async () => {} },
  { nombre: 'analisis', ir: async (p) => p.getByRole('tab', { name: 'Análisis' }).click() },
  { nombre: 'movimientos', ir: ir('movimientos') },
  { nombre: 'movimiento-detalle', ir: async (p) => p.locator('.v5-tabla-fila').first().click(), cerrar: async (p) => p.keyboard.press('Escape') },
  { nombre: 'importar', ir: async (p) => p.getByRole('button', { name: 'Importar', exact: true }).click(), cerrar: async (p) => p.getByRole('button', { name: /Volver a movimientos/ }).click() },
  { nombre: 'nuevo', ir: async (p) => p.getByRole('button', { name: 'Nuevo movimiento' }).locator('visible=true').first().click(), cerrar: async (p) => p.keyboard.press('Escape') },
  { nombre: 'patrimonio', ir: ir('inversiones', 'Patrimonio') },
  { nombre: 'base', ir: ir('suscripciones') },
  { nombre: 'presupuesto', ir: ir('presupuesto') },
  { nombre: 'objetivos', ir: ir('simulador', 'Objetivos') },
  { nombre: 'fulcro', ir: async (p) => p.getByRole('button', { name: /Preguntar a Fulcro|Abrir Fulcro/ }).locator('visible=true').first().click(), cerrar: async (p) => p.getByRole('button', { name: 'Cerrar' }).first().click() },
  { nombre: 'cuenta', ir: async (p) => p.locator('.app-cuenta:not(.app-ojo):not(.app-fulcro)').click(), cerrar: async (p) => p.keyboard.press('Escape') },
]

// Se ejecuta DENTRO de la página: devuelve los problemas visibles.
function revisar() {
  const problemas = []
  const vw = document.documentElement.clientWidth
  if (document.documentElement.scrollWidth > vw + 1) problemas.push(`scroll lateral: la página mide ${document.documentElement.scrollWidth}px en ${vw}px`)
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05
  }
  const lum = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const [r, g, b, a = 1] = m[1].split(',').map((x) => parseFloat(x))
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return { L: 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b), a }
  }
  const fondoDe = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      const l = lum(cs.backgroundColor)
      if (l && l.a > 0.9) return l
      // Fondos de un solo color pintados con linear-gradient(c, c)
      const g = cs.backgroundImage.match(/linear-gradient\((rgba?\([^)]+\))/)
      const lg = g && lum(g[1])
      if (lg && lg.a > 0.9) return lg
    }
    return lum('rgb(10,16,13)')
  }
  for (const el of document.querySelectorAll('main *, .app-header *, .bottom-nav *, .v5-lateral *, .v5-panel *, .consultor-panel *')) {
    if (!visible(el)) continue
    const cs = getComputedStyle(el)
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('')
    // Texto cortado: el contenido es más ancho que la caja, que lo recorta, sin «…»
    if (texto && el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis' && el.closest('[class*="scroll"], .inv-scroll') === null) {
      problemas.push(`texto cortado: «${texto.slice(0, 40)}» (${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]})`)
    }
    // Contraste AA del texto propio del elemento (tamaño normal)
    if (texto && texto.length > 1 && parseFloat(cs.fontSize) < 18.5 && !el.closest('[aria-hidden="true"], .skeleton, [disabled], .fade-out')) {
      const fg = lum(cs.color)
      const bg = fondoDe(el)
      if (fg && bg && fg.a > 0.9) {
        const [a, b] = [fg.L, bg.L].sort((x, y) => y - x)
        const ratio = (a + 0.05) / (b + 0.05)
        if (ratio < 4.5) problemas.push(`contraste ${ratio.toFixed(2)}:1 en «${texto.slice(0, 30)}» (${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]})`)
      }
    }
  }
  for (const bt of document.querySelectorAll('button, [role="button"], a')) {
    if (!visible(bt)) continue
    const nombre = (bt.getAttribute('aria-label') || bt.textContent || bt.getAttribute('title') || '').trim()
    if (!nombre) problemas.push(`botón sin nombre (${bt.tagName.toLowerCase()}.${String(bt.className).split(' ')[0]})`)
  }
  return [...new Set(problemas)]
}

export async function auditoria({ url, salida, navegador }) {
  const b = await chromium.launch(navegador)
  const informe = []
  for (const a of ANCHOS) {
    const p = await b.newPage({ viewport: { width: a.w, height: a.h } })
    const errores = []
    p.on('pageerror', (e) => errores.push(e.message))
    p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 200)) })
    await p.goto(url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(1200)
    for (let i = 0; i < 40; i++) {
      const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
      if (await x.count()) { await x.first().click(); await p.waitForTimeout(150) } else break
    }
    for (const pant of PANTALLAS) {
      try {
        await pant.ir(p)
        await p.waitForTimeout(700)
        const problemas = await p.evaluate(revisar)
        if (salida) await p.screenshot({ path: `${salida}/${a.nombre}-${pant.nombre}.png` })
        for (const pr of problemas) informe.push(`[${a.nombre}] ${pant.nombre}: ${pr}`)
        if (pant.cerrar) { await pant.cerrar(p); await p.waitForTimeout(300) }
      } catch (e) {
        informe.push(`[${a.nombre}] ${pant.nombre}: no se pudo abrir (${e.message.split('\n')[0]})`)
      }
    }
    for (const e of new Set(errores)) informe.push(`[${a.nombre}] error de la app: ${e}`)
    await p.close()
  }
  await b.close()
  return informe
}
