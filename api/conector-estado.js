// ¿Está listo el conector de Claude? Lo está cuando el servidor OAuth de
// Supabase Auth responde con sus metadatos (se activa en el panel de Supabase).
// La app lo consulta para mostrar «Conecta tu asistente de IA» o «Muy pronto».
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300')
  const supabase = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  if (!supabase) return res.status(200).json({ disponible: false })
  try {
    const r = await fetch(`${supabase}/.well-known/oauth-authorization-server/auth/v1`, { signal: AbortSignal.timeout(4000) })
    const meta = r.ok ? await r.json() : null
    return res.status(200).json({ disponible: Boolean(meta?.authorization_endpoint && meta?.registration_endpoint) })
  } catch {
    return res.status(200).json({ disponible: false })
  }
}
