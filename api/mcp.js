// CONECTOR DE PALANCA PARA CLAUDE (servidor MCP remoto, transporte HTTP sin
// estado). Claude lo añade como conector y el usuario entra con SU cuenta de
// Palanca: el inicio de sesión es el servidor OAuth 2.1 de Supabase Auth y aquí
// solo llega su token. Sin token válido → 401 con el enlace a los metadatos
// (/.well-known/oauth-protected-resource), que es como Claude sabe dónde iniciar
// sesión. Con token: todas las consultas van COMO el usuario (RLS).
// La lógica vive en _mcpNucleo.js (probada sin HTTP).
import { clienteDelUsuario, usuarioDeLaPeticion } from './_auth.js'
import { manejarMensaje } from './_mcpNucleo.js'

export const config = { maxDuration: 60 }

export const origen = (req) => {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'palanca-zeta.vercel.app'
  const proto = req.headers?.['x-forwarded-proto'] || (String(host).startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID')
  res.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate, Mcp-Session-Id')
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const usuario = await usuarioDeLaPeticion(req)
  if (!usuario) {
    res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${origen(req)}/.well-known/oauth-protected-resource"`)
    return res.status(401).json({ error: 'invalid_token', error_description: 'Inicia sesión en Palanca para usar el conector.' })
  }
  // Sin flujo de eventos (SSE): todo es petición → respuesta.
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST, OPTIONS').json({ error: 'Usa POST' })

  let cuerpo = req.body
  if (typeof cuerpo === 'string') {
    try {
      cuerpo = JSON.parse(cuerpo)
    } catch {
      return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON no válido' } })
    }
  }
  const sb = clienteDelUsuario(req)
  if (!sb) return res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Falta configuración del servidor' } })

  const lote = Array.isArray(cuerpo)
  const mensajes = lote ? cuerpo : [cuerpo]
  const respuestas = []
  for (const m of mensajes) {
    const r = await manejarMensaje(m, { sb, usuario })
    if (r) respuestas.push(r)
  }
  if (respuestas.length === 0) return res.status(202).end() // solo notificaciones
  res.setHeader('Content-Type', 'application/json')
  return res.status(200).send(JSON.stringify(lote ? respuestas : respuestas[0]))
}
