import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { aCentimos } from './importe'

// Límites de gasto por categoría (Presupuesto v5). Fuente: la tabla
// `presupuestos_categoria` (supabase-schema-presupuestos-categoria.sql), con
// RLS por usuario. Degradación elegante, como useObjetivoTipo: si la tabla aún
// no existe, se guardan en este navegador por usuario y se suben solos la
// primera vez que la tabla esté disponible. Nunca toca movimientos ni el
// presupuesto general.
//
// limites: { [categoriaId]: { categoriaId, nombre, importe } }
const claveLS = (u) => `palanca_presu_cat_${u}`
const tablaFalta = (error) => error && (error.code === '42P01' || error.code === 'PGRST205' || /presupuestos_categoria/.test(error.message ?? ''))

function leerLS(u) {
  try {
    const v = JSON.parse(localStorage.getItem(claveLS(u)) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
function escribirLS(u, limites) {
  try {
    localStorage.setItem(claveLS(u), JSON.stringify(limites))
  } catch {
    /* almacenamiento bloqueado: se queda en memoria */
  }
}
const deFila = (f) => ({ categoriaId: f.categoria_id, nombre: f.categoria_nombre, importe: Number(f.importe) })

export function usePresupuestosCategoria(usuarioId) {
  const [limites, setLimitesEstado] = useState({})
  // Copia siempre al día: varias escrituras seguidas no se pisan entre sí.
  const actual = useRef({})
  const setLimites = useCallback((v) => {
    actual.current = v
    setLimitesEstado(v)
  }, [])
  const [modo, setModo] = useState('nube') // 'nube' | 'local'
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!usuarioId) return
    setCargando(true)
    const { data, error } = await supabase.from('presupuestos_categoria').select('*').eq('usuario_id', usuarioId)
    if (error) {
      // Sin tabla (o sin red): lo de este navegador, sin romper nada.
      setModo(tablaFalta(error) ? 'local' : 'nube')
      setLimites(leerLS(usuarioId))
      setCargando(false)
      return
    }
    const nube = Object.fromEntries((data ?? []).filter((f) => f.usuario_id === usuarioId).map((f) => [f.categoria_id, deFila(f)]))
    // Primera vez con tabla: sube lo que hubiera en este navegador (sin pisar la nube).
    const locales = Object.values(leerLS(usuarioId)).filter((l) => !nube[l.categoriaId])
    if (locales.length) {
      const { error: e2 } = await supabase.from('presupuestos_categoria').upsert(
        locales.map((l) => ({ usuario_id: usuarioId, categoria_id: l.categoriaId, categoria_nombre: l.nombre, importe: l.importe, importe_centimos: aCentimos(l.importe), updated_at: new Date().toISOString() })),
        { onConflict: 'usuario_id,categoria_id' },
      )
      if (!e2) {
        for (const l of locales) nube[l.categoriaId] = l
        try {
          localStorage.removeItem(claveLS(usuarioId))
        } catch {
          /* nada */
        }
      }
    }
    setModo('nube')
    setLimites(nube)
    setCargando(false)
  }, [usuarioId, setLimites])

  useEffect(() => {
    cargar()
  }, [cargar])

  /**
   * Aplica varios cambios a la vez: [{ categoriaId, nombre, importe }] donde
   * importe > 0 fija el límite e importe null/0 lo quita. Una sola escritura.
   */
  const guardarLimitesCategoria = useCallback(
    async (cambios) => {
      if (!usuarioId || !Array.isArray(cambios)) return false
      const siguiente = { ...actual.current }
      const subir = []
      const quitar = []
      for (const c of cambios) {
        if (!c?.categoriaId) return false
        const valor = c.importe == null || c.importe === '' ? null : Number(c.importe)
        if (valor != null && (!Number.isFinite(valor) || valor < 0)) return false
        if (valor == null || aCentimos(valor) === 0) {
          delete siguiente[c.categoriaId]
          quitar.push(c.categoriaId)
        } else {
          siguiente[c.categoriaId] = { categoriaId: c.categoriaId, nombre: c.nombre, importe: aCentimos(valor) / 100 }
          subir.push({ usuario_id: usuarioId, categoria_id: c.categoriaId, categoria_nombre: c.nombre, importe: aCentimos(valor) / 100, importe_centimos: aCentimos(valor), updated_at: new Date().toISOString() })
        }
      }
      if (modo === 'nube') {
        let error = null
        if (subir.length) ({ error } = await supabase.from('presupuestos_categoria').upsert(subir, { onConflict: 'usuario_id,categoria_id' }))
        if (!error && quitar.length) ({ error } = await supabase.from('presupuestos_categoria').delete().eq('usuario_id', usuarioId).in('categoria_id', quitar))
        if (error && !tablaFalta(error)) return false
        if (error) {
          setModo('local')
          escribirLS(usuarioId, siguiente)
        }
      } else {
        escribirLS(usuarioId, siguiente)
      }
      setLimites(siguiente)
      return true
    },
    [usuarioId, modo, setLimites],
  )

  /** Un solo límite (atajo de guardarLimitesCategoria). */
  const guardarLimiteCategoria = useCallback(
    (categoriaId, nombre, importe) => guardarLimitesCategoria([{ categoriaId, nombre, importe }]),
    [guardarLimitesCategoria],
  )

  return { limitesCategoria: limites, modoLimites: modo, cargandoLimites: cargando, guardarLimiteCategoria, guardarLimitesCategoria }
}
