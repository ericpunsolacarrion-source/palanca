import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function usePresupuesto(usuarioId) {
  const [metodo, setMetodo] = useState('tasa')
  const [tasaAhorroObjetivo, setTasaAhorroObjetivo] = useState(null)
  const [gastoMaximoFijo, setGastoMaximoFijo] = useState(null)
  const [objetivoInversionMensual, setObjetivoInversionMensual] = useState(null)
  const [configurado, setConfigurado] = useState(false)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!usuarioId) return
    setCargando(true)

    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    if (!error) {
      setMetodo(data?.metodo ?? 'tasa')
      setTasaAhorroObjetivo(data?.tasa_ahorro_objetivo ?? null)
      setGastoMaximoFijo(data?.gasto_maximo_fijo ?? null)
      setObjetivoInversionMensual(data?.objetivo_inversion_mensual ?? null)
      setConfigurado(data?.tasa_ahorro_objetivo != null || data?.gasto_maximo_fijo != null)
    }
    setCargando(false)
  }, [usuarioId])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function guardarPresupuesto(nuevoMetodo, valor) {
    const payload = {
      usuario_id: usuarioId,
      metodo: nuevoMetodo,
      updated_at: new Date().toISOString(),
      tasa_ahorro_objetivo: nuevoMetodo === 'tasa' ? valor : null,
      gasto_maximo_fijo: nuevoMetodo === 'fijo' ? valor : null,
    }

    const { error } = await supabase.from('presupuestos').upsert(payload)

    if (!error) {
      setMetodo(nuevoMetodo)
      setTasaAhorroObjetivo(payload.tasa_ahorro_objetivo)
      setGastoMaximoFijo(payload.gasto_maximo_fijo)
      setConfigurado(true)
    }
    return !error
  }

  async function guardarObjetivoInversion(nuevoObjetivo) {
    const { error } = await supabase
      .from('presupuestos')
      .upsert({
        usuario_id: usuarioId,
        objetivo_inversion_mensual: nuevoObjetivo,
        updated_at: new Date().toISOString(),
      })

    if (!error) setObjetivoInversionMensual(nuevoObjetivo)
    return !error
  }

  return {
    metodo,
    tasaAhorroObjetivo,
    gastoMaximoFijo,
    objetivoInversionMensual,
    configurado,
    cargando,
    guardarPresupuesto,
    guardarObjetivoInversion,
  }
}
