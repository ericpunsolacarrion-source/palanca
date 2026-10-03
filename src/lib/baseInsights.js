// Lecturas derivadas de Base. No escribe datos ni decide patrimonio.
// Trabaja exclusivamente con los compromisos declarados por el usuario.

const activo = (r) => r?.activo !== false

export function resumenBase(items = []) {
  const activos = items.filter(activo)
  const gastos = activos.filter((r) => r.tipo === 'gasto')
  const ingresos = activos.filter((r) => r.tipo === 'ingreso')

  const gastoMensualCentimos = gastos.reduce(
    (s, r) => s + (Number(r.importe_centimos ?? Math.round(Number(r.importe) * 100)) || 0),
    0,
  )
  const ingresoMensualCentimos = ingresos.reduce(
    (s, r) => s + (Number(r.importe_centimos ?? Math.round(Number(r.importe) * 100)) || 0),
    0,
  )

  return {
    compromisos: activos.length,
    gastos: gastos.length,
    ingresos: ingresos.length,
    gastoMensualCentimos,
    ingresoMensualCentimos,
    gastoAnualCentimos: gastoMensualCentimos * 12,
    ingresoAnualCentimos: ingresoMensualCentimos * 12,
    margenMensualCentimos: ingresoMensualCentimos - gastoMensualCentimos,
  }
}

export function proyeccionCompromiso(rec, anios) {
  const centimos = Number(rec?.importe_centimos ?? Math.round(Number(rec?.importe || 0) * 100)) || 0
  const meses = Math.max(0, Math.round(Number(anios) * 12))
  return centimos * meses
}

export function lecturaBase(items = []) {
  const r = resumenBase(items)
  const mensajes = []

  if (r.ingresoMensualCentimos > 0 && r.gastoMensualCentimos > 0) {
    const porcentaje = (r.gastoMensualCentimos / r.ingresoMensualCentimos) * 100
    mensajes.push({
      tipo: 'base',
      texto: `${Math.round(porcentaje)}% de tus ingresos recurrentes ya tiene un compromiso asignado.`,
    })
  }

  if (r.gastoMensualCentimos > 0) {
    mensajes.push({
      tipo: 'coste',
      texto: `Tus compromisos actuales representan ${r.gastoAnualCentimos / 100} € al año si se mantienen.`,
    })
  }

  return mensajes.slice(0, 2)
}
