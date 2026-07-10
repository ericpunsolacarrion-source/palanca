import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Planificaciones de meses futuros por usuario. Degradación elegante: si la
// tabla aún no existe, se comporta como vacío sin romper la app.
export function usePlanificaciones(usuarioId) {
  const [planes, setPlanes] = useState({}) // { 'YYYY-MM': plan }
  const [cargando, setCargando] = useState(true)
  const [tablaFalta, setTablaFalta] = useState(false)

  const cargar = useCallback(async () => {
    if (!usuarioId) return
    setCargando(true)

    const { data, error } = await supabase
      .from('planificaciones')
      .select('*')
      .eq('usuario_id', usuarioId)

    if (error) {
      setTablaFalta(error.code === '42P01' || /planificaciones/.test(error.message))
      setPlanes({})
    } else {
      const mapa = {}
      for (const p of data) mapa[p.mes] = p
      setPlanes(mapa)
      setTablaFalta(false)
    }
    setCargando(false)
  }, [usuarioId])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function guardar(mes, { ingreso, gasto, inversion, nota }) {
    const { error } = await supabase.from('planificaciones').upsert(
      {
        usuario_id: usuarioId,
        mes,
        ingreso_previsto: ingreso || 0,
        gasto_previsto: gasto || 0,
        inversion_prevista: inversion || 0,
        nota: nota?.trim() || null,
      },
      { onConflict: 'usuario_id,mes' },
    )
    if (!error) await cargar()
    return !error
  }

  async function eliminar(mes) {
    const { error } = await supabase
      .from('planificaciones')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('mes', mes)
    if (!error) await cargar()
    return !error
  }

  return { planes, cargando, tablaFalta, guardar, eliminar }
}
