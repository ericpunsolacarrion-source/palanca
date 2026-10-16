// BATERÍA DE PREGUNTAS A FULCRO con la clienta de prueba (clienteFulcro.js).
// Cada pregunta lleva su RESPUESTA CORRECTA, calculada directamente de los
// movimientos de Laura (no del motor de la app, para poder pillarlo si se
// equivoca). Las de criterio llevan lo que debe decir una buena respuesta.
// Sin dependencias: se usa en el test y en el informe para Eric.

const c = (x) => Math.round(x * 100)
const eur = (cent) => {
  const n = Math.round(cent) / 100
  const [e, d] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '−' : ''}${e.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${d === '00' ? '' : ',' + d} €`
}

const CONSUMO_NO = new Set(['Inversion', 'Ahorro', 'Ajuste'])
const DEV_CATEGORIA = { 'DEVOLUCION AMAZON.ES': 'Compras', 'DEVOLUCION ZARA': 'Compras' }
const esConsumo = (e) => e.tipo === 'gasto' && !CONSUMO_NO.has(e.categoria)
const esDev = (e) => e.tipo === 'ingreso' && e.categoria === 'Devoluciones'
const esIngreso = (e) => e.tipo === 'ingreso' && ['Nomina', 'Intereses'].includes(e.categoria)

export function crearCalculadora(evs, hoy) {
  const pad = (n) => String(n).padStart(2, '0')
  const hoyIso = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`
  const y = hoy.getFullYear()
  const m = hoy.getMonth() + 1
  const mesIso = (yy, mm) => {
    const d = new Date(yy, mm - 1, 1)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }
  const finMes = (yy, mm) => {
    const d = new Date(yy, mm, 0)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const P = {
    esteMes: [`${mesIso(y, m)}-01`, hoyIso],
    mesPasado: [`${mesIso(y, m - 1)}-01`, finMes(y, m - 1)],
    esteAnio: [`${y}-01-01`, hoyIso],
    anioPasado: [`${y - 1}-01-01`, `${y - 1}-12-31`],
    ult3: [`${mesIso(y, m - 3)}-01`, finMes(y, m - 1)],
    ult6: [`${mesIso(y, m - 6)}-01`, finMes(y, m - 1)],
    ult12: [`${mesIso(y, m - 12)}-01`, finMes(y, m - 1)],
    todo: ['0000-00-00', hoyIso],
    anio: (a) => [`${a}-01-01`, `${a}-12-31`],
    mes: (a, mm) => [`${a}-${pad(mm)}-01`, finMes(a, mm)],
  }
  const en = ([d, h]) => (e) => e.fecha >= d && e.fecha <= h && e.fecha <= hoyIso
  const suma = (xs) => xs.reduce((s, e) => s + c(e.importe), 0)
  const concepto = (re) => (e) => re.test(e.concepto)
  const categoria = (cat) => (e) => e.categoria === cat

  // Gasto neto de devoluciones (las devoluciones restan donde corresponden).
  const gasto = (per, filtro = () => true, filtroDev = filtro) =>
    suma(evs.filter((e) => esConsumo(e) && filtro(e) && en(per)(e))) - suma(evs.filter((e) => esDev(e) && filtroDev(e) && en(per)(e)))
  const gastoCat = (per, cat) => gasto(per, categoria(cat), (e) => DEV_CATEGORIA[e.concepto] === cat)
  const ingresos = (per) => suma(evs.filter((e) => esIngreso(e) && en(per)(e)))
  const ahorro = (per) => ingresos(per) - gasto(per)
  const invertidoNeto = (per) =>
    suma(evs.filter((e) => e.categoria === 'Inversion' && e.tipo === 'gasto' && en(per)(e))) -
    suma(evs.filter((e) => e.categoria === 'Inversion' && e.tipo === 'ingreso' && en(per)(e)))
  const aportado = (per) => suma(evs.filter((e) => e.categoria === 'Inversion' && e.tipo === 'gasto' && en(per)(e)))
  const n = (per, filtro) => evs.filter((e) => esConsumo(e) && filtro(e) && en(per)(e)).length

  // Patrimonio: lo que entra de fuera menos lo que sale (traspasos e inversión, neutros).
  const patrimonio = () =>
    suma(evs.filter((e) => e.tipo === 'ingreso' && !['Inversion', 'Desde ahorro'].includes(e.categoria) && e.fecha <= hoyIso)) -
    suma(evs.filter((e) => esConsumo(e) && e.fecha <= hoyIso))
  const bolsaInversion = () => Math.max(0, invertidoNeto(P.todo))
  const mesesConDatos = (per) => {
    const set = new Set(evs.filter((e) => en(per)(e)).map((e) => e.fecha.slice(0, 7)))
    return set.size
  }
  const ahorroPorMes = (per) => {
    const meses = [...new Set(evs.filter((e) => en(per)(e)).map((e) => e.fecha.slice(0, 7)))].sort()
    return meses.map((k) => {
      const pm = [`${k}-01`, finMes(Number(k.slice(0, 4)), Number(k.slice(5, 7)))]
      return { mes: k, ahorro: ahorro(pm), ingresos: ingresos(pm), gasto: gasto(pm) }
    })
  }
  return { P, gasto, gastoCat, ingresos, ahorro, invertidoNeto, aportado, patrimonio, bolsaInversion, n, concepto, categoria, mesesConDatos, ahorroPorMes, eur, hoyIso }
}

/**
 * Preguntas: { n, bloque, pregunta, esperado(calc) → texto con la cifra correcta,
 *              cifra(calc) → céntimos que DEBE aparecer (para el test), criterio }
 */
export const PREGUNTAS = [
  // A. Cuánto he gastado
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto he gastado este mes?', cifra: (k) => k.gasto(k.P.esteMes) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto gasté el mes pasado?', cifra: (k) => k.gasto(k.P.mesPasado) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto llevo gastado este año?', cifra: (k) => k.gasto(k.P.esteAnio) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto gasté el año pasado?', cifra: (k) => k.gasto(k.P.anioPasado) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto gasté en 2024?', cifra: (k) => k.gasto(k.P.anio(2024)) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto he gastado en los últimos 3 meses?', cifra: (k) => k.gasto(k.P.ult3) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto he gastado en los últimos 6 meses?', cifra: (k) => k.gasto(k.P.ult6) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto gasté en marzo de 2024?', cifra: (k) => k.gasto(k.P.mes(2024, 3)) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto gasté en agosto?', cifra: (k) => k.gasto(k.P.mes(2026, 8)) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto he gastado desde que uso la app?', cifra: (k) => k.gasto(k.P.todo) },
  { bloque: 'Gasto por periodo', pregunta: '¿Cuánto gasto al mes de media?', criterio: (k) => `Media mensual de gasto de los últimos 12 meses completos ≈ ${k.eur(k.gasto(k.P.ult12) / 12)} (o la de los 3 últimos: ${k.eur(k.gasto(k.P.ult3) / 3)}). Debe decir de qué periodo es la media.` },

  // B. Por categoría
  { bloque: 'Por categoría', pregunta: '¿Cuánto gasto en comida?', cifra: (k) => Math.round(k.gastoCat(k.P.ult3, 'Comida') / 3), nota: 'Sin periodo = media mensual de los 3 últimos meses completos.' },
  { bloque: 'Por categoría', pregunta: '¿Cuánto he gastado en restaurantes este año?', cifra: (k) => k.gastoCat(k.P.esteAnio, 'Restaurantes') },
  { bloque: 'Por categoría', pregunta: '¿Cuánto gasté en ropa y compras el año pasado?', cifra: (k) => k.gastoCat(k.P.anioPasado, 'Compras'), nota: 'Compras (Amazon, Zara, regalos) ya descontada la devolución de Amazon. Zara ya está dentro de Compras.' },
  { bloque: 'Por categoría', pregunta: '¿Cuánto me gasto en transporte al mes?', cifra: (k) => Math.round(k.gastoCat(k.P.ult3, 'Transporte') / 3), nota: 'Media de los 3 últimos meses completos.' },
  { bloque: 'Por categoría', pregunta: '¿Cuánto pago de suministros este año?', cifra: (k) => k.gastoCat(k.P.esteAnio, 'Suministros') },
  { bloque: 'Por categoría', pregunta: '¿Cuánto me he gastado en viajes en 2025?', cifra: (k) => k.gastoCat(k.P.anio(2025), 'Viajes') },
  { bloque: 'Por categoría', pregunta: '¿En qué gasto más?', criterio: (k) => `Este mes, por categorías: Vivienda (alquiler ${k.eur(90000)}) muy por delante; después Comida y Restaurantes. Debe dar cifras y % del total.` },
  { bloque: 'Por categoría', pregunta: '¿En qué se me fue el dinero el mes pasado?', criterio: (k) => `Desglose de ${k.P.mesPasado[0].slice(0, 7)}: gasto total ${k.eur(k.gasto(k.P.mesPasado))}; Vivienda primero, después Comida, Seguros (hogar en septiembre) y Restaurantes.` },

  // C. Por comercio
  { bloque: 'Por comercio', pregunta: '¿Cuánto he gastado en Mercadona este año?', cifra: (k) => k.gasto(k.P.esteAnio, k.concepto(/MERCADONA/)) },
  { bloque: 'Por comercio', pregunta: '¿Cuánto he pagado de Netflix hasta ahora?', cifra: (k) => k.gasto(k.P.todo, k.concepto(/NETFLIX/)) },
  { bloque: 'Por comercio', pregunta: '¿Cuánto he pagado de Spotify este año?', cifra: (k) => k.gasto(k.P.esteAnio, k.concepto(/SPOTIFY/)) },
  { bloque: 'Por comercio', pregunta: '¿Cuánto he gastado en gasolina los últimos 3 meses?', cifra: (k) => k.gasto(k.P.ult3, k.concepto(/REPSOL/)) },
  { bloque: 'Por comercio', pregunta: '¿Cuánto gasto en gasolina?', cifra: (k) => Math.round(k.gasto(k.P.ult3, k.concepto(/REPSOL/)) / 3), nota: 'Media de los 3 últimos meses completos.' },
  { bloque: 'Por comercio', pregunta: '¿Cuánto me ha costado el gimnasio este año?', cifra: (k) => k.gasto(k.P.esteAnio, k.concepto(/BASIC-FIT/)) },
  { bloque: 'Por comercio', pregunta: '¿Cuánto he gastado en Amazon el año pasado?', cifra: (k) => k.gasto(k.P.anioPasado, k.concepto(/AMAZON/)), nota: 'Compras + Prime − la devolución de 29,99 €.' },
  { bloque: 'Por comercio', pregunta: '¿Cuánto pago de luz?', cifra: (k) => Math.round(k.gasto(k.P.ult12, k.concepto(/IBERDROLA/)) / 12), nota: 'La luz es bimestral: media de los últimos 12 meses y cuánto es cada recibo.' },
  { bloque: 'Por comercio', pregunta: '¿Cuánto me cuesta el seguro del coche?', criterio: () => 'Mapfre, anual: 410 € (2024) → 432 € (2025) → 455 € (2026). Ideal: decir el último importe y que ha subido cada año (+11 %).' },
  { bloque: 'Por comercio', pregunta: '¿Cuánto me gasto en La Tagliatella?', cifra: (k) => Math.round(k.gasto(k.P.ult3, k.concepto(/TAGLIATELLA/)) / 3), nota: 'Media de los 3 últimos meses.' },
  { bloque: 'Por comercio', pregunta: '¿Cuánto he gastado en Ikea?', criterio: () => 'No hay ningún gasto en Ikea: debe decirlo sin inventarse nada.' },
  { bloque: 'Por comercio', pregunta: '¿Cuándo pagué el gimnasio por última vez?', criterio: (k) => `Último cargo de Basic-Fit: día 3 de este mes, 29,99 €.` },

  // D. Ingresos y ahorro
  { bloque: 'Ingresos y ahorro', pregunta: '¿Cuánto he ingresado este año?', cifra: (k) => k.ingresos(k.P.esteAnio) },
  { bloque: 'Ingresos y ahorro', pregunta: '¿Cuánto ingresé el año pasado?', cifra: (k) => k.ingresos(k.P.anioPasado) },
  { bloque: 'Ingresos y ahorro', pregunta: '¿Cuánto he ahorrado este año?', cifra: (k) => k.ahorro(k.P.esteAnio) },
  { bloque: 'Ingresos y ahorro', pregunta: '¿Cuánto ahorré el año pasado?', cifra: (k) => k.ahorro(k.P.anioPasado) },
  { bloque: 'Ingresos y ahorro', pregunta: '¿Cuánto he ahorrado este mes?', criterio: (k) => `La nómina llega el día 28: a día de hoy no ha entrado. Debe decirlo y dar el mes pasado: ahorro ${k.eur(k.ahorro(k.P.mesPasado))} (${Math.round((k.ahorro(k.P.mesPasado) / k.ingresos(k.P.mesPasado)) * 100)} %).` },
  { bloque: 'Ingresos y ahorro', pregunta: '¿Cuál es mi tasa de ahorro?', criterio: (k) => `Últimos 12 meses: ${Math.round((k.ahorro(k.P.ult12) / k.ingresos(k.P.ult12)) * 100)} % de lo que ingresa (${k.eur(k.ahorro(k.P.ult12))} de ${k.eur(k.ingresos(k.P.ult12))}).` },
  { bloque: 'Ingresos y ahorro', pregunta: '¿Qué mes ahorré más?', criterio: (k) => {
    const meses = k.ahorroPorMes(k.P.todo).filter((x) => x.ingresos > 0)
    const mejor = meses.reduce((a, x) => (x.ahorro > a.ahorro ? x : a), meses[0])
    return `El mes con más ahorro: ${mejor.mes} (${k.eur(mejor.ahorro)}), por la paga extra.`
  } },
  { bloque: 'Ingresos y ahorro', pregunta: '¿Cuánto me han subido el sueldo?', criterio: () => 'Nómina: 2.100 € (2024) → 2.250 € (2025, +7,1 %) → 2.400 € (2026, +6,7 %). Más pagas extra en junio y diciembre.' },
  { bloque: 'Ingresos y ahorro', pregunta: '¿Cuánto tengo en la cuenta de ahorro?', criterio: () => 'Traspasos de 300 €/mes menos los 800 € que sacó en agosto de 2025, más intereses. Palanca los cuenta dentro de tu disponible: debería explicarlo, sin inventar un saldo.' },

  // E. Comparativas y tendencias
  { bloque: 'Comparativas', pregunta: '¿Gasto más que el año pasado?', criterio: (k) => `Enero–${k.hoyIso.slice(5, 7)} de este año ${k.eur(k.gasto(k.P.esteAnio))} frente al mismo periodo del año pasado. Sube sobre todo por el alquiler (875 → 900 €) y los seguros. Debe comparar periodos iguales.` },
  { bloque: 'Comparativas', pregunta: '¿En qué categoría he aumentado más el gasto?', criterio: () => 'Vivienda (alquiler 850 → 875 → 900 €) y Seguros (Mapfre 410 → 432 → 455 €). Suscripciones también sube (Netflix y Spotify).' },
  { bloque: 'Comparativas', pregunta: '¿Este mes voy mejor o peor que el anterior?', criterio: () => 'Debe comparar a la misma altura del mes (hasta el día 15) y no el mes completo contra medio mes.' },
  { bloque: 'Comparativas', pregunta: '¿Qué suscripciones me han subido de precio?', criterio: () => 'Netflix 12,99 → 13,99 € (feb 2025), Spotify 10,99 → 11,99 € (jul 2025), Movistar 55 → 59 € (mar 2025). Y los seguros anuales.' },
  { bloque: 'Comparativas', pregunta: '¿Cuál ha sido mi mes más caro?', criterio: () => 'Un agosto (viaje: Booking 520 €) o un diciembre (regalos 280 € + Nochebuena 60 €), según el año. Debe dar la cifra.' },

  // F. Fijos y suscripciones (tras añadir los detectados en Fijos)
  { bloque: 'Fijos y suscripciones', pregunta: '¿Cuánto pago en suscripciones al mes?', criterio: () => 'Netflix 13,99 + Spotify 11,99 + iCloud 2,99 = 28,97 €/mes (más Amazon Prime anual 49,90 €, ≈ 4,16 €/mes). Requiere haber añadido los fijos.' },
  { bloque: 'Fijos y suscripciones', pregunta: '¿Cuánto pago en gastos fijos al mes?', criterio: () => 'Alquiler 900 + Movistar 59 + gimnasio 29,99 + suscripciones + luz y agua prorrateadas + seguros prorrateados (455/12 + 172/12). ≈ 1.110–1.130 €/mes.' },
  { bloque: 'Fijos y suscripciones', pregunta: '¿Cuándo me cobran el seguro del coche?', criterio: () => 'En marzo (día 18). Si el fijo no está creado, debe decir que lo añada en Fijos.' },
  { bloque: 'Fijos y suscripciones', pregunta: '¿Qué suscripción podría quitar?', criterio: () => 'Debe razonar con lo que paga (Netflix, Spotify, iCloud, Prime, gimnasio) sin decidir por ella; preguntar cuál usa menos.' },

  // G. Inversión y patrimonio
  { bloque: 'Inversión y patrimonio', pregunta: '¿Cuánto he invertido este año?', cifra: (k) => k.aportado(k.P.esteAnio), nota: 'Y debe decir que ha retirado 1.000 € (neto: aportado − 1.000 €).' },
  { bloque: 'Inversión y patrimonio', pregunta: '¿Cuánto tengo invertido en total?', criterio: (k) => `Aportado neto (a coste): ${k.eur(k.bolsaInversion())}. Sin rentabilidad: Palanca no conoce el valor de mercado.` },
  { bloque: 'Inversión y patrimonio', pregunta: '¿Cuánto dinero tengo?', criterio: (k) => `Patrimonio: ${k.eur(k.patrimonio())} (disponible + invertido, a coste).` },
  { bloque: 'Inversión y patrimonio', pregunta: '¿Cuánto ha crecido mi patrimonio este año?', criterio: (k) => `Lo ahorrado en ${k.hoyIso.slice(0, 4)}: ${k.eur(k.ahorro(k.P.esteAnio))} (más intereses, ya incluidos). La retirada del fondo no suma.` },

  // H. Previsión y planes
  { bloque: 'Previsión', pregunta: '¿Llegaré a fin de mes?', criterio: () => 'Sí: la nómina llega el 28 y lo gastado a mitad de mes está en su media. Debe tener en cuenta que el ingreso aún no ha llegado.' },
  { bloque: 'Previsión', pregunta: '¿Cuánto puedo gastar al día hasta fin de mes?', criterio: () => 'Depende del presupuesto. Si no tiene, debe proponer uno o usar su ahorro objetivo; cifra por día clara.' },
  { bloque: 'Previsión', pregunta: '¿Cuándo llegaré a 20.000 € para la entrada del piso?', criterio: (k) => `Con lo que tiene (${k.eur(k.patrimonio())}) y su ahorro medio de ${k.eur(k.ahorro(k.P.ult12) / 12)}/mes: fecha aproximada. Debe decir el supuesto.` },
  { bloque: 'Previsión', pregunta: '¿Me puedo permitir un viaje de 1.500 € en diciembre?', criterio: () => 'Sí, con números: su ahorro mensual y su colchón lo cubren; recordar que diciembre ya trae regalos y la paga extra.' },
  { bloque: 'Previsión', pregunta: '¿Cuánto tendré ahorrado a final de año?', criterio: () => 'Lo de ahora + ahorro medio × meses que quedan + paga extra de diciembre − gastos de diciembre habituales.' },

  // I. Consejo
  { bloque: 'Consejo', pregunta: '¿Cómo puedo ahorrar más?', criterio: () => 'Con SUS datos: restaurantes (~75 €/mes), compras en Amazon/Zara, subida del seguro del coche (negociar en febrero), suscripciones. Concreto y con cifras, no genérico.' },
  { bloque: 'Consejo', pregunta: '¿Estoy ahorrando suficiente?', criterio: (k) => `Su tasa (${Math.round((k.ahorro(k.P.ult12) / k.ingresos(k.P.ult12)) * 100)} %) es alta; la referencia habitual es 20 %. Debe conectar con su objetivo del piso.` },
  { bloque: 'Consejo', pregunta: '¿Debería invertir más?', criterio: () => 'Educativo, sin recomendar productos: fondo de emergencia primero (3–6 meses de gasto), horizonte del piso (corto plazo → menos riesgo).' },
  { bloque: 'Consejo', pregunta: '¿Tengo un buen fondo de emergencia?', criterio: (k) => `Gasto medio ~${k.eur(k.gasto(k.P.ult12) / 12)}/mes → 3–6 meses = ${k.eur((k.gasto(k.P.ult12) / 12) * 3)}–${k.eur((k.gasto(k.P.ult12) / 12) * 6)}. Comparar con su disponible.` },
  { bloque: 'Consejo', pregunta: '¿Me compensa renegociar el seguro del coche?', criterio: () => 'Sí: ha subido de 410 a 455 € en dos años (+11 %). Mejor momento: 30–45 días antes de la renovación (febrero). Remitir al plan de ahorro de Fijos.' },
  { bloque: 'Consejo', pregunta: '¿Gasto mucho en restaurantes?', criterio: (k) => `≈ ${k.eur(k.gastoCat(k.P.ult3, 'Restaurantes') / 3)}/mes, ${Math.round((k.gastoCat(k.P.ult3, 'Restaurantes') / k.gasto(k.P.ult3)) * 100)} % de su gasto: moderado. No juzgar; dar contexto.` },

  // J. Cómo escribe la gente de verdad
  { bloque: 'Escritura real', pregunta: 'cuanto gaste en mercadoma este mes', cifra: (k) => k.gasto(k.P.esteMes, k.concepto(/MERCADONA/)), nota: 'Con errata ("mercadoma").' },
  { bloque: 'Escritura real', pregunta: 'gasolina ultimos 3 meses', cifra: (k) => k.gasto(k.P.ult3, k.concepto(/REPSOL/)) },
  { bloque: 'Escritura real', pregunta: 'CUANTO ME GASTO EN NETFLIX', criterio: () => '13,99 €/mes. En mayúsculas y sin signos.' },
  { bloque: 'Escritura real', pregunta: '¿y en comida?', criterio: () => 'Seguimiento de la pregunta anterior: debe entender el periodo de la pregunta previa.' },
  { bloque: 'Escritura real', pregunta: 'spotify', criterio: () => 'Una sola palabra: debería dar lo que paga (11,99 €/mes) o preguntar qué quiere saber.' },
  { bloque: 'Escritura real', pregunta: '¿Cuánto me he gastado en el super este mes?', cifra: (k) => k.gasto(k.P.esteMes, k.concepto(/MERCADONA|LIDL/)) },

  // K. Límites
  { bloque: 'Límites', pregunta: '¿En qué acciones invierto?', criterio: () => 'No debe recomendar valores concretos: orientación educativa y remitir a un asesor.' },
  { bloque: 'Límites', pregunta: '¿Qué tiempo hará mañana?', criterio: () => 'Fuera de tema: decirlo con amabilidad y volver a sus finanzas.' },
  { bloque: 'Límites', pregunta: 'Dame mi número de cuenta', criterio: () => 'Fulcro no ve datos bancarios: decirlo.' },
].map((p, i) => ({ ...p, n: i + 1 }))
