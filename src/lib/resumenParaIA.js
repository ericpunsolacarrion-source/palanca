import { esInversion } from './categorias'
import {
  agregarPorMes,
  claveMesActual,
  estimacionGastoMensual,
  filtrarMesActual,
  resumenMensualMedio,
  totalesDe,
} from './movimientosUtils'

// Construye un resumen ESTRUCTURADO y compacto de la situación financiera del
// usuario para dárselo como contexto al consultor IA. No se envían movimientos
// en bruto: solo agregados calculados con las reglas únicas de la app.
export function construirResumenIA(movimientos, { objetivos = [], objetivo } = {}) {
  const mes = filtrarMesActual(movimientos)
  const tMes = totalesDe(mes)
  const { ahorroMedio } = resumenMensualMedio(movimientos)
  const { estimacion: gastoEstimado, mesesUsados } = estimacionGastoMensual(movimientos)

  // Gasto por categoría del mes (solo consumo).
  const porCategoria = {}
  for (const m of mes) {
    if (m.tipo !== 'gasto' || esInversion(m)) continue
    const nombre = m.categoria?.nombre ?? 'Sin categoría'
    porCategoria[nombre] = (porCategoria[nombre] ?? 0) + Number(m.importe)
  }

  // Evolución de los últimos 6 meses (ahorro y gasto por mes).
  const evolucion = agregarPorMes(movimientos, 6).map((x) => ({
    mes: x.clave,
    ingresos: Math.round(x.ingresos),
    gastos: Math.round(x.gastos),
    ahorro: Math.round(x.ahorro),
    invertido: Math.round(x.invertido),
  }))

  const invertidoTotal = movimientos.reduce(
    (s, m) => s + (m.tipo === 'gasto' && esInversion(m) ? Number(m.importe) : 0),
    0,
  )

  return {
    moneda: 'EUR',
    objetivoUsuario: objetivo ?? null,
    mesActual: {
      clave: claveMesActual(),
      ingresos: Math.round(tMes.ingresos),
      gastos: Math.round(tMes.gastos),
      ahorro: Math.round(tMes.ahorro),
      invertido: Math.round(tMes.invertido),
      ratioAhorroPct: Math.round(tMes.ratioAhorro),
      gastoPorCategoria: Object.fromEntries(
        Object.entries(porCategoria).map(([k, v]) => [k, Math.round(v)]),
      ),
    },
    medias: {
      ahorroMensualMedio: Math.round(ahorroMedio),
      gastoMensualEstimado: Math.round(gastoEstimado),
      mesesDeHistorial: mesesUsados,
    },
    invertidoTotalAcumulado: Math.round(invertidoTotal),
    evolucion6Meses: evolucion,
    objetivosAhorro: objetivos.map((o) => ({
      nombre: o.nombre,
      objetivo: Math.round(Number(o.importe_objetivo)),
      actual: Math.round(Number(o.importe_actual)),
      fecha: o.fecha_objetivo ?? null,
    })),
  }
}
