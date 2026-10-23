// Endpoint serverless (Vercel): lee CAPTURAS DE PANTALLA de la app del banco
// (la lista de movimientos) y devuelve los movimientos estructurados.
//
// Para quien no puede (o no sabe) descargar el extracto: hace capturas de su
// lista de movimientos y Palanca las convierte en datos. El usuario REVISA
// todo antes de importar (nada se guarda solo).
//
// Privacidad: las imágenes llegan reducidas desde el móvil, se envían al
// modelo SOLO para leerlas y no se guardan en ningún sitio (ni aquí ni en la BD).
//
// Coste mínimo: claude-haiku-5-5, esfuerzo bajo, salida estructurada (JSON
// validado contra un esquema). ~3.000 tokens de imagen por captura.
// Seguridad: solo usuarios con sesión; tope de imágenes y tamaño por petición
// y de peticiones al día por usuario; errores sin detalles internos.

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { clienteDelUsuario, usuarioDeLaPeticion } from './_auth.js'
import { inicioDelDiaEnMadrid } from './consultor.js'

const MODELO = process.env.CAPTURAS_MODELO || 'claude-haiku-5-5'
const MAX_IMAGENES = 4 // por petición (el cliente envía en lotes)
const MAX_BYTES_IMAGEN = 1_500_000 // base64 por imagen (el cliente las reduce a ~300 KB)
// Peticiones/usuario/día: 15 en Production (un año entero cabe) y 25 en pruebas.
const LIMITE_DIARIO = Number(process.env.CAPTURAS_LIMITE_DIARIO ?? ((process.env.VERCEL_ENV || 'development') === 'production' ? 15 : 25))
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']

// Mismo criterio que Fulcro: en producción, activo con la API key salvo que se
// apague con IA_PUBLICA=false (o FULCRO_PUBLICO=false).
const ENTORNO = process.env.VERCEL_ENV || 'development'
const PERMITIDO_AQUI =
  ENTORNO !== 'production' || (process.env.IA_PUBLICA !== 'false' && process.env.FULCRO_PUBLICO !== 'false')
const ACTIVO = Boolean(process.env.ANTHROPIC_API_KEY) && PERMITIDO_AQUI

export const config = { maxDuration: 60 }

export const SYSTEM_PROMPT = `Lees capturas de pantalla de la lista de MOVIMIENTOS de la app o web de un banco (normalmente español) y devuelves cada movimiento como dato estructurado.

Reglas:
- Un elemento por cada movimiento visible (una compra, un recibo, una transferencia, un bizum, una nómina…). Si una captura repite movimientos de otra (se solapan), inclúyelos igualmente: la app los fusiona.
- "importe": NEGATIVO si sale dinero (gasto, cargo, recibo, compra, transferencia enviada; suele verse con "-" o en rojo) y POSITIVO si entra (nómina, abono, bizum recibido, devolución; suele verse con "+" o en verde). Sin símbolo de moneda. Formato español: "1.234,56" es mil doscientos treinta y cuatro con cincuenta y seis.
- "fecha": AAAA-MM-DD. Las apps agrupan por día con cabeceras ("Hoy", "Ayer", "Lunes 13 oct", "15 de octubre"): aplica a cada movimiento la fecha de su grupo. Resuelve "Hoy" y "Ayer" con la fecha de hoy que te doy. Si falta el año, usa el más reciente que no deje la fecha en el futuro.
- "concepto": el comercio o la descripción tal como aparece (p. ej. "Mercadona", "Recibo Iberdrola", "Bizum de Ana"), sin números de tarjeta ni referencias largas.
- "captura": el número de la captura (empezando en 1) donde lo has leído.
- NO incluyas saldos, totales, "saldo disponible", cabeceras, anuncios, ofertas ni movimientos "pendientes" o "retenidos" (si aparecen marcados así).
- Nunca inventes: si un dato no se lee bien, omite ese movimiento y explícalo en "avisos" en una frase corta en español.
- Si una imagen no es una lista de movimientos bancarios, no extraigas nada de ella y dilo en "avisos".`

const ESQUEMA = {
  type: 'object',
  properties: {
    movimientos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fecha: { type: 'string', description: 'AAAA-MM-DD' },
          concepto: { type: 'string' },
          importe: { type: 'number', description: 'Negativo si sale dinero, positivo si entra' },
          captura: { type: 'integer' },
        },
        required: ['fecha', 'concepto', 'importe', 'captura'],
        additionalProperties: false,
      },
    },
    avisos: { type: 'array', items: { type: 'string' } },
  },
  required: ['movimientos', 'avisos'],
  additionalProperties: false,
}

// Valida el cuerpo: lista de imágenes {tipo, datos(base64)} y la fecha de hoy
// del usuario (su zona horaria). Devuelve { error } o { imagenes, hoy }.
export function validarPeticion(body) {
  const imagenes = Array.isArray(body?.imagenes) ? body.imagenes : null
  if (!imagenes || imagenes.length === 0) return { error: 'No hay capturas.' }
  if (imagenes.length > MAX_IMAGENES) return { error: `Máximo ${MAX_IMAGENES} capturas por envío.` }
  for (const img of imagenes) {
    if (!img || !TIPOS.includes(img.tipo) || typeof img.datos !== 'string') return { error: 'Formato de imagen no válido.' }
    if (img.datos.length > MAX_BYTES_IMAGEN || !/^[A-Za-z0-9+/=]+$/.test(img.datos)) return { error: 'Imagen demasiado grande o dañada.' }
  }
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(body?.hoy ?? '') ? body.hoy : new Date().toISOString().slice(0, 10)
  return { imagenes, hoy }
}

export function peticionCapturas(imagenes, hoy, modelo = MODELO) {
  const contenido = []
  imagenes.forEach((img, i) => {
    contenido.push({ type: 'text', text: `Captura ${i + 1}:` })
    contenido.push({ type: 'image', source: { type: 'base64', media_type: img.tipo, data: img.datos } })
  })
  contenido.push({ type: 'text', text: `Hoy es ${hoy}. Extrae los movimientos de estas ${imagenes.length} capturas.` })
  return {
    model: modelo,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contenido }],
    output_config: { effort: 'low', format: jsonSchemaOutputFormat(ESQUEMA) },
  }
}

// Limpia lo que devuelve el modelo: fechas válidas y no futuras, importes
// finitos y razonables, conceptos acotados. Lo dudoso se descarta.
export function limpiarSalida(salida, hoy, nImagenes) {
  const movimientos = []
  for (const m of Array.isArray(salida?.movimientos) ? salida.movimientos : []) {
    const fecha = String(m?.fecha ?? '')
    const importe = Math.round(Number(m?.importe) * 100) / 100
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoy || fecha < '2000-01-01') continue
    if (!Number.isFinite(importe) || importe === 0 || Math.abs(importe) >= 1e9) continue
    const concepto = String(m?.concepto ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
    const captura = Math.min(Math.max(1, Math.round(Number(m?.captura) || 1)), nImagenes)
    movimientos.push({ fecha, concepto, importe, captura })
  }
  const avisos = (Array.isArray(salida?.avisos) ? salida.avisos : [])
    .map((a) => String(a).slice(0, 200))
    .slice(0, 5)
  return { movimientos, avisos }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ activo: ACTIVO })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const usuario = await usuarioDeLaPeticion(req)
  if (!usuario) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'no_autorizado' })
  if (!ACTIVO) return res.status(503).json({ error: 'La lectura de capturas aún no está activada.', code: 'sin_configurar' })

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {}
  const v = validarPeticion(body)
  if (v.error) return res.status(400).json({ error: v.error })

  // Tope diario por usuario (registro en fulcro_uso con modelo "capturas:…").
  const sb = clienteDelUsuario(req)
  if (!sb) return res.status(503).json({ error: 'No disponible ahora mismo. Inténtalo en unos minutos.', code: 'sin_contador' })
  if (LIMITE_DIARIO > 0) {
    const { count, error } = await sb
      .from('fulcro_uso')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuario.id)
      .like('modelo', 'capturas:%')
      .gte('created_at', inicioDelDiaEnMadrid().toISOString())
    // Falla cerrado: sin poder contar, no se procesa (cada lectura cuesta).
    if (error) return res.status(503).json({ error: 'No disponible ahora mismo. Inténtalo en unos minutos.', code: 'sin_contador' })
    if ((count ?? 0) >= LIMITE_DIARIO) {
      return res.status(429).json({ error: 'Has llegado al máximo de capturas por hoy. Mañana puedes seguir.', code: 'limite_diario' })
    }
  }

  const client = new Anthropic({ timeout: 55_000, maxRetries: 1 })
  try {
    const respuesta = await client.messages.parse(peticionCapturas(v.imagenes, v.hoy))
    if (sb) {
      const u = respuesta.usage || {}
      await sb.from('fulcro_uso').insert({
        usuario_id: usuario.id,
        modelo: `capturas:${respuesta.model || MODELO}`.slice(0, 60),
        tokens_entrada: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
        tokens_salida: u.output_tokens ?? 0,
        tokens_cache: u.cache_read_input_tokens ?? 0,
      })
    }
    if (respuesta.stop_reason === 'refusal' || !respuesta.parsed_output) {
      return res.status(200).json({ movimientos: [], avisos: ['No se han podido leer estas capturas. Prueba con otras más nítidas.'] })
    }
    const limpio = limpiarSalida(respuesta.parsed_output, v.hoy, v.imagenes.length)
    if (respuesta.stop_reason === 'max_tokens') limpio.avisos.push('Había demasiados movimientos: envía menos capturas a la vez.')
    return res.status(200).json(limpio)
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error('Capturas: error de Anthropic', e.status, e.message)
    else console.error('Capturas: fallo', e)
    if (e instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'La lectura de capturas no está bien configurada.', code: 'sin_configurar' })
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Hay mucha demanda ahora mismo. Inténtalo en un minuto.' })
    return res.status(502).json({ error: 'No se han podido leer las capturas. Inténtalo de nuevo.' })
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
