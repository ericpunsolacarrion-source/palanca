import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { claveMesActual } from './movimientosUtils'
import { toast } from './toast'

// Recurrentes del usuario (alquiler, nómina, suscripción…), persistidos en
// Supabase (tabla `recurrentes` + `recurrentes_confirmaciones` para la racha).
// Migra automáticamente, una sola vez, los datos antiguos de localStorage sin
// borrarlos. Si las tablas aún no existen (SQL sin ejecutar), degrada a
// localStorage para no romper nada.

const claveLS = (usuarioId) => `palanca_recurrentes_${usuarioId}`
const claveMigrado = (usuarioId) => `palanca_recurrentes_migrado_${usuarioId}`

function leerLS(usuarioId) {
  try {
    const arr = JSON.parse(localStorage.getItem(claveLS(usuarioId)) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

const esUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

// Fila de la BD → forma que esperan los componentes.
function aItem(row, mesesPorRec) {
  const meses = mesesPorRec[row.id] || []
  return {
    id: row.id,
    tipo: row.tipo,
    nombre: row.nombre,
    importe: Number(row.importe),
    categoriaId: row.categoria_id,
    categoriaNombre: row.categoria_nombre,
    fuenteId: row.fuente_id,
    diaMes: row.dia_mes,
    confirmar: row.confirmar,
    activo: row.activo,
    mesesAplicados: meses,
    aplicadoEn: meses.includes(claveMesActual()) ? claveMesActual() : null,
  }
}

// Sube a Supabase los recurrentes legacy de localStorage (una sola vez).
async function migrarDesdeLS(usuarioId, legacy) {
  for (const it of legacy) {
    const { data, error } = await supabase
      .from('recurrentes')
      .insert({
        usuario_id: usuarioId,
        tipo: it.tipo,
        nombre: it.nombre,
        importe: it.importe,
        categoria_id: esUuid(it.categoriaId) ? it.categoriaId : null,
        categoria_nombre: it.categoriaNombre ?? null,
        fuente_id: esUuid(it.fuenteId) ? it.fuenteId : null,
        dia_mes: it.diaMes ?? null,
        confirmar: !!it.confirmar,
        activo: it.activo !== false,
      })
      .select('id')
      .single()
    if (error || !data) continue
    const meses = Array.isArray(it.mesesAplicados)
      ? it.mesesAplicados
      : it.aplicadoEn
        ? [it.aplicadoEn]
        : []
    if (meses.length) {
      await supabase
        .from('recurrentes_confirmaciones')
        .upsert(
          meses.map((m) => ({ usuario_id: usuarioId, recurrente_id: data.id, mes: m })),
          { onConflict: 'recurrente_id,mes', ignoreDuplicates: true },
        )
    }
  }
}

// Pub/sub para que todas las instancias (badge de la pestaña y vista de gestión)
// se re-sincronicen al mutar.
const oyentes = new Set()
function notificar() {
  oyentes.forEach((fn) => fn())
}

export function useRecurrentes(usuarioId) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modoLegacy, setModoLegacy] = useState(false)

  const cargar = useCallback(async () => {
    if (!usuarioId) {
      setItems([])
      return
    }
    const { data: recs, error } = await supabase
      .from('recurrentes')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: true })

    if (error) {
      // Tabla aún no creada (SQL sin ejecutar): degradar a localStorage.
      if (error.code === '42P01' || /recurrentes/.test(error.message)) {
        setModoLegacy(true)
        setItems(leerLS(usuarioId))
        return
      }
      setItems([])
      return
    }
    setModoLegacy(false)

    // Migración única desde localStorage si Supabase está vacío.
    if ((recs?.length ?? 0) === 0 && !localStorage.getItem(claveMigrado(usuarioId))) {
      const legacy = leerLS(usuarioId)
      if (legacy.length > 0) {
        await migrarDesdeLS(usuarioId, legacy)
        localStorage.setItem(claveMigrado(usuarioId), '1')
        await cargar()
        return
      }
      localStorage.setItem(claveMigrado(usuarioId), '1')
    }

    const { data: confs } = await supabase
      .from('recurrentes_confirmaciones')
      .select('recurrente_id, mes')
      .eq('usuario_id', usuarioId)
    const mesesPorRec = {}
    for (const c of confs || []) {
      ;(mesesPorRec[c.recurrente_id] ||= []).push(c.mes)
    }
    setItems((recs || []).map((r) => aItem(r, mesesPorRec)))
  }, [usuarioId])

  useEffect(() => {
    setCargando(true)
    cargar().finally(() => setCargando(false))
    oyentes.add(cargar)
    return () => oyentes.delete(cargar)
  }, [cargar])

  const crear = useCallback(
    async (datos) => {
      if (!usuarioId) return
      const { error } = await supabase.from('recurrentes').insert({
        usuario_id: usuarioId,
        tipo: datos.tipo,
        nombre: datos.nombre,
        importe: datos.importe,
        categoria_id: esUuid(datos.categoriaId) ? datos.categoriaId : null,
        categoria_nombre: datos.categoriaNombre ?? null,
        fuente_id: esUuid(datos.fuenteId) ? datos.fuenteId : null,
        dia_mes: datos.diaMes ?? null,
        confirmar: !!datos.confirmar,
        activo: true,
      })
      if (!error) {
        await cargar()
        notificar()
      } else toast('No se ha podido guardar el recurrente.', 'error')
    },
    [usuarioId, cargar],
  )

  const actualizar = useCallback(
    async (id, campos) => {
      const mapa = {
        tipo: 'tipo',
        nombre: 'nombre',
        importe: 'importe',
        categoriaId: 'categoria_id',
        categoriaNombre: 'categoria_nombre',
        fuenteId: 'fuente_id',
        diaMes: 'dia_mes',
        confirmar: 'confirmar',
        activo: 'activo',
      }
      const fila = {}
      for (const [k, col] of Object.entries(mapa)) {
        if (k in campos) fila[col] = campos[k]
      }
      if (Object.keys(fila).length === 0) return
      const { error } = await supabase.from('recurrentes').update(fila).eq('id', id)
      if (!error) {
        await cargar()
        notificar()
      } else toast('No se ha podido actualizar el recurrente.', 'error')
    },
    [cargar],
  )

  const eliminar = useCallback(
    async (id) => {
      const { error } = await supabase.from('recurrentes').delete().eq('id', id)
      if (!error) {
        await cargar()
        notificar()
      } else toast('No se ha podido eliminar el recurrente.', 'error')
    },
    [cargar],
  )

  // Marca el recurrente como aplicado en el mes actual (histórico → racha).
  const marcarAplicado = useCallback(
    async (id) => {
      const mes = claveMesActual()
      const { error } = await supabase
        .from('recurrentes_confirmaciones')
        .upsert(
          { usuario_id: usuarioId, recurrente_id: id, mes },
          { onConflict: 'recurrente_id,mes', ignoreDuplicates: true },
        )
      if (!error) {
        await cargar()
        notificar()
      }
    },
    [usuarioId, cargar],
  )

  const claveActual = claveMesActual()
  const pendientes = items.filter(
    (it) => it.activo && !it.mesesAplicados.includes(claveActual),
  )

  return { items, pendientes, cargando, modoLegacy, crear, actualizar, eliminar, marcarAplicado }
}
