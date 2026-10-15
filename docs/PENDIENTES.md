# Pendientes de Palanca (lista maestra)

**Todo lo que se ha dejado para más adelante, en un solo sitio**, para poder rematarlo algún día.
Se mantiene al día en cada sesión: lo terminado se marca ✔ con la fecha, lo nuevo se añade en su bloque.
Última revisión: 15-10-2026.

Leyenda: 🟥 bloquea el lanzamiento o el cobro · 🟧 importante · 🟩 mejora.

---

## A. Decisiones que tiene que tomar Eric

| | Tema | Estado / propuesta | Dónde |
|---|---|---|---|
| 🟧 | **Frases motivadoras** de los recordatorios | Las de autores clásicos no convencieron. **Diseñar o extraer otras** (tono propio de Palanca, cercano; ¿frases propias en vez de citas?). La maquinaria está lista y **apagada** (`CON_FRASE = false`) | `src/lib/frases.js`, `src/lib/recordatorios.js` |
| 🟧 | **Cada cuánto se envía un email** | Propuesta provisional: máximo 1 cada 3 días; a los 3-6 y a los 14-21 días sin entrar; alta sin apuntar a los 2-6 días; después, silencio | `docs/RECORDATORIOS.md` |
| 🟥 | **Precio Premium** | Mensual **3,99 € ✔ (visto bueno)**. Falta el anual (29,99 € o 34,99 €) y si hay precio fundador | `docs/PREMIUM.md`, `docs/COSTES.md` |
| 🟥 | **Qué incluye Premium** | Propuesta: Fulcro sin límite (Gratis: 5/mes), capturas sin límite, plan de ahorro completo, simuladores completos, banco en el futuro | `docs/PREMIUM.md` |
| 🟧 | **Límite de Fulcro en Gratis** | Propuesta: 5 preguntas al mes | `docs/PREMIUM.md` |
| ✔ | Invitar a un amigo | **Decidido:** 1 mes gratis al que invita solo si el invitado se da de alta **y paga** | `docs/PREMIUM.md` |
| ✔ | Garantía "si no ahorras, te devolvemos" | **Descartada**: no se puede medir el ahorro | `docs/PREMIUM.md` |
| 🟥 | **Cuándo lanzar** a la app pública | Cuando Eric diga "lánzalo": `develop` → `main` | `docs/ESTADO.md` |

## B. Pasos que solo puede hacer Eric (accesos)

| | Paso | Para qué | Guía |
|---|---|---|---|
| 🟥 | Ejecutar `supabase-schema-metricas.sql` en Supabase | Panel de métricas, planes, ahorros en BD, borrado de cuenta completo, recordatorios | `docs/METRICAS.md` |
| 🟧 | Clave de Anthropic en Vercel (solo Preview) + Redeploy | Fulcro e importar por capturas en la versión de prueba | `docs/FULCRO.md` |
| 🟩 | SQL v2 de `supabase-schema-fulcro.sql` (opcional) | Registro de uso de Fulcro más robusto | `docs/FULCRO.md` |
| 🟧 | Comprar dominio + cuenta Resend + variables | Encender los emails | `docs/RECORDATORIOS.md` |
| 🟥 | Supabase Pro y Vercel Pro **antes de cobrar** | El plan gratis de Supabase se pausa sin actividad; Vercel Hobby es de uso no comercial (verificar) | `docs/COSTES.md` |
| 🟥 | Alta de autónomo o sociedad, gestoría, IVA | Poder cobrar legalmente | `docs/COSTES.md` §2 |

## C. Producto por construir

### Cobro y Premium
- 🟥 **Cobro con Stripe**: Checkout + Portal del cliente + webhook que escriba en la tabla `planes` (`origen = pago`). El panel ya está listo.
- 🟥 **Activar los límites de Premium** en la app, según lo que se decida en A. Mostrar Premium solo en los momentos útiles: al llegar al límite de Fulcro, en el resumen de "Trae tu historial" y en recibos negociables.
- 🟧 **Programa de referidos**: enlace propio, registro de quién invita a quién y mes gratis al primer pago del invitado.
- 🟧 Encender `PREMIUM_ACTIVO=true` (email de invitación a Premium) cuando exista el cobro.

### Recordatorios y retención
- 🟧 Frases nuevas (ver A) → `CON_FRASE = true`.
- 🟧 **Notificaciones push en el móvil**: claves VAPID, guardar la suscripción de cada dispositivo y enviar desde la misma función diaria. En iPhone solo funcionan con la app instalada en la pantalla de inicio.
- 🟩 Probar variantes de asunto de los emails cuando haya volumen.

### Importación y Fulcro
- 🟧 Probar la **lectura de capturas con la API real**: hasta ahora solo se ha probado con datos simulados.
- 🟧 Ejecutar `scripts/probar-fulcro.mjs` con la clave real.
- 🟩 **Guías de descarga del extracto banco por banco** (ahora son genéricas; los menús de cada banco no están verificados).
- 🟩 Pulir el ciclo mensual de "trae lo nuevo del extracto".

### Diseño y marca
- 🟩 **Mascota** de Fulcro (aparcada; ver `docs/marca/`).
- 🟩 Pulir pantallas secundarias (simuladores, cuenta, onboarding, logros) con el sistema visual v2.

### Datos, métricas y seguridad
- 🟩 **Precalcular las métricas cada noche** cuando haya más de unos 2.000 usuarios activos (ahora tarda ≈ 3,6 s con 3.000).
- 🟧 **MFA opcional** (doble factor) en la cuenta.
- 🟧 **Revisar las reglas de acceso (RLS) de todas las tablas**.
- 🟩 Ahorros negociados: ya están en BD con copia local; quitar la copia local cuando todo el mundo tenga el SQL.

### Motor financiero (de `docs/MOTOR.md`)
- 🟩 Fase 1, limpieza: leer en céntimos en las tablas secundarias y retirar las columnas en euros.
- 🟩 **Fase 2 — Nodos y apuntes derivados** (deja de depender del nombre de la categoría).
- 🟩 **Fase 3 — Historia versionada** (editar o borrar = nueva versión; nada se pierde).
- 🟩 Valoración a mercado de inversiones, multidivisa y dividendos.

## D. Visión a largo plazo
- 🟧 **Conexión con el banco**:
  1. Mediante un agregador con licencia (Enable Banking, Tink, Arcopay…).
  2. Después, licencia AISP propia del Banco de España + ISO 27001.
  3. Cuando llegue PSD3, previsto hacia 2027-28.
  Detalle en `docs/VISION_BANCO.md`.
- 🟩 Política de privacidad y términos de uso **revisados por un profesional** antes de abrir al público.

---

## Histórico de cosas terminadas que estaban aquí
- ✔ 15-10-2026: panel de métricas solo admin, Premium/Gratis en el panel, descargar mis datos, borrado de cuenta completo, motor de emails (apagado), estudio de costes.
