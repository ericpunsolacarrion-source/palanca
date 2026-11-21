// Errores técnicos del acceso (login, alta, recuperar contraseña) para poder
// saber QUÉ falló cuando a alguien no le deja entrar. Llegan desde la app con
// navigator.sendBeacon y se escriben en los registros de Vercel (Logs →
// buscar «[auth-error]»). Sin datos personales: la app ya quita el email.
const CAMPOS = ['contexto', 'nombre', 'estado', 'codigo', 'mensaje']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  let d = req.body
  try {
    if (typeof d === 'string') d = JSON.parse(d)
  } catch {
    return res.status(400).end()
  }
  if (!d || typeof d !== 'object') return res.status(400).end()
  const limpio = {}
  for (const k of CAMPOS) limpio[k] = String(d[k] ?? '').replace(/[^\s@]+@[^\s@]+/g, '[email]').slice(0, 200)
  console.warn('[auth-error]', JSON.stringify(limpio))
  return res.status(204).end()
}
