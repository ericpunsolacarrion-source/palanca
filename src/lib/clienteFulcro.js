// CLIENTA DE PRUEBA PARA FULCRO: Laura, 34 años, Valencia, consultora, ahorra
// para la entrada de un piso. Tres años de movimientos MUY regulares (mismos
// días, importes que varían poco y de forma determinista) para que cada
// respuesta de Fulcro se pueda comprobar a mano.
//
// Se importa en una cuenta de prueba con el CSV de Palanca
// (scripts/generar-cliente-fulcro.mjs) y las respuestas correctas se calculan
// en clienteFulcro.test.js. Sin dependencias: Node lo importa tal cual.

const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

// Pequeña variación determinista (mismo resultado siempre).
function variacion(semilla) {
  let s = semilla
  return (amplitud) => {
    s = (s * 1103515245 + 12345) % 2147483648
    return Math.round(((s / 2147483648) * 2 - 1) * amplitud * 100) / 100
  }
}

export const PERFIL_LAURA = {
  nombre: 'Laura',
  anioNacimiento: 1992,
  objetivo: 'Ahorrar 20.000 € para la entrada de un piso',
}

/**
 * Movimientos de Laura desde noviembre de 2023 hasta `hoy` (incluido).
 * Cada uno: { fecha, tipo, categoria, importe, concepto, cuenta }.
 */
export function movimientosLaura(hoy = new Date()) {
  const v = variacion(20231101)
  const hoyIso = iso(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate())
  const res = []
  const add = (fecha, tipo, categoria, importe, concepto, cuenta = '') => {
    if (fecha <= hoyIso) res.push({ fecha, tipo, categoria, importe: Math.round(importe * 100) / 100, concepto, cuenta })
  }

  add('2023-11-01', 'ingreso', 'Ajuste', 4500, 'Saldo inicial')

  let ahorroCuenta = 0 // para los intereses de la cuenta de ahorro
  for (let y = 2023, m = 11; y < hoy.getFullYear() || (y === hoy.getFullYear() && m <= hoy.getMonth() + 1); m === 12 ? ((y += 1), (m = 1)) : (m += 1)) {
    const d = (dia) => iso(y, m, Math.min(dia, new Date(y, m, 0).getDate())) // sin 29/02 en años que no lo tienen
    const nomina = y <= 2024 ? 2100 : y === 2025 ? 2250 : 2400
    const alquiler = y <= 2024 ? 850 : y === 2025 ? 875 : 900
    const despuesDe = (aa, mm) => y > aa || (y === aa && m >= mm)
    // Lo que no tiene día fijo (salir a cenar, la peluquería) se mueve unos días cada mes.
    const cerca = (dia) => d(Math.max(1, dia + Math.round(v(3))))

    // Ingresos
    add(d(28), 'ingreso', 'Nomina', nomina, 'NOMINA CONSULTORA LEVANTE SL')
    if (m === 6 || m === 12) add(d(20), 'ingreso', 'Nomina', nomina, 'PAGA EXTRA CONSULTORA LEVANTE SL')

    // Vivienda y recibos
    add(d(1), 'gasto', 'Vivienda', alquiler, 'TRANSFERENCIA ALQUILER PISO')
    add(d(5), 'gasto', 'Suministros', despuesDe(2025, 3) ? 59 : 55, 'RECIBO MOVISTAR FIBRA Y MOVIL')
    if (m % 2 === 0) add(d(12), 'gasto', 'Suministros', 70 + ([12, 1, 2].includes(m) ? 25 : [7, 8].includes(m) ? 15 : 0) + v(6), 'RECIBO IBERDROLA CLIENTES')
    if ([1, 4, 7, 10].includes(m)) add(d(15), 'gasto', 'Suministros', 36.5, 'RECIBO AGUA GLOBAL OMNIUM')

    // Suscripciones y deporte
    add(d(3), 'gasto', 'Deporte', 29.99, 'RECIBO BASIC-FIT SPAIN')
    add(d(8), 'gasto', 'Suscripciones', despuesDe(2025, 2) ? 13.99 : 12.99, 'NETFLIX.COM')
    add(d(10), 'gasto', 'Suscripciones', despuesDe(2025, 7) ? 11.99 : 10.99, 'SPOTIFY')
    add(d(14), 'gasto', 'Suscripciones', 2.99, 'APPLE.COM/BILL ICLOUD')
    if (m === 11) add(d(6), 'gasto', 'Suscripciones', 49.9, 'AMAZON PRIME CUOTA ANUAL')

    // Seguros anuales
    if (m === 3) add(d(18), 'gasto', 'Seguros', y === 2024 ? 410 : y === 2025 ? 432 : 455, 'RECIBO MAPFRE SEGURO COCHE')
    if (m === 9) add(d(20), 'gasto', 'Seguros', y === 2024 ? 160 : y === 2025 ? 165 : 172, 'RECIBO LINEA DIRECTA SEGURO HOGAR')

    // Día a día
    for (const dia of [4, 11, 18, 25]) add(d(dia), 'gasto', 'Comida', 58 + v(12), 'MERCADONA VALENCIA')
    for (const dia of [8, 22]) add(d(dia), 'gasto', 'Comida', 22 + v(6), 'LIDL')
    for (const dia of [7, 21]) add(d(dia), 'gasto', 'Transporte', 52 + v(6), 'REPSOL ESTACION DE SERVICIO')
    add(cerca(9), 'gasto', 'Restaurantes', 34 + v(6), 'LA TAGLIATELLA')
    add(cerca(16), 'gasto', 'Restaurantes', 18 + v(4), 'BAR EL RACO')
    add(cerca(26), 'gasto', 'Restaurantes', 22 + v(8), 'TELEPIZZA')
    add(cerca(13), 'gasto', 'Salud', 14 + v(4), 'FARMACIA RUZAFA')
    add(cerca(17), 'gasto', 'Cuidado personal', 18, 'PELUQUERIA MARTA')
    if (m % 2 === 1) add(cerca(24), 'gasto', 'Ocio', 16, 'CINES YELMO')
    add(cerca(19), 'gasto', 'Compras', 35 + v(20), 'AMAZON.ES')
    if (m % 2 === 1) add(cerca(15), 'gasto', 'Compras', 45 + v(15), 'ZARA')

    // Temporadas
    if (m === 7) add(d(5), 'gasto', 'Viajes', 180 + v(40), 'RYANAIR')
    if (m === 8) add(d(10), 'gasto', 'Viajes', 520 + v(120), 'BOOKING.COM')
    if (m === 12) add(d(15), 'gasto', 'Compras', 280 + v(70), 'EL CORTE INGLES REGALOS')
    if (m === 12) add(d(24), 'gasto', 'Restaurantes', 60, 'CENA NOCHEBUENA')
    if (m === 10 && y % 2 === 0) add(d(10), 'gasto', 'Transporte', y === 2024 ? 45 : 47, 'ITV')

    // Ahorro e inversión
    add(d(2), 'gasto', 'Inversion', despuesDe(2025, 1) ? 200 : 150, 'APORTACION FONDO INDEXADO', 'MyInvestor')
    add(d(29), 'gasto', 'Ahorro', 300, 'TRASPASO A CUENTA AHORRO')
    ahorroCuenta += 300
    if ([3, 6, 9, 12].includes(m)) {
      const intereses = Math.round(ahorroCuenta * 0.02 / 4 * 100) / 100
      add(d(30), 'ingreso', 'Intereses', intereses, 'INTERESES CUENTA AHORRO')
    }

    // Lo que pasa una vez
    if (y === 2025 && m === 1) add(d(23), 'ingreso', 'Devoluciones', 29.99, 'DEVOLUCION AMAZON.ES')
    if (y === 2025 && m === 8) {
      add(d(1), 'ingreso', 'Desde ahorro', 800, 'TRASPASO DESDE CUENTA AHORRO')
      ahorroCuenta -= 800
    }
    if (y === 2026 && m === 3) add(d(20), 'ingreso', 'Devoluciones', 39.95, 'DEVOLUCION ZARA')
    if (y === 2026 && m === 4) add(d(5), 'ingreso', 'Inversion', 1000, 'REEMBOLSO FONDO INDEXADO', 'MyInvestor')
  }
  return res.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
}

// CSV con el formato de Palanca ("Descargar mis datos"): se importa tal cual,
// con sus categorías, desde Movimientos → Importar → Extracto del banco.
export function csvLaura(movs) {
  const campo = (t) => (/[;"\n\r]/.test(t) ? `"${String(t).replace(/"/g, '""')}"` : String(t))
  const filas = movs.map((m) =>
    [m.fecha, m.tipo, m.categoria, (m.importe * (m.tipo === 'gasto' ? -1 : 1)).toFixed(2).replace('.', ','), m.concepto, m.cuenta].map(campo).join(';'),
  )
  return '﻿' + ['fecha;tipo;categoria;importe;concepto;cuenta', ...filas].join('\r\n') + '\r\n'
}
