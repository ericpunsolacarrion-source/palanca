// npm run e2e — arranca la app con datos simulados, hace el recorrido completo
// (móvil y ordenador) y la auditoría visual (móvil, tablet y ordenador).
// Sale con código 1 si algo falla. Capturas en tests/e2e/salida/.
import { createServer } from 'vite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import config from './vite.config.mjs'
import { recorrido } from './recorrido.mjs'
import { auditoria } from './auditoria.mjs'
import { limites } from './limites.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const salida = path.join(AQUI, 'salida')
mkdirSync(salida, { recursive: true })
// Navegador: el de Playwright, o uno ya instalado (PW_CHROMIUM=/ruta/chrome).
const navegador = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}

const servidor = await createServer(config)
await servidor.listen()
const url = `http://localhost:${config.server.port}/?diseno=${process.env.E2E_DISENO || 'v5'}`
let fallos = 0
try {
  for (const ancho of [390, 1280, 1920]) {
    const r = await recorrido({ url, ancho, salida, navegador })
    console.log(`\nRecorrido a ${ancho}px: ${r.fallos.length ? `${r.fallos.length} fallos` : 'todo bien'}`)
    for (const f of [...r.fallos, ...r.errores]) console.log('  ✗ ' + f)
    fallos += r.fallos.length + r.errores.length
  }
  if ((process.env.E2E_DISENO || 'v5') === 'v5') {
    const l = await limites({ url, navegador })
    console.log(`\nLímites por categoría: ${l.length ? `${l.length} fallos` : 'todo bien'}`)
    for (const f of l) console.log('  ✗ ' + f)
    fallos += l.length
  }
  const informe = await auditoria({ url, salida, navegador })
  console.log(`\nAuditoría visual: ${informe.length ? `${informe.length} problemas` : 'sin problemas'}`)
  for (const l of informe) console.log('  ✗ ' + l)
  fallos += informe.length
} finally {
  await servidor.close()
}
process.exit(fallos ? 1 : 0)
