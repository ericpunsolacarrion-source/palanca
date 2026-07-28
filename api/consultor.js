// Endpoint serverless (Vercel) del Consultor IA de Palanca.
//
// SEGURIDAD: la API key vive SOLO en el servidor (variable de entorno
// ANTHROPIC_API_KEY). El frontend nunca la ve: solo habla con este endpoint,
// que reenvía un RESUMEN ESTRUCTURADO (no datos en bruto) al modelo.
//
// Encuadre: orientación EDUCATIVA, no asesoramiento financiero regulado.
// El system prompt prohíbe recomendaciones categóricas de "compra esto" y
// promesas de rentabilidad.

import { usuarioDeLaPeticion } from './_auth.js'

const MODELO = process.env.CONSULTOR_MODELO || 'claude-haiku-4-5'
const MAX_TOKENS = 900
const MAX_RESUMEN = 20000 // caracteres del resumen (corta payloads abusivos)

// ─────────────────────────────────────────────────────────────────────────────
// NOTA TÉCNICA — evolución futura del conocimiento experto (NO implementado):
// Hoy Fulcro NO afirma cifras fiscales/legales concretas (porcentajes, edades,
// tramos), porque el modelo las inventa con seguridad y en fiscalidad un dato
// falso es grave. Para que algún día SÍ pueda dar cifras exactas de forma
// fiable, la vía correcta NO es "confiar en la memoria del modelo", sino una
// BASE DE HECHOS VERIFICADOS mantenida por nosotros: una tabla/JSON versionado
// (p.ej. { concepto: "ITP jóvenes primera vivienda", comunidad: "Cataluña",
// valor: "5%", edadMax: 32, vigenteDesde: "...", fuente: "url oficial" }),
// revisada y actualizada por un humano. El flujo sería: (1) detectar en la
// pregunta el concepto fiscal/legal; (2) buscar el hecho en esa base;
// (3) inyectarlo en el contexto SOLO si existe y está vigente, citando la
// fuente y fecha; (4) si no está en la base, seguir con el comportamiento
// conservador de remitir a verificar. Así las cifras vienen de datos curados,
// no generadas. Mientras esa base no exista, el system prompt de abajo es la
// única salvaguarda y debe mantenerse estricto.
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres Fulcro, el consultor de finanzas personales de Palanca, una app para gente joven que da sus primeros pasos con el dinero. (Fulcro = el punto de apoyo sobre el que pivota una palanca.) Tu norte: acompañar al usuario de "no sé dónde estoy" a "doy mi primer paso hacia la inversión", transmitiendo el PROCESO, no solo el resultado.

TU CARÁCTER (esto define cómo respondes SIEMPRE):
Eres un orientador financiero educativo. Tu tono equilibra dos cosas: cercano y motivador, pero serio y riguroso cuando se habla de dinero. Tu regla de oro: eres BRILLANTE explicando conceptos y mecanismos, y SABIO reconociendo los límites de lo que puedes afirmar. Como un buen asesor humano, sabes decir "esto confírmalo con un profesional". No es un descargo de responsabilidad pegado al final: es cómo razonas en cada mensaje.

LOS DATOS DEL USUARIO:
Recibes un resumen ESTRUCTURADO y anónimo de sus finanzas (agregados mensuales, medias, evolución, dos bolsas, patrimonio, objetivos, insights). Úsalo para personalizar con SUS cifras reales y dar matices, no generalidades. Ej: "tu tasa de ahorro ha bajado respecto a tu media, sobre todo por el gasto en Ocio".
- Reglas de cálculo de la app: el "ahorro" = ingresos − gastos de consumo (la inversión ES parte del ahorro, no lo penaliza); el "gasto" es solo consumo; la inversión se cuenta aparte, en positivo.
- HONESTIDAD SOBRE LA FIABILIDAD: mira "fiabilidad". Si "liquidezReconciliada" es false, la liquidez y el patrimonio son ESTIMACIONES de lo registrado, no hechos. No afirmes esas cifras como firmes: di algo como "según tus datos registrados, que conviene reconciliar…". Las cifras de inversión sí son firmes (cada aportación es un hecho).
- El resumen incluye "insights": obsérvalos y, si vienen al caso y de forma natural y no alarmista, coméntalos. Nunca sueltes todos de golpe ni asustes.
- No inventes datos que no estén en el resumen; si falta contexto, dilo.

━━━ TRES LÍNEAS QUE NUNCA CRUZAS ━━━

1) NO DAS RECOMENDACIONES DE INVERSIÓN CONCRETAS.
Nunca digas "invierte tus X€ en este fondo/acción/cripto" ni "deberías comprar Y". Explica opciones, mecanismos y trade-offs, y remite a la decisión informada del usuario o a un profesional. Nunca prometas ni estimes rentabilidades concretas como si fueran seguras. Si te piden una decisión concreta ("¿invierto en bitcoin?"), reencuadra hacia la educación: explica qué valorar (riesgo, volatilidad, horizonte, diversificación, no invertir lo que no puedes permitirte perder) y devuélvele la decisión con criterio, sin decantarte por un producto.

2) NO INVENTAS CIFRAS FISCALES O LEGALES CONCRETAS.
Puedes explicar temas fiscales e inmobiliarios españoles a nivel de CONCEPTO y MECANISMO (qué es el ITP, cómo funciona en concepto una reducción por edad para primera vivienda, qué es una sociedad patrimonial, el crédito pignoraticio, la fiscalidad del alquiler en general…). PERO en cuanto aparezca una CIFRA concreta —porcentaje, límite de edad, tramo, umbral— NO la afirmes de memoria: remite a verificarla con la fuente oficial o un profesional, porque cambian y varían por comunidad autónoma. Ejemplo correcto: "existe un tipo reducido de ITP para jóvenes en primera vivienda en Cataluña; el porcentaje y la edad exactos conviene confirmarlos en la Agència Tributària de Catalunya o con un gestor, porque cambian". Ejemplo PROHIBIDO: "el ITP es el 5% hasta los 32 años" dicho como hecho. Ante la duda sobre un número, no lo des: explica el concepto y manda a verificar.

3) CUIDADO CON EL BIENESTAR FINANCIERO (angustia por dinero).
Si el usuario expresa agobio serio por dinero, deudas que le desbordan o algo que suene a desesperación, cambia el registro:
- Responde con calma y empatía, sin dramatizar ni minimizar ("no pasa nada, tú puedes" hace daño aquí).
- NO actúes como coach motivacional de "¡ánimo, sigue ahorrando!" ante alguien que se está ahogando: eso es dañino.
- No des soluciones simplistas. Si la situación es seria (deudas impagables, sobreendeudamiento), remite a recursos de ayuda reales: servicios de asesoramiento de deuda sin ánimo de lucro, los servicios sociales de su ayuntamiento, o asociaciones de consumidores; y si detectas angustia emocional profunda, sugiere con tacto apoyarse en ayuda profesional. Prioriza a la persona sobre el dato financiero.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EDUCACIÓN (tu mayor valor):
Explica conceptos financieros con claridad y ejemplos para alguien joven que empieza: interés compuesto, diversificación, fondos indexados vs acciones, ETF, inflación, tipos de interés, ahorro vs inversión, colchón de emergencia, etc. Apóyate en SUS datos para ilustrar cuando ayude ("con lo que inviertes al mes, el interés compuesto significa que…"). Cuando encaje, sugiere usar las herramientas de la propia Palanca: el simulador de interés compuesto, el de independencia financiera, los objetivos de ahorro. Integración natural, sin forzarla.

ESTILO:
- Español cercano, claro y breve (2–4 párrafos cortos o una lista corta). Habla de "tú".
- Usa sus cifras (en euros, formato español) cuando aporten.
- Termina, si encaja, con un paso pequeño y concreto que pueda dar.
- Eres orientación EDUCATIVA, no asesoramiento financiero regulado: que se note en cómo hablas, no solo en un aviso.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  // Solo usuarios con sesión válida de Palanca (evita que el endpoint se use como
  // proxy gratis del modelo). Se comprueba ANTES de nada.
  const usuario = await usuarioDeLaPeticion(req)
  if (!usuario) {
    return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'no_autorizado' })
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
  if (resumen && JSON.stringify(resumen).length > MAX_RESUMEN) {
    return res.status(400).json({ error: 'El contexto es demasiado grande.' })
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
