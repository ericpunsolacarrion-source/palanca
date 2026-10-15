// RECORDATORIOS POR EMAIL (función programada, una vez al día: vercel.json).
// Vercel solo ejecuta las tareas programadas en PRODUCCIÓN, y además esta
// función no envía nada si falta cualquiera de estas variables:
//   RECORDATORIOS_ACTIVOS=true · CRON_SECRET · SUPABASE_SERVICE_ROLE_KEY ·
//   RESEND_API_KEY · RECORDATORIOS_REMITENTE ("Palanca <hola@tudominio>") ·
//   RECORDATORIOS_SECRETO (firma de los enlaces de baja) · APP_URL
// Opcionales: RECORDATORIOS_SOLO_A (email: solo se envía a esa dirección, para
// probar) · PREMIUM_ACTIVO=true (invitaciones a Premium) · RECORDATORIOS_MAX.
// ?simular=1 devuelve a quién se escribiría y qué, sin enviar nada.
// Guía: docs/RECORDATORIOS.md.
import { createClient } from '@supabase/supabase-js'
import { componerEmail, elegirRecordatorio } from '../src/lib/recordatorios.js'
import { enlaceBaja } from './_firma.js'

const hoyEnMadrid = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })

export function configuracion(env = process.env) {
  const c = {
    activos: env.RECORDATORIOS_ACTIVOS === 'true',
    cron: env.CRON_SECRET,
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    servicio: env.SUPABASE_SERVICE_ROLE_KEY,
    resend: env.RESEND_API_KEY,
    remitente: env.RECORDATORIOS_REMITENTE,
    secreto: env.RECORDATORIOS_SECRETO,
    app: (env.APP_URL || '').replace(/\/$/, ''),
    soloA: (env.RECORDATORIOS_SOLO_A || '').trim().toLowerCase() || null,
    premiumActivo: env.PREMIUM_ACTIVO === 'true',
    max: Number(env.RECORDATORIOS_MAX ?? 300),
  }
  c.faltan = ['cron', 'url', 'servicio', 'resend', 'remitente', 'secreto', 'app'].filter((k) => !c[k])
  return c
}

const emailDelRemitente = (r) => (String(r).match(/<([^>]+)>/)?.[1] ?? r).trim()

async function enviar(c, para, email, baja) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.resend}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: c.remitente,
      to: [para],
      subject: email.asunto,
      html: email.html,
      text: email.texto,
      // Baja en un clic desde el propio cliente de correo (Gmail, Apple Mail…).
      headers: { 'List-Unsubscribe': `<${baja}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }),
  })
  const datos = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(datos?.message || `Resend ${r.status}`)
  return datos.id ?? null
}

export default async function handler(req, res) {
  const c = configuracion()
  // Siempre cerrado: sin CRON_SECRET correcto no responde nada útil.
  if (!c.cron || req.headers?.authorization !== `Bearer ${c.cron}`) return res.status(401).json({ error: 'No autorizado' })
  if (!c.activos) return res.status(200).json({ activo: false, motivo: 'RECORDATORIOS_ACTIVOS no es "true"' })
  if (c.faltan.length) return res.status(200).json({ activo: false, faltan: c.faltan })

  const simular = String(req.query?.simular ?? '') === '1'
  const sb = createClient(c.url, c.servicio, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: candidatos, error } = await sb.rpc('recordatorios_candidatos')
  if (error) return res.status(500).json({ error: error.message })

  const hoy = hoyEnMadrid()
  const remitente = { nombre: 'Palanca', email: emailDelRemitente(c.remitente) }
  const resultado = { hoy, candidatos: candidatos.length, enviados: 0, errores: 0, detalle: [] }

  for (const f of candidatos) {
    if (resultado.enviados >= c.max) break
    if (c.soloA && String(f.email).toLowerCase() !== c.soloA) continue
    const tipo = elegirRecordatorio(f, hoy, { premiumActivo: c.premiumActivo })
    if (!tipo) continue
    const baja = enlaceBaja(c.app, f.uid, c.secreto)
    const email = componerEmail(tipo, f, hoy, { app: c.app, baja }, remitente)
    if (simular) {
      resultado.detalle.push({ email: f.email, tipo, asunto: email.asunto })
      continue
    }
    try {
      const id = await enviar(c, f.email, email, baja)
      await sb.from('recordatorios_enviados').insert({ usuario_id: f.uid, tipo, proveedor_id: id })
      resultado.enviados += 1
      resultado.detalle.push({ tipo })
    } catch (e) {
      resultado.errores += 1
      console.error('recordatorio', tipo, e.message)
    }
  }
  return res.status(200).json(resultado)
}
