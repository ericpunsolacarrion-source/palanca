# Pendientes de Palanca (lista maestra)

**Todo lo que se ha dejado para más adelante, en un solo sitio**, para poder rematarlo algún día.
Se mantiene al día en cada sesión: lo terminado se marca ✔ con la fecha, lo nuevo se añade en su bloque.
Última revisión: 15-10-2026 (Fulcro como nuevo).

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
| 🟧 | **Fulcro "de datos" para todos** | Las respuestas al momento no usan IA: se podrían abrir ya en la app pública (también en Gratis, sin límite) aunque la IA siga en "Próximamente". ¿Sí? | `src/lib/respuestasLocales.js` |
| 🟩 | Historial de Fulcro de 8 → 4 mensajes | Ahorra ≈ 20–30 % en charlas largas; puede restar algo de memoria | `api/consultor.js` |
| 🟥 | **Cuándo lanzar** a la app pública | Cuando Eric diga "lánzalo": `develop` → `main` | `docs/ESTADO.md` |

## B. Pasos que solo puede hacer Eric (accesos)

| | Paso | Para qué | Guía |
|---|---|---|---|
| ✔ | ~~Ejecutar `supabase-schema-metricas.sql` en Supabase~~ **Hecho 15-10** en el proyecto **palanca** (el que usa la app, Production y Preview). Allí faltaba `fulcro_uso`: ahora el SQL la incluye | Panel de métricas, planes, ahorros en BD, borrado de cuenta completo, recordatorios y **memoria de comercios** (§8) | `docs/METRICAS.md` |
| ✔ | ~~Límite de gasto en Anthropic~~ **Hecho 15-10**: 5 $ de saldo sin recarga automática (tope natural). Opcional: límite mensual en Gasto → Límites | Que nunca haya un susto en la factura de IA | `docs/COSTES.md` §5 |
| ✔ | ~~Clave de Anthropic en Vercel (solo Preview) + Redeploy~~ **Hecho 15-10**. Versión de prueba: palanca-git-develop-palanca-mac.vercel.app | Fulcro e importar por capturas en la versión de prueba | `docs/FULCRO.md` |
| ✔ | ~~SQL v2 de `supabase-schema-fulcro.sql`~~ **Hecho 15-10** en palanca | Registro de uso de Fulcro más robusto | `docs/FULCRO.md` |
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
- 🟩 Ampliar las **respuestas al momento** con lo que pregunte la gente: mirar en el panel qué va a la IA y debería ir local.
- 🟧 **Batería de preguntas a Fulcro con Laura** (`docs/FULCRO-PREGUNTAS.md`, 73 preguntas con su respuesta correcta; CSV en `docs/pruebas/`): Eric las prueba en una cuenta de prueba y reporta por número. 64 de las 73 ya se responden al momento con la cifra exacta (test `clienteFulcro.test.js`); quedan en la IA las de consejo (viaje, cómo ahorrar, límites). Eric: volver a probarlas, y su propia cuenta con "gasolina".
- 🟧 **Calidad de las respuestas de Fulcro con IA**: rehecho el 15-10 (la IA recibe las cifras del motor y no puede inventarlas). Falta comprobarlo con la IA real en la versión de prueba y recoger ejemplos flojos que queden.
- 🟩 Estudiar Cloudflare Pages en lugar de Vercel Pro (ahorro ≈ 20 $/mes; obliga a adaptar `/api`).
- 🟧 Probar la **lectura de capturas con la API real**: hasta ahora solo se ha probado con datos simulados.
- 🟧 Ejecutar `scripts/probar-fulcro.mjs` con la clave real.
- 🟩 **Guías de descarga del extracto banco por banco** (ahora son genéricas; los menús de cada banco no están verificados).
- 🟩 Pulir el ciclo mensual de "trae lo nuevo del extracto".

### Demo y primeros pasos
- 🟧 **Demo avanzada, segunda vuelta** (Eric, 15-10: "después ya trabajaremos con más profundidad"): la versión 1 recorre cada pantalla. Ideas: enseñar acciones en vivo (renombrar un "ALIPAM", confirmar un fijo, retirar de una inversión), un capítulo de importación con un extracto de ejemplo, y medir en el panel en qué paso se sale la gente.

### Diseño y marca
- 🟩 **Mascota** de Fulcro (aparcada; ver `docs/marca/`).
- 🟩 Pulir pantallas secundarias (simuladores, cuenta, onboarding, logros) con el sistema visual v2.

### Datos, métricas y seguridad
- 🟩 **Precalcular las métricas cada noche** cuando haya más de unos 2.000 usuarios activos (ahora tarda ≈ 3,6 s con 3.000).
- 🟧 **MFA opcional** (doble factor) en la cuenta.
- 🟧 **Revisar las reglas de acceso (RLS) de todas las tablas**.
- 🟩 Ahorros negociados: ya están en BD con copia local; quitar la copia local cuando todo el mundo tenga el SQL.

### Motor financiero (de `docs/MOTOR.md`)
- 🟧 **Pantalla «Mis comercios»**: ver y deshacer lo que Palanca ha aprendido (la función `olvidar` ya existe; falta la pantalla).
- 🟧 Probar con **extractos reales** de los bancos: los formatos simulados (BBVA, Santander, CaixaBank, ING, Revolut) ya funcionan; falta un extracto real de cada uno para confirmar cabeceras y textos exactos.
- 🟧 **Decisión: Bizum recibido de amigos** (te devuelven su parte de una cena): ahora cuenta como ingreso. ¿Restarlo del gasto, como una devolución?
- 🟩 Comisión de Revolut (columna "Fee"): ahora se ignora; sumarla como gasto si no es 0.
- 🟩 Atajo "Traer de mi ahorro" en Nuevo → Ingreso (ahora sale solo al importar o eligiendo la categoría "Desde ahorro").
- 🟩 Las retiradas de inversión no guardan la ganancia por separado (se ve en el patrimonio, no como "rentabilidad").
- 🟩 Al renombrar un comercio en el historial, ofrecer también igualar el **nombre** de los demás (ahora se iguala la categoría, y el nombre llega solo por la memoria).
- 🟩 Devoluciones parciales: enlazar cada devolución con su compra concreta (ahora resta de la categoría del comercio).
- 🟩 Pasar `esDevolucion` a `tipo_evento = devolucion` (Fase 2), en vez de reconocerla por nombre.
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
- ✔ 15-10-2026 (última hora): Fulcro como nuevo: desglose por concepto + total (gasolina moto/coche/furgoneta), "último año" y más periodos, 64/73 preguntas de Laura al momento, la IA recibe las cifras hechas del motor, panel con ficha de cifra y origen.
- ✔ 15-10-2026 (noche): demo avanzada (18 pasos, 7 capítulos, Fulcro en directo) desde Tu cuenta y desde el final de la demo rápida.
- ✔ 15-10-2026 (noche): Fulcro activado en la versión de prueba (clave solo en Preview), SQL de métricas aplicado en el proyecto palanca y panel de Métricas visible para el admin.
- ✔ 15-10-2026 (noche): motor probado con 5 clientes simulados de 5 bancos y recorridos completos en el navegador; corregidos importación de Santander/Revolut/ING, retiradas de inversión, vuelta del ahorro, fijos genéricos, suscripciones falsas y respuestas de Fulcro.
- ✔ 15-10-2026 (tarde): motor conectado. Identidad de comercios con memoria, importación por comercio real, editar comercio y categoría con «igualar los demás», fijos sin doble cobro, devoluciones como contra-gasto, sin fechas futuras ([IDENTIDAD.md](IDENTIDAD.md)).
- ✔ 15-10-2026: respuestas de Fulcro al momento sin IA (preguntas de datos).
- ✔ 15-10-2026: panel de métricas solo admin, Premium/Gratis en el panel, descargar mis datos, borrado de cuenta completo, motor de emails (apagado), estudio de costes.
