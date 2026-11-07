// Día de cobro de la nómina: pregunta en el alta, detección automática con los
// movimientos (motor, sin IA) y respeto a la elección manual.
import { chromium } from 'playwright'

const UID = 'demo-user'

export async function cobro({ url, navegador = {}, salida = null }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  const ok = (c, m) => {
    console.log(c ? '  ✓' : '  ✗', m)
    if (!c) fallos.push('Día de cobro: ' + m)
  }
  const nueva = async (ls) => {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    p.__err = []
    p.on('pageerror', (e) => p.__err.push(e.message))
    await p.addInitScript((pares) => { if (!sessionStorage.getItem('__ini')) { for (const [k, v] of pares) localStorage.setItem(k, v); sessionStorage.setItem('__ini', '1') } }, Object.entries(ls))
    await p.goto(url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(800)
    return p
  }
  const cerrar = async (p) => {
    for (let i = 0; i < 20; i++) {
      const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
      if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break
    }
  }
  const config = (p) => p.evaluate((u) => JSON.parse(localStorage.getItem(`palanca_periodo_${u}`) || 'null'), UID)
  try {
    // 1) Alta: pregunta el día de cobro y lo guarda con el modo automático.
    {
      const p = await nueva({ mock_sin_perfil: '1', mock_vacio: '1' })
      await p.locator('#ob-nombre').fill('Ana')
      await p.getByRole('button', { name: 'Continuar' }).click()
      await p.waitForTimeout(250)
      await p.locator('.ob-paso button').first().click() // objetivo
      await p.waitForTimeout(500)
      if (await p.getByRole('button', { name: 'Lo pongo después' }).count()) await p.getByRole('button', { name: 'Lo pongo después' }).click()
      await p.waitForTimeout(250)
      ok((await p.getByText('¿Qué día cobras tu nómina?').count()) === 1, 'El alta pregunta qué día cobras la nómina')
      ok(/detectará el día exacto/.test(await p.locator('.ob-sub').innerText()), 'Avisa de que con los extractos se detectará el día exacto')
      if (salida) await p.screenshot({ path: `${salida}/alta-dia-cobro.png` })
      await p.locator('#ob-cobro').fill('28')
      await p.getByRole('button', { name: 'Continuar' }).click()
      await p.waitForTimeout(250)
      await p.getByRole('button', { name: 'Prefiero no decirlo' }).click()
      await p.waitForTimeout(1200)
      const c = await config(p)
      ok(c?.dia === 28 && c?.cobro === 28 && c?.auto === true, `Guarda cobro 28 → mes desde el 28, automático (${JSON.stringify(c)})`)
      ok(p.__err.length === 0, 'Sin errores en consola (alta) ' + p.__err.join(' | '))
      await p.close()
    }
    // 2) Automático: la nómina del 28 llegó una vez el 27 → el mes empieza el 27, solo.
    {
      const p = await nueva({ mock_nomina28: '1', [`palanca_periodo_${UID}`]: JSON.stringify({ dia: 28, cobro: 28, auto: true }) })
      const aviso = await p.getByText(/tu mes empieza ahora el día 27/).first().waitFor({ timeout: 4000 }).then(() => true, () => false)
      await cerrar(p)
      await p.waitForTimeout(500)
      const c = await config(p)
      ok(c?.dia === 27 && c?.auto === true, `Se ajusta solo al 27 (${JSON.stringify(c)})`)
      ok(aviso, 'Avisa del ajuste')
      await p.getByRole('button', { name: /^Tu cuenta/ }).first().click()
      await p.waitForTimeout(300)
      ok((await p.locator('#ajuste-periodo-dia').inputValue()) === '27', 'Tu cuenta muestra el día 27')
      ok(/llega el día 28 y a veces se adelanta al 27/.test(await p.getByTestId('periodo-nomina').innerText()), 'Explica lo detectado (28, a veces 27)')
      if (salida) await p.locator('.ajuste-periodo').screenshot({ path: `${salida}/cuenta-automatico.png` })
      ok(p.__err.length === 0, 'Sin errores en consola (automático) ' + p.__err.join(' | '))
      await p.close()
    }
    // 3) Elegido a mano: no se cambia; solo se sugiere.
    {
      const p = await nueva({ mock_nomina28: '1', [`palanca_periodo_${UID}`]: JSON.stringify({ dia: 1, cobro: null, auto: false }) })
      await cerrar(p)
      await p.waitForTimeout(500)
      const c = await config(p)
      ok(c?.dia === 1 && c?.auto === false, 'Con elección manual no cambia nada solo')
      ok((await p.getByText(/actívalo en Tu cuenta/).count()) >= 1, 'Sugiere el día detectado una vez')
      await p.getByRole('button', { name: /^Tu cuenta/ }).first().click()
      await p.waitForTimeout(300)
      const sug = p.getByRole('button', { name: 'Ver cómo quedaría empezando el día 27' })
      ok((await sug.count()) === 1, 'Tu cuenta ofrece ver cómo quedaría con el 27')
      await sug.click()
      ok((await p.locator('.ajuste-periodo-vista').count()) === 1, 'Y enseña la vista previa antes de guardar')
      ok(p.__err.length === 0, 'Sin errores en consola (manual) ' + p.__err.join(' | '))
      await p.close()
    }
  } catch (e) {
    fallos.push('Día de cobro: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
