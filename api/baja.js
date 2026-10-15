// BAJA DE LOS RECORDATORIOS POR EMAIL. El enlace va firmado (api/_firma.js).
// GET muestra una página con un botón (los antivirus del correo abren los
// enlaces solos: así nadie se da de baja sin querer). POST hace la baja: es
// también la "baja en un clic" de Gmail/Apple Mail (cabecera List-Unsubscribe).
import { createClient } from '@supabase/supabase-js'
import { firmaValida } from './_firma.js'

const pagina = (titulo, cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:#f4f5f9;color:#151823}main{max-width:440px;margin:12vh auto;padding:28px 24px;background:#fff;border-radius:14px}h1{font-size:22px;margin:0 0 12px}p{line-height:1.55;color:#3a4050}button{font:inherit;font-weight:600;border:0;border-radius:10px;padding:12px 18px;background:#5b67e8;color:#fff;cursor:pointer}a{color:#5b67e8}</style></head><body><main>${cuerpo}</main></body></html>`

export default async function handler(req, res) {
  const u = String(req.query?.u ?? '')
  const t = String(req.query?.t ?? '')
  const secreto = process.env.RECORDATORIOS_SECRETO
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (!firmaValida(u, t, secreto)) {
    return res.status(400).send(pagina('Enlace no válido', '<h1>Enlace no válido</h1><p>Este enlace de baja no es correcto o ha caducado. Puedes desactivar los recordatorios en la app: Tu cuenta → Recordatorios por email.</p>'))
  }

  if (req.method === 'POST') {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !servicio) return res.status(500).send(pagina('Error', '<h1>No se ha podido completar</h1><p>Inténtalo más tarde o desactívalos en la app.</p>'))
    const sb = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await sb.from('perfiles').update({ recordatorios: false }).eq('usuario_id', u)
    if (error) return res.status(500).send(pagina('Error', '<h1>No se ha podido completar</h1><p>Inténtalo más tarde o desactívalos en la app.</p>'))
    return res.status(200).send(pagina('Baja hecha', '<h1>Hecho</h1><p>No te enviaremos más recordatorios por email. Si cambias de idea, puedes volver a activarlos en la app: Tu cuenta → Recordatorios por email.</p>'))
  }

  const accion = `/api/baja?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`
  return res.status(200).send(pagina('Darte de baja', `<h1>¿Dejar de recibir recordatorios?</h1><p>No te escribiremos más emails de recordatorio. Tu cuenta y tus datos no cambian.</p><form method="post" action="${accion}"><button type="submit">Sí, darme de baja</button></form>`))
}
