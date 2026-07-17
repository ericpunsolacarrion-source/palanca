import { useCallback, useEffect, useState } from 'react'
import { claveMesActual } from './movimientosUtils'

// Movimientos recurrentes definidos por el usuario (alquiler, nómina, suscripción…).
// Se configuran una vez y se registran cada mes. Los INGRESOS (y cualquiera
// marcado como "confirmar") piden confirmar/ajustar el importe cada mes, para no
// meter datos incorrectos a ciegas (la nómina varía). Definiciones en
// localStorage por dispositivo; el movimiento registrado va a Supabase.
// Cada recurrente: { id, tipo:'gasto'|'ingreso', nombre, importe, categoriaId,
//   categoriaNombre, fuenteId, fuenteNombre, confirmar, activo, aplicadoEn }.

const clave = (usuarioId) => `palanca_recurrentes_${usuarioId}`

function leer(usuarioId) {
  try {
    const arr = JSON.parse(localStorage.getItem(clave(usuarioId)) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function escribir(usuarioId, items) {
  try {
    localStorage.setItem(clave(usuarioId), JSON.stringify(items))
  } catch {
    // sin persistencia, no pasa nada
  }
}

const idNuevo = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
  `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// Pub/sub para que TODAS las instancias del hook (ej. el badge de la pestaña y
// la vista de gestión) se sincronicen al mutar en el mismo tab.
const oyentes = new Set()
function notificar() {
  oyentes.forEach((fn) => fn())
}

export function useRecurrentes(usuarioId) {
  const [items, setItems] = useState(() => (usuarioId ? leer(usuarioId) : []))

  useEffect(() => {
    setItems(usuarioId ? leer(usuarioId) : [])
    const refrescar = () => setItems(usuarioId ? leer(usuarioId) : [])
    oyentes.add(refrescar)
    return () => oyentes.delete(refrescar)
  }, [usuarioId])

  const guardarLista = useCallback(
    (nuevos) => {
      if (usuarioId) escribir(usuarioId, nuevos)
      notificar()
    },
    [usuarioId],
  )

  const crear = useCallback(
    (datos) => {
      guardarLista([
        ...items,
        { id: idNuevo(), activo: true, aplicadoEn: null, mesesAplicados: [], ...datos },
      ])
    },
    [items, guardarLista],
  )

  const actualizar = useCallback(
    (id, campos) => guardarLista(items.map((it) => (it.id === id ? { ...it, ...campos } : it))),
    [items, guardarLista],
  )

  const eliminar = useCallback(
    (id) => guardarLista(items.filter((it) => it.id !== id)),
    [items, guardarLista],
  )

  // Marca un recurrente como aplicado en el mes actual (tras registrarlo).
  // Conserva el HISTÓRICO de meses en `mesesAplicados` (para "llevas N meses"),
  // además de `aplicadoEn` por compatibilidad.
  const marcarAplicado = useCallback(
    (id) => {
      const clave = claveMesActual()
      const it = items.find((x) => x.id === id)
      const previos = Array.isArray(it?.mesesAplicados) ? it.mesesAplicados : []
      const historico = previos.includes(clave) ? previos : [...previos, clave]
      actualizar(id, { aplicadoEn: clave, mesesAplicados: historico })
    },
    [items, actualizar],
  )

  // Recurrentes activos que aún no se han registrado este mes.
  const claveActual = claveMesActual()
  const yaAplicado = (it) =>
    (Array.isArray(it.mesesAplicados) && it.mesesAplicados.includes(claveActual)) ||
    it.aplicadoEn === claveActual
  const pendientes = items.filter((it) => it.activo && !yaAplicado(it))

  return { items, pendientes, crear, actualizar, eliminar, marcarAplicado }
}
