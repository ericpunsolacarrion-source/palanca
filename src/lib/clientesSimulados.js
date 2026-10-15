// Clientes simulados para probar el motor de punta a punta (solo tests).
// Cada cliente tiene un año de vida financiera REAL (la "verdad": qué es cada
// cosa) y el extracto que le daría SU banco, con el formato y los textos que
// usa ese banco. Así se puede comprobar que, tras importar, la app dice
// exactamente lo que pasó.

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Generador determinista (mismo cliente → mismos datos en cada ejecución).
function azar(semilla) {
  let s = semilla
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
}

// clase: consumo · ingreso · devolucion · al_ahorro · del_ahorro · aportacion · retirada
// cat: la categoría que esperamos que Palanca le ponga.
const ev = (fecha, importe, texto, clase, cat, comercio) => ({ fecha, importe: Math.round(importe * 100) / 100, texto, clase, cat, comercio })

/**
 * Vida de un cliente durante `meses` meses hasta `hoy`. Devuelve los eventos
 * reales en orden de fecha (importe > 0; el signo lo da la clase).
 */
export function vidaDe(perfil, hoy = new Date(), meses = 12) {
  const r = azar(perfil.semilla)
  const entre = (a, b) => a + r() * (b - a)
  const evs = []
  for (let k = meses - 1; k >= 0; k -= 1) {
    const y = hoy.getFullYear()
    const m = hoy.getMonth() - k
    const dia = (d) => new Date(y, m, Math.min(d, 28))
    const pasado = (d) => d <= hoy
    const add = (d, ...resto) => {
      if (pasado(d)) evs.push(ev(iso(d), ...resto))
    }
    const t = perfil.textos
    add(dia(perfil.diaNomina), perfil.nomina, t.nomina, 'ingreso', 'Nomina', 'Nómina')
    add(dia(1), perfil.alquiler, t.alquiler, 'consumo', 'Vivienda', 'Alquiler')
    add(dia(3), 13.99, t.netflix, 'consumo', 'Suscripciones', 'Netflix')
    add(dia(5), 10.99, t.spotify, 'consumo', 'Suscripciones', 'Spotify')
    add(dia(6), 39.9, t.gimnasio, 'consumo', 'Deporte', 'Basic-Fit')
    add(dia(8), Math.round(entre(38, 72) * 100) / 100, t.luz, 'consumo', 'Suministros', 'Iberdrola')
    add(dia(10), 45, t.movil, 'consumo', 'Suministros', 'Movistar')
    // Súper semanal (el texto cambia según la tienda/terminal: ALIPAM23, ALIPAM77…)
    for (const d of [2, 9, 16, 23]) add(dia(d), entre(25, 95), t.super(Math.floor(r() * 90) + 10), 'consumo', 'Comida', 'Mercadona')
    for (const d of [4, 18]) add(dia(d), entre(40, 65), t.gasolina, 'consumo', 'Transporte', 'Repsol')
    add(dia(1 + Math.floor(r() * 27)), entre(15, 60), t.bar, 'consumo', 'Restaurantes', 'Bar Paco')
    add(dia(1 + Math.floor(r() * 27)), entre(18, 120), t.amazon, 'consumo', 'Compras', 'Amazon')
    add(dia(25), perfil.alAhorro, t.alAhorro, 'al_ahorro', 'Ahorro', 'Ahorro')
    add(dia(26), perfil.aportacion, t.aportacion, 'aportacion', 'Inversion', 'MyInvestor')
    // Cosas que pasan de vez en cuando
    if (k === 7) add(dia(21), 32.5, t.devolucion, 'devolucion', 'Devoluciones', 'Amazon')
    if (k === 4) add(dia(14), 600, t.delAhorro, 'del_ahorro', 'Desde ahorro', 'Ahorro')
    if (k === 2) add(dia(15), 1000, t.retirada, 'retirada', 'Inversion', 'MyInvestor')
    if (k === 3) add(dia(22), 386.4, t.seguro, 'consumo', 'Seguros', 'Mapfre')
  }
  return evs.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
}

const SALE = new Set(['consumo', 'al_ahorro', 'aportacion'])
export const signo = (e) => (SALE.has(e.clase) ? -1 : 1)

// Lo que la app DEBERÍA decir de esa vida (reglas de CLAUDE.md y MOTOR.md).
export function verdadDe(evs) {
  const c = (x) => Math.round(x * 100)
  let ingresos = 0
  let gastos = 0
  let invertido = 0
  let patrimonio = 0
  let bolsa = 0 // bolsa de inversión a coste
  for (const e of evs) {
    const v = c(e.importe)
    if (e.clase === 'ingreso') (ingresos += v), (patrimonio += v)
    if (e.clase === 'consumo') (gastos += v), (patrimonio -= v)
    if (e.clase === 'devolucion') (gastos -= v), (patrimonio += v)
    if (e.clase === 'aportacion') (invertido += v), (bolsa += v)
    if (e.clase === 'retirada') {
      invertido -= v
      // Sacar más de lo aportado (que conste) es dinero que entra al patrimonio.
      patrimonio += Math.max(0, v - bolsa)
      bolsa = Math.max(0, bolsa - v)
    }
  }
  return { ingresos: ingresos / 100, gastos: gastos / 100, ahorro: (ingresos - gastos) / 100, invertido: invertido / 100, patrimonio: patrimonio / 100, bolsaInversion: bolsa / 100 }
}

const fmtES = (n) => n.toFixed(2).replace('.', ',')
const fmtMilesES = (n) => {
  const [e, d] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '-' : ''}${e.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d}`
}
const ddmmyyyy = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`

// ── Formatos de exportación de cada banco (cabeceras y textos reales) ──────
export const BANCOS = {
  bbva: {
    textos: {
      nomina: 'NOMINA TRANSFERENCIA DE TALLERES GARCIA SL', alquiler: 'TRANSFERENCIA A FAVOR DE ANTONIO LOPEZ ALQUILER',
      netflix: 'PAGO CON TARJETA EN NETFLIX.COM', spotify: 'PAGO CON TARJETA EN SPOTIFY P1E2B', gimnasio: 'RECIBO BASIC-FIT SPAIN SAU',
      luz: 'RECIBO IBERDROLA CLIENTES SAU', movil: 'RECIBO TELEFONICA DE ESPANA SAU', super: (n) => `PAGO CON TARJETA EN MERCADONA ${n} VALENCIA`,
      gasolina: 'PAGO CON TARJETA EN E.S. REPSOL CAMPANAR', bar: 'PAGO CON TARJETA EN BAR PACO', amazon: 'PAGO CON TARJETA EN AMZN Mktp ES',
      alAhorro: 'TRASPASO A CUENTA AHORRO', aportacion: 'TRANSFERENCIA A MYINVESTOR FONDO INDEXADO', devolucion: 'DEVOLUCION COMPRA AMZN Mktp ES',
      delAhorro: 'TRASPASO DESDE CUENTA AHORRO', retirada: 'TRANSFERENCIA DE MYINVESTOR REEMBOLSO FONDO', seguro: 'RECIBO MAPFRE ESPAÑA SEGURO AUTO',
    },
    extracto(evs) {
      let saldo = 3200
      const filas = evs.map((e) => {
        const imp = signo(e) * e.importe
        saldo += imp
        return [ddmmyyyy(e.fecha), ddmmyyyy(e.fecha), e.texto, e.texto.split(' ').slice(0, 3).join(' '), fmtES(imp), 'EUR', fmtMilesES(saldo), 'EUR', '']
      })
      return ['Últimos movimientos;;;;;;;;', 'Cuenta;ES12 0182 **** **** 1234;;;;;;;', ';;;;;;;;', 'F.Valor;Fecha;Concepto;Movimiento;Importe;Divisa;Disponible;Divisa;Observaciones', ...filas.map((f) => f.join(';'))].join('\r\n')
    },
  },
  santander: {
    textos: {
      nomina: 'TRANSFERENCIA NOMINA EMPRESA SL', alquiler: 'TRANSF. ALQUILER PISO', netflix: 'COMPRA TARJ. 5402XXXXXXXX1234 NETFLIX.COM',
      spotify: 'COMPRA TARJ. 5402XXXXXXXX1234 SPOTIFY', gimnasio: 'RECIBO BASIC FIT', luz: 'RECIBO IBERDROLA', movil: 'RECIBO MOVISTAR',
      super: (n) => `COMPRA TARJ. 5402XXXXXXXX1234 ALIPAM${n}`, gasolina: 'COMPRA TARJ. 5402XXXXXXXX1234 REPSOL', bar: 'COMPRA TARJ. 5402XXXXXXXX1234 BAR PACO',
      amazon: 'COMPRA TARJ. 5402XXXXXXXX1234 AMAZON.ES', alAhorro: 'TRASPASO A CUENTA AHORRO 1234', aportacion: 'TRANSFERENCIA A INDEXA CAPITAL',
      devolucion: 'DEVOLUCION COMPRA AMAZON.ES', delAhorro: 'TRASPASO DE CUENTA AHORRO 1234', retirada: 'TRANSFERENCIA DE INDEXA CAPITAL REEMBOLSO', seguro: 'RECIBO MAPFRE SEGUROS',
    },
    extracto(evs) {
      let saldo = 1500
      const filas = evs.map((e) => {
        const imp = signo(e) * e.importe
        saldo += imp
        return [ddmmyyyy(e.fecha), ddmmyyyy(e.fecha), `"${e.texto}"`, `${fmtMilesES(imp)} EUR`, `${fmtMilesES(saldo)} EUR`]
      })
      return ['Movimientos de cuenta', 'Fecha Operación;Fecha Valor;Concepto;Importe;Saldo', ...filas.map((f) => f.join(';'))].join('\n')
    },
  },
  caixabank: {
    textos: {
      nomina: 'NOMINA', alquiler: 'TRANSFERENCIA ALQUILER', netflix: 'NETFLIX.COM', spotify: 'SPOTIFY', gimnasio: 'BASIC FIT', luz: 'IBERDROLA CLIENTES',
      movil: 'MOVISTAR', super: (n) => `MERCADONA ${n}`, gasolina: 'E.S. REPSOL', bar: 'BAR PACO', amazon: 'AMAZON MARKETPLACE', alAhorro: 'TRASPASO PROPIO',
      aportacion: 'TRANSF MYINVESTOR', devolucion: 'DEVOLUCION AMAZON MARKETPLACE', delAhorro: 'TRASPASO PROPIO', retirada: 'TRANSF DE MYINVESTOR', seguro: 'MAPFRE',
    },
    extracto(evs) {
      // CaixaBank separa cargo y abono en dos columnas (Debe/Haber), sin signo.
      const filas = evs.map((e) => [e.texto, ddmmyyyy(e.fecha), ddmmyyyy(e.fecha), signo(e) < 0 ? fmtES(e.importe) : '', signo(e) > 0 ? fmtES(e.importe) : ''])
      return ['Concepto;Fecha;Fecha valor;Cargo;Abono', ...filas.map((f) => f.join(';'))].join('\n')
    },
  },
  ing: {
    textos: {
      nomina: 'Nómina recibida Consultora SL', alquiler: 'Transferencia emitida Alquiler', netflix: 'Pago en NETFLIX.COM', spotify: 'Pago en Spotify',
      gimnasio: 'Recibo Basic-Fit', luz: 'Recibo Iberdrola', movil: 'Recibo Movistar', super: (n) => `Pago en MERCADONA ${n}`, gasolina: 'Pago en REPSOL',
      bar: 'Pago en Bar Paco', amazon: 'Pago en AMAZON', alAhorro: 'Traspaso a Cuenta NARANJA', aportacion: 'Transferencia emitida a MyInvestor',
      devolucion: 'Devolución Pago en AMAZON', delAhorro: 'Traspaso desde Cuenta NARANJA', retirada: 'Transferencia recibida de MyInvestor', seguro: 'Recibo Mapfre',
    },
    // ING trae SU categoría ("Alimentación", "Compras"…), distinta de la nuestra.
    catBanco: { Comida: 'Alimentación', Restaurantes: 'Ocio y viajes', Transporte: 'Vehículo y transporte', Compras: 'Compras', Suministros: 'Recibos', Suscripciones: 'Ocio y viajes', Deporte: 'Salud y bienestar', Vivienda: 'Hogar', Nomina: 'Nómina', Ahorro: 'Movimientos excluidos', Inversion: 'Inversiones', Devoluciones: 'Compras', Seguros: 'Seguros' },
    extracto(evs) {
      let saldo = 5000
      const filas = evs.map((e) => {
        const imp = signo(e) * e.importe
        saldo += imp
        return [ddmmyyyy(e.fecha), BANCOS.ing.catBanco[e.cat] ?? 'Otros', '', e.texto, '', '', fmtES(imp), fmtES(saldo)]
      })
      return ['Número de cuenta:,ES00 1465 ****', ',', 'F. VALOR;CATEGORÍA;SUBCATEGORÍA;DESCRIPCIÓN;COMENTARIO;IMAGEN;IMPORTE (€);SALDO (€)', ...filas.map((f) => f.join(';'))].join('\n')
    },
  },
  revolut: {
    textos: {
      nomina: 'Payment from Empresa SL', alquiler: 'To Antonio Lopez', netflix: 'Netflix', spotify: 'Spotify', gimnasio: 'Basic-Fit', luz: 'Iberdrola',
      movil: 'Movistar', super: () => 'Mercadona', gasolina: 'Repsol', bar: 'Bar Paco', amazon: 'Amazon', alAhorro: 'To EUR Savings', aportacion: 'To MyInvestor',
      devolucion: 'Refund from Amazon', delAhorro: 'From EUR Savings', retirada: 'Payment from MyInvestor', seguro: 'Mapfre',
    },
    extracto(evs) {
      // Revolut: CSV en inglés, comas, fechas con hora, punto decimal, tipo propio y estado.
      const tipo = (e) => (e.clase === 'consumo' ? 'CARD_PAYMENT' : e.clase === 'devolucion' ? 'CARD_REFUND' : /savings/i.test(e.texto) ? 'TRANSFER' : signo(e) > 0 ? 'TOPUP' : 'TRANSFER')
      const filas = evs.map((e, i) => [tipo(e), 'Current', `${e.fecha} 10:${pad(i % 60)}:00`, `${e.fecha} 12:00:00`, e.texto, (signo(e) * e.importe).toFixed(2), '0.00', 'EUR', 'COMPLETED', '0'])
      // Un pago rechazado y revertido: NO es un movimiento.
      filas.push(['CARD_PAYMENT', 'Current', `${evs[3].fecha} 11:00:00`, '', 'Zara', '-59.95', '0.00', 'EUR', 'REVERTED', ''])
      return ['Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance', ...filas.map((f) => f.join(','))].join('\n')
    },
  },
}

export const PERFILES = [
  { id: 'lucia', banco: 'bbva', semilla: 11, nomina: 1850, diaNomina: 28, alquiler: 650, alAhorro: 200, aportacion: 150 },
  { id: 'marcos', banco: 'santander', semilla: 22, nomina: 2400, diaNomina: 1, alquiler: 900, alAhorro: 300, aportacion: 250 },
  { id: 'carmen', banco: 'caixabank', semilla: 33, nomina: 1420.55, diaNomina: 5, alquiler: 520, alAhorro: 100, aportacion: 50 },
  { id: 'jordi', banco: 'ing', semilla: 44, nomina: 3100, diaNomina: 27, alquiler: 1100, alAhorro: 500, aportacion: 400 },
  { id: 'ana', banco: 'revolut', semilla: 55, nomina: 2050, diaNomina: 30, alquiler: 780, alAhorro: 150, aportacion: 100 },
]

export function clienteSimulado(perfil, hoy = new Date()) {
  const banco = BANCOS[perfil.banco]
  const evs = vidaDe({ ...perfil, textos: banco.textos }, hoy)
  return { perfil, evs, verdad: verdadDe(evs), extracto: banco.extracto(evs) }
}
