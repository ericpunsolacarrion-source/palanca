// Periodo financiero («Mi mes empieza el día…» en Tu cuenta): vista previa
// antes de guardar, guardado, etiquetas con el rango real y las invariantes en
// pantalla (mismo patrimonio, mismo nº de movimientos). Con y sin la columna
// perfiles.dia_inicio_periodo (mock_columna_periodo=1 simula la migración hecha).
import { chromium } from 'playwright'

export async function periodo({ url, navegador = {}, conColumna = false, salida = null }) {
  const fallos = []
  const b = await chromium.launch(navegador)
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
  const err = []
  p.on('pageerror', (e) => err.push(e.message))
  const etiqueta = conColumna ? 'Periodo (columna)' : 'Periodo (sin columna)'
  const ok = (c, m) => {
    console.log(c ? '  ✓' : '  ✗', m)
    if (!c) fallos.push(`${etiqueta}: ${m}`)
  }
  const cerrarAvisos = async () => {
    for (let i = 0; i < 20; i++) {
      const x = p.getByRole('button', { name: /^(Seguir|Entendido)$/ })
      if (await x.count()) { await x.first().click(); await p.waitForTimeout(120) } else break
    }
  }
  const patrimonio = async () => {
    await p.locator('[data-pestana="dashboard"]:visible').first().click()
    await p.waitForTimeout(500)
    return (await p.locator('.v5-cifra-hero').first().innerText()).trim()
  }
  const totalMovs = async () => {
    await p.locator('[data-pestana="movimientos"]:visible').first().click()
    await p.waitForTimeout(600)
    const cabs = await p.locator('.v5-movs-historial > .v5-bloque > .v5-bloque-cab, .v5-bloque:not(.anidado) > .v5-bloque-cab').allInnerTexts()
    const vistos = new Set()
    let n = 0
    for (const t of cabs) {
      if (vistos.has(t)) continue
      vistos.add(t)
      const m = t.match(/(\d+) movimientos?/)
      if (m) n += Number(m[1])
    }
    return { n, primero: cabs[0] ?? '' }
  }
  try {
    if (conColumna) await p.addInitScript(() => localStorage.setItem('mock_columna_periodo', '1'))
    await p.goto(url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(700)
    await cerrarAvisos()
    const patAntes = await patrimonio()
    const movAntes = await totalMovs()
    ok(movAntes.n > 0, `Hay movimientos (${movAntes.n})`)
    ok(!/·\s*\d+ \w+ –/.test(movAntes.primero), 'Con día 1 los meses no muestran rango (como siempre)')

    await p.getByRole('button', { name: /^Tu cuenta/ }).first().click()
    await p.waitForTimeout(300)
    const sel = p.locator('#ajuste-periodo-dia')
    ok((await sel.inputValue()) === '1', 'Por defecto, el mes empieza el día 1')
    ok((await p.getByRole('button', { name: 'Guardar mi mes' }).isDisabled()), 'Sin cambios, no se puede guardar')
    await sel.selectOption('28')
    await p.waitForTimeout(300)
    const ej = await p.getByTestId('periodo-ejemplo').innerText()
    ok(/del 28 de \w+ al 27 de \w+ cuenta como \w+/.test(ej), `Explica el periodo con un ejemplo («${ej.slice(0, 70)}…»)`)
    const vista = p.locator('.ajuste-periodo-vista')
    ok((await vista.count()) === 1, 'Vista previa visible ANTES de guardar')
    ok((await vista.locator('tbody tr').count()) === 4, 'Muestra los 4 últimos periodos')
    ok(/fechas reales.*no cambian/.test(await vista.innerText()), 'Dice que las fechas reales no cambian')
    if (salida) await p.locator('.cuenta-caja').screenshot({ path: `${salida}/periodo-vista-previa${conColumna ? '-columna' : ''}.png` })
    await p.getByRole('button', { name: 'Guardar mi mes' }).click()
    await p.waitForTimeout(700)
    ok((await p.getByText('tu calendario financiero se ha actualizado').count()) >= 1, 'Confirma que se ha guardado')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)

    const patDespues = await patrimonio()
    ok(patAntes === patDespues, `El patrimonio no cambia (${patAntes} → ${patDespues})`)
    const movDespues = await totalMovs()
    ok(movAntes.n === movDespues.n, `El nº de movimientos no cambia (${movAntes.n} → ${movDespues.n})`)
    ok(/28 \w+ – 27 \w+/.test(movDespues.primero), `El periodo en curso enseña su rango («${movDespues.primero.split('\n').slice(0, 2).join(' ')}»)`)
    if (salida) await p.screenshot({ path: `${salida}/periodo-movimientos${conColumna ? '-columna' : ''}.png` })

    // Persistencia: al recargar sigue el día 28 (columna o este dispositivo).
    await p.reload({ waitUntil: 'networkidle' })
    await p.waitForTimeout(700)
    await cerrarAvisos()
    await p.getByRole('button', { name: /^Tu cuenta/ }).first().click()
    await p.waitForTimeout(300)
    ok((await p.locator('#ajuste-periodo-dia').inputValue()) === '28', 'Al recargar se conserva el día 28')
    if (conColumna) {
      const enBD = await p.evaluate(() => [localStorage.getItem('mock_periodo_bd'), Object.keys(localStorage).some((k) => k.startsWith('palanca_periodo_'))])
      ok(enBD[0] === '28' && !enBD[1], 'Se guarda en la columna del perfil (no en el navegador)')
    } else {
      const ls = await p.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith('palanca_periodo_'))?.[1])
      ok(JSON.parse(ls || '{}').dia === 28, 'Sin la columna, se guarda en este dispositivo')
    }
    // Volver al día 1 deja todo como estaba.
    await p.locator('#ajuste-periodo-dia').selectOption('1')
    await p.getByRole('button', { name: 'Guardar mi mes' }).click()
    await p.waitForTimeout(700)
    await p.keyboard.press('Escape')
    const vuelta = await totalMovs()
    ok(vuelta.n === movAntes.n && vuelta.primero === movAntes.primero, 'Volver al día 1 deja Movimientos como al principio')
    ok(err.length === 0, 'Sin errores en consola ' + err.join(' | '))
  } catch (e) {
    fallos.push(`${etiqueta}: ` + e.message.split('\n')[0])
  } finally {
    await b.close()
  }
  return fallos
}
