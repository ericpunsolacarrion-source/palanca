import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { esInversion } from './categorias'

const MESES_HISTORIAL = 6

function claveMes(fechaIso) {
  return fechaIso.slice(0, 7)
}

function etiquetaMesCorta(clave) {
  const [anio, mes] = clave.split('-')
  const fecha = new Date(Number(anio), Number(mes) - 1, 1)
  return new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(fecha).replace('.', '')
}

export function useHistorialMensual(usuarioId) {
  const [meses, setMeses] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!usuarioId) return
    let cancelado = false

    async function cargar() {
      setCargando(true)

      const hoy = new Date()
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES_HISTORIAL - 1), 1)
      const desde = inicio.toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('movimientos')
        .select('tipo, importe, fecha, categoria:categorias(nombre)')
        .eq('usuario_id', usuarioId)
        .gte('fecha', desde)

      if (cancelado) return

      if (!error && data) {
        const claves = []
        for (let i = MESES_HISTORIAL - 1; i >= 0; i -= 1) {
          const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
          claves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }

        const mapa = new Map(claves.map((c) => [c, { clave: c, ingresos: 0, gastos: 0 }]))

        for (const m of data) {
          const clave = claveMes(m.fecha)
          if (!mapa.has(clave)) continue
          const entrada = mapa.get(clave)
          if (m.tipo === 'ingreso') {
            entrada.ingresos += Number(m.importe)
          } else if (!esInversion(m)) {
            entrada.gastos += Number(m.importe)
          }
        }

        setMeses(
          claves.map((c) => ({ ...mapa.get(c), etiqueta: etiquetaMesCorta(c) })),
        )
      }

      setCargando(false)
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [usuarioId])

  return { meses, cargando }
}
