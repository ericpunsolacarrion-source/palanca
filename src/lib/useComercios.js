import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { claveComercio, establecerDirectorio } from './comercios'

// MEMORIA DE COMERCIOS del usuario: "este concepto del banco es tal comercio
// (y va en tal categoría)". Fuente: tabla comercios_alias; mientras no exista
// (SQL sin ejecutar) se guarda en este dispositivo y se sube después.
// Al cambiar, se fija como directorio activo de toda la app (lib/comercios.js).
const claveLocal = (uid) => `palanca_comercios_${uid}`

function leerLocal(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(claveLocal(uid)) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
function guardarLocal(uid, lista) {
  try {
    localStorage.setItem(claveLocal(uid), JSON.stringify(lista))
  } catch {
    // sin almacenamiento: dura la sesión
  }
}

const fusionar = (base, nuevos) => {
  const mapa = new Map(base.map((a) => [a.clave, a]))
  for (const a of nuevos) mapa.set(a.clave, { categoria: null, ...mapa.get(a.clave), ...a })
  return [...mapa.values()]
}

export function useComercios(usuarioId) {
  const [alias, setAlias] = useState(() => (usuarioId ? leerLocal(usuarioId) : []))
  const [enBd, setEnBd] = useState(false)

  useEffect(() => {
    if (!usuarioId) return
    let vivo = true
    ;(async () => {
      const { data, error } = await supabase.from('comercios_alias').select('clave, nombre, categoria').eq('usuario_id', usuarioId)
      if (!vivo || error) return // sin tabla: memoria local
      setEnBd(true)
      const locales = leerLocal(usuarioId)
      const remotos = data ?? []
      const pendientes = locales.filter((l) => !remotos.some((r) => r.clave === l.clave))
      if (pendientes.length) {
        await supabase.from('comercios_alias').upsert(pendientes.map((a) => ({ usuario_id: usuarioId, clave: a.clave, nombre: a.nombre, categoria: a.categoria ?? null })))
      }
      if (vivo) setAlias(fusionar(remotos, pendientes))
    })()
    return () => {
      vivo = false
    }
  }, [usuarioId])

  // El directorio activo cambia con la memoria: toda la app lo ve al re-renderizar.
  const directorio = useMemo(() => establecerDirectorio(alias), [alias])

  /**
   * Recuerda que estos conceptos del banco son `nombre` (y su categoría).
   * entradas: [{ texto | clave, nombre, categoria? }]. Ignora lo vacío.
   */
  const recordar = useCallback(
    async (entradas) => {
      if (!usuarioId) return
      const nuevos = []
      for (const e of entradas) {
        const clave = e.clave ?? claveComercio(e.texto ?? '')
        const nombre = String(e.nombre ?? '').trim().slice(0, 80)
        if (!clave || !nombre) continue
        // Sin categoría explícita no se pisa la que ya hubiera recordada.
        nuevos.push(e.categoria !== undefined ? { clave, nombre, categoria: e.categoria } : { clave, nombre })
      }
      if (!nuevos.length) return
      setAlias((prev) => {
        const lista = fusionar(prev, nuevos)
        guardarLocal(usuarioId, lista)
        return lista
      })
      if (enBd) {
        await supabase.from('comercios_alias').upsert(nuevos.map((a) => ({ usuario_id: usuarioId, ...a, updated_at: new Date().toISOString() })))
      }
    },
    [usuarioId, enBd],
  )

  const olvidar = useCallback(
    async (clave) => {
      if (!usuarioId) return
      setAlias((prev) => {
        const lista = prev.filter((a) => a.clave !== clave)
        guardarLocal(usuarioId, lista)
        return lista
      })
      if (enBd) await supabase.from('comercios_alias').delete().eq('usuario_id', usuarioId).eq('clave', clave)
    },
    [usuarioId, enBd],
  )

  return { alias, directorio, recordar, olvidar }
}
