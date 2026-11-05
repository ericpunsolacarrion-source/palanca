// CLIENTE SIMULADO COMPLETO: 3 años de una persona que usa Palanca al 100 %.
// Sirve para revisar la app llena de verdad (Tu cuenta → «Ver la app con datos
// de ejemplo» y la demo avanzada), sin tocar nada guardado: vive SOLO en
// memoria y sus ids empiezan por "demo-" (esDemo bloquea editar o borrar).
//
// Quién es: Lucía, 31 años, Madrid. Nómina con dos subidas y pagas extra,
// algún trabajo freelance, alquiler, coche, suscripciones (que cambian con el
// tiempo), viajes en verano, compras con devoluciones, traspasos a su cuenta
// de ahorro, inversión en cuatro plataformas (con una retirada) y cuadres con
// el banco cada pocos meses. Además, presupuesto y objetivos configurados.
//
// Fechas relativas a hoy y sin futuros. Pseudoaleatorio con semilla: los
// mismos datos en cada visita.

import { aCentimos } from './importe'
import { AVISO_DEMO, PREFIJO_DEMO } from './datosDemo'

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function aleatorio(semilla) {
  let s = semilla
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export const CATEGORIAS_CLIENTE = {
  Nomina: 'ingreso',
  Freelance: 'ingreso',
  'Otros ingresos': 'ingreso',
  Devoluciones: 'ingreso',
  'Desde ahorro': 'ingreso',
  Ajuste: 'ingreso',
  Vivienda: 'gasto',
  Comida: 'gasto',
  Restaurantes: 'gasto',
  Transporte: 'gasto',
  Suscripciones: 'gasto',
  Compras: 'gasto',
  Salud: 'gasto',
  Ocio: 'gasto',
  Viajes: 'gasto',
  Impuestos: 'gasto',
  Ahorro: 'gasto',
  Inversion: 'gasto',
}

const MESES = 36

export function generarClienteCompleto(hoy = new Date()) {
  const azar = aleatorio(20231105)
  const hoyIso = iso(hoy)
  const movimientos = []
  let n = 0
  const mov = (tipo, cat, importe, fecha, nota, fuente = null, hora = 12) => {
    if (fecha > hoyIso || importe <= 0) return
    n += 1
    movimientos.push({
      id: `${PREFIJO_DEMO}c${n}`,
      tipo,
      importe,
      importe_centimos: aCentimos(importe),
      fecha,
      nota,
      created_at: `${fecha}T${pad(hora)}:00:00Z`,
      fuente_id: fuente ? `${PREFIJO_DEMO}f-${fuente}` : null,
      categoria_id: `${PREFIJO_DEMO}c-${cat}`,
      es_fijo: false,
      categoria: { id: `${PREFIJO_DEMO}c-${cat}`, nombre: cat },
      fuente: fuente ? { id: `${PREFIJO_DEMO}f-${fuente}`, nombre: fuente } : null,
    })
  }
  const dia = (y, m, d) => iso(new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate())))
  const imp = (base, var_) => Math.round((base + (azar() - 0.5) * 2 * var_) * 100) / 100
  const unDe = (lista) => lista[Math.floor(azar() * lista.length)]
  const diaAzar = (desde = 1, hasta = 28) => desde + Math.floor(azar() * (hasta - desde + 1))

  const hoyDia = hoy.getDate()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES - 1), 1)
  mov('ingreso', 'Ajuste', 4200, iso(inicio), 'Saldo inicial')

  for (let k = MESES - 1; k >= 0; k -= 1) {
    const y = hoy.getFullYear()
    const m = hoy.getMonth() - k
    const mes = ((m % 12) + 12) % 12 // 0 = enero
    const ano = Math.floor((MESES - 1 - k) / 12) // 0, 1, 2
    const d = (x) => dia(y, m, x)

    // ── Ingresos ──
    const nomina = [2150, 2310, 2540][ano]
    mov('ingreso', 'Nomina', nomina, d(1), 'Nómina Deale Consulting')
    if (mes === 5 || mes === 11) mov('ingreso', 'Nomina', nomina, d(20), 'Paga extra')
    if (azar() < 0.3) mov('ingreso', 'Freelance', imp(420, 180), d(diaAzar(10, 26)), 'Proyecto freelance')
    if (mes === 5 && ano > 0) mov('ingreso', 'Otros ingresos', imp(310, 90), d(24), 'Devolución AEAT renta')
    if (mes === 2 && ano === 1) mov('ingreso', 'Otros ingresos', 180, d(12), 'Wallapop venta bici')
    if (azar() < 0.35) mov('ingreso', 'Otros ingresos', imp(25, 15), d(diaAzar()), 'Bizum de Marta (cena)')

    // ── Inversión y ahorro (el día 2, nada más cobrar) ──
    mov('gasto', 'Inversion', ano === 0 ? 250 : 300, d(2), 'Fondo indexado MSCI', 'MyInvestor')
    if (ano >= 1) mov('gasto', 'Inversion', ano === 1 ? 100 : 150, d(3), 'Plan de inversión ETF', 'Trade Republic')
    if (ano <= 1) mov('gasto', 'Inversion', 50, d(15), 'Compra bitcoin', 'Coinbase')
    if (mes === 11) mov('gasto', 'Inversion', 1000, d(22), 'Aportación plan de pensiones', 'Indexa Capital')
    mov('gasto', 'Ahorro', ano === 2 ? 250 : 200, d(2), 'Traspaso a cuenta de ahorro')

    // ── Vivienda ──
    mov('gasto', 'Vivienda', [850, 890, 920][ano], d(3), 'Alquiler piso')
    if (mes % 2 === 0) mov('gasto', 'Vivienda', imp(mes < 3 || mes > 9 ? 92 : 64, 12), d(18), 'Iberdrola')
    if (mes <= 2 || mes >= 10) mov('gasto', 'Vivienda', imp(48, 14), d(12), 'Naturgy gas')
    if (mes % 3 === 1) mov('gasto', 'Vivienda', imp(38, 6), d(9), 'Canal de Isabel II')
    mov('gasto', 'Vivienda', ano === 0 ? 30 : 35, d(7), 'Digi fibra y móvil')
    if (azar() < 0.18) mov('gasto', 'Vivienda', imp(85, 50), d(diaAzar()), unDe(['IKEA', 'Leroy Merlin']))

    // ── Comida ──
    for (const x of [5, 12, 19, 26]) mov('gasto', 'Comida', imp(64, 20), d(x + Math.floor(azar() * 2)), 'Mercadona')
    mov('gasto', 'Comida', imp(28, 10), d(diaAzar(8, 16)), 'Lidl')
    if (azar() < 0.6) mov('gasto', 'Comida', imp(42, 15), d(diaAzar(17, 27)), 'Carrefour')
    if (azar() < 0.4) mov('gasto', 'Comida', imp(18, 6), d(diaAzar()), 'Fruteria Paqui')

    // ── Restaurantes ──
    const salidas = 2 + Math.floor(azar() * 3)
    for (let i = 0; i < salidas; i += 1) mov('gasto', 'Restaurantes', imp(34, 16), d(diaAzar()), unDe(['La Tagliatella', 'Goiko', 'Vips', 'Restaurante Casa Lucio', 'Honest Greens']))
    const pedidos = 1 + Math.floor(azar() * 3)
    for (let i = 0; i < pedidos; i += 1) mov('gasto', 'Restaurantes', imp(21, 7), d(diaAzar()), unDe(['Glovo', 'Just Eat', 'Uber Eats']))
    if (azar() < 0.7) mov('gasto', 'Restaurantes', imp(9, 4), d(diaAzar()), 'Starbucks')

    // ── Transporte ──
    mov('gasto', 'Transporte', 20, d(1), 'Abono transporte Madrid')
    mov('gasto', 'Transporte', imp(58, 9), d(diaAzar(4, 12)), unDe(['Repsol', 'Cepsa']))
    mov('gasto', 'Transporte', imp(55, 9), d(diaAzar(18, 27)), unDe(['Repsol', 'Galp', 'BP']))
    if (azar() < 0.5) mov('gasto', 'Transporte', imp(14, 6), d(diaAzar()), unDe(['Cabify', 'Uber']))
    if (azar() < 0.25) mov('gasto', 'Transporte', imp(46, 18), d(diaAzar()), 'Renfe')
    if (mes === 9) mov('gasto', 'Transporte', 360 + ano * 14, d(14), 'Línea Directa seguro coche')
    if (mes === 3 && ano === 1) mov('gasto', 'Transporte', 43.5, d(10), 'ITV')
    if (mes === 7 && ano === 1) mov('gasto', 'Impuestos', 100, d(6), 'Multa DGT')
    if (mes === 1 && ano === 2) mov('gasto', 'Transporte', imp(280, 40), d(16), 'Taller Midas revisión')

    // ── Suscripciones (cambian con los años) ──
    mov('gasto', 'Suscripciones', ano === 0 ? 12.99 : ano === 1 ? 13.99 : 14.99, d(8), 'Netflix')
    if (k > 0) mov('gasto', 'Suscripciones', ano === 0 ? 10.99 : 11.99, d(hoyDia), 'Spotify')
    if (ano === 0) mov('gasto', 'Suscripciones', 9.99, d(15), 'HBO Max')
    if (ano >= 1) mov('gasto', 'Suscripciones', 9.99, d(15), 'Disney+')
    if (ano >= 1) mov('gasto', 'Suscripciones', 22.99, d(20), 'ChatGPT Plus')
    if (ano === 2) mov('gasto', 'Suscripciones', 21.78, d(21), 'Claude Pro')
    mov('gasto', 'Suscripciones', 2.99, d(4), 'iCloud+')
    if (mes === 2) mov('gasto', 'Suscripciones', 49.9, d(6), 'Amazon Prime')

    // ── Salud ──
    mov('gasto', 'Salud', [48, 52, 56][ano], d(5), 'Sanitas')
    if (azar() < 0.5) mov('gasto', 'Salud', imp(16, 9), d(diaAzar()), 'Farmacia')
    if (azar() < 0.12) mov('gasto', 'Salud', imp(70, 20), d(diaAzar()), 'Quirónsalud')

    // ── Ocio ──
    mov('gasto', 'Ocio', ano === 0 ? 24.99 : 29.99, d(6), 'Basic-Fit')
    if (azar() < 0.5) mov('gasto', 'Ocio', imp(19, 6), d(diaAzar()), unDe(['Yelmo Cines', 'Cinesa']))
    if (azar() < 0.2) mov('gasto', 'Ocio', imp(65, 25), d(diaAzar()), 'Ticketmaster')
    if (azar() < 0.15) mov('gasto', 'Ocio', imp(30, 15), d(diaAzar()), 'Steam')

    // ── Compras (con alguna devolución) ──
    const compras = 1 + Math.floor(azar() * 3)
    for (let i = 0; i < compras; i += 1) {
      const tienda = unDe(['Amazon', 'Zara', 'Mango', 'Decathlon', 'Primark', 'El Corte Inglés', 'Vinted', 'MediaMarkt'])
      const precio = imp(tienda === 'MediaMarkt' ? 120 : tienda === 'El Corte Inglés' ? 75 : 42, 20)
      const fecha = d(diaAzar(1, 22))
      mov('gasto', 'Compras', precio, fecha, tienda)
      if (['Zara', 'Amazon', 'Mango'].includes(tienda) && azar() < 0.25) {
        mov('ingreso', 'Devoluciones', Math.round(precio * 0.6 * 100) / 100, d(Number(fecha.slice(8)) + 5), `Devolución ${tienda}`)
      }
    }
    if (mes === 10) mov('gasto', 'Compras', imp(160, 40), d(28), 'Amazon Black Friday')
    if (mes === 11) for (const t of ['El Corte Inglés', 'Zara', 'Amazon']) mov('gasto', 'Compras', imp(70, 30), d(diaAzar(10, 23)), `${t} regalos`)

    // ── Viajes (verano, puente y Navidad) ──
    if (mes === 6) {
      mov('gasto', 'Viajes', imp(190, 50), d(4), unDe(['Ryanair', 'Vueling', 'Iberia']))
      mov('gasto', 'Viajes', imp(420, 90), d(5), unDe(['Booking', 'Airbnb']))
    }
    if (mes === 7) for (let i = 0; i < 5; i += 1) mov('gasto', 'Viajes', imp(38, 18), d(diaAzar(8, 18)), 'Restaurante vacaciones')
    if (mes === 11) mov('gasto', 'Viajes', imp(86, 20), d(21), 'Renfe AVE Navidad')
    if (mes === 3 && ano === 2) {
      mov('gasto', 'Viajes', 612, d(2), 'Iberia vuelos Lisboa')
      mov('gasto', 'Viajes', 340, d(3), 'Booking Lisboa')
      mov('ingreso', 'Desde ahorro', 600, d(2), 'Traigo de la cuenta de ahorro')
    }
    if (mes === 0) mov('gasto', 'Ocio', imp(120, 40), d(diaAzar(7, 20)), 'Rebajas Zara')

    // ── Impuestos ──
    if (mes === 5 && ano === 0) mov('gasto', 'Impuestos', 186.4, d(24), 'AEAT renta a pagar')
    if (mes === 3) mov('gasto', 'Impuestos', 78.5, d(15), 'Ayuntamiento impuesto circulación')

    // ── Cuadres con el banco cada ~5 meses ──
    if (k % 5 === 3) {
      const dif = imp(0, 35)
      mov(dif >= 0 ? 'ingreso' : 'gasto', 'Ajuste', Math.abs(dif), d(27), 'Cuadre con el banco', null, 20)
    }
  }

  // Retirada de cripto (año 2): vende parte de lo de Coinbase con ganancia.
  const retirada = new Date(hoy.getFullYear(), hoy.getMonth() - 16, 10)
  mov('ingreso', 'Inversion', 300, iso(retirada), 'Venta bitcoin', 'Coinbase')

  // Último cuadre hace 9 días: el disponible sale «Cuadrado hace 9 días».
  const cuadre = new Date(hoy.getFullYear(), hoy.getMonth(), hoyDia - 9)
  mov('gasto', 'Ajuste', 17.4, iso(cuadre), 'Cuadre con el banco', null, 21)

  movimientos.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))

  // ── Compromisos fijos (forma de useRecurrentes) ──
  const mesActual = hoyIso.slice(0, 7)
  const mesesCon = (nota) => [...new Set(movimientos.filter((x) => x.nota === nota).map((x) => x.fecha.slice(0, 7)))]
  const rec = (id, datos) => {
    const meses = datos.mesesAplicados ?? mesesCon(datos.nota ?? datos.nombre)
    return {
      id: `${PREFIJO_DEMO}r-${id}`,
      tipo: 'gasto',
      categoriaId: `${PREFIJO_DEMO}c-${datos.categoriaNombre}`,
      fuenteId: null,
      periodoMeses: 1,
      mesInicio: null,
      confirmar: false,
      activo: true,
      desde: `${iso(inicio)}T12:00:00Z`,
      mesesAplicados: meses,
      totalCentimos: meses.length * aCentimos(datos.importe),
      aplicadoEn: meses.includes(mesActual) ? mesActual : null,
      ...datos,
    }
  }
  const renovacion = new Date(hoy.getFullYear(), hoy.getMonth(), hoyDia + 10)
  const recurrentes = [
    rec('nomina', { tipo: 'ingreso', nombre: 'Nómina', nota: 'Nómina Deale Consulting', importe: 2540, categoriaNombre: 'Nomina', diaMes: 1, confirmar: true }),
    rec('alquiler', { nombre: 'Alquiler', nota: 'Alquiler piso', importe: 920, categoriaNombre: 'Vivienda', diaMes: 3 }),
    rec('ahorro', { nombre: 'Traspaso a ahorro', nota: 'Traspaso a cuenta de ahorro', importe: 250, categoriaNombre: 'Ahorro', diaMes: 2 }),
    rec('myinvestor', { nombre: 'MyInvestor', nota: 'Fondo indexado MSCI', importe: 300, categoriaNombre: 'Inversion', fuenteId: `${PREFIJO_DEMO}f-MyInvestor`, diaMes: 2 }),
    rec('traderepublic', { nombre: 'Trade Republic', nota: 'Plan de inversión ETF', importe: 150, categoriaNombre: 'Inversion', fuenteId: `${PREFIJO_DEMO}f-Trade Republic`, diaMes: 3 }),
    rec('digi', { nombre: 'Digi', nota: 'Digi fibra y móvil', importe: 35, categoriaNombre: 'Vivienda', diaMes: 7 }),
    rec('abono', { nombre: 'Abono transporte', nota: 'Abono transporte Madrid', importe: 20, categoriaNombre: 'Transporte', diaMes: 1 }),
    rec('icloud', { nombre: 'iCloud+', importe: 2.99, categoriaNombre: 'Suscripciones', diaMes: 4 }),
    rec('sanitas', { nombre: 'Sanitas', importe: 56, categoriaNombre: 'Salud', diaMes: 5 }),
    rec('basicfit', { nombre: 'Basic-Fit', importe: 29.99, categoriaNombre: 'Ocio', diaMes: 6 }),
    rec('netflix', { nombre: 'Netflix', importe: 14.99, categoriaNombre: 'Suscripciones', diaMes: 8 }),
    // Spotify se cobra hoy y aún no está apuntado: enseña «Hoy se cobra…».
    rec('spotify', { nombre: 'Spotify', importe: 11.99, categoriaNombre: 'Suscripciones', diaMes: hoyDia }),
    rec('disney', { nombre: 'Disney+', importe: 9.99, categoriaNombre: 'Suscripciones', diaMes: 15 }),
    rec('chatgpt', { nombre: 'ChatGPT Plus', importe: 22.99, categoriaNombre: 'Suscripciones', diaMes: 20 }),
    rec('claude', { nombre: 'Claude Pro', importe: 21.78, categoriaNombre: 'Suscripciones', diaMes: 21 }),
    rec('iberdrola', { nombre: 'Iberdrola', importe: 78, categoriaNombre: 'Vivienda', diaMes: 18, periodoMeses: 2, mesInicio: 1, confirmar: true }),
    rec('agua', { nombre: 'Canal de Isabel II', importe: 38, categoriaNombre: 'Vivienda', diaMes: 9, periodoMeses: 3, mesInicio: 2, confirmar: true }),
    rec('prime', { nombre: 'Amazon Prime', importe: 49.9, categoriaNombre: 'Suscripciones', diaMes: 6, periodoMeses: 12, mesInicio: 3 }),
    rec('pensiones', { nombre: 'Plan de pensiones', nota: 'Aportación plan de pensiones', importe: 1000, categoriaNombre: 'Inversion', fuenteId: `${PREFIJO_DEMO}f-Indexa Capital`, diaMes: 22, periodoMeses: 12, mesInicio: 12 }),
    // Renovación anual dentro de 10 días: enseña el aviso de renovación.
    rec('mapfre', {
      nombre: 'Mapfre seguro hogar',
      importe: 142.6,
      categoriaNombre: 'Vivienda',
      diaMes: renovacion.getDate(),
      periodoMeses: 12,
      mesInicio: renovacion.getMonth() + 1,
      mesesAplicados: [],
    }),
    rec('lineadirecta', { nombre: 'Línea Directa seguro coche', importe: 388, categoriaNombre: 'Transporte', diaMes: 14, periodoMeses: 12, mesInicio: 10 }),
    // Dada de baja hace dos años: se ve como inactiva.
    rec('hbo', { nombre: 'HBO Max', importe: 9.99, categoriaNombre: 'Suscripciones', diaMes: 15, activo: false }),
  ]

  return { movimientos, recurrentes, categorias: CATEGORIAS_CLIENTE }
}

// Presupuesto del cliente (misma forma que usePresupuesto). Guardar no hace
// nada: se avisa con AVISO_DEMO.
export function presupuestoCliente(avisar) {
  const bloqueado = async () => {
    avisar?.(AVISO_DEMO)
    return false
  }
  return {
    metodo: 'tasa',
    tasaAhorroObjetivo: 25,
    gastoMaximoFijo: null,
    objetivoInversionMensual: 450,
    configurado: true,
    cargando: false,
    guardarPresupuesto: bloqueado,
    guardarObjetivoInversion: bloqueado,
  }
}

// Objetivos de ahorro del cliente (misma forma que useObjetivosAhorro).
export function objetivosCliente(avisar, hoy = new Date()) {
  const bloqueado = async () => {
    avisar?.(AVISO_DEMO)
    return null
  }
  const fecha = (meses) => iso(new Date(hoy.getFullYear(), hoy.getMonth() + meses, 1))
  const hace = (meses) => `${iso(new Date(hoy.getFullYear(), hoy.getMonth() - meses, 1))}T12:00:00Z`
  const obj = (id, nombre, tipo, objetivo, actual, plazo, creado) => ({
    id: `${PREFIJO_DEMO}o-${id}`,
    nombre,
    tipo,
    importe_objetivo: objetivo,
    importe_objetivo_centimos: aCentimos(objetivo),
    importe_actual: actual,
    importe_actual_centimos: aCentimos(actual),
    fecha_objetivo: plazo == null ? null : fecha(plazo),
    created_at: hace(creado),
  })
  return {
    objetivos: [
      // El progreso lo pone la app: cada objetivo sigue una bolsa entera.
      obj('colchon', 'Colchón de emergencia (6 meses)', 'liquidez', 12000, 0, null, 34),
      obj('cartera', 'Cartera de 25.000 € invertidos', 'inversion', 25000, 0, 30, 20),
      obj('piso', 'Entrada del piso + gastos', 'patrimonio', 45000, 0, 36, 26),
    ],
    cargando: false,
    tablaFalta: false,
    crear: bloqueado,
    actualizar: bloqueado,
    eliminar: bloqueado,
  }
}
