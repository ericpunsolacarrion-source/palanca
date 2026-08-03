import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { aCentimos } from './importe'

// Objetivos de ahorro múltiples por usuario. Degradación elegante: si la tabla
// aún no existe en la BD, se comporta como lista vacía sin romper la app.
export function useObjetivosAhorro(usuarioId) {
  const [objetivos, setObjetivos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tablaFalta, setTablaFalta] = useState(false)

  const cargar = useCallback(async () => {
    if (!usuarioId) return
    setCargando(true)

    const { data, error } = await supabase
      .from('objetivos_ahorro')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: true })

    if (error) {
      // 42P01 = tabla inexistente (aún no se ha ejecutado el SQL)
      setTablaFalta(error.code === '42P01' || /objetivos_ahorro/.test(error.message))
      setObjetivos([])
    } else {
      setObjetivos(data)
      setTablaFalta(false)
    }
    setCargando(false)
  }, [usuarioId])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function crear({ nombre, importeObjetivo, importeActual, fechaObjetivo }) {
    const { data, error } = await supabase
      .from('objetivos_ahorro')
      .insert({
        usuario_id: usuarioId,
        nombre: nombre.trim(),
        importe_objetivo: importeObjetivo,
        importe_objetivo_centimos: aCentimos(importeObjetivo),
        importe_actual: importeActual || 0,
        importe_actual_centimos: aCentimos(importeActual || 0),
        fecha_objetivo: fechaObjetivo || null,
      })
      .select()
      .single()
    if (!error) await cargar()
    return error ? null : data
  }

  async function actualizar(id, campos) {
    const conCentimos = { ...campos }
    if ('importe_objetivo' in campos) conCentimos.importe_objetivo_centimos = aCentimos(campos.importe_objetivo)
    if ('importe_actual' in campos) conCentimos.importe_actual_centimos = aCentimos(campos.importe_actual)
    const { error } = await supabase.from('objetivos_ahorro').update(conCentimos).eq('id', id)
    if (!error) await cargar()
    return !error
  }

  async function eliminar(id) {
    const { error } = await supabase.from('objetivos_ahorro').delete().eq('id', id)
    if (!error) await cargar()
    return !error
  }

  return { objetivos, cargando, tablaFalta, crear, actualizar, eliminar }
}
