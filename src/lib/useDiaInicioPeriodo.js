import { useCallback, useState } from 'react'
import { actualizarPerfil } from './perfil'
import { normalizarDiaInicio } from './periodo'
import { claveLSDiaInicio as claveLS, diaInicioDePerfil } from './periodoVista'

export { diaInicioDePerfil }

// Día de inicio del periodo financiero del usuario (1 = mes natural).
// Fuente: la columna perfiles.dia_inicio_periodo (RLS: cada usuario solo lee y
// escribe su fila). Si la columna aún no existe en la BD (migración pendiente),
// se guarda en este dispositivo (localStorage por usuario), como otros ajustes.
export function useDiaInicioPeriodo(usuarioId, perfil, onPerfilActualizado) {
  const [local, setLocal] = useState(null) // fuerza re-render tras guardar en localStorage
  const dia = local ?? diaInicioDePerfil(perfil, usuarioId)
  const enBD = Boolean(perfil && 'dia_inicio_periodo' in perfil)

  const guardar = useCallback(
    async (nuevo) => {
      const valor = normalizarDiaInicio(nuevo)
      if (enBD) {
        const actualizado = await actualizarPerfil(usuarioId, { dia_inicio_periodo: valor })
        if (!actualizado || !('dia_inicio_periodo' in actualizado)) return false
        onPerfilActualizado?.(actualizado)
        setLocal(null)
        return true
      }
      try {
        localStorage.setItem(claveLS(usuarioId), String(valor))
      } catch {
        return false
      }
      setLocal(valor)
      return true
    },
    [enBD, usuarioId, onPerfilActualizado],
  )

  return { dia, guardar, enBD }
}
