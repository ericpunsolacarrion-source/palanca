// Metadatos del recurso protegido (RFC 9728) del conector MCP: le dicen a
// Claude que /api/mcp se protege con el servidor OAuth de Supabase Auth de
// Palanca. Servido en /.well-known/oauth-protected-resource (vercel.json).
import { origen } from './mcp.js'

export default function handler(req, res) {
  const supabase = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=300')
  if (!supabase) return res.status(500).json({ error: 'Falta configuración del servidor' })
  return res.status(200).json({
    resource: `${origen(req)}/api/mcp`,
    authorization_servers: [`${supabase}/auth/v1`],
    bearer_methods_supported: ['header'],
    resource_name: 'Palanca',
    resource_documentation: `${origen(req)}/`,
  })
}
