# Consultor IA — puesta en marcha

El Consultor es un chat de orientación financiera que usa los datos reales del
usuario. Arquitectura:

- **Frontend** (`src/components/Consultor.jsx`): botón flotante + panel. Construye
  un **resumen estructurado** con `construirResumenIA` (`src/lib/resumenParaIA.js`)
  —agregados, no movimientos en bruto— y lo envía a `/api/consultor`.
- **Backend** (`api/consultor.js`, función serverless de Vercel): única pieza que
  conoce la API key. Añade el encuadre educativo (no asesoramiento regulado) y
  llama a la Messages API de Anthropic. El navegador **nunca** ve la clave.

## Configurar en Vercel (obligatorio para que funcione en producción)

En el proyecto de Vercel → **Settings → Environment Variables**, añade:

| Nombre | Valor | Entornos |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | tu clave `sk-ant-…` | Production (y Preview si quieres) |

Opcional:

| Nombre | Valor por defecto | Para qué |
| --- | --- | --- |
| `CONSULTOR_MODELO` | `claude-haiku-4-5` | Cambiar el modelo. Haiku es rápido y barato para un chat de consumo; para respuestas más elaboradas usa `claude-opus-4-8`. |

Tras guardar, **vuelve a desplegar** (un push a `main` basta) para que la función
tome la variable.

## Comportamiento sin configurar

Si `ANTHROPIC_API_KEY` no existe, el endpoint responde `503` con
`code: "sin_configurar"` y el panel muestra un aviso amable. La app **no se
rompe**: el resto sigue funcionando igual.

## Nota sobre desarrollo local

`npm run dev` (Vite) **no** ejecuta las funciones `api/*`; por eso en local el
consultor mostrará "no puedo responder". Para probar el endpoint en local usa
`vercel dev` con la variable de entorno definida en un `.env` local.

## Coste y privacidad

- Se envía un **resumen agregado** (ingresos/gastos/ahorro por mes, medias,
  evolución, objetivos), nunca la lista completa de movimientos ni datos
  personales identificables.
- El encuadre del sistema prohíbe recomendaciones categóricas de compra y
  promesas de rentabilidad: es orientación educativa.
