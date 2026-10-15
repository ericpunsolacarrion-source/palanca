import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { leerAhorros, registrarAhorro } from './negociables'
import { registrarEvento } from './analitica'

// Ahorros conseguidos al negociar recibos. Fuente: tabla ahorros_negociados
// (supabase-schema-metricas.sql). Mientras la tabla no exista se sigue
// usando este dispositivo (localStorage), y lo de aquí se sube a la BD la
// primera vez que esté disponible.
const aFila = (usuarioId, a) => ({
  usuario_id: usuarioId,
  rec_id: String(a.recId),
  nombre: a.nombre,
  antes: a.antes,
  despues: a.despues,
  ahorro_anual: a.ahorroAnual,
  fecha: a.fecha,
})
const deFila = (f) => ({
  recId: f.rec_id,
  nombre: f.nombre,
  antes: Number(f.antes),
  despues: Number(f.despues),
  ahorroAnual: Number(f.ahorro_anual),
  fecha: f.fecha,
})

export function useAhorrosNegociados(usuarioId) {
  const [ahorros, setAhorros] = useState(() => leerAhorros(usuarioId))
  const [enBd, setEnBd] = useState(false)

  useEffect(() => {
    if (!usuarioId) return
    let vivo = true
    ;(async () => {
      const { data, error } = await supabase.from('ahorros_negociados').select('*').eq('usuario_id', usuarioId)
      if (!vivo || error) return // sin tabla: se queda lo local
      setEnBd(true)
      const remotos = (data ?? []).map(deFila)
      const locales = leerAhorros(usuarioId).filter((l) => !remotos.some((r) => String(r.recId) === String(l.recId)))
      if (locales.length) {
        const { error: e2 } = await supabase.from('ahorros_negociados').upsert(locales.map((a) => aFila(usuarioId, a)), { onConflict: 'usuario_id,rec_id' })
        if (!e2) remotos.push(...locales)
      }
      if (vivo) setAhorros(remotos)
    })()
    return () => {
      vivo = false
    }
  }, [usuarioId])

  const registrar = useCallback(
    async (datos) => {
      const lista = registrarAhorro(usuarioId, datos) // copia local (y cálculo)
      const nuevo = lista.find((a) => String(a.recId) === String(datos.recId))
      if (!nuevo) return { lista: ahorros, ahorroAnual: 0 }
      if (enBd) {
        await supabase.from('ahorros_negociados').upsert(aFila(usuarioId, nuevo), { onConflict: 'usuario_id,rec_id' })
      }
      const siguiente = [...ahorros.filter((a) => String(a.recId) !== String(datos.recId)), nuevo]
      setAhorros(siguiente)
      registrarEvento('ahorro_negociado')
      return { lista: siguiente, ahorroAnual: nuevo.ahorroAnual }
    },
    [usuarioId, enBd, ahorros],
  )

  return { ahorros, registrar }
}
