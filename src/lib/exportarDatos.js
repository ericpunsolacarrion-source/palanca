import { supabase } from './supabaseClient'
import { SELECT_MOVIMIENTO } from './movimientosUtils'

// DERECHO DE ACCESO Y PORTABILIDAD (RGPD art. 15 y 20): el usuario descarga
// todo lo suyo. JSON completo (todas las tablas) y CSV de movimientos que se
// abre en Excel y que Palanca vuelve a importar tal cual.

export const TABLAS_USUARIO = [
  'perfiles',
  'movimientos',
  'categorias',
  'fuentes',
  'recurrentes',
  'recurrentes_confirmaciones',
  'presupuestos',
  'objetivos_ahorro',
  'planificaciones',
  'simulaciones_guardadas',
  'escenarios_simulador',
  'gastos_rapidos',
  'ahorros_negociados',
  'eventos',
]

const campoCsv = (v) => {
  const t = String(v ?? '')
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

// Formato español (Excel): separador ';' y coma decimal. Gastos en negativo,
// así el archivo se lee igual que un extracto del banco.
export function movimientosACsv(movs) {
  const cab = ['fecha', 'tipo', 'categoria', 'importe', 'concepto', 'cuenta']
  const filas = movs.map((m) => {
    const importe = Number(m.importe) * (m.tipo === 'gasto' ? -1 : 1)
    return [
      m.fecha,
      m.tipo,
      m.categoria?.nombre ?? '',
      importe.toFixed(2).replace('.', ','),
      m.nota ?? '',
      m.fuente?.nombre ?? '',
    ]
      .map(campoCsv)
      .join(';')
  })
  return '﻿' + [cab.join(';'), ...filas].join('\r\n') + '\r\n'
}

function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const hoy = () => new Date().toISOString().slice(0, 10)

export async function exportarTodo(usuarioId, email) {
  const tablas = {}
  for (const t of TABLAS_USUARIO) {
    const todas = []
    // De 1.000 en 1.000 (límite de Supabase por consulta).
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await supabase.from(t).select('*').eq('usuario_id', usuarioId).range(desde, desde + 999)
      if (error) break // tabla que aún no existe: se omite
      todas.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    if (todas.length) tablas[t] = todas
  }
  const json = JSON.stringify({ app: 'Palanca', exportado: new Date().toISOString(), email, tablas }, null, 2)
  descargar(`palanca-mis-datos-${hoy()}.json`, json, 'application/json')
  return Object.values(tablas).reduce((s, f) => s + f.length, 0)
}

export async function exportarMovimientosCsv(usuarioId) {
  const todos = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from('movimientos')
      .select(SELECT_MOVIMIENTO)
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false })
      .range(desde, desde + 999)
    if (error) throw error
    todos.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  descargar(`palanca-movimientos-${hoy()}.csv`, movimientosACsv(todos), 'text/csv;charset=utf-8')
  return todos.length
}
