import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { toast } from './toast'

// Escenarios de independencia financiera guardados por el usuario para
// compararlos (conservador / realista / optimista…). Persistidos en la tabla
// `escenarios_simulador` (tipo='independencia'; parámetros en `datos` jsonb).
// Migra una sola vez los legacy de localStorage sin borrarlos; tolerante si la
// tabla no existe. Escenario: { id, nombre, gasto, patrimonio, ahorro, rentabilidad }.

const TIPO = 'independencia'
const claveLS = (usuarioId) => `palanca_escenarios_if_${usuarioId}`
const claveMigrado = (usuarioId) => `palanca_escenarios_if_migrado_${usuarioId}`

function leerLS(usuarioId) {
  try {
    const arr = JSON.parse(localStorage.getItem(claveLS(usuarioId)) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

const aItem = (row) => ({ id: row.id, nombre: row.nombre, ...(row.datos || {}) })
const aDatos = ({ nombre, ...resto }) => ({ nombre, datos: resto })

async function migrarDesdeLS(usuarioId, legacy) {
  const filas = legacy.map((it) => {
    const { nombre, datos } = aDatos(it)
    return { usuario_id: usuarioId, tipo: TIPO, nombre: nombre ?? 'Escenario', datos }
  })
  if (filas.length) await supabase.from('escenarios_simulador').insert(filas)
}

export function useEscenariosIF(usuarioId) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!usuarioId) {
      setItems([])
      return
    }
    const { data, error } = await supabase
      .from('escenarios_simulador')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', TIPO)
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === '42P01' || /escenarios_simulador/.test(error.message)) {
        setItems(leerLS(usuarioId))
        return
      }
      setItems([])
      return
    }
    if ((data?.length ?? 0) === 0 && !localStorage.getItem(claveMigrado(usuarioId))) {
      const legacy = leerLS(usuarioId)
      if (legacy.length > 0) {
        await migrarDesdeLS(usuarioId, legacy)
        localStorage.setItem(claveMigrado(usuarioId), '1')
        await cargar()
        return
      }
      localStorage.setItem(claveMigrado(usuarioId), '1')
    }
    setItems((data || []).map(aItem))
  }, [usuarioId])

  useEffect(() => {
    setCargando(true)
    cargar().finally(() => setCargando(false))
  }, [cargar])

  const crear = useCallback(
    async (escenario) => {
      if (!usuarioId) return
      const { nombre, datos } = aDatos(escenario)
      const { error } = await supabase
        .from('escenarios_simulador')
        .insert({ usuario_id: usuarioId, tipo: TIPO, nombre: nombre ?? 'Escenario', datos })
      if (!error) await cargar()
      else toast('No se ha podido guardar el escenario.', 'error')
    },
    [usuarioId, cargar],
  )

  const eliminar = useCallback(
    async (id) => {
      const { error } = await supabase.from('escenarios_simulador').delete().eq('id', id)
      if (!error) await cargar()
      else toast('No se ha podido eliminar el escenario.', 'error')
    },
    [cargar],
  )

  return { items, cargando, crear, eliminar }
}
