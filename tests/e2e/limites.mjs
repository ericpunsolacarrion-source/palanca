// Límites por categoría (Presupuesto v5), en el navegador: fijar, editar y quitar límites por categoría,
// que se conservan al recargar (modo navegador, sin tabla) y que no tocan
// movimientos ni el presupuesto general.
import { chromium } from 'playwright'

export async function limites({ url, navegador = {} }) {
const fallos = []
const b = await chromium.launch(navegador)
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const err = []; p.on('pageerror', (e) => err.push(e.message))
try {
const cerrarAvisos = async () => { for (let i = 0; i < 20; i++) { const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ }); if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break } }
await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); await cerrarAvisos()
await p.locator('[data-pestana="presupuesto"]:visible').first().click(); await p.waitForTimeout(700)
const ok = (c, m) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fallos.push('Límites: ' + m) }
const presuAntes = await p.locator('.v5-presu-cifras').innerText()
await p.getByRole('button', { name: /Poner límites|Editar límites/ }).click()
await p.getByLabel('Límite mensual para Comida').fill('120')
await p.getByLabel('Límite mensual para Ocio').fill('50,5')
await p.getByRole('button', { name: 'Guardar límites' }).click(); await p.waitForTimeout(400)
const fila = (n) => p.locator('.v5-limite', { hasText: n }).first()
ok((await fila('Comida').innerText()).includes('120'), 'Comida guarda 120 €')
ok((await fila('Ocio').innerText()).includes('50,50'), 'Ocio guarda 50,50 € (decimales exactos)')
ok((await p.locator('.v5-presu-cifras').innerText()) === presuAntes, 'El presupuesto general no cambia')
const ls = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('palanca_presu_cat_')))
ok(ls.length === 1 && ls[0] === 'palanca_presu_cat_demo-user', 'Se guarda por usuario: ' + ls.join(','))
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700); await cerrarAvisos()
await p.locator('[data-pestana="presupuesto"]:visible').first().click(); await p.waitForTimeout(700)
ok((await fila('Comida').innerText()).includes('120'), 'Tras recargar, Comida sigue en 120 €')
await p.getByRole('button', { name: 'Editar límites' }).click()
await p.getByLabel('Límite mensual para Comida').fill('')
await p.getByLabel('Límite mensual para Ocio').fill('60')
await p.getByRole('button', { name: 'Guardar límites' }).click(); await p.waitForTimeout(400)
ok((await fila('Comida').innerText()).includes('Sin límite'), 'Vaciar el campo quita el límite')
ok((await fila('Ocio').innerText()).includes('60'), 'Editar Ocio a 60 €')
// Otro usuario no ve estos límites (clave de otro id).
const otro = await p.evaluate(() => localStorage.getItem('palanca_presu_cat_otro-usuario'))
ok(otro === null, 'Nada guardado bajo otro usuario')
await p.locator('[data-pestana="movimientos"]:visible').first().click(); await p.waitForTimeout(600)
// Modo nube: con la tabla creada, lo del navegador se sube solo y se conserva.
await p.evaluate(() => localStorage.setItem('mock_tabla_limites', '1'))
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700); await cerrarAvisos()
await p.locator('[data-pestana="presupuesto"]:visible').first().click(); await p.waitForTimeout(700)
const subidos = await p.evaluate(() => JSON.parse(localStorage.getItem('mock_db_limites') || '[]'))

ok(subidos.length === 1 && subidos[0].categoria_nombre === 'Ocio' && subidos[0].importe_centimos === 6000 && subidos[0].usuario_id === 'demo-user', 'Al existir la tabla, el límite local se sube (Ocio 60 € = 6000 céntimos, del usuario)')
ok(await p.evaluate(() => localStorage.getItem('palanca_presu_cat_demo-user')) === null, 'Y se limpia la copia local')
await p.getByRole('button', { name: 'Editar límites' }).click()
await p.getByLabel('Límite mensual para Transporte').fill('75')
await p.getByRole('button', { name: 'Guardar límites' }).click(); await p.waitForTimeout(400)
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700); await cerrarAvisos()
await p.locator('[data-pestana="presupuesto"]:visible').first().click(); await p.waitForTimeout(700)
ok((await fila('Transporte').innerText()).includes('75') && (await fila('Ocio').innerText()).includes('60'), 'Modo nube: los límites se conservan al recargar')
await p.evaluate(() => { localStorage.removeItem('mock_tabla_limites'); localStorage.removeItem('mock_db_limites') })
ok(err.length === 0, 'Sin errores en consola: ' + err.join(' | '))
} catch (e) { fallos.push('Límites: ' + e.message.split('\n')[0]) } finally { await b.close() }
return fallos
}
