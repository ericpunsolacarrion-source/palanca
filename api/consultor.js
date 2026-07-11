// Endpoint serverless (Vercel) del Consultor IA de Palanca.
//
// SEGURIDAD: la API key vive SOLO en el servidor (variable de entorno
// ANTHROPIC_API_KEY). El frontend nunca la ve: solo habla con este endpoint,
// que reenvía un RESUMEN ESTRUCTURADO (no datos en bruto) al modelo.
//
// Encuadre: orientación EDUCATIVA, no asesoramiento financiero regulado.
// El system prompt prohíbe recomendaciones categóricas de "compra esto" y
// promesas de rentabilidad.

const MODELO = process.env.CONSULTOR_MODELO || 'claude-haiku-4-5'
const MAX_TOKENS = 900

const SYSTEM_PROMPT = `Eres Fulcro, el consultor de finanzas personales de Palanca, una app para gente joven que da sus primeros pasos con el dinero. (Fulcro = el punto de apoyo sobre el que pivota una palanca.) Tu norte: acompañar al usuario de "no sé dónde estoy" a "doy mi primer paso hacia la inversión", transmitiendo el PROCESO, no solo el resultado.

Recibes un resumen ESTRUCTURADO y anónimo de las finanzas del usuario (agregados mensuales, medias, evolución, objetivos). Úsalo para personalizar cada respuesta con sus cifras reales.

Reglas de la app (respétalas siempre):
- El "ahorro" = ingresos − gastos de consumo. La inversión ES parte del ahorro (invertir no penaliza el ratio de ahorro).
- El "gasto" es solo consumo; la inversión se cuenta aparte, en positivo.

Encuadre OBLIGATORIO — orientación educativa, NO asesoramiento financiero regulado:
- Explica conceptos, señala patrones en SUS datos y sugiere vías o preguntas a considerar.
- NUNCA des recomendaciones categóricas de comprar un producto concreto ("compra este fondo/acción/cripto").
- NUNCA prometas ni estimes rentabilidades concretas como si fueran seguras.
- Si te piden una decisión de inversión concreta, reencuadra hacia la educación: explica los criterios a valorar y anima a formarse o consultar a un profesional colegiado.

Estilo:
- Español cercano, claro y breve (2–4 párrafos cortos o una lista corta).
- Habla de "tú". Usa sus cifras (en euros, formato español) cuando aporten.
- Termina, si encaja, con un paso concreto y pequeño que pueda dar.
- No inventes datos que no estén en el resumen; si falta contexto, dilo.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Degradación elegante: el frontend muestra un aviso, no se rompe.
    return res.status(503).json({
      error: 'El consultor no está configurado todavía.',
      code: 'sin_configurar',
    })
  }

  // En Vercel (runtime Node) req.body ya viene parseado si el content-type es JSON.
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {}
  const { resumen, pregunta, historial } = body

  if (!pregunta || typeof pregunta !== 'string' || !pregunta.trim()) {
    return res.status(400).json({ error: 'Falta la pregunta.' })
  }
  if (pregunta.length > 2000) {
    return res.status(400).json({ error: 'La pregunta es demasiado larga.' })
  }

  // Historial previo (para dar continuidad a la conversación), acotado.
  const mensajes = []
  if (Array.isArray(historial)) {
    for (const m of historial.slice(-8)) {
      if (!m || (m.rol !== 'usuario' && m.rol !== 'consultor')) continue
      const texto = String(m.texto ?? '').slice(0, 4000)
      if (!texto) continue
      mensajes.push({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: texto })
    }
  }

  // El turno actual lleva el resumen estructurado como contexto + la pregunta.
  const contexto = resumen
    ? `Contexto (resumen estructurado de mis finanzas, en JSON):\n${JSON.stringify(resumen)}\n\n`
    : ''
  mensajes.push({ role: 'user', content: `${contexto}Mi pregunta: ${pregunta.trim()}` })

  try {
    const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: mensajes,
      }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      console.error('Error de Anthropic:', respuesta.status, detalle)
      return res.status(502).json({ error: 'El consultor no está disponible ahora mismo.' })
    }

    const datos = await respuesta.json()
    const texto = (datos.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    return res.status(200).json({ respuesta: texto || 'No he sabido qué responder. Prueba a reformular.' })
  } catch (e) {
    console.error('Fallo llamando al consultor:', e)
    return res.status(502).json({ error: 'El consultor no está disponible ahora mismo.' })
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
