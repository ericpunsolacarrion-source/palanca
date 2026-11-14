// Acceso: errores que antes salían «sin explicación».
//  1) Volver de un enlace del correo caducado o ya usado (#error=…otp_expired).
//  2) Entrar sin haber confirmado el email → mensaje + «Reenviar correo».
import { chromium } from 'playwright'

export async function acceso({ url, navegador = {} }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  const ok = (c, m) => {
    console.log(c ? '  ✓' : '  ✗', m)
    if (!c) fallos.push('Acceso: ' + m)
  }
  try {
    {
      const p = await b.newPage({ viewport: { width: 390, height: 844 } })
      await p.addInitScript(() => localStorage.setItem('mock_sin_sesion', '1'))
      const base = url.split('#')[0]
      await p.goto(`${base}${base.includes('?') ? '&' : '?'}x=1#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`, { waitUntil: 'networkidle' })
      await p.waitForTimeout(600)
      ok(/caducado o ya se había usado/.test(await p.locator('.error').innerText().catch(() => '')), 'Enlace del correo caducado: lo explica')
      ok(!(await p.evaluate(() => location.hash)).includes('error'), 'Quita el error de la dirección')
      const boton = p.getByRole('button', { name: 'Reenviar correo de confirmación' })
      ok((await boton.count()) === 1, 'Ofrece reenviar el correo de confirmación')
      await p.locator('input[type="email"]').fill('amigo@ejemplo.com')
      await boton.click()
      await p.waitForTimeout(300)
      ok(/te hemos enviado otro correo/.test(await p.locator('.acceso-aviso').innerText().catch(() => '')), 'Al reenviar, lo confirma (sin revelar si la cuenta existe)')
      await p.close()
    }
    {
      const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
      await p.addInitScript(() => { localStorage.setItem('mock_sin_sesion', '1'); localStorage.setItem('mock_sin_confirmar', '1'); localStorage.setItem('palanca_ya_entro', '1') })
      await p.goto(url, { waitUntil: 'networkidle' })
      await p.waitForTimeout(600)
      await p.locator('input[type="email"]').fill('amigo@ejemplo.com')
      await p.locator('input[type="password"]').fill('secreto123')
      await p.locator('button.acceso-boton').click()
      await p.waitForTimeout(400)
      ok(/Confirma tu email/.test(await p.locator('.error').innerText().catch(() => '')), 'Email sin confirmar: lo dice')
      ok((await p.getByRole('button', { name: 'Reenviar correo de confirmación' }).count()) === 1, 'Y ofrece reenviar el correo')
      await p.close()
    }
  } catch (e) {
    fallos.push('Acceso: ' + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
