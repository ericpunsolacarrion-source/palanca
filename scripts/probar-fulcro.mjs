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

// Preguntas y lo que DEBERÍA hacer cada respuesta (compartidas con el generador
// del usuario de ejemplo, que precalcula el "detalle" de cada una igual que la app).
const CASOS = JSON.parse(readFileSync(new URL('./data/fulcro-preguntas.json', import.meta.url), 'utf8'))

const limite = Number(process.argv[2]) || CASOS.length
const client = new Anthropic()
const MODELO = peticionPara([]).model
let totalUSD = 0

// Precio del modelo PEDIDO (no del nombre que devuelva la respuesta). Si no
// está en la tabla, se avisa en vez de estimar a la baja.
const precio = PRECIOS[MODELO]
if (!precio) console.warn(`⚠ Sin precio para ${MODELO}: añádelo a PRECIOS para ver el coste.\n`)

function coste(u) {
  if (!precio) return 0
  const [pin, pout] = precio
  return (
    ((u.input_tokens ?? 0) * pin +
      (u.cache_creation_input_tokens ?? 0) * pin * 1.25 +
      (u.cache_read_input_tokens ?? 0) * pin * 0.1 +
      (u.output_tokens ?? 0) * pout) /
    1e6
  )
}

async function preguntar(pregunta, historial = []) {
  // `detalle` precalculado con contextoParaPregunta (igual que la app) para
  // cada pregunta de la batería; null si la pregunta no menciona nada concreto.
  const mensajes = construirMensajes({ resumen: demo.resumen, detalle: demo.detalles[pregunta] ?? null, pregunta, historial })
  const r = await client.messages.create(peticionPara(mensajes))
  const texto = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  const usd = coste(r.usage)
  totalUSD += usd
  return { texto, r, usd }
}

console.log(`Modelo: ${MODELO} · usuario de ejemplo del ${demo.generado}\n`)
let primera = null
for (const [i, c] of CASOS.slice(0, limite).entries()) {
  try {
    const { texto, r, usd } = await preguntar(c.pregunta)
    if (i === 0) primera = { pregunta: c.pregunta, texto }
    const u = r.usage
    const palabras = texto.split(/\s+/).filter(Boolean).length
    console.log(`━━ ${i + 1}. ${c.pregunta}`)
    console.log(`DEBERÍA: ${c.deberia}`)
    console.log(`\n${texto}\n`)
    console.log(
      `· ${palabras} palabras · entrada ${u.input_tokens} + caché leída ${u.cache_read_input_tokens ?? 0} / escrita ${u.cache_creation_input_tokens ?? 0} · salida ${u.output_tokens} · ${(usd * 100).toFixed(3)} céntimos de $ · ${r.stop_reason}\n`,
    )
  } catch (e) {
    console.log(`━━ ${i + 1}. ${c.pregunta}\nERROR: ${e.status ?? ''} ${e.message}\n`)
  }
}

// Seguimiento en conversación (reutiliza la 1ª respuesta, sin repetirla): debe
// leer de caché el system prompt y el resumen.
if (limite >= CASOS.length && primera) {
  try {
    const b = await preguntar('¿Y qué podría recortar?', [
      { rol: 'usuario', texto: primera.pregunta },
      { rol: 'consultor', texto: primera.texto },
    ])
    console.log(`━━ Seguimiento en conversación ("¿Y qué podría recortar?")\n\n${b.texto}\n`)
    console.log(`· caché leída ${b.r.usage.cache_read_input_tokens ?? 0} tokens · ${(b.usd * 100).toFixed(3)} céntimos de $\n`)
  } catch (e) {
    console.log(`━━ Seguimiento\nERROR: ${e.status ?? ''} ${e.message}\n`)
  }
}

console.log(`TOTAL de la batería: ${(totalUSD * 100).toFixed(2)} céntimos de dólar`)
