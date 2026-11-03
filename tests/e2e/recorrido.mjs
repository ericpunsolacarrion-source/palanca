// RECORRIDO COMPLETO en el navegador (16 pasos): la app real con Supabase y la
// IA simulados. Lo lanza tests/e2e/ejecutar.mjs. Cada paso que falla deja una
// captura en tests/e2e/salida/.
import { chromium } from 'playwright'

export async function recorrido({ url, ancho = 390, salida, navegador }) {
const out = salida
const b = await chromium.launch(navegador)
const p = await b.newPage({ viewport: { width: ancho, height: 800 }, deviceScaleFactor: 1 })
const errores = []
const fallos = []
p.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`))
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(`${m.type()}: ${m.text().slice(0, 200)}`) })
p.on('dialog', (d) => { fallos.push(`diálogo nativo inesperado: ${d.message()}`); d.dismiss() })

const paso = async (nombre, fn) => {
  try { await fn(); console.log(`✓ ${nombre}`) } catch (e) { fallos.push(`${nombre}: ${e.message.split('\n')[0]}`); console.log(`✗ ${nombre}: ${e.message.split('\n')[0]}`); await p.screenshot({ path: `${out}/fallo-${nombre.replace(/\W+/g, '_')}.png` }) }
}
const cerrarModales = async () => { for (let i = 0; i < 40; i++) { const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ }); if (await x.count()) { await x.first().click(); await p.waitForTimeout(200) } else break } }
const desborde = async (donde) => {
  const r = await p.evaluate(() => {
    const docW = document.documentElement.clientWidth
    const anchos = [...document.querySelectorAll('body *')].filter((el) => {
      const rr = el.getBoundingClientRect(); const cs = getComputedStyle(el)
      if (!(rr.width > 0 && rr.right > docW + 1) || cs.position === 'fixed') return false
      // Dentro de una fila deslizable a propósito (overflow-x auto/scroll): no es desborde.
      for (let a = el.parentElement; a; a = a.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) return false
      }
      return true
    }).slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} → ${Math.round(el.getBoundingClientRect().right)}px`)
    return { scroll: document.documentElement.scrollWidth > docW, anchos }
  })
  if (r.scroll || r.anchos.length) fallos.push(`desborde horizontal en ${donde}: ${r.anchos.join(' | ')}`)
}
// Pestañas por su id (no por el texto, que cambia entre diseños). En v4,
// «Inversión» vive dentro de «Futuro».
const IDS = { Movimientos: 'movimientos', Fijos: 'suscripciones', Plan: 'presupuesto', 'Inversión': 'inversiones', Inicio: 'dashboard' }
const tab = async (n) => {
  const id = IDS[n]
  const directa = p.locator(`.bottom-nav [data-pestana="${id}"]`)
  if (await directa.count()) return directa.click()
  await p.locator('.bottom-nav [data-pestana="presupuesto"]').click()
  await p.waitForTimeout(300)
  await p.getByRole('tab', { name: n, exact: true }).click()
}

await p.goto(url, { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
await cerrarModales()

await paso('Inicio carga con avisos y marca', async () => {
  await p.getByText('Hola, Eric').waitFor({ timeout: 4000 })
  await p.locator('.app-logo svg').waitFor()
  await p.getByText('Tu patrimonio').waitFor()
  await p.locator('.b4-balance, .ini-mes').first().waitFor()
  await desborde('Inicio')
})

await paso('Inicio: análisis y vuelta', async () => {
  await p.getByRole('tab', { name: 'Análisis' }).click(); await p.waitForTimeout(800)
  await desborde('Inicio/Análisis')
  await p.getByRole('tab', { name: 'Resumen' }).click(); await p.waitForTimeout(400)
})

await paso('Inicio: ocultar y mostrar importes', async () => {
  await p.getByRole('button', { name: 'Ocultar importes' }).click(); await p.waitForTimeout(800)
  const t = await p.evaluate(() => document.querySelector('main').innerText)
  if (/\d[\d.]*(,\d+)?\s?€/.test(t)) throw new Error('quedan cifras visibles')
  await p.getByRole('button', { name: 'Mostrar importes' }).click(); await p.waitForTimeout(600)
})

await paso('Movimientos: registrar un gasto', async () => {
  await tab('Movimientos'); await p.waitForTimeout(500)
  await p.locator('.importe-grande input, input[inputmode="decimal"]').first().fill('23,45')
  await p.getByRole('button', { name: 'Comida', exact: true }).first().click()
  await p.locator('.apunte-guardar').click()
  await p.waitForTimeout(600)
  await desborde('Movimientos/Nuevo')
})

await paso('Movimientos: apuntar con sitio y «Se repite» crea el fijo', async () => {
  await p.locator('#importe').fill('13,99')
  await p.locator('#apunte-lugar').fill('Academia de inglés'); await p.locator('#importe').click(); await p.waitForTimeout(300)
  await p.locator('.apunte-meta-chip', { hasText: 'Se repite' }).click()
  await p.locator('.apunte-panel .apunte-chip', { hasText: 'Cada mes' }).click()
  const texto = await p.locator('.apunte-guardar').innerText()
  if (!/13,99/.test(texto)) throw new Error('botón sin importe: ' + texto)
  await p.locator('.apunte-guardar').click(); await p.waitForTimeout(900)
  await p.getByText(/añadido a Fijos/).first().waitFor({ timeout: 3000 })
})

await paso('Movimientos: historial muestra el gasto y se puede borrar', async () => {
  await p.getByRole('button', { name: 'Historial', exact: true }).click(); await p.waitForTimeout(500)
  await p.getByText(/23,45/).first().waitFor({ timeout: 3000 })
  await desborde('Movimientos/Historial')
})

await paso('Movimientos: importar muestra el asistente', async () => {
  await p.getByRole('button', { name: 'Importar', exact: true }).click(); await p.waitForTimeout(400)
  await desborde('Movimientos/Importar')
})

await paso('Fijos: calendario, detector y lista', async () => {
  await tab('Fijos'); await p.waitForTimeout(800)
  await p.getByText('Próximos 30 días').waitFor({ timeout: 3000 })
  await desborde('Fijos')
})

await paso('Fijos: añadir suscripción detectada no la deja pendiente', async () => {
  const fila = p.locator('.tb-detectada', { hasText: 'Netflix' })
  await fila.getByRole('button', { name: 'Añadir' }).click(); await p.waitForTimeout(900)
  const row = p.locator('.tb-row', { hasText: 'Netflix' })
  await row.waitFor({ timeout: 3000 })
  if (!(await row.evaluate((el) => el.classList.contains('is-hecho')))) throw new Error('Netflix añadida aparece como pendiente (el cargo de este mes ya existe)')
})

await paso('Fijos: confirmar un fijo crea movimiento y deshacer lo quita', async () => {
  const row = p.locator('.tb-row', { hasText: 'Spotify' })
  await row.locator('.tb-ring').click(); await p.waitForTimeout(800)
  if (!(await row.evaluate((el) => el.classList.contains('is-hecho')))) throw new Error('no quedó hecho')
  await row.locator('.tb-ring').click(); await p.waitForTimeout(800)
  if (await row.evaluate((el) => el.classList.contains('is-hecho'))) throw new Error('no se deshizo')
})

await paso('Fijos: alta de compromiso anual', async () => {
  await p.getByRole('button', { name: /Añadir compromiso/ }).click(); await p.waitForTimeout(300)
  await p.locator('.tb-input-nombre').fill('Dominio web')
  await p.locator('.tb-form input[inputmode="decimal"], .tb-form input').nth(1).fill('15')
  await p.locator('.tb-form .chip').first().click()
  await p.getByRole('button', { name: 'Anual', exact: true }).click()
  await p.getByLabel('Día del mes en que se cobra').fill('12')
  await p.getByRole('button', { name: 'Guardar', exact: true }).click(); await p.waitForTimeout(800)
  await p.locator('.tb-row', { hasText: 'Dominio web' }).waitFor({ timeout: 3000 })
})

await paso('Presupuesto: definir por tasa', async () => {
  await tab('Plan'); await p.waitForTimeout(600)
  const campo = p.locator('input[type="number"]').first()
  if (await campo.count()) { await campo.fill('20'); await p.getByRole('button', { name: /Guardar presupuesto/ }).click(); await p.waitForTimeout(600) }
  await desborde('Presupuesto')
})

await paso('Inversión: pantalla y alta', async () => {
  await tab('Inversión'); await p.waitForTimeout(700)
  await desborde('Inversión')
})

await paso('Simulador: todas las subpestañas', async () => {
  await tab('Plan'); await p.getByRole('tab', { name: 'Simuladores' }).click(); await p.waitForTimeout(500)
  for (const s of ['Ahorro', 'Interés compuesto', 'Hipoteca', 'Independencia']) {
    const bt = p.getByRole('button', { name: s, exact: true })
    if (await bt.count()) { await bt.first().click(); await p.waitForTimeout(400); await desborde(`Simulador/${s}`) }
  }
})

await paso('Fulcro: saludo local, pregunta con streaming y nueva', async () => {
  await p.evaluate(() => sessionStorage.clear())
  await p.getByRole('button', { name: /Abrir Fulcro|Preguntar a Fulcro/ }).first().click(); await p.waitForTimeout(800)
  await p.getByLabel('Tu pregunta').fill('Hola')
  await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  await p.getByText('¡Hola! Pregúntame').waitFor({ timeout: 2000 })
  await p.getByLabel('Tu pregunta').fill('¿Cuánto gasto en comida?')
  await p.keyboard.press('Enter'); await p.waitForTimeout(500)
  await p.locator('.fulcro-al-momento').first().waitFor({ timeout: 2000 })
  await p.getByLabel('Tu pregunta').fill('¿Qué me recomiendas para ahorrar más?')
  await p.keyboard.press('Enter'); await p.waitForTimeout(3000)
  await p.getByText('Donde más se te va').waitFor({ timeout: 3000 })
  await desborde('Fulcro')
  await p.getByRole('button', { name: 'Nueva', exact: true }).click(); await p.waitForTimeout(300)
  await p.getByRole('button', { name: 'Cerrar' }).click()
})

await paso('Cuenta: panel abre y cierra', async () => {
  await p.locator('.app-cuenta:not(.app-ojo):not(.app-fulcro)').click(); await p.waitForTimeout(500)
  await desborde('Cuenta')
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
})

await b.close()
return { fallos, errores: [...new Set(errores)] }
}
