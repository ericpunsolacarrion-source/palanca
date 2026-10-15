import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabaseClient', () => ({ supabase: {} }))
import { BANCOS, PERFILES, clienteSimulado, signo } from './clientesSimulados'
import { claveDuplicado, detectarMapeo, leerFilasTexto, procesarFilas, tablaDesdeFilas } from './importarCsv'
import { agruparPorComercio, categorizarFilas, comoMovimiento, indicesParecidos } from './revisionImportacion'
import { crearCategorizador } from './categorizar'
import { bolsas, gastoPorCategoria, totalesDe } from './movimientosUtils'
import { detectarSuscripciones } from './suscripciones'
import { respuestaLocal } from './respuestasLocales'
import { conciliarFijos } from './conciliarFijos'
import { claveComercio, crearDirectorio } from './comercios'
import { formatearEuros } from './categorias'
import { movimientosACsv } from './exportarDatos'

// Cinco clientes de cinco bancos, con un año de vida real cada uno. Se importa
// su extracto TAL CUAL lo exporta su banco y se comprueba que Palanca dice
// exactamente lo que pasó (la "verdad" de clientesSimulados.js).

function importar(extracto, existentes = [], dir) {
  const tabla = tablaDesdeFilas(leerFilasTexto(extracto))
  const claves = new Set(existentes.map(claveDuplicado))
  const r = procesarFilas(tabla.filas, detectarMapeo(tabla.cabeceras), claves, { inicio: tabla.inicio })
  const filas = categorizarFilas(r.validas, crearCategorizador(existentes, dir))
  const movs = filas.map(comoMovimiento).map((m, i) => ({ ...m, id: `i${i}`, importe_centimos: Math.round(m.importe * 100) }))
  return { ...r, filas, movs }
}

const centimos = (x) => Math.round(x * 100)

describe.each(PERFILES)('cliente $id ($banco)', (perfil) => {
  const c = clienteSimulado(perfil)
  const imp = importar(c.extracto)

  it('entra todo el extracto (y nada que no ocurriera)', () => {
    expect(imp.validas).toHaveLength(c.evs.length)
    // Lo único que se rechaza es lo que no llegó a pasar (Revolut: pago revertido).
    for (const e of imp.errores) expect(e.motivo).toMatch(/no completada/)
  })

  it('las cifras cuadran AL CÉNTIMO con la realidad', () => {
    const t = totalesDe(imp.movs)
    const b = bolsas(imp.movs)
    expect(centimos(t.ingresos)).toBe(centimos(c.verdad.ingresos))
    expect(centimos(t.gastos)).toBe(centimos(c.verdad.gastos))
    expect(centimos(t.ahorro)).toBe(centimos(c.verdad.ahorro))
    expect(centimos(t.invertido)).toBe(centimos(c.verdad.invertido))
    expect(centimos(b.patrimonio)).toBe(centimos(c.verdad.patrimonio))
    expect(centimos(b.bolsaInversion)).toBe(centimos(c.verdad.bolsaInversion))
  })

  it('el desglose por categorías suma lo mismo que el gasto', () => {
    const suma = [...gastoPorCategoria(imp.movs).values()].reduce((s, v) => s + centimos(v), 0)
    expect(suma).toBe(centimos(totalesDe(imp.movs).gastos))
  })

  it('traspasos, inversiones, retiradas y devoluciones nunca se confunden con ingreso o gasto', () => {
    imp.filas.forEach((f, i) => {
      const e = c.evs[i]
      const cat = f.esInversion ? 'Inversion' : f.categoria
      if (['al_ahorro', 'del_ahorro', 'aportacion', 'retirada', 'devolucion'].includes(e.clase)) expect(`${e.texto}: ${cat}`).toBe(`${e.texto}: ${e.cat}`)
    })
  })

  it('reconoce las marcas conocidas y les pone su categoría', () => {
    const conocidas = ['Netflix', 'Spotify', 'Basic-Fit', 'Iberdrola', 'Movistar', 'Repsol', 'Amazon', 'Mapfre']
    imp.filas.forEach((f, i) => {
      const e = c.evs[i]
      if (conocidas.includes(e.comercio) && e.clase === 'consumo') expect(`${e.texto}: ${f.categoria}`).toBe(`${e.texto}: ${e.cat}`)
    })
  })

  it('los grupos de la revisión tienen nombres limpios (sin tarjeta, ni "Pago en", ni "To")', () => {
    for (const g of agruparPorComercio(imp.filas)) {
      expect(g.nombre).not.toMatch(/xxxx|^(pago|con|en|to|from|payment|transferencia emitida)\b/i)
      expect(g.nombre).not.toMatch(/\b(sl|s\.l\.)$/i)
    }
  })

  it('detecta sus suscripciones y no se inventa ninguna', () => {
    const nombres = detectarSuscripciones(imp.movs, []).map((s) => s.nombre)
    for (const n of ['Netflix', 'Spotify', 'Basic-Fit', 'Movistar']) expect(nombres).toContain(n)
    for (const n of nombres) expect(n).not.toMatch(/mercadona|alipam|repsol|bar paco|amazon|traspaso|savings|myinvestor|indexa|naranja/i)
  })

  it('volver a importar el mismo extracto no duplica nada', () => {
    const otra = importar(c.extracto, imp.movs)
    expect(otra.validas).toHaveLength(0)
  })

  it('Fulcro responde al momento con las cifras del motor', () => {
    const hoy = new Date()
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const gasolina = c.evs.filter((e) => e.comercio === 'Repsol' && e.fecha >= iso(desde) && e.fecha <= iso(hasta)).reduce((s, e) => s + centimos(e.importe), 0)
    expect(respuestaLocal('¿Cuánto he gastado en gasolina los últimos 3 meses?', { movimientos: imp.movs })).toContain(`**${formatearEuros(gasolina / 100)}**`)
    const anio = `${hoy.getFullYear()}-01-01`
    const aport = c.evs.filter((e) => e.clase === 'aportacion' && e.fecha >= anio).reduce((s, e) => s + centimos(e.importe), 0)
    expect(respuestaLocal('¿Cuánto he invertido este año?', { movimientos: imp.movs })).toContain(`**${formatearEuros(aport / 100)}**`)
  })

  it('Fijos: el gimnasio y Netflix de este mes ya están pagados (sin doble cobro)', () => {
    const rec = (id, nombre, importe, diaMes) => ({ id, tipo: 'gasto', nombre, importe, diaMes, activo: true, periodoMeses: 1, mesesAplicados: [] })
    const r = conciliarFijos([rec('a', 'Netflix', 13.99, 3), rec('b', 'Gimnasio', 39.9, 6), rec('c', 'Spotify', 10.99, 5)], imp.movs)
    for (const x of r) expect(`${x.nombre}: ${x.detectado?.importe}`).toBe(`${x.nombre}: ${x.importe}`)
  })
})

describe('Santander: "ALIPAM40" es Mercadona y nadie lo sabe… hasta que el cliente lo dice una vez', () => {
  const c = clienteSimulado(PERFILES.find((p) => p.banco === 'santander'))

  it('sin memoria: un solo grupo "Alipam" (aunque cada compra traiga otro número)', () => {
    const grupos = agruparPorComercio(importar(c.extracto).filas)
    const alipam = grupos.filter((g) => /alipam/i.test(g.nombre))
    expect(alipam).toHaveLength(1)
    expect(alipam[0].n).toBe(c.evs.filter((e) => /ALIPAM/.test(e.texto)).length)
  })

  it('con memoria: todo es Mercadona y Comida, también en el siguiente extracto', () => {
    const dir = crearDirectorio([{ clave: claveComercio('COMPRA TARJ. 5402XXXXXXXX1234 ALIPAM40'), nombre: 'Mercadona', categoria: 'Comida' }])
    const tabla = tablaDesdeFilas(leerFilasTexto(c.extracto))
    const r = procesarFilas(tabla.filas, detectarMapeo(tabla.cabeceras), new Set())
    const filas = categorizarFilas(r.validas, crearCategorizador([], dir))
    const deAlipam = filas.filter((f) => /ALIPAM/.test(f.nota))
    expect(deAlipam.every((f) => f.categoria === 'Comida')).toBe(true)
    const grupo = agruparPorComercio(filas, dir).find((g) => g.nombre === 'Mercadona')
    expect(grupo.n).toBe(deAlipam.length)
  })
})

describe('extractos que se solapan (el cliente baja el de cada mes)', () => {
  it('el segundo extracto solo trae lo nuevo, aunque repita semanas', () => {
    const p = PERFILES[0]
    const c = clienteSimulado(p)
    const mitad = Math.floor(c.evs.length * 0.7)
    const ext = (evs) => BANCOS[p.banco].extracto(evs)
    const primero = importar(ext(c.evs.slice(0, mitad)))
    const segundo = importar(ext(c.evs.slice(mitad - 20)), primero.movs)
    expect(primero.validas.length + segundo.validas.length).toBe(c.evs.length)
    expect(segundo.duplicados).toHaveLength(20)
    // Y lo ya apuntado a mano (mismo día e importe) se propone fuera.
    const e = c.evs[mitad]
    const aMano = [{ id: 'a', tipo: signo(e) > 0 ? 'ingreso' : 'gasto', fecha: e.fecha, importe: e.importe, importe_centimos: centimos(e.importe), nota: null }]
    const tercero = importar(ext(c.evs.slice(mitad, mitad + 1)))
    expect(indicesParecidos(tercero.validas, aMano).size).toBe(1)
  })
})

describe('descargar mis datos y volver a importarlos (ida y vuelta)', () => {
  it.each(PERFILES)('$id: el CSV de Palanca reimportado da exactamente las mismas cifras', (perfil) => {
    const c = clienteSimulado(perfil)
    const movs = importar(c.extracto).movs.map((m) => ({ ...m, categoria: { nombre: m.categoria.nombre } }))
    const vuelta = importar(movimientosACsv(movs)).movs
    expect(vuelta).toHaveLength(movs.length)
    expect(bolsas(vuelta)).toEqual(bolsas(movs))
    expect(totalesDe(vuelta)).toEqual(totalesDe(movs))
  })
})
