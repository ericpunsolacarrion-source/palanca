import { useCallback, useState } from 'react'
import { actualizarPerfil } from './perfil'
import { normalizarDiaInicio } from './periodo'
import { claveLSPeriodo, configPeriodoDePerfil } from './periodoVista'

export { diaInicioDePerfil } from './periodoVista'

// Guarda la configuración del periodo ({ dia?, cobro?, auto? }) del usuario.
// Con las columnas en perfiles (RLS: cada usuario solo su fila) va a la BD; si
// aún no existen, a este dispositivo. Devuelve { ok, perfil? }.
export async function guardarPeriodoUsuario(usuarioId, perfil, campos) {
  const actual = configPeriodoDePerfil(perfil, usuarioId)
  const nuevo = {
    dia: campos.dia != null ? normalizarDiaInicio(campos.dia) : actual.dia,
    cobro: campos.cobro !== undefined ? campos.cobro : actual.cobro,
    auto: campos.auto !== undefined ? campos.auto === true : actual.auto,
  }
  if (perfil && 'dia_inicio_periodo' in perfil) {
    const actualizado = await actualizarPerfil(usuarioId, { dia_inicio_periodo: nuevo.dia, dia_cobro_nomina: nuevo.cobro, periodo_automatico: nuevo.auto })
    if (!actualizado || !('dia_inicio_periodo' in actualizado)) return { ok: false }
    return { ok: true, perfil: actualizado, config: nuevo }
  }
  try {
    localStorage.setItem(claveLSPeriodo(usuarioId), JSON.stringify(nuevo))
  } catch {
    return { ok: false }
  }
  return { ok: true, config: nuevo }
}

// Periodo financiero del usuario: { dia, cobro, auto, enBD, guardar(campos) }.
export function useDiaInicioPeriodo(usuarioId, perfil, onPerfilActualizado) {
  const [local, setLocal] = useState(null) // fuerza re-render tras guardar en el navegador
  const config = local ?? configPeriodoDePerfil(perfil, usuarioId)
  const enBD = Boolean(perfil && 'dia_inicio_periodo' in perfil)

  const guardar = useCallback(
    async (campos) => {
      const r = await guardarPeriodoUsuario(usuarioId, perfil, typeof campos === 'number' ? { dia: campos } : campos)
      if (!r.ok) return false
      if (r.perfil) {
        onPerfilActualizado?.(r.perfil)
        setLocal(null)
      } else setLocal(r.config)
      return true
    },
    [usuarioId, perfil, onPerfilActualizado],
  )

  return { ...config, enBD, guardar }
}
