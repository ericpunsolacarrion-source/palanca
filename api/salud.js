// SALUD + KEEP-ALIVE. Una petición ligera a Supabase (Auth y una consulta a la
// base de datos, que con la clave pública y sin sesión devuelve [] por RLS).
// - Mirar de un vistazo: https://palanca-zeta.vercel.app/api/salud
// - Keep-alive: el cron de vercel.json la llama cada día; así el proyecto
//   gratuito de Supabase no se pausa por 7 días sin actividad.
//   Para desactivarlo: quitar la entrada /api/salud de «crons» en vercel.json.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return res.status(503).json({ app: 'ok', supabase: 'sin configurar' })
  const probar = async (ruta) => {
    const t = Date.now()
    try {
      const r = await fetch(`${url}${ruta}`, { headers: { apikey: key }, signal: AbortSignal.timeout(8000) })
      return { ok: r.ok, estado: r.status, ms: Date.now() - t }
    } catch (e) {
      return { ok: false, estado: 0, ms: Date.now() - t, error: e?.name === 'TimeoutError' ? 'sin respuesta en 8 s' : 'no se puede conectar' }
    }
  }
  const [auth, baseDeDatos] = await Promise.all([probar('/auth/v1/health'), probar('/rest/v1/movimientos?select=id&limit=1')])
  const ok = auth.ok && baseDeDatos.ok
  if (!ok) console.error('[salud] Supabase no responde', JSON.stringify({ auth, baseDeDatos }))
  return res.status(ok ? 200 : 503).json({
    estado: ok ? 'todo bien' : 'Supabase no responde (¿proyecto pausado?)',
    app: 'ok',
    auth,
    base_de_datos: baseDeDatos,
    comprobado: new Date().toISOString(),
  })
}
