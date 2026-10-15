# Fulcro — el consultor de Palanca

> Guía de cómo funciona, **hasta dónde llega**, cuánto cuesta y cómo se prueba.
> Código: `api/consultor.js` (servidor), `src/components/Consultor.jsx` (chat),
> `src/lib/resumenParaIA.js` + `src/lib/contextoFulcro.js` (datos del motor).

## Respuestas al momento (sin IA)
Las preguntas de DATOS se responden en el móvil con `src/lib/respuestasLocales.js`: gratis, al instante y sin gastar preguntas del día. Ejemplos: cuánto en gasolina o en un comercio, lo pagado hasta ahora de Spotify, el próximo cobro de un fijo, el total de fijos, en qué se gasta más, e ingresos, ahorro o inversión de un periodo. Lo de CRITERIO va a la IA, y ante la duda también. Cada respuesta al momento ofrece "Que lo analice Fulcro". Tests en `respuestasLocales.test.js`, incluidas 2.000 preguntas aleatorias.

## Estado
En pruebas **solo en dev**: se enciende en los despliegues de prueba de Vercel
(rama `develop` → "Preview"). En la app pública sigue en "Próximamente" hasta
poner `FULCRO_PUBLICO=true`. Requiere `ANTHROPIC_API_KEY` en Vercel (solo
Preview) y la tabla `fulcro_uso` (`supabase-schema-fulcro.sql`, ya ejecutado).

## Activarlo (5 minutos, una sola vez)
1. console.anthropic.com → **API Keys** → crear clave. En **Limits**, poner un
   tope de gasto mensual (p. ej. 5 $).
2. Vercel → proyecto **palanca** → Settings → **Environment Variables** →
   `ANTHROPIC_API_KEY` = la clave, marcando **solo "Preview"** → Save.
3. Vercel → Deployments → el último de `develop` → **⋯ → Redeploy**.
4. Abrir esa versión de prueba, entrar con tu cuenta y pulsar **Fulcro**.
Sin el SQL v2 de `supabase-schema-fulcro.sql` funciona igual (modo de
respaldo del límite diario); el SQL v2 solo hace el límite a prueba de
peticiones simultáneas.

## Dónde aparece
- Botón flotante **Fulcro** en todas las pantallas.
- Inicio → "Así va [mes]" → **"¿Cómo voy? Pregunta a Fulcro"** (pregunta ya hecha).
- Con **datos de ejemplo** (usuario nuevo) responde sobre el ejemplo y lo dice
  (`datosDeEjemplo: true` en el resumen); sin datos propios ofrece preguntas
  de arranque.

## Qué ve (y qué no)
- **Siempre**: un resumen agregado calculado por el motor (~900 tokens): mes
  actual y gasto por categoría, tasa de ahorro y tendencia, evolución 6 meses,
  medias, bolsas y patrimonio con su fiabilidad, inversión, presupuesto (límite,
  gastado, restante, € al día), objetivos (progreso, lo que falta, meses a su
  ritmo), proyección a 10 años, fijos (coste, próximos cobros, avisos) e insights.
- **Según la pregunta**: si nombra una categoría, un comercio o un mes, solo ese
  desglose (evolución, comercios, compras y ticket medio, totales del mes).
- **Nunca**: movimientos uno a uno, nombre, email ni datos bancarios.

## Hasta dónde llega
| Sí responde (con sus cifras) | No puede (lo dice y ofrece alternativa) |
|---|---|
| Cómo va el mes y frente a su media | Ver movimientos uno a uno o fechas de cada gasto |
| En qué se le va el dinero (categoría, comercio, mes) | Saldos bancarios en tiempo real |
| Presupuesto: cuánto le queda y al día | Cotizaciones / valor de mercado (Palanca cuenta a coste) |
| Cuándo llega a sus objetivos a su ritmo | Recomendar productos concretos o cifras fiscales exactas |
| Qué fijos/suscripciones pesan, renovaciones, subidas | Hacer cambios (registrar, borrar, cancelar): indica dónde |
| Patrimonio (con su fiabilidad) y "qué pasaría si…" | Temas que no son de dinero: reconduce en una frase |
| Conceptos financieros y cómo usar Palanca | |

Tres líneas rojas fijas en el system prompt: sin recomendaciones de inversión
concretas, sin cifras fiscales/legales de memoria, y cuidado especial ante
angustia por dinero.

## Coste (fase inicial: mínimo)
- Modelo `claude-haiku-5-5` ($0,10 / $0,50 por millón de tokens), esfuerzo
  `low`, respuestas de 60–150 palabras por defecto (la salida es lo caro).
  `max_tokens` 4.000: Haiku 5.5 razona (adaptativo) antes de responder y ese
  razonamiento cuenta en el tope; con margen nunca se corta a medias y solo
  se paga lo usado.
- **Caché**: system prompt (~2.900 tokens) y resumen (~900) se cachean; en una
  conversación, las preguntas siguientes los leen al 10 % del precio.
- Estimación: **0,01–0,06 céntimos de $ por pregunta** (la primera de una
  conversación escribe la caché; las siguientes la reutilizan).
- **Gratis**: saludos y "gracias/vale" se responden en la app, sin IA.
- **Topes**: 10 preguntas/usuario/día (`FULCRO_LIMITE_DIARIO`), registro de
  tokens en `fulcro_uso`, y límite de gasto mensual en console.anthropic.com.
- Variables: `CONSULTOR_MODELO`, `CONSULTOR_ESFUERZO`, `FULCRO_LIMITE_DIARIO`,
  `FULCRO_PUBLICO`.

Consulta de coste real en Supabase (SQL Editor):
```sql
select date(created_at) as dia, count(*) as preguntas,
       sum(tokens_entrada) as entrada, sum(tokens_cache) as cache, sum(tokens_salida) as salida,
       round((sum(tokens_entrada) * 0.10 + sum(tokens_cache) * 0.01 + sum(tokens_salida) * 0.50) / 1e6, 4) as dolares_aprox
from fulcro_uso group by 1 order by 1 desc;
```

## El otro servicio de IA: asistente de columnas del importador
`api/mapear-columnas.js` deduce qué columna es cada cosa en un CSV raro. Usa la
misma `ANTHROPIC_API_KEY`, el modelo `claude-haiku-5-5` (`IMPORTADOR_MODELO`) y
solo recibe cabeceras + 2–3 filas recortadas. Coste por uso: una fracción de
céntimo.

## Seguridad (probado)
Sin sesión → 401; método no permitido → 405; cuerpos malformados, preguntas,
resúmenes o detalles gigantes → 400, todo **sin llamar a la IA**. Desde fuera
no se puede cambiar el modelo, `max_tokens` ni el system prompt, ni colar
roles `system` en el historial (acotado a 8 mensajes × 4.000 caracteres). Los
errores de la API no filtran detalles internos. El cupo diario es atómico
(probado con 25 peticiones simultáneas: pasa exactamente una).

## Banco de pruebas
`scripts/probar-fulcro.mjs` hace 18 preguntas típicas (datos, conceptos,
límites, bienestar) + una conversación de dos turnos sobre un usuario de ejemplo
(`scripts/data/fulcro-demo.json`, generado con el motor real) con la MISMA
petición que la app, y muestra cada respuesta junto a lo que debería hacer, sus
tokens y su coste. La batería completa cuesta < 1 céntimo.

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/probar-fulcro.mjs
```

Úsalo tras cada cambio del system prompt: es la forma de ver si una mejora
ayuda de verdad y no rompe otra cosa.
