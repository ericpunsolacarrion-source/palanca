// CONCILIACIÓN DE FIJOS: un fijo de este mes que YA está apuntado (importado
// del extracto, leído de una captura o anotado a mano) cuenta como pagado.
// Así Fijos no vuelve a preguntar "¿ya te lo han cobrado?" y, sobre todo,
// confirmarlo no crea un SEGUNDO movimiento: nunca se cuenta dos veces.
//
// Es DERIVADO (no escribe nada): si el movimiento se borra, el fijo vuelve a
// estar pendiente solo. Lógica pura y testeable.

import { centimosDe, claveMes } from './movimientosUtils'
import { esAjuste, esTraspaso } from './categorias'
import { fechaCobroEnMes, tocaEnMes } from './periodicidad'
import { claveComercio, directorio, marcaDe, mismaEtiqueta, normalizarTexto } from './comercios'
import { reglaPara } from './categorizar'

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const diasEntre = (a, b) => Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000)

// ¿Es este movimiento del mismo sitio que el fijo? Por la cuenta elegida, por
// el comercio real (memoria/marca) o porque todas las palabras del nombre del
// fijo aparecen en el concepto ("Seguro moto" en "SEGURO MOTO MAPFRE").
export function esDelFijo(rec, m, dir = directorio()) {
  if (rec.fuenteId && m.fuente_id && rec.fuenteId === m.fuente_id) return true
  const nombreMov = dir.nombreDe(m)
  if (nombreMov && mismaEtiqueta(nombreMov, rec.nombre)) return true
  const contiene = (texto, palabras) => palabras.length > 0 && palabras.every((p) => new RegExp(`\\b${p.replace(/s$/, '')}`).test(texto))
  const delFijo = claveComercio(rec.nombre).split(' ').filter((p) => p.length >= 3)
  // Todas las palabras del fijo en el concepto ("Seguro moto" ⊂ "SEGURO MOTO MAPFRE")…
  if (contiene(normalizarTexto(`${nombreMov} ${m.nota ?? ''} ${m.fuente?.nombre ?? ''}`), delFijo)) return true
  // …o el comercio real del movimiento dentro del nombre del fijo ("Iberdrola" ⊂ "Luz Iberdrola")…
  const delMov = normalizarTexto(nombreMov).split(' ').filter((p) => p.length >= 4)
  if (contiene(normalizarTexto(rec.nombre), delMov)) return true
  // …o el mismo TIPO de recibo: un fijo llamado "Gimnasio" y el cargo "BASIC-FIT",
  // "Luz" e "IBERDROLA" (la misma regla del diccionario, de recibo o suscripción).
  // Solo si el fijo tiene nombre genérico: un fijo "Netflix" nunca se queda con el cargo de Spotify.
  if (marcaDe(rec.nombre)) return false
  const delNombre = reglaPara(rec.nombre)
  return Boolean(delNombre?.fijo && delNombre === (reglaPara(m.nota ?? '') ?? reglaPara(nombreMov ?? '')))
}

/**
 * Devuelve los fijos con `mesesAplicados` ampliado con el mes actual cuando su
 * cobro ya está entre los movimientos, y `detectado: { mes, movimientoId, importe }`.
 * Reglas del emparejamiento:
 *  - mismo tipo (gasto/ingreso), sin ajustes ni traspasos, fecha ≤ hoy;
 *  - en la ventana del cobro: ±7 días de su día (o el mes entero si no tiene día);
 *  - del MISMO sitio (ver esDelFijo) con importe parecido (±50 %: luz, agua…
 *    varían), o de su misma categoría con el importe EXACTO;
 *  - cada movimiento cubre un solo fijo.
 */
export function conciliarFijos(recurrentes, movimientos, hoy = new Date(), dir = directorio()) {
  const hoyIso = iso(hoy)
  const mes = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}`
  const usados = new Set()
  return recurrentes.map((rec) => {
    const confirmados = rec.mesesAplicados ?? []
    if (rec.activo === false || confirmados.includes(mes) || !tocaEnMes(rec, mes)) return rec
    const cobro = fechaCobroEnMes(rec, mes)
    const objetivo = Math.round(Number(rec.importe) * 100)
    let mejor = null
    for (const m of movimientos) {
      if (usados.has(m.id) || m.tipo !== rec.tipo || esAjuste(m) || esTraspaso(m) || m.fecha > hoyIso) continue
      if (cobro ? diasEntre(m.fecha, cobro) > 7 : claveMes(m.fecha) !== mes) continue
      const cent = centimosDe(m)
      const mismoSitio = esDelFijo(rec, m, dir)
      const encaja =
        (mismoSitio && objetivo > 0 && Math.abs(cent - objetivo) / objetivo <= 0.5) ||
        (!mismoSitio && rec.categoriaId && rec.categoriaId === m.categoria_id && cent === objetivo)
      if (!encaja) continue
      // El más cercano al día de cobro y al importe.
      const puntos = (cobro ? diasEntre(m.fecha, cobro) : 0) + Math.abs(cent - objetivo) / 100 + (mismoSitio ? 0 : 5)
      if (!mejor || puntos < mejor.puntos) mejor = { m, puntos, cent }
    }
    if (!mejor) return rec
    usados.add(mejor.m.id)
    return {
      ...rec,
      mesesAplicados: [...confirmados, mes],
      detectado: { mes, movimientoId: mejor.m.id, importe: mejor.cent / 100, fecha: mejor.m.fecha },
    }
  })
}
