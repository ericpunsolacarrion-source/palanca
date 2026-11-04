// npm run capturas — captura cada pantalla en los tamaños de ordenador (y móvil)
// con datos simulados. Uso: node tests/e2e/capturas.mjs [diseño] [carpeta]
// Ej.: node tests/e2e/capturas.mjs v5 antes  → tests/e2e/salida/capturas/antes/
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import config from './vite.config.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const diseno = process.argv[2] || 'v5'
const carpeta = path.join(AQUI, 'salida', 'capturas', process.argv[3] || diseno)
mkdirSync(carpeta, { recursive: true })
const TAMANOS = (process.env.TAMANOS || '1280x800,1440x900,1920x1080,390x844').split(',').map((t) => t.split('x').map(Number))

const ir = (id) => async (p) => {
  const b = p.locator(`[data-pestana="${id}"]:visible`).first()
  if (await b.count()) return b.click()
  throw new Error(`sin pestaña ${id}`)
}
const tabONav = (id, tab) => async (p) => {
  const b = p.locator(`[data-pestana="${id}"]:visible`).first()
  if (await b.count()) return b.click()
  await ir('presupuesto')(p)
  await p.getByRole('tab', { name: tab, exact: true }).click()
}
const PANTALLAS = [
  ['inicio', ir('dashboard')],
  ['movimientos', ir('movimientos')],
  ['patrimonio', tabONav('inversiones', 'Patrimonio')],
  ['base', ir('suscripciones')],
  ['presupuesto', ir('presupuesto')],
  ['objetivos', tabONav('simulador', 'Objetivos')],
  ['fulcro', async (p) => p.getByRole('button', { name: /Preguntar a Fulcro|Abrir Fulcro/ }).first().click()],
]

const navegador = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}
const servidor = await createServer(config)
await servidor.listen()
const url = `http://localhost:${config.server.port}/?diseno=${diseno}`
const b = await chromium.launch(navegador)
const errores = []
try {
  for (const [w, h] of TAMANOS) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    p.on('pageerror', (e) => errores.push(`${w}: ${e.message}`))
    await p.goto(url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(900)
    for (let i = 0; i < 20; i++) {
      const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
      if (await x.count()) { await x.first().click(); await p.waitForTimeout(150) } else break
    }
    for (const [nombre, accion] of PANTALLAS) {
      try {
        await accion(p)
        await p.waitForTimeout(nombre === 'fulcro' ? 700 : 900)
        await p.screenshot({ path: path.join(carpeta, `${nombre}-${w}.png`), fullPage: false })
        if (nombre === 'fulcro') await p.keyboard.press('Escape')
      } catch (e) {
        errores.push(`${nombre}@${w}: ${e.message.split('\n')[0]}`)
      }
    }
    // Estados y pantallas secundarias (una vez por tamaño)
    const extra = async (nombre, accion, cerrar) => {
      try {
        await accion()
        await p.waitForTimeout(700)
        await p.screenshot({ path: path.join(carpeta, `${nombre}-${w}.png`) })
        if (cerrar) await cerrar()
      } catch (e) {
        errores.push(`${nombre}@${w}: ${e.message.split('\n')[0]}`)
      }
    }
    await extra('analisis', async () => { await ir('dashboard')(p); await p.getByRole('tab', { name: 'Análisis' }).click() }, () => p.getByRole('tab', { name: 'Resumen' }).click())
    await extra('nuevo', () => p.getByRole('button', { name: 'Nuevo movimiento' }).locator('visible=true').first().click(), () => p.keyboard.press('Escape'))
    await extra('detalle', async () => { await ir('movimientos')(p); await p.locator('.v5-tabla-fila').first().click() }, () => p.keyboard.press('Escape'))
    await extra('cuenta', () => p.locator('.app-cuenta:not(.app-ojo):not(.app-fulcro)').click(), () => p.keyboard.press('Escape'))
    for (const [nombre, flag] of [['acceso', 'mock_sin_sesion'], ['bienvenida', 'mock_sin_perfil']]) {
      await extra(nombre, async () => {
        await p.evaluate((f) => localStorage.setItem(f, '1'), flag)
        await p.reload({ waitUntil: 'networkidle' })
      }, async () => {
        await p.evaluate((f) => localStorage.removeItem(f), flag)
      })
    }
    await p.close()
  }
} finally {
  await b.close()
  await servidor.close()
}
console.log(`Capturas en ${carpeta}`)
if (errores.length) console.log(errores.map((e) => '  ✗ ' + e).join('\n'))
