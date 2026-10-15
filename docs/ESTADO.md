# Palanca — Estado del proyecto (empieza aquí)

> **Mapa de una pantalla para orientarse rápido.** Léelo al empezar cualquier
> sesión: qué está vivo, dónde mirar, qué sigue. Mantenerlo al día tras cada
> cambio relevante o despliegue.
>
> **Última actualización:** 2026-10-15 · **Último deploy:** `28c4bfe`

---

## Qué es
PWA de finanzas personales (React 19 + Vite + Supabase). Estética oscura,
premium, minimalista. Misión y detalle de negocio: **[ESTADO-PLATAFORMA.md](ESTADO-PLATAFORMA.md)**.

## Qué está vivo en producción (verificado)
- **Motor con precisión al céntimo (Fase 1):** todo el dinero se guarda y se
  calcula en **céntimos enteros** (patrimonio exacto, sin deriva de float).
  Doble escritura `importe` + `*_centimos` en las 7 tablas de dinero.
- **Módulo "Base"** (antes "Recurrentes"): la *biografía del dinero fijo* —
  héroe de gastos fijos, compromisos con historia, hoja de detalle, sello al
  confirmar, y **anillo-interruptor 1:1** (marcar crea movimiento; volver a
  tocar lo borra por completo, sin huérfanos).
- Resto de la app previo (dashboard, presupuesto, inversión, simuladores,
  consultor IA "Fulcro", importación CSV, auth + RLS).

## Dónde mirar (documentos clave)
| Tema | Documento |
|---|---|
| **Contrato del motor** (invariantes, inamovible) | **[MOTOR.md](MOTOR.md)** |
| **Identidad de comercios** (ALIPAM23 = Mercadona, erratas, memoria) | **[IDENTIDAD.md](IDENTIDAD.md)** |
| Guía pantalla a pantalla | [PANTALLAS.md](PANTALLAS.md) |
| **Sistema visual** (colores, tipografía, iconos, qué NO hacer) | **[DISENO.md](DISENO.md)** |
| **Fulcro** (qué ve, hasta dónde llega, coste, pruebas) | **[FULCRO.md](FULCRO.md)** |
| **Métricas de uso** (panel admin, qué se guarda, definiciones) | **[METRICAS.md](METRICAS.md)** |
| **PENDIENTES (lista maestra de todo lo aplazado)** | **[PENDIENTES.md](PENDIENTES.md)** |
| **Costes y margen** (IA, servicios, Premium) | **[COSTES.md](COSTES.md)** |
| **Recordatorios** (app y email: reglas, activación) | **[RECORDATORIOS.md](RECORDATORIOS.md)** |
| **Premium** (propuesta de precio y beneficios, para decidir) | **[PREMIUM.md](PREMIUM.md)** |
| **Competencia y conexión con el banco** (PSD2, agregadores, licencia, ISO) | **[VISION_BANCO.md](VISION_BANCO.md)** |
| Estado de plataforma / negocio (dossier largo) | [ESTADO-PLATAFORMA.md](ESTADO-PLATAFORMA.md) |
| Reglas de cálculo y disciplina | [../CLAUDE.md](../CLAUDE.md) |

Código núcleo del cálculo: `src/lib/movimientosUtils.js` (`bolsas`, `totalesDe`).
Frontera euros↔céntimos: `src/lib/importe.js` (`aCentimos`/`aEuros`).

## Roadmap del motor (diseñado en MOTOR.md, orden acordado)
1. **Fase 1 — Precisión decimal.** ✅ Desplegada.
   - Pendiente housekeeping (baja prioridad): conmutar lecturas de las tablas
     secundarias a céntimos, retirar columnas en euros, re-añadir `NOT NULL` en
     `*_centimos` (tras un tiempo con doble escritura en prod).
2. **Fase 2 — Nodos + apuntes derivados.** ⬜ Pendiente. Mata la semántica por
   nombre de categoría (`esInversion`/`esAjuste`); el patrimonio deriva de
   apuntes entre nodos.
3. **Fase 3 — Historia versionada.** ⬜ Editar/borrar = anexar versión; nada se
   pierde (append-only).
4. **Fase 4 — Reconciliación por atestación + residuo.** ⬜ El ajuste deja de
   ser un tapón; residuo derivado reabsorbible.

## Auditoría del motor (2026-10-14, rama `claude/capabilities-overview-m3ry1u`)
Corregido (con tests): carga paginada (>1000 movimientos ya no trunca el
histórico ni el patrimonio); los **ajustes de saldo ya no cuentan como gasto**
en desgloses por categoría (gráfico, presupuesto, píldoras, IA) — nueva fuente
única `gastoPorCategoria`/`esConsumo`; patrimonio de la tarjeta **a hoy**
(`bolsas(movs, hasta)`, T2); total del filtro "Ajuste" neto con signo;
recurrentes no crean movimientos con fecha futura ni duplicados por doble
toque; sumas exactas en céntimos en Inversiones; CSV: separador `;`, `1.234`
como miles, importes negativos y columna `tipo` opcional (el signo decide).

**Decidido:** la categoría `Ahorro` (tipo gasto) es un **traspaso neutro**
(`esTraspaso`): ni gasto ni cambio de patrimonio. Ya no se crea de serie.

## ⏳ Pendiente de lanzar (en `develop`, NO en `main`)
Decisión del usuario (2026-10-14): **no lanzar aún**; se publica cuando él lo
diga ("lánzalo" → fast-forward de `develop` a `main`). Incluye: Ahorro como
traspaso, detector de suscripciones, pestaña Fijos (periodicidades,
calendario, avisos) y el **rediseño visual v2** (ver DISENO.md). Además
(2026-10-14, tarde): **Inicio nuevo** (Resumen/Análisis, modo discreto),
**fijos con día obligatorio y confirmación en su día** (también desde el
inicio) y **datos de ejemplo + demo rápida** para usuarios nuevos. Detalle en
PANTALLAS.md §3 y §4b.

**2026-10-15 (noche) — Activado en la versión de prueba:** Fulcro con IA (clave `ANTHROPIC_API_KEY` solo en Preview), SQL de métricas aplicado en el proyecto de Supabase **palanca** (el que usan Production y Preview; "palanca dev" no lo usa la app) y panel de Métricas visible. Prueba: https://palanca-git-develop-palanca-mac.vercel.app

**2026-10-15 (noche) — Motor rematado con clientes simulados (en `develop`):** 5 clientes con un año real de su banco (BBVA, Santander, CaixaBank, ING, Revolut) y 2 recorridos completos en el navegador (52 comprobaciones). Corregido:
- **Santander y Revolut no importaban nada** (importes `-32,57 EUR`; fechas "Started Date", tipo `CARD_PAYMENT`). Ahora sí, y los pagos revertidos no entran.
- **ING inflaba el gasto en 10.000 €/año**: sus categorías ("Inversiones", "Movimientos excluidos") contaban como gasto y duplicaban las nuestras. Ahora son solo una pista, traducida.
- **Traer dinero del ahorro** ya no es ingreso (`Desde ahorro`), y **retirar de una inversión** ya no es ingreso ni duplica el patrimonio (Inversión → "Aportar / Retirar").
- Fijos genéricos ("Gimnasio") reconocen el cargo de su marca ("BASIC FIT") y dejan de proponerlo como detectado; las suscripciones exigen el mismo día del mes (el bar no es una suscripción).
- Fulcro: "¿cuánto he invertido?" descuenta retiradas; "¿cuánto he ahorrado este mes?" si la nómina aún no ha llegado, dice también el mes pasado.
- Revisión de la importación: primero lo no reconocido y lo que más dinero mueve (traspasos, inversiones). Nombres sin "Pago en", "To" ni tarjetas.
- Nombres con mayúscula ("lucía" → "Lucía", "mercadona" → "Mercadona"). Ajustar saldo admite descubierto y aclara que se suma la cuenta de ahorro.
- Descargar mis datos (CSV) y reimportarlo da las mismas cifras al céntimo.

**2026-10-15 (tarde) — Motor conectado: identidad de comercios (en `develop`):** detalle en [IDENTIDAD.md](IDENTIDAD.md).
- **Un comercio, un nombre en toda la app**: «ALIPAM23», «ALIPAM77» y «mercadoma» se reconocen como Mercadona (mayúsculas, acentos, erratas, plurales, números del banco).
- **Memoria por usuario** (`comercios_alias`): lo que el cliente corrige una vez se aplica solo en el siguiente extracto («Reconocido»).
- **Importar**: grupos por comercio real, renombrar con sugerencias, texto original del banco visible y duplicados a ±3 días.
- **Historial**: editar el comercio y la categoría, con la opción de igualar los demás movimientos de ese comercio.
- **Fijos sin doble cobro**: si el cargo ya está en los movimientos, el fijo sale como hecho.
- **Devoluciones como contra-gasto** (no ingreso) y **sin fechas futuras** al importar.
- Categorías y conceptos **sin duplicados** («comida» = «Comida»).
- **Pruebas**: 336 tests, fuzz de invariantes al céntimo y 20 comprobaciones e2e del caso ALIPAM.
- **Requiere** la sección 8 de `supabase-schema-metricas.sql`. Sin ella, la memoria se guarda en el dispositivo.

**2026-10-15 — Métricas y RGPD (en `develop`):**
- **Panel de métricas solo para admin**: Tu cuenta → Métricas de Palanca. Muestra activos, frecuencia, embudo, retención y usuarios ([METRICAS.md](METRICAS.md)).
- **Analítica propia**: sin importes ni textos, y se puede desactivar.
- **Descargar mis datos**: CSV o JSON.
- **Ahorros negociados en BD**: con respaldo local.
- **Política de privacidad actualizada**: uso, capturas a Anthropic y portabilidad.
- **Arreglo del borrado de cuenta**: antes se dejaba los fijos, los gastos rápidos, los escenarios y el uso de Fulcro.
- **Planes Premium/Gratis** en el panel: dar o quitar Premium, ingresos al mes y comparativa de uso.
- **Recordatorios**: tarjeta en Inicio tras 3+ días sin apuntar (frases motivadoras retiradas, pendientes de rediseño). Los emails están preparados y APAGADOS ([RECORDATORIOS.md](RECORDATORIOS.md)).
- **Propuesta de Premium**: [PREMIUM.md](PREMIUM.md).
- **Requiere ejecutar `supabase-schema-metricas.sql`** (un solo bloque, probado en Postgres 16). Sin él, todo sigue funcionando como antes.

**Noche del 2026-10-14 (rondas de producto, todo en `develop`):**
- **Fulcro listo para usar**: funciona con datos de ejemplo, acceso directo
  "¿Cómo voy?" en el Inicio, sabe qué cobros están por confirmar y si el
  ingreso llega a final de mes; `max_tokens` 4000. Falta solo poner la clave
  (pasos en FULCRO.md → "Activarlo").
- **Primeros minutos**: acceso con propuesta clara; alta en 4 pasos; logros
  honestos (sin el saldo inicial); "Ver la app con datos de ejemplo" en Tu cuenta.
- **Navegación en 5 pestañas** (Plan = Presupuesto + Simuladores) y
  **buscador** en el historial; movimientos con nombre legible.
- **Clientes extremos** (10 años, jubilado, estudiante, patrimonio alto,
  endeudado, datos caóticos; 320–390 px): cifras que nunca se cortan; sin
  falsas alarmas si el ingreso llega a final de mes; tope de 9 cifras y
  confirmación ante un "cero de más"; avisos de subida solo con precio estable.
- **Pantallas secundarias**: simuladores abren con un caso ya calculado;
  iconos propios en logros y avisos, sin emojis.

**15-10 (mañana): importación y ahorro de recibos (en `develop`):**
- **Trae tu historial**: extractos reales (Excel, ".xls" HTML, CSV de cualquier
  banco con cabecera desplazada o Debe/Haber) y **capturas** leídas con IA;
  categorías por comercio (aprende de tu historial); excluye lo ya apuntado;
  resumen final con suscripciones y ahorro posible.
- **Plan de ahorro** en Fijos: recibos negociables, momento ideal, guion de
  llamada, Fulcro y registro de lo ahorrado; aviso en el inicio antes de
  renovar seguros.
- La lectura de capturas usa la misma `ANTHROPIC_API_KEY` que Fulcro (solo
  Preview mientras tanto; `IA_PUBLICA=true` para abrirla al público).

**Pendiente del usuario (no se puede hacer desde la sesión: sin red a
Supabase/Vercel):** clave de Anthropic en Vercel (Preview) para Fulcro; el
SQL v2 de `supabase-schema-fulcro.sql` es opcional (sin él, modo respaldo).

## Fulcro (consultor IA) — en pruebas SOLO en dev (en `develop`)
- **Solo en dev**: el servidor lo enciende fuera de producción (`VERCEL_ENV`);
  en la app pública sigue "Próximamente" hasta `FULCRO_PUBLICO=true`.
- **Modo ahorro**: `claude-haiku-5-5` (~0,04 céntimos/pregunta; cambiable con
  `CONSULTOR_MODELO`), esfuerzo `low`, ≤4000 tokens (incluye su razonamiento), system prompt cacheado,
  **10 preguntas/usuario/día** en el servidor (`FULCRO_LIMITE_DIARIO`) y
  registro de tokens en `fulcro_uso` (`supabase-schema-fulcro.sql`).
- **Datos del motor**: resumen agregado (mes, tasa de ahorro, evolución,
  bolsas con fiabilidad, presupuesto con ritmo diario, objetivos con meses a su
  ritmo, proyección 10 años, fijos, insights) + **detalle según la pregunta**
  (`lib/contextoFulcro.js`: categoría, comercio o mes mencionados). Nunca
  movimientos uno a uno ni datos personales.
- **Conoce Palanca**: el system prompt describe cada pantalla para guiar.
- **Chat**: respuesta en streaming (NDJSON), formato seguro (negritas y
  listas), sugerencias según sus datos, "Qué ve Fulcro", conversación de la
  sesión, contador de preguntas. Abrible con pregunta desde cualquier pantalla
  (evento `palanca-fulcro`).
- **Alcance y coste afinados**: mapa de lo que puede/no puede responder,
  60–150 palabras por defecto, 2 ejemplos de respuesta ideal, resumen cacheado
  en la conversación, saludos/gracias gratis en local. Banco de pruebas:
  `scripts/probar-fulcro.mjs`. Detalle en **docs/FULCRO.md**.
- **Para probar en dev**: SQL de `fulcro_uso` ✅ ejecutado. Falta
  `ANTHROPIC_API_KEY` en Vercel solo para "Preview" + límite de gasto en
  console.anthropic.com.

## Rediseño visual v2 (2026-10-14, en `develop`)
Fuera la estética "de IA": sin degradados morado→cian, sin glows ni manchas
de fondo, sin emojis/✦. Tipografía Geist + Geist Mono (autoalojadas), un solo
acento índigo, semánticos calmados, iconos SVG propios (`Icono.jsx`), marca
de palanca, etiquetas de sección unificadas, Fulcro compacto que no tapa
contenido. Logo elegido: **"La P que crece"**; mascota de Fulcro aparcada
(ver `docs/marca/`). Pendiente de pulir en siguientes pasadas: pantallas secundarias
(simuladores, cuenta, onboarding, logros) con el mismo criterio.

## Foco de producto (2026-10-14): suscripciones + seguimiento financiero
Base ahora es la pestaña **Fijos** (puerta de entrada). Hecho en `develop`:
- **Detector de cargos periódicos** (`lib/suscripciones.js`) sobre el
  histórico/CSV: mensual, bimestral, trimestral, semestral y anual; coste
  anual y subida de precio; añadir con un toque.
- **Periodicidades** en los compromisos (`lib/periodicidad.js`). SQL
  `supabase-schema-periodicidad.sql` ✅ ejecutado en producción (2026-10-14).
- **Calendario de cobros** (30 días) + **reparto anual** (`CalendarioCobros.jsx`).
- **Avisos** en el inicio (`lib/avisos.js`): cobros inminentes, renovaciones,
  subidas de precio + notificación local del sistema al abrir la app.

Siguiente: **web push real** (avisos con la app cerrada: VAPID + tabla de
suscripciones push + cron en Vercel), agrupar los logros que saltan en cascada
tras una importación grande (hoy salen N modales seguidos), y medir retención
con usuarios reales.

## Deuda técnica / cosas a vigilar
- Housekeeping de Fase 1 (arriba).
- **Base · "Total pagado":** exacto desde ahora (guarda el importe real por
  confirmación); las confirmaciones hechas **antes** del arreglo del anillo no
  tienen `movimiento_id` → al deshacerlas se quita la marca pero no se borra su
  movimiento antiguo. No hacer deshacer+remarcar en esas.
- La valoración a mercado, multidivisa y dividendos NO están (patrimonio a
  coste); son ampliaciones previstas (ver MOTOR.md §F2b/§10).

## Cómo trabajar aquí
- **No romper nunca los datos reales.** Cambios incrementales y verificables.
- Antes de dar algo por hecho: `npm run build`, `oxlint` (`npm run lint`) y
  `npm test` (vitest) en verde.
- **Deploy = push a `main`** → Vercel. Verifica build local antes de desplegar.
- SQL para Supabase: un único bloque limpio; recordar vaciar el SQL Editor.
- Respetar el contrato de **MOTOR.md**: no reabrirlo salvo contradicción
  objetiva con una invariante.
