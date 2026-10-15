import { supabase } from './supabaseClient'

// ANALÍTICA DE USO (propia, sin terceros). Solo se guarda QUÉ tipo de acción
// y CUÁNDO: nunca importes, conceptos ni textos. Se escribe con la función
// registrar_evento() de la BD (supabase-schema-metricas.sql), que respeta
// perfiles.analitica = false y pone un tope diario. Si la tabla aún no existe,
// falla en silencio: nunca molesta al usuario.
//
// Tipos: visita · movimiento · movimiento_rapido · cobro_confirmado ·
// fijo_nuevo · importacion · importacion_capturas · ahorro_negociado ·
// tour · datos_ejemplo · exportacion · clic_email (entró desde un recordatorio) · fulcro_local (respuesta de datos sin IA)

export const MINUTOS_VISITA = 30
const CLAVE_VISITA = 'palanca_ultima_visita'

let activa = false

// Una "visita" = abrir la app (o volver a ella) tras ≥ 30 min sin usarla.
export function debeContarVisita(ultima, ahora, minutos = MINUTOS_VISITA) {
  const t = Number(ultima)
  return !Number.isFinite(t) || t <= 0 || ahora - t >= minutos * 60000
}

export function registrarEvento(tipo) {
  if (!activa) return
  try {
    supabase.rpc('registrar_evento', { p_tipo: tipo }).then(
      () => {},
      () => {},
    )
  } catch {
    // sin red o sin tabla: se ignora
  }
}

function contarVisita() {
  if (!activa || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return
  const ahora = Date.now()
  let ultima = null
  try {
    ultima = localStorage.getItem(CLAVE_VISITA)
    localStorage.setItem(CLAVE_VISITA, String(ahora))
  } catch {
    // sin almacenamiento: cuenta cada apertura
  }
  if (debeContarVisita(ultima, ahora)) registrarEvento('visita')
}

// Los botones de los emails llevan ?desde=email_<tipo>: se cuenta y se limpia la URL.
function contarClicEmail() {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    const desde = url.searchParams.get('desde') ?? ''
    if (!desde.startsWith('email_')) return
    registrarEvento('clic_email')
    url.searchParams.delete('desde')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  } catch {
    // nada
  }
}

let escuchando = false
// La llama App con el usuario y su preferencia. `permitida === false` la apaga.
export function iniciarAnalitica({ usuarioId, permitida }) {
  activa = Boolean(usuarioId) && permitida !== false
  if (!activa) return
  contarVisita()
  contarClicEmail()
  if (!escuchando && typeof document !== 'undefined') {
    escuchando = true
    // PWA: volver a la app desde segundo plano también es una visita.
    document.addEventListener('visibilitychange', contarVisita)
  }
}
