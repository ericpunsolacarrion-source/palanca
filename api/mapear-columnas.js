// Endpoint serverless (Vercel) que DEDUCE el mapeo de columnas de un CSV
// desordenado usando el modelo, para el importador de Palanca.
//
// PRIVACIDAD (crítico): el frontend envía SOLO las cabeceras y 2-3 filas de
// ejemplo, lo justo para inferir qué columna es cada cosa. NUNCA el archivo
// completo. Una vez devuelto el mapeo, el navegador procesa el resto del CSV
// de forma determinista (lib/importarCsv.js) sin enviar el grueso de los datos
// financieros a ningún modelo. La API key vive solo en el servidor.

const MODELO = process.env.IMPORTADOR_MODELO || process.env.CONSULTOR_MODELO || 'claude-haiku-4-5'
const MAX_TOKENS = 300

// Columnas canónicas que la app entiende (ver lib/importarCsv.js).
const COLUMNAS = ['fecha', 'tipo', 'categoria', 'concepto', 'importe', 'plataforma']

const SYSTEM_PROMPT = `Eres un asistente que mapea columnas de un CSV de movimientos financieros a un esquema fijo.

Recibes las CABECERAS del CSV y unas pocas filas de ejemplo. Debes deducir, para cada columna canónica, el ÍNDICE (base 0) de la columna del CSV que le corresponde, o -1 si no existe.

Columnas canónicas:
- fecha: la fecha del movimiento (formatos como 2025-03-13 o 13/03/2025).
- tipo: gasto / ingreso / inversion (o income/expense).
- categoria: categoría del movimiento (Comida, Nómina, Suscripciones…).
- concepto: descripción o nota libre del movimiento.
- importe: la cantidad (positiva). Puede venir con € o separadores de miles.
- plataforma: broker o plataforma de inversión (opcional; suele faltar).

Responde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código, con esta forma exacta:
{"fecha":N,"tipo":N,"categoria":N,"concepto":N,"importe":N,"plataforma":N}
donde cada N es el índice de columna (entero >= 0) o -1 si esa columna no está presente.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: 'El asistente de columnas no está configurado todavía.',
      code: 'sin_configurar',
    })
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {}
  const { cabeceras, muestras } = body

  if (!Array.isArray(cabeceras) || cabeceras.length === 0) {
    return res.status(400).json({ error: 'Faltan las cabeceras.' })
  }

  // Blindaje de privacidad en el propio servidor: como mucho 3 filas de ejemplo
  // y truncadas, aunque el cliente enviara de más.
  const filasEjemplo = (Array.isArray(muestras) ? muestras : [])
    .slice(0, 3)
    .map((fila) => (Array.isArray(fila) ? fila.slice(0, cabeceras.length).map((c) => String(c).slice(0, 80)) : []))

  const contenido = `Cabeceras (con su índice):\n${cabeceras
    .map((c, i) => `${i}: ${String(c).slice(0, 80)}`)
    .join('\n')}\n\nFilas de ejemplo:\n${filasEjemplo
    .map((f) => f.join(' | '))
    .join('\n')}`

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
        messages: [{ role: 'user', content: contenido }],
      }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      console.error('Error de Anthropic (mapear-columnas):', respuesta.status, detalle)
      return res.status(502).json({ error: 'El asistente no está disponible ahora mismo.' })
    }

    const datos = await respuesta.json()
    const texto = (datos.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    const mapeo = normalizarMapeo(extraerJson(texto), cabeceras.length)
    if (!mapeo) {
      return res.status(502).json({ error: 'No se ha podido deducir el mapeo.' })
    }
    return res.status(200).json({ mapeo })
  } catch (e) {
    console.error('Fallo mapeando columnas:', e)
    return res.status(502).json({ error: 'El asistente no está disponible ahora mismo.' })
  }
}

// Extrae el primer objeto JSON del texto (por si el modelo añade algo alrededor).
function extraerJson(texto) {
  if (!texto) return null
  const inicio = texto.indexOf('{')
  const fin = texto.lastIndexOf('}')
  if (inicio < 0 || fin <= inicio) return null
  return safeParse(texto.slice(inicio, fin + 1))
}

// Valida el mapeo devuelto: solo columnas conocidas, índices en rango o -1.
function normalizarMapeo(obj, nCols) {
  if (!obj || typeof obj !== 'object') return null
  const mapeo = {}
  for (const col of COLUMNAS) {
    const v = Number(obj[col])
    mapeo[col] = Number.isInteger(v) && v >= 0 && v < nCols ? v : -1
  }
  return mapeo
}

function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
