// Recuperar contraseña: el enlace del correo (#…type=recovery) abre «Elige tu
// nueva contraseña»; valida (mínimo, letras y números, coinciden), avisa si es
// igual a la anterior o si el enlace caducó, y al guardar entra en la app.
import { chromium } from 'playwright'

export async function recuperar({ url, navegador = {}, salida = null }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  const enlace = (u) => { const x = new URL(u); x.searchParams.set('recuperar', '1'); x.hash = 'access_token=t&type=recovery'; return x.toString() }
  try {
    for (const ancho of [390, 1280]) {
      const ok = (c, m) => {
        console.log(c ? '  ✓' : '  ✗', `[${ancho}] ${m}`)
        if (!c) fallos.push(`Recuperar contraseña [${ancho}]: ${m}`)
      }
      const nueva = async (ls = {}) => {
        const p = await b.newPage({ viewport: { width: ancho, height: 900 } })
        p.__err = []
        p.on('pageerror', (e) => p.__err.push(e.message))
        await p.addInitScript((pares) => { for (const [k, v] of pares) localStorage.setItem(k, v) }, Object.entries(ls))
        await p.goto(enlace(url), { waitUntil: 'networkidle' })
        return p
      }
      const rellenar = async (p, a, c) => {
        await p.locator('#nueva-pass').fill(a)
        await p.locator('#nueva-pass-2').fill(c)
        await p.getByRole('button', { name: 'Guardar contraseña' }).click()
        await p.waitForTimeout(250)
        return (await p.getByRole('alert').count()) ? p.getByRole('alert').innerText() : ''
      }
      {
        const p = await nueva()
        ok((await p.getByTestId('nueva-contrasena').count()) === 1, 'El enlace del correo abre «Elige tu nueva contraseña»')
        if (salida && ancho === 390) await p.screenshot({ path: `${salida}/recuperar-nueva.png` })
        ok(/al menos 8/.test(await rellenar(p, 'abc1', 'abc1')), 'Demasiado corta → lo dice')
        ok(/letras y números/.test(await rellenar(p, 'abcdefgh', 'abcdefgh')), 'Sin números → lo dice')
        ok(/no coinciden/.test(await rellenar(p, 'abcdefg1', 'abcdefg2')), 'No coinciden → lo dice')
        await rellenar(p, 'abcdefg1', 'abcdefg1')
        await p.waitForTimeout(500)
        ok((await p.getByTestId('nueva-contrasena').count()) === 0 && (await p.evaluate(() => globalThis.__passCambiada === true)), 'Guardada → entra en la app')
        ok(!(await p.evaluate(() => location.search.includes('recuperar'))), 'Limpia la dirección (no vuelve a salir al recargar)')
        ok(p.__err.length === 0, 'Sin errores en consola ' + p.__err.join(' | '))
        await p.close()
      }
      {
        const p = await nueva({ mock_pass_misma: '1' })
        ok(/distinta de la anterior/.test(await rellenar(p, 'abcdefg1', 'abcdefg1')), 'Igual a la anterior → lo dice')
        await p.close()
      }
      {
        const p = await nueva({ mock_pass_caducada: '1' })
        ok(/caducado/.test(await rellenar(p, 'abcdefg1', 'abcdefg1')), 'Enlace caducado → lo dice')
        ok((await p.getByRole('button', { name: 'Pedir otro enlace' }).count()) === 1, 'Y ofrece pedir otro')
        await p.close()
      }
      {
        const p = await b.newPage({ viewport: { width: ancho, height: 900 } })
        await p.goto(url, { waitUntil: 'networkidle' })
        ok((await p.getByTestId('nueva-contrasena').count()) === 0, 'Sin enlace de recuperación no aparece')
        await p.close()
      }
    }
  } catch (e) {
    fallos.push('Recuperar contraseña: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
