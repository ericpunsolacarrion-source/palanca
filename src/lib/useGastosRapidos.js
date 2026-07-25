import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { toast } from './toast'

// Accesos rápidos de gasto definidos por el usuario (café 1,50 €, comer 12 €…).
// Persistidos en Supabase (tabla `gastos_rapidos`) para que viajen con la cuenta.
// Migra automáticamente, una sola vez, los datos antiguos de localStorage sin
// borrarlos. Si la tabla aún no existe, degrada a localStorage.
// Item (forma del componente): { id, nombre, importe, categoriaId, categoriaNombre }.

const claveLS = (usuarioId) => `palanca_gastos_rapidos_${usuarioId}`
const claveMigrado = (usuarioId) => `palanca_gastos_rapidos_migrado_${usuarioId}`

function leerLS(usuarioId) {
  try {
    const arr = JSON.parse(localStorage.getItem(claveLS(usuarioId)) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

const esUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

const aItem = (row) => ({
  id: row.id,
  nombre: row.nombre,
  importe: row.importe == null ? null : Number(row.importe),
  categoriaId: row.categoria_id,
  categoriaNombre: row.categoria_nombre,
})

async function migrarDesdeLS(usuarioId, legacy) {
  const filas = legacy.map((it) => ({
    usuario_id: usuarioId,
    nombre: it.nombre,
    importe: it.importe ?? null,
    categoria_id: esUuid(it.categoriaId) ? it.categoriaId : null,
    categoria_nombre: it.categoriaNombre ?? null,
  }))
  if (filas.length) await supabase.from('gastos_rapidos').insert(filas)
}

export function useGastosRapidos(usuarioId) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!usuarioId) {
      setItems([])
      return
    }
    const { data, error } = await supabase
      .from('gastos_rapidos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === '42P01' || /gastos_rapidos/.test(error.message)) {
        setItems(leerLS(usuarioId).map((it) => ({ ...it })))
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
    async ({ nombre, importe, categoriaId, categoriaNombre }) => {
      if (!usuarioId) return
      const { error } = await supabase.from('gastos_rapidos').insert({
        usuario_id: usuarioId,
        nombre: nombre.trim(),
        importe: importe ?? null,
        categoria_id: esUuid(categoriaId) ? categoriaId : null,
        categoria_nombre: categoriaNombre ?? null,
      })
      if (!error) await cargar()
      else toast('No se ha podido crear el acceso rápido.', 'error')
    },
    [usuarioId, cargar],
  )

  const actualizar = useCallback(
    async (id, campos) => {
      const mapa = {
        nombre: 'nombre',
        importe: 'importe',
        categoriaId: 'categoria_id',
        categoriaNombre: 'categoria_nombre',
      }
      const fila = {}
      for (const [k, col] of Object.entries(mapa)) {
        if (k in campos) fila[col] = campos[k]
      }
      if (Object.keys(fila).length === 0) return
      const { error } = await supabase.from('gastos_rapidos').update(fila).eq('id', id)
      if (!error) await cargar()
      else toast('No se ha podido actualizar el acceso rápido.', 'error')
    },
    [cargar],
  )

  const eliminar = useCallback(
    async (id) => {
      const { error } = await supabase.from('gastos_rapidos').delete().eq('id', id)
      if (!error) await cargar()
      else toast('No se ha podido eliminar el acceso rápido.', 'error')
    },
    [cargar],
  )

  return { items, cargando, crear, actualizar, eliminar }
}
