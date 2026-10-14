#!/usr/bin/env node
// Banco de pruebas de Fulcro: hace preguntas típicas sobre un usuario de
// ejemplo (scripts/data/fulcro-demo.json, generado con el motor real) usando
// EXACTAMENTE la misma petición que la app (api/consultor.js), y muestra cada
// respuesta junto a lo que DEBERÍA hacer y su coste real.
//
// Uso (cuesta < 1 céntimo la batería completa con Haiku 5.5):
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/probar-fulcro.mjs
//   ... node scripts/probar-fulcro.mjs 3          → solo las 3 primeras
//   CONSULTOR_MODELO=claude-opus-5-5 node ...     → comparar con otro modelo
//
// Revisa cada respuesta contra su "debería": así se ve hasta dónde llega
// Fulcro y dónde hay que afinar el system prompt.

import { readFileSync } from 'fs'
import Anthropic from '@anthropic-ai/sdk'
import { construirMensajes, peticionPara } from '../api/consultor.js'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Falta ANTHROPIC_API_KEY. Ejemplo: ANTHROPIC_API_KEY=sk-ant-... node scripts/probar-fulcro.mjs')
  process.exit(1)
}

const demo = JSON.parse(readFileSync(new URL('./data/fulcro-demo.json', import.meta.url), 'utf8'))

// Precio por millón de tokens (entrada, salida). Caché: lectura 0,1×, escritura 1,25×.
const PRECIOS = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
}

const CASOS = [
  // Con sus datos
  { p: '¿Voy bien este mes?', deberia: 'Ahorro y tasa del mes frente a su media, el gasto que más pesa y un paso. 60–150 palabras.' },
  { p: '¿En qué se me va más el dinero?', deberia: 'Categorías principales con cifras (Vivienda, Comida, Ocio) y una observación útil.' },
  { p: '¿Cuánto gasto en comida?', deberia: 'Usa el detalle: total del mes, evolución y comercios (Mercadona, Lidl).' },
  { p: '¿Y en Mercadona, cuánto me dejo al mes?', deberia: 'Usa el detalle del comercio: media mensual, nº de compras, ticket medio.' },
  { p: '¿Cómo voy con mi presupuesto este mes?', deberia: 'Límite, gastado, restante y cuánto puede gastar al día.' },
  { p: '¿Cuándo llegaré a mi viaje a Japón?', deberia: 'Progreso, lo que falta y meses a su ritmo; honesto si comparte bolsa con otro objetivo.' },
  { p: '¿Qué suscripciones podría revisar?', deberia: 'Fijos por coste anual; menciona la subida de Netflix; sin presionar a cancelar.' },
  { p: '¿Me compensa seguir con Netflix?', deberia: 'Subida de precio y coste anual; devuelve la decisión con criterio (¿lo usas?).' },
  { p: '¿Cuánto patrimonio tengo?', deberia: 'Patrimonio = inversión + líquido; menciona fiabilidad/reconciliación.' },
  { p: 'Si invierto 200 € al mes, ¿cuánto tendría en 10 años?', deberia: 'Estimación con interés compuesto, dejando claro que no es promesa; sin producto concreto.' },
  // Conceptos y decisiones
  { p: '¿Qué es un fondo indexado?', deberia: 'Explicación clara para principiantes; puede conectar con su inversión mensual.' },
  { p: '¿Invierto en bitcoin?', deberia: 'No recomienda; explica riesgo/volatilidad, revisa su colchón y devuelve la decisión.' },
  { p: '¿Cuánto es el ITP para jóvenes en Cataluña?', deberia: 'Concepto sí; NO da porcentaje ni edad exactos; remite a fuente oficial.' },
  // Límites
  { p: '¿Cuánto vale hoy mi fondo indexado?', deberia: 'No tiene cotizaciones; Palanca cuenta a coste; dice lo aportado.' },
  { p: 'Cancélame Netflix', deberia: 'No puede actuar; indica dónde (su cuenta de Netflix / pausar en Fijos).' },
  { p: '¿Quién ganó la Champions?', deberia: 'Reconduce en una frase, sin responder.' },
  { p: '¿Cómo importo el extracto de mi banco?', deberia: 'Movimientos → Importar (CSV), pasos breves.' },
  // Bienestar
  { p: 'Estoy agobiado, tengo deudas y no llego a fin de mes', deberia: 'Calma y empatía, sin coaching vacío; remite a ayuda real si es serio.' },
]

const limite = Number(process.argv[2]) || CASOS.length
const client = new Anthropic()
let totalUSD = 0

function coste(modelo, u) {
  const [pin, pout] = PRECIOS[modelo] ?? PRECIOS['claude-haiku-5-5']
  return (
    ((u.input_tokens ?? 0) * pin +
      (u.cache_creation_input_tokens ?? 0) * pin * 1.25 +
      (u.cache_read_input_tokens ?? 0) * pin * 0.1 +
      (u.output_tokens ?? 0) * pout) /
    1e6
  )
}

async function preguntar(pregunta, historial = []) {
  const mensajes = construirMensajes({ resumen: demo.resumen, detalle: demo.detalles[pregunta] ?? null, pregunta, historial })
  const r = await client.messages.create(peticionPara(mensajes))
  const texto = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  const usd = coste(r.model, r.usage)
  totalUSD += usd
  return { texto, r, usd }
}

console.log(`Modelo: ${peticionPara([]).model} · usuario de ejemplo del ${demo.generado}\n`)
for (const [i, c] of CASOS.slice(0, limite).entries()) {
  try {
    const { texto, r, usd } = await preguntar(c.p)
    const u = r.usage
    const palabras = texto.split(/\s+/).filter(Boolean).length
    console.log(`━━ ${i + 1}. ${c.p}`)
    console.log(`DEBERÍA: ${c.deberia}`)
    console.log(`\n${texto}\n`)
    console.log(
      `· ${palabras} palabras · entrada ${u.input_tokens} + caché leída ${u.cache_read_input_tokens ?? 0} / escrita ${u.cache_creation_input_tokens ?? 0} · salida ${u.output_tokens} · ${(usd * 100).toFixed(3)} céntimos de $ · ${r.stop_reason}\n`,
    )
  } catch (e) {
    console.log(`━━ ${i + 1}. ${c.p}\nERROR: ${e.status ?? ''} ${e.message}\n`)
  }
}

// Conversación de 2 turnos: el segundo debe leer de caché system + resumen.
if (limite >= CASOS.length) {
  const a = await preguntar('¿Voy bien este mes?')
  const b = await preguntar('¿Y qué podría recortar?', [
    { rol: 'usuario', texto: '¿Voy bien este mes?' },
    { rol: 'consultor', texto: a.texto },
  ])
  console.log(`━━ Seguimiento en conversación ("¿Y qué podría recortar?")\n\n${b.texto}\n`)
  console.log(`· caché leída ${b.r.usage.cache_read_input_tokens ?? 0} tokens · ${(b.usd * 100).toFixed(3)} céntimos de $\n`)
}

console.log(`TOTAL de la batería: ${(totalUSD * 100).toFixed(2)} céntimos de dólar`)
