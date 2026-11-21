// Núcleo del CONECTOR DE PALANCA PARA CLAUDE (servidor MCP). Sin HTTP: recibe
// un mensaje JSON-RPC y un contexto { sb, usuario } y devuelve la respuesta.
// `sb` es un cliente de Supabase que actúa COMO el usuario (su token de OAuth):
// todas las consultas pasan por RLS, igual que desde la app. Nunca se usa la
// service key. Las reglas de cálculo son las del motor (api/_motor.js,
// empaquetado desde src/lib), no se recalculan a mano aquí.
//
// Toda acción que ESCRIBE funciona en dos tiempos: sin `confirmar` devuelve
// una vista previa de lo que haría; con `confirmar: true` lo hace.
import {
  bolsas,
  CATEGORIA_AJUSTE,
  CATEGORIA_INVERSION,
  categorizarFilas,
  claveDuplicado,
  claveMes,
  configurarPeriodo,
  COLUMNAS_PLANTILLA,
  crearCategorizador,
  detectarMapeo,
  esAjuste,
  esInversion,
  esRetiradaInversion,
  formaEtiqueta,
  gastoPorCategoria,
  parseFecha,
  procesarFilas,
  tablaDesdeFilas,
  totalesDe,
  TIPOS_PLANTILLA,
} from './_motor.js'

// Fechas «de hoy» del motor (p. ej. rechazar movimientos futuros) en hora de
// España: Vercel corre en UTC.
process.env.TZ = 'Europe/Madrid'

export const VERSIONES = ['2025-06-18', '2025-03-26', '2024-11-05']
export const INFO = { name: 'palanca', title: 'Palanca', version: '1.0.0' }
export const INSTRUCCIONES = `Palanca es la app de finanzas personales del usuario. Con estas herramientas lees y cambias SUS datos (nunca los de otra persona).
Reglas de Palanca (aplícalas al explicar cifras):
- Gasto = consumo. Inversión = compras de acciones/ETF/fondos (cuentan como «invertido», a precio de compra). Ventas de inversión vuelven a disponible.
- Aportaciones y retiradas entre el banco y el bróker, y traspasos entre cuentas propias, NO son gasto ni inversión.
- Intereses y dividendos son ingresos. Las devoluciones restan gasto.
- Patrimonio = disponible + invertido (a precio de compra, no a valor de mercado).
- Importes en euros, en formato español al hablar con el usuario (1.234,56 €).
Para escribir: llama primero SIN confirmar, enseña al usuario la vista previa y vuelve a llamar con confirmar=true solo si él lo aprueba.`

// «Hoy» en España (Vercel corre en UTC: a las 00:30 en Madrid aún es ayer allí).
const HOY = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date())
const eur = (n) => `${(Math.round(Number(n) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })} €`
const MAX_FILAS = 5000

// ── Lectura de datos del usuario ────────────────────────────────────────────
async function leerMovimientos(sb, uid) {
  const filas = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await sb
      .from('movimientos')
      .select('id, tipo, importe, importe_centimos, fecha, nota, created_at, categoria:categorias(id, nombre), fuente:fuentes(id, nombre)')
      .eq('usuario_id', uid)
      .order('fecha', { ascending: true })
      .range(desde, desde + 999)
    if (error) throw new ErrorDatos('No se han podido leer tus movimientos.')
    filas.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return filas
}

async function prepararPeriodo(sb, uid) {
  // Si el usuario cobra a mitad de mes, sus meses van de nómina a nómina.
  try {
    const { data } = await sb.from('perfiles').select('*').eq('usuario_id', uid).maybeSingle()
    configurarPeriodo(Number(data?.dia_inicio_periodo) || 1)
  } catch {
    configurarPeriodo(1)
  }
}

const esId = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v))

class ErrorDatos extends Error {}
class ErrorArgumentos extends Error {}

const tipoVisible = (m) =>
  esAjuste(m) ? 'ajuste' : esInversion(m) ? 'compra inversión' : esRetiradaInversion(m) ? 'venta inversión' : m.tipo

const vistaMovimiento = (m) => ({
  id: m.id,
  fecha: m.fecha,
  tipo: tipoVisible(m),
  categoria: m.categoria?.nombre ?? null,
  concepto: m.nota ?? '',
  importe: Number(m.importe),
  plataforma: m.fuente?.nombre ?? null,
})

// ── Herramientas ────────────────────────────────────────────────────────────
async function resumen(sb, uid, args) {
  const meses = Math.min(24, Math.max(1, Number(args.meses) || 6))
  await prepararPeriodo(sb, uid)
  const movs = await leerMovimientos(sb, uid)
  const b = bolsas(movs, HOY())
  const porMes = new Map()
  for (const m of movs) {
    const k = claveMes(m.fecha)
    if (!porMes.has(k)) porMes.set(k, [])
    porMes.get(k).push(m)
  }
  const claves = [...porMes.keys()].sort().filter((k) => k <= claveMes(HOY())).slice(-meses)
  const mensual = claves.map((k) => {
    const t = totalesDe(porMes.get(k))
    return { mes: k, ingresos: t.ingresos, gastos: t.gastos, invertido: t.invertido, ahorro: t.ahorro, ratio_ahorro: Math.round(t.ratioAhorro * 10) / 10 }
  })
  const actual = porMes.get(claveMes(HOY())) ?? []
  const categorias = [...gastoPorCategoria(actual).entries()].sort((a, c) => c[1] - a[1]).slice(0, 8).map(([nombre, importe]) => ({ nombre, importe }))
  const ultimoAjuste = movs.filter(esAjuste).map((m) => m.fecha).sort().at(-1) ?? null
  const datos = {
    disponible: b.bolsaLiquidez,
    invertido_a_precio_de_compra: b.bolsaInversion,
    patrimonio: b.patrimonio,
    meses: mensual,
    gasto_por_categoria_mes_actual: categorias,
    movimientos_totales: movs.length,
    primer_movimiento: movs[0]?.fecha ?? null,
    ultimo_ajuste_de_saldo: ultimoAjuste,
  }
  const texto = [
    `Patrimonio: ${eur(b.patrimonio)} (disponible ${eur(b.bolsaLiquidez)} + invertido ${eur(b.bolsaInversion)} a precio de compra).`,
    ...mensual.map((m) => `${m.mes}: ingresos ${eur(m.ingresos)} · gastos ${eur(m.gastos)} · invertido ${eur(m.invertido)}`),
  ].join('\n')
  return { texto, datos }
}

async function listarMovimientos(sb, uid, args) {
  const limite = Math.min(500, Math.max(1, Number(args.limite) || 50))
  const movs = await leerMovimientos(sb, uid)
  const desde = args.desde ? parseFecha(args.desde) : null
  const hasta = args.hasta ? parseFecha(args.hasta) : null
  const texto = String(args.texto ?? '').trim().toLowerCase()
  const cat = args.categoria ? formaEtiqueta(args.categoria) : null
  const tipo = args.tipo ?? 'todos'
  const filtrados = movs
    .filter((m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta))
    .filter((m) => !texto || (m.nota ?? '').toLowerCase().includes(texto))
    .filter((m) => !cat || formaEtiqueta(m.categoria?.nombre ?? '') === cat)
    .filter((m) => tipo === 'todos' || (tipo === 'inversion' ? esInversion(m) || esRetiradaInversion(m) : !esInversion(m) && !esRetiradaInversion(m) && m.tipo === tipo))
    .reverse()
  const lista = filtrados.slice(0, limite).map(vistaMovimiento)
  return {
    texto: `${filtrados.length} movimientos encontrados${filtrados.length > limite ? ` (se muestran los ${limite} más recientes)` : ''}.`,
    datos: { total: filtrados.length, movimientos: lista },
  }
}

async function listarCategorias(sb, uid) {
  const { data, error } = await sb.from('categorias').select('id, tipo, nombre').eq('usuario_id', uid).order('nombre')
  if (error) throw new ErrorDatos('No se han podido leer tus categorías.')
  return { texto: `${data.length} categorías.`, datos: { categorias: data } }
}

// Filas que manda Claude (objetos) → filas de la plantilla (arrays, mismo orden).
function aFilasPlantilla(filas) {
  if (!Array.isArray(filas) || filas.length === 0) throw new ErrorArgumentos('«filas» debe ser una lista con al menos un movimiento.')
  if (filas.length > MAX_FILAS) throw new ErrorArgumentos(`Como mucho ${MAX_FILAS} filas por llamada: divide la importación.`)
  return filas.map((f) => [f.fecha, f.tipo, f.concepto, f.categoria ?? '', f.importe, f.plataforma ?? '', f.activo ?? ''].map((v) => (v === null || v === undefined ? '' : v)))
}

function desglose(filas) {
  const s = (pred) => Math.round(filas.filter(pred).reduce((t, f) => t + Math.round(f.importe * 100), 0)) / 100
  const traspaso = (f) => !f.esInversion && (f.categoria === 'Ahorro' || f.categoria === 'Desde ahorro')
  return {
    gastos: s((f) => !f.esInversion && f.tipo === 'gasto' && !traspaso(f)),
    ingresos: s((f) => !f.esInversion && f.tipo === 'ingreso' && !traspaso(f) && f.categoria !== 'Devoluciones'),
    devoluciones: s((f) => f.categoria === 'Devoluciones'),
    invertido: Math.round((s((f) => f.esInversion && f.tipo === 'gasto') - s((f) => f.esInversion && f.tipo === 'ingreso')) * 100) / 100,
    traspasos: filas.filter(traspaso).length,
  }
}

async function idsCategorias(sb, uid, filas) {
  const { data: existentes, error } = await sb.from('categorias').select('id, tipo, nombre').eq('usuario_id', uid)
  if (error) throw new ErrorDatos('No se han podido leer tus categorías.')
  const mapa = new Map()
  for (const c of existentes ?? []) mapa.set(`${c.tipo}|${formaEtiqueta(c.nombre)}`, c.id)
  const aCrear = new Map()
  for (const f of filas) {
    const nombre = f.esInversion ? CATEGORIA_INVERSION : f.categoria
    const k = `${f.tipo}|${formaEtiqueta(nombre)}`
    if (!mapa.has(k) && !aCrear.has(k)) aCrear.set(k, { usuario_id: uid, tipo: f.tipo, nombre })
  }
  if (aCrear.size) {
    const { data, error: e } = await sb.from('categorias').insert([...aCrear.values()]).select('id, tipo, nombre')
    if (e) throw new ErrorDatos('No se han podido crear las categorías nuevas.')
    for (const c of data ?? []) mapa.set(`${c.tipo}|${formaEtiqueta(c.nombre)}`, c.id)
  }
  return { de: (f) => mapa.get(`${f.tipo}|${formaEtiqueta(f.esInversion ? CATEGORIA_INVERSION : f.categoria)}`) ?? null, creadas: [...aCrear.values()].map((c) => c.nombre) }
}

async function idsFuentes(sb, uid, filas) {
  const nombres = [...new Set(filas.filter((f) => f.esInversion && f.plataforma).map((f) => f.plataforma))]
  if (!nombres.length) return () => null
  const { data: existentes, error } = await sb.from('fuentes').select('id, nombre').eq('usuario_id', uid)
  if (error) throw new ErrorDatos('No se han podido leer tus plataformas.')
  const mapa = new Map((existentes ?? []).map((f) => [formaEtiqueta(f.nombre), f.id]))
  const nuevas = nombres.filter((n) => !mapa.has(formaEtiqueta(n))).map((nombre) => ({ usuario_id: uid, tipo: 'gasto', nombre }))
  if (nuevas.length) {
    const { data, error: e } = await sb.from('fuentes').insert(nuevas).select('id, nombre')
    if (e) throw new ErrorDatos('No se han podido crear las plataformas nuevas.')
    for (const f of data ?? []) mapa.set(formaEtiqueta(f.nombre), f.id)
  }
  return (f) => (f.esInversion && f.plataforma ? mapa.get(formaEtiqueta(f.plataforma)) ?? null : null)
}

export const idImportacion = (desde, hasta, n) => Buffer.from(JSON.stringify({ d: desde, h: hasta, n })).toString('base64url')
const leerIdImportacion = (id) => {
  try {
    const o = JSON.parse(Buffer.from(String(id), 'base64url').toString('utf8'))
    if (o && typeof o.d === 'string' && typeof o.h === 'string' && Number.isInteger(o.n) && o.n > 0) return o
  } catch {
    /* no es un id válido */
  }
  throw new ErrorArgumentos('«id_importacion» no es válido: usa el que devolvió importar_movimientos.')
}

async function importarMovimientos(sb, uid, args) {
  const filasPlantilla = aFilasPlantilla(args.filas)
  const movs = await leerMovimientos(sb, uid)
  const claves = new Set(movs.map((m) => claveDuplicado({ fecha: m.fecha, tipo: m.tipo, importe: m.importe, nota: m.nota })))
  const t = tablaDesdeFilas([COLUMNAS_PLANTILLA, ...filasPlantilla])
  const r = procesarFilas(t.filas, detectarMapeo(t.cabeceras), claves, { inicio: t.inicio })
  // Sin categoría: la sugiere el mismo categorizador de la app (tu historial + diccionario).
  const validas = categorizarFilas(r.validas, crearCategorizador(movs)).map((f) => ({ ...f, esInversion: f.esInversion || f.categoria === CATEGORIA_INVERSION }))
  const errores = r.errores.map((e) => ({ fila: e.fila - 1, motivo: e.motivo }))
  const previa = {
    nuevos: validas.length,
    ya_estaban: r.duplicados.length,
    con_errores: errores.length,
    errores: errores.slice(0, 50),
    asi_lo_contara_palanca: desglose(validas),
    desde: validas.map((f) => f.fecha).sort()[0] ?? null,
    hasta: validas.map((f) => f.fecha).sort().at(-1) ?? null,
  }
  if (!args.confirmar || validas.length === 0) {
    const d = previa.asi_lo_contara_palanca
    return {
      texto:
        `VISTA PREVIA (no se ha guardado nada): ${validas.length} movimientos nuevos, ${r.duplicados.length} ya estaban, ${errores.length} con errores.\n` +
        `Gastos ${eur(d.gastos)} · ingresos ${eur(d.ingresos)} · invertido ${eur(d.invertido)} · ${d.traspasos} traspasos neutros.` +
        (validas.length ? '\nPara guardarlo, vuelve a llamar con confirmar=true si el usuario lo aprueba.' : ''),
      datos: { ...previa, guardado: false },
    }
  }
  const cats = await idsCategorias(sb, uid, validas)
  const fuenteDe = await idsFuentes(sb, uid, validas)
  const insertadas = []
  for (let i = 0; i < validas.length; i += 200) {
    const lote = validas.slice(i, i + 200).map((f) => ({
      usuario_id: uid,
      tipo: f.tipo,
      categoria_id: cats.de(f),
      fuente_id: fuenteDe(f),
      importe: f.importe,
      importe_centimos: Math.round(f.importe * 100),
      fecha: f.fecha,
      es_fijo: false,
      nota: f.nota || null,
    }))
    const { data, error } = await sb.from('movimientos').insert(lote).select('id, created_at')
    if (error) throw new ErrorDatos(`Error al guardar (se han guardado ${insertadas.length} de ${validas.length}). Si vuelves a importar lo mismo, no se duplicará.`)
    insertadas.push(...(data ?? []))
  }
  const tiempos = insertadas.map((x) => x.created_at).sort()
  const id = idImportacion(tiempos[0], tiempos.at(-1), insertadas.length)
  return {
    texto: `Guardados ${insertadas.length} movimientos.${cats.creadas.length ? ` Categorías nuevas: ${cats.creadas.join(', ')}.` : ''} Para deshacerlo: deshacer_importacion con id_importacion=${id}. Si el disponible no coincide con el banco, usa cuadrar_saldo.`,
    datos: { ...previa, guardado: true, guardados: insertadas.length, id_importacion: id, categorias_creadas: cats.creadas },
  }
}

async function deshacerImportacion(sb, uid, args) {
  const { d, h, n } = leerIdImportacion(args.id_importacion)
  const { data, error } = await sb.from('movimientos').select('id').eq('usuario_id', uid).gte('created_at', d).lte('created_at', h)
  if (error) throw new ErrorDatos('No se han podido leer tus movimientos.')
  if (data.length !== n) {
    return { texto: `No se deshace nada: esa importación tenía ${n} movimientos y ahora hay ${data.length} en ese momento (puede que ya se deshiciera o que se cambiaran).`, datos: { borrados: 0 }, error: true }
  }
  if (!args.confirmar) return { texto: `VISTA PREVIA: se borrarían ${n} movimientos de esa importación. Vuelve a llamar con confirmar=true si el usuario lo aprueba.`, datos: { borraria: n, guardado: false } }
  const ids = data.map((x) => x.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { error: e } = await sb.from('movimientos').delete().eq('usuario_id', uid).in('id', ids.slice(i, i + 200))
    if (e) throw new ErrorDatos('No se ha podido deshacer del todo. Vuelve a intentarlo.')
  }
  return { texto: `Importación deshecha: ${n} movimientos borrados.`, datos: { borrados: n } }
}

async function borrarMovimientos(sb, uid, args) {
  const ids = Array.isArray(args.ids) ? [...new Set(args.ids.map(String))].filter(esId) : []
  if (!ids.length || ids.length > 500) throw new ErrorArgumentos('«ids» debe tener entre 1 y 500 identificadores (los de listar_movimientos).')
  const { data, error } = await sb
    .from('movimientos')
    .select('id, tipo, importe, fecha, nota, categoria:categorias(nombre), fuente:fuentes(nombre)')
    .eq('usuario_id', uid)
    .in('id', ids)
  if (error) throw new ErrorDatos('No se han podido leer esos movimientos.')
  const lista = (data ?? []).map(vistaMovimiento)
  if (!args.confirmar) {
    return { texto: `VISTA PREVIA: se borrarían ${lista.length} movimientos${lista.length < ids.length ? ` (${ids.length - lista.length} no existen o no son tuyos)` : ''}. Vuelve a llamar con confirmar=true si el usuario lo aprueba.`, datos: { borraria: lista, guardado: false } }
  }
  const { error: e } = await sb.from('movimientos').delete().eq('usuario_id', uid).in('id', lista.map((m) => m.id))
  if (e) throw new ErrorDatos('No se han podido borrar.')
  return { texto: `Borrados ${lista.length} movimientos.`, datos: { borrados: lista.length } }
}

async function cuadrarSaldo(sb, uid, args) {
  const banco = Number(args.banco)
  const broker = args.broker === undefined || args.broker === null ? 0 : Number(args.broker)
  if (!Number.isFinite(banco) || !Number.isFinite(broker)) throw new ErrorArgumentos('«banco» y «broker» deben ser números en euros.')
  const fecha = args.fecha ? parseFecha(args.fecha) : HOY()
  if (!fecha || fecha > HOY()) throw new ErrorArgumentos('«fecha» no es válida (AAAA-MM-DD, hoy o antes).')
  const movs = await leerMovimientos(sb, uid)
  const calculado = Math.round(bolsas(movs, fecha).bolsaLiquidez * 100)
  const real = Math.round((banco + broker) * 100)
  const dif = real - calculado
  const base = { fecha, disponible_segun_palanca: calculado / 100, disponible_real: real / 100, ajuste: dif / 100 }
  if (dif === 0) return { texto: `Ya cuadra: Palanca calcula ${eur(real / 100)} a ${fecha}.`, datos: { ...base, guardado: false } }
  if (!args.confirmar) {
    return {
      texto: `VISTA PREVIA: Palanca calcula ${eur(calculado / 100)} disponibles a ${fecha} y tienes ${eur(real / 100)}. Se crearía un ajuste de saldo de ${dif > 0 ? '+' : '−'}${eur(Math.abs(dif) / 100)} (no cuenta como gasto ni ingreso). Vuelve a llamar con confirmar=true si el usuario lo aprueba.`,
      datos: { ...base, guardado: false },
    }
  }
  const tipo = dif > 0 ? 'ingreso' : 'gasto'
  let { data: cat } = await sb.from('categorias').select('id').eq('usuario_id', uid).eq('tipo', tipo).eq('nombre', CATEGORIA_AJUSTE).maybeSingle()
  if (!cat) {
    const r = await sb.from('categorias').insert({ usuario_id: uid, tipo, nombre: CATEGORIA_AJUSTE }).select('id').single()
    if (r.error) throw new ErrorDatos('No se ha podido crear la categoría de ajuste.')
    cat = r.data
  }
  const nota = `Ajuste de saldo al ${fecha.split('-').reverse().join('/')}: banco ${eur(banco)}${broker ? ` + efectivo en el bróker ${eur(broker)}` : ''}`
  const { error } = await sb.from('movimientos').insert({ usuario_id: uid, tipo, categoria_id: cat.id, fuente_id: null, importe: Math.abs(dif) / 100, importe_centimos: Math.abs(dif), fecha, es_fijo: false, nota })
  if (error) throw new ErrorDatos('No se ha podido guardar el ajuste.')
  return { texto: `Saldo cuadrado: ajuste de ${dif > 0 ? '+' : '−'}${eur(Math.abs(dif) / 100)} a ${fecha}.`, datos: { ...base, guardado: true } }
}

async function listarFijos(sb, uid) {
  const { data, error } = await sb.from('recurrentes').select('*').eq('usuario_id', uid)
  if (error) throw new ErrorDatos('No se han podido leer tus gastos fijos.')
  const fijos = (data ?? []).map((r) => {
    const cada = Number(r.periodo_meses) || 1
    const importe = Number(r.importe)
    return {
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      importe,
      cada_meses: cada,
      dia_del_mes: r.dia_mes ?? null,
      categoria: r.categoria_nombre ?? null,
      activo: r.activo !== false,
      coste_anual: Math.round((importe * 12) / cada * 100) / 100,
    }
  })
  const activos = fijos.filter((f) => f.activo && f.tipo === 'gasto')
  const anual = Math.round(activos.reduce((t, f) => t + f.coste_anual, 0) * 100) / 100
  return {
    texto: `${activos.length} gastos fijos activos: ${eur(anual)} al año (${eur(anual / 12)} al mes de media).`,
    datos: { fijos, gasto_fijo_anual: anual },
  }
}

async function editarMovimiento(sb, uid, args) {
  if (!args.id) throw new ErrorArgumentos('Falta «id» (el de listar_movimientos).')
  if (!esId(args.id)) return { texto: 'No existe ese movimiento (o no es tuyo): usa el id de listar_movimientos.', datos: { guardado: false }, error: true }
  const { data: actual, error } = await sb
    .from('movimientos')
    .select('id, tipo, importe, importe_centimos, fecha, nota, categoria_id, categoria:categorias(id, nombre), fuente:fuentes(id, nombre)')
    .eq('usuario_id', uid)
    .eq('id', String(args.id))
    .maybeSingle()
  if (error) throw new ErrorDatos('No se ha podido leer ese movimiento.')
  if (!actual) return { texto: 'No existe ese movimiento (o no es tuyo).', datos: { guardado: false }, error: true }
  const cambios = {}
  const antes = vistaMovimiento(actual)
  const despues = { ...antes }
  if (args.importe !== undefined) {
    const n = Number(args.importe)
    if (!(n > 0)) throw new ErrorArgumentos('«importe» debe ser un número positivo en euros.')
    cambios.importe = Math.round(n * 100) / 100
    cambios.importe_centimos = Math.round(n * 100)
    despues.importe = cambios.importe
  }
  if (args.fecha !== undefined) {
    const f = parseFecha(args.fecha)
    if (!f || f > HOY()) throw new ErrorArgumentos('«fecha» no es válida (hoy o antes).')
    cambios.fecha = f
    despues.fecha = f
  }
  if (args.concepto !== undefined) {
    cambios.nota = String(args.concepto).trim() || null
    despues.concepto = cambios.nota ?? ''
  }
  let categoriaNueva = null
  if (args.categoria !== undefined) {
    const nombre = String(args.categoria).trim()
    if (!nombre) throw new ErrorArgumentos('«categoria» no puede estar vacía.')
    if (esInversion(actual) || esRetiradaInversion(actual) || esAjuste(actual)) {
      throw new ErrorArgumentos('A las inversiones y a los ajustes de saldo no se les cambia la categoría: bórralo e impórtalo con el tipo correcto.')
    }
    if ([CATEGORIA_INVERSION, CATEGORIA_AJUSTE].some((c) => formaEtiqueta(c) === formaEtiqueta(nombre))) {
      throw new ErrorArgumentos('Para convertir algo en inversión o ajuste, bórralo e impórtalo con el tipo correcto.')
    }
    categoriaNueva = nombre
    despues.categoria = nombre
  }
  if (!Object.keys(cambios).length && !categoriaNueva) throw new ErrorArgumentos('No hay nada que cambiar: indica importe, fecha, concepto o categoría.')
  if (!args.confirmar) {
    return { texto: `VISTA PREVIA: ${JSON.stringify(antes)} → ${JSON.stringify(despues)}. Vuelve a llamar con confirmar=true si el usuario lo aprueba.`, datos: { antes, despues, guardado: false } }
  }
  if (categoriaNueva) {
    const { data: cats } = await sb.from('categorias').select('id, tipo, nombre').eq('usuario_id', uid).eq('tipo', actual.tipo)
    let cat = (cats ?? []).find((c) => formaEtiqueta(c.nombre) === formaEtiqueta(categoriaNueva))
    if (!cat) {
      const r = await sb.from('categorias').insert({ usuario_id: uid, tipo: actual.tipo, nombre: categoriaNueva }).select('id, nombre').single()
      if (r.error) throw new ErrorDatos('No se ha podido crear la categoría.')
      cat = r.data
    }
    cambios.categoria_id = cat.id
    despues.categoria = cat.nombre
  }
  const { error: e } = await sb.from('movimientos').update(cambios).eq('usuario_id', uid).eq('id', actual.id)
  if (e) throw new ErrorDatos('No se ha podido guardar el cambio.')
  return { texto: 'Movimiento actualizado.', datos: { antes, despues, guardado: true } }
}

const PERIODOS = [1, 2, 3, 6, 12]

async function categoriaPorNombre(sb, uid, tipo, nombre) {
  const { data } = await sb.from('categorias').select('id, tipo, nombre').eq('usuario_id', uid).eq('tipo', tipo)
  const cat = (data ?? []).find((c) => formaEtiqueta(c.nombre) === formaEtiqueta(nombre))
  if (cat) return cat
  const r = await sb.from('categorias').insert({ usuario_id: uid, tipo, nombre }).select('id, nombre').single()
  if (r.error) throw new ErrorDatos('No se ha podido crear la categoría.')
  return r.data
}

function validarFijo(args, parcial) {
  const f = {}
  if (args.nombre !== undefined) {
    f.nombre = String(args.nombre).trim()
    if (!f.nombre || f.nombre.length > 60) throw new ErrorArgumentos('«nombre» debe tener entre 1 y 60 caracteres.')
  } else if (!parcial) throw new ErrorArgumentos('Falta «nombre».')
  if (args.importe !== undefined) {
    const n = Number(args.importe)
    if (!(n > 0) || n > 100000) throw new ErrorArgumentos('«importe» debe ser positivo (en euros).')
    f.importe = Math.round(n * 100) / 100
    f.importe_centimos = Math.round(n * 100)
  } else if (!parcial) throw new ErrorArgumentos('Falta «importe».')
  if (args.dia_del_mes !== undefined) {
    const d = Number(args.dia_del_mes)
    if (!Number.isInteger(d) || d < 1 || d > 31) throw new ErrorArgumentos('«dia_del_mes» va de 1 a 31.')
    f.dia_mes = d
  }
  if (args.cada_meses !== undefined || !parcial) {
    const c = Number(args.cada_meses ?? 1)
    if (!PERIODOS.includes(c)) throw new ErrorArgumentos('«cada_meses» puede ser 1, 2, 3, 6 o 12.')
    f.periodo_meses = c
    const m = Number(args.mes_inicio ?? Number(HOY().slice(5, 7)))
    if (c > 1 && (!Number.isInteger(m) || m < 1 || m > 12)) throw new ErrorArgumentos('«mes_inicio» va de 1 a 12.')
    f.mes_inicio = c === 1 ? null : m
  }
  if (args.activo !== undefined) f.activo = Boolean(args.activo)
  return f
}

const textoFijo = (f) =>
  `${f.nombre}: ${eur(f.importe)} ${f.periodo_meses > 1 ? `cada ${f.periodo_meses} meses` : 'al mes'}${f.dia_mes ? ` (día ${f.dia_mes})` : ''}${f.activo === false ? ' · dado de baja' : ''}`

async function crearFijo(sb, uid, args) {
  const tipo = args.tipo === 'ingreso' ? 'ingreso' : 'gasto'
  const fila = { ...validarFijo(args, false), tipo, activo: true, confirmar: true }
  const { data: existentes } = await sb.from('recurrentes').select('id, nombre, activo').eq('usuario_id', uid)
  const repetido = (existentes ?? []).find((r) => r.activo !== false && formaEtiqueta(r.nombre) === formaEtiqueta(fila.nombre))
  const categoria = args.categoria ? String(args.categoria).trim() : null
  if (!args.confirmar) {
    return {
      texto: `VISTA PREVIA: nuevo ${tipo} fijo «${textoFijo(fila)}»${categoria ? ` en ${categoria}` : ''}.${repetido ? ` OJO: ya tienes un fijo llamado «${repetido.nombre}» (id ${repetido.id}); quizá quieras cambiar ese.` : ''} Vuelve a llamar con confirmar=true si el usuario lo aprueba.`,
      datos: { fijo: fila, ya_existe: repetido ?? null, guardado: false },
    }
  }
  if (categoria) {
    const cat = await categoriaPorNombre(sb, uid, tipo, categoria)
    fila.categoria_id = cat.id
    fila.categoria_nombre = cat.nombre
  }
  const { data, error } = await sb.from('recurrentes').insert({ usuario_id: uid, ...fila }).select('id').single()
  if (error) throw new ErrorDatos('No se ha podido guardar el gasto fijo.')
  return { texto: `Guardado: ${textoFijo(fila)}. Aparecerá en Fijos y en la previsión del mes.`, datos: { id: data.id, fijo: fila, guardado: true } }
}

async function cambiarFijo(sb, uid, args) {
  if (!esId(args.id)) return { texto: 'No existe ese gasto fijo: usa el id de listar_gastos_fijos.', datos: { guardado: false }, error: true }
  const { data: actual, error } = await sb.from('recurrentes').select('*').eq('usuario_id', uid).eq('id', String(args.id)).maybeSingle()
  if (error) throw new ErrorDatos('No se ha podido leer ese gasto fijo.')
  if (!actual) return { texto: 'No existe ese gasto fijo (o no es tuyo).', datos: { guardado: false }, error: true }
  const cambios = validarFijo({ ...args, ...(args.cada_meses === undefined && args.mes_inicio !== undefined ? { cada_meses: actual.periodo_meses ?? 1 } : {}) }, true)
  const categoria = args.categoria ? String(args.categoria).trim() : null
  if (!Object.keys(cambios).length && !categoria) throw new ErrorArgumentos('No hay nada que cambiar.')
  const antes = { ...actual, importe: Number(actual.importe) }
  const despues = { ...antes, ...cambios }
  if (!args.confirmar) {
    return {
      texto: `VISTA PREVIA: «${textoFijo(antes)}» → «${textoFijo(despues)}»${categoria ? ` en ${categoria}` : ''}. Vuelve a llamar con confirmar=true si el usuario lo aprueba.`,
      datos: { antes: textoFijo(antes), despues: textoFijo(despues), guardado: false },
    }
  }
  if (categoria) {
    const cat = await categoriaPorNombre(sb, uid, actual.tipo, categoria)
    cambios.categoria_id = cat.id
    cambios.categoria_nombre = cat.nombre
  }
  const { error: e } = await sb.from('recurrentes').update(cambios).eq('usuario_id', uid).eq('id', actual.id)
  if (e) throw new ErrorDatos('No se ha podido guardar el cambio.')
  return { texto: `Actualizado: ${textoFijo(despues)}.`, datos: { despues: textoFijo(despues), guardado: true } }
}

// ── Catálogo ────────────────────────────────────────────────────────────────
const FILA = {
  type: 'object',
  properties: {
    fecha: { type: 'string', description: 'Día real del movimiento: dd/mm/aaaa o AAAA-MM-DD. Nunca futura.' },
    tipo: { type: 'string', enum: TIPOS_PLANTILLA, description: 'Qué es: decide cómo cuenta en Palanca.' },
    concepto: { type: 'string', description: 'Texto corto y estable (comercio, «Nómina octubre», «Compra NVIDIA»…).' },
    categoria: { type: 'string', description: 'En Gasto, Ingreso y Devolución (p. ej. Comida, Restaurantes, Transporte, Nómina). Vacía en el resto: el tipo la fija.' },
    importe: { type: 'number', description: 'En euros, positivo. Compras con comisión incluida; ventas, lo recibido.' },
    plataforma: { type: 'string', description: 'Solo inversión y bróker (p. ej. «Trade Republic»).' },
    activo: { type: 'string', description: 'Solo inversión (p. ej. «NVIDIA»).' },
  },
  required: ['fecha', 'tipo', 'concepto', 'importe'],
}
const CONFIRMAR = { type: 'boolean', description: 'false (por defecto) = solo vista previa. true = hacerlo (solo tras el OK del usuario).' }

export const HERRAMIENTAS = [
  {
    name: 'resumen',
    title: 'Resumen de mis finanzas',
    description: 'Patrimonio (disponible + invertido a precio de compra), ingresos, gastos e invertido por mes y en qué se va el dinero este mes. Úsala para empezar cualquier análisis.',
    inputSchema: { type: 'object', properties: { meses: { type: 'integer', minimum: 1, maximum: 24, description: 'Cuántos meses (por defecto 6).' } } },
    annotations: { readOnlyHint: true },
    ejecutar: resumen,
  },
  {
    name: 'listar_movimientos',
    title: 'Ver mis movimientos',
    description: 'Movimientos del usuario, del más reciente al más antiguo, con filtros. Devuelve el id de cada uno (para borrar).',
    inputSchema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'AAAA-MM-DD' },
        hasta: { type: 'string', description: 'AAAA-MM-DD' },
        tipo: { type: 'string', enum: ['todos', 'gasto', 'ingreso', 'inversion'] },
        categoria: { type: 'string' },
        texto: { type: 'string', description: 'Busca en el concepto.' },
        limite: { type: 'integer', minimum: 1, maximum: 500 },
      },
    },
    annotations: { readOnlyHint: true },
    ejecutar: listarMovimientos,
  },
  {
    name: 'listar_categorias',
    title: 'Ver mis categorías',
    description: 'Las categorías de gasto e ingreso del usuario.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    ejecutar: listarCategorias,
  },
  {
    name: 'listar_gastos_fijos',
    title: 'Ver mis gastos fijos',
    description: 'Suscripciones, recibos e ingresos fijos que el usuario tiene en Palanca (Fijos), con su periodicidad y su coste anual.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    ejecutar: listarFijos,
  },
  {
    name: 'crear_gasto_fijo',
    title: 'Añadir un gasto fijo',
    description: 'Añade una suscripción, recibo o ingreso fijo a Fijos (p. ej. «Spotify, 10,99 € el día 4 de cada mes» o un seguro anual). Avisa si ya existe uno con ese nombre.',
    inputSchema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        importe: { type: 'number', description: 'Euros por cobro.' },
        tipo: { type: 'string', enum: ['gasto', 'ingreso'], description: 'Por defecto, gasto.' },
        dia_del_mes: { type: 'integer', minimum: 1, maximum: 31 },
        cada_meses: { type: 'integer', enum: [1, 2, 3, 6, 12], description: '1 = mensual (por defecto), 12 = anual.' },
        mes_inicio: { type: 'integer', minimum: 1, maximum: 12, description: 'Mes en que se cobra (si no es mensual).' },
        categoria: { type: 'string', description: 'Ej. Suscripciones, Seguros, Vivienda.' },
        confirmar: CONFIRMAR,
      },
      required: ['nombre', 'importe'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    ejecutar: crearFijo,
  },
  {
    name: 'cambiar_gasto_fijo',
    title: 'Cambiar o dar de baja un gasto fijo',
    description: 'Cambia el importe, el día, la periodicidad, el nombre o la categoría de un gasto fijo (id de listar_gastos_fijos), o lo da de baja con activo=false (se conserva su historial).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        nombre: { type: 'string' },
        importe: { type: 'number' },
        dia_del_mes: { type: 'integer', minimum: 1, maximum: 31 },
        cada_meses: { type: 'integer', enum: [1, 2, 3, 6, 12] },
        mes_inicio: { type: 'integer', minimum: 1, maximum: 12 },
        categoria: { type: 'string' },
        activo: { type: 'boolean', description: 'false = dar de baja.' },
        confirmar: CONFIRMAR,
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    ejecutar: cambiarFijo,
  },
  {
    name: 'editar_movimiento',
    title: 'Corregir un movimiento',
    description: 'Cambia el importe, la fecha, el concepto o la categoría de un movimiento (id de listar_movimientos). Sin confirmar enseña el antes y el después.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        importe: { type: 'number', description: 'Nuevo importe en euros (positivo).' },
        fecha: { type: 'string', description: 'AAAA-MM-DD o dd/mm/aaaa.' },
        concepto: { type: 'string' },
        categoria: { type: 'string', description: 'Nombre de la categoría (se crea si no existe).' },
        confirmar: CONFIRMAR,
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    ejecutar: editarMovimiento,
  },
  {
    name: 'importar_movimientos',
    title: 'Importar movimientos',
    description:
      'Añade movimientos (de un Excel, un extracto o lo que diga el usuario) con el formato de la plantilla de Palanca. Una fila por movimiento real, sin totales ni previsiones. ' +
      'Banco→bróker = «Aportación al bróker» (neutra); comprar acciones/ETF = «Compra inversión» (cuenta como invertido); vender = «Venta inversión»; ' +
      'intereses y dividendos = «Interés»/«Dividendo»; entre cuentas propias = «Traspaso a ahorro»/«Desde ahorro»; reembolsos = «Devolución». ' +
      'Lo que ya está (misma fecha, importe y concepto) no se duplica. Sin confirmar devuelve una vista previa.',
    inputSchema: { type: 'object', properties: { filas: { type: 'array', items: FILA, minItems: 1, maxItems: MAX_FILAS }, confirmar: CONFIRMAR }, required: ['filas'] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    ejecutar: importarMovimientos,
  },
  {
    name: 'cuadrar_saldo',
    title: 'Cuadrar mi saldo',
    description: 'Hace que el disponible de Palanca coincida con el dinero real (banco + efectivo en el bróker) en una fecha, con un ajuste de saldo visible que no cuenta como gasto ni ingreso.',
    inputSchema: {
      type: 'object',
      properties: {
        banco: { type: 'number', description: 'Euros en el banco ese día.' },
        broker: { type: 'number', description: 'Euros en efectivo (sin invertir) en el bróker ese día. Opcional.' },
        fecha: { type: 'string', description: 'AAAA-MM-DD (por defecto, hoy).' },
        confirmar: CONFIRMAR,
      },
      required: ['banco'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    ejecutar: cuadrarSaldo,
  },
  {
    name: 'deshacer_importacion',
    title: 'Deshacer una importación',
    description: 'Borra los movimientos de una importación hecha con importar_movimientos (con el id_importacion que devolvió).',
    inputSchema: { type: 'object', properties: { id_importacion: { type: 'string' }, confirmar: CONFIRMAR }, required: ['id_importacion'] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    ejecutar: deshacerImportacion,
  },
  {
    name: 'borrar_movimientos',
    title: 'Borrar movimientos',
    description: 'Borra movimientos concretos por id (los de listar_movimientos). Sin confirmar enseña cuáles se borrarían.',
    inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 500 }, confirmar: CONFIRMAR }, required: ['ids'] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    ejecutar: borrarMovimientos,
  },
]

const respuesta = (id, result) => ({ jsonrpc: '2.0', id, result })
const fallo = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

// Un mensaje JSON-RPC → respuesta (o null si es una notificación).
export async function manejarMensaje(msg, { sb, usuario }) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fallo(msg?.id, -32600, 'Petición no válida')
  const esNotificacion = msg.id === undefined || msg.id === null
  if (esNotificacion) return null
  const { id, method, params = {} } = msg
  switch (method) {
    case 'initialize': {
      const pedida = params.protocolVersion
      return respuesta(id, {
        protocolVersion: VERSIONES.includes(pedida) ? pedida : VERSIONES[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: INFO,
        instructions: INSTRUCCIONES,
      })
    }
    case 'ping':
      return respuesta(id, {})
    case 'tools/list':
      return respuesta(id, { tools: HERRAMIENTAS.map(({ ejecutar: _e, ...h }) => h) })
    case 'tools/call': {
      const h = HERRAMIENTAS.find((x) => x.name === params.name)
      if (!h) return fallo(id, -32602, `Herramienta desconocida: ${params.name}`)
      try {
        const r = await h.ejecutar(sb, usuario.id, params.arguments ?? {})
        return respuesta(id, { content: [{ type: 'text', text: r.texto }], structuredContent: r.datos, isError: Boolean(r.error) })
      } catch (e) {
        const mensaje = e instanceof ErrorArgumentos || e instanceof ErrorDatos ? e.message : 'Error inesperado en Palanca. Inténtalo de nuevo.'
        if (!(e instanceof ErrorArgumentos || e instanceof ErrorDatos)) console.error('mcp', params.name, e)
        return respuesta(id, { content: [{ type: 'text', text: mensaje }], isError: true })
      }
    }
    default:
      return fallo(id, -32601, `Método no soportado: ${method}`)
  }
}
