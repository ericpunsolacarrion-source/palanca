# Palanca · Auditoría de cumplimiento legal, privacidad y seguridad

> **Fase:** auditoría preventiva (09-11-2026). No se ha implementado nada legal, no se ha tocado ninguna base de datos y no se ha desplegado nada.
> **Alcance:** código del repositorio, SQL del proyecto y documentación.
> **No es asesoramiento jurídico.** Todo lo marcado «⚖️ validación jurídica» debe revisarlo un abogado especializado en protección de datos y consumo antes del lanzamiento público.

**Leyenda de estados**

| Marca | Significado |
|---|---|
| ✅ Cumplido | Implementado y comprobado en el código |
| 🔧 Pendiente de implementación | |
| 👤 Pendiente de información de Eric | |
| ⚖️ Pendiente de validación jurídica | |
| ➖ No aplicable | Con la justificación al lado |
| ⛔ Bloqueante para el lanzamiento | |

---

## 0. Entorno de trabajo (verificación previa)

| Comprobación | Resultado |
|---|---|
| Rama | `claude/capabilities-overview-m3ry1u`, limpia, al día con `develop` |
| Variables de entorno | **No hay `.env` en este entorno** ni credenciales de Supabase. **No se puede demostrar** a qué proyecto apuntan |
| Consecuencia | La auditoría es solo de lectura de código: **no se ha conectado a ninguna base de datos** (ni DEV ni producción) ni se ha ejecutado SQL |
| Estado real de la BD | **No verificado.** Las políticas reales hay que comprobarlas con `supabase-auditoria-seguridad.sql` (solo lectura), primero en palanca dev y luego en producción. 👤 |
| Entornos según la documentación | `docs/ESTADO.md` (15-10) dice que **Production y Preview usan el mismo proyecto «palanca»**; «palanca dev» no lo usa la app. 👤 Eric debe confirmar si ya cambió Preview a palanca dev |

---

## A. Estado actual (qué hay y qué funciona de verdad)

### A.1 Datos personales que se recogen

| # | Dato | Dónde se guarda | Para qué | Quién accede | ¿Terceros? | ¿Necesario? |
|---|---|---|---|---|---|---|
| 1 | **Email** | `auth.users` (Supabase Auth) y `perfiles.email` | Acceso, recuperar contraseña, recordatorios | El usuario. Eric (panel admin: email, plan, fechas, recuentos) | Supabase (alojamiento), Resend (al enviar emails) | Sí. *Duplicado en `perfiles.email`*: minimizar 🔧 |
| 2 | **Contraseña** | `auth.users` (hash, gestionado por Supabase) | Inicio de sesión | Nadie la ve en claro | Supabase | Sí |
| 3 | **Nombre** (opcional) | `perfiles.nombre` | Saludo y emails | Usuario. Va en el asunto de algunos emails | Resend | No imprescindible (opcional, bien) |
| 4 | **Año de nacimiento** (opcional, ≥ 14 años) | `perfiles.anio_nacimiento` | Simuladores (jubilación, independencia) | Usuario | No | Opcional ✅ (año, no fecha) |
| 5 | **Objetivo** (alta) | `perfiles.objetivo` | Personalizar la app y Fulcro | Usuario | Anthropic (en el contexto de Fulcro) | Sí, para la función |
| 6 | **Saldo inicial y conciliaciones** | `movimientos` (categoría Ajuste), `perfiles.saldo_inicial`, `perfiles.ultima_reconciliacion` | Patrimonio y liquidez | Usuario | No (Fulcro recibe agregados) | Sí |
| 7 | **Movimientos**: importe, fecha, tipo, categoría, **nota o concepto** | `movimientos` | Núcleo del servicio | Usuario | Anthropic: agregados y nombres de comercio en Fulcro; 3 filas de ejemplo al importar CSV con IA | Sí. Ver §B R7: **el concepto puede contener datos de terceros** («Bizum de Marta») |
| 8 | **Inversiones y plataformas** | `movimientos` (categoría Inversion) + `fuentes` (nombres de bancos o brókers) | Patrimonio e inversión | Usuario | Agregados a Anthropic (Fulcro) | Sí |
| 9 | **Compromisos fijos** (recibos, seguros, nómina) | `recurrentes`, `recurrentes_confirmaciones` | Base, avisos, previsión | Usuario | Nombre y fecha de renovación del seguro en el email (si lo activa) | Sí |
| 10 | Presupuestos, límites, objetivos, planificaciones, simulaciones, escenarios, gastos rápidos, alias de comercios, ahorros negociados | Tablas homónimas | Funciones de la app | Usuario | No (salvo agregados en Fulcro) | Sí |
| 11 | **Periodo financiero / día de cobro** | `perfiles.dia_inicio_periodo`, `dia_cobro_nomina`, `periodo_automatico` (SQL pendiente) o el navegador | Agrupar por «mes» | Usuario | No | Sí |
| 12 | **Uso de la app** (tipo de acción y fecha, sin importes) | `eventos` (vía `registrar_evento`) | Métricas internas | Eric (agregadas en el panel) | No | No imprescindible → **activado por defecto** (§B R5) |
| 13 | **Uso de IA** (fecha, modelo, tokens) | `fulcro_uso` | Límite diario y coste | Usuario (lo suyo), Eric (recuentos) | No | Sí |
| 14 | **Plan** (gratis/premium, origen, importe, fechas, nota del admin) | `planes`, `planes_historial` | Funciones Premium | Usuario lee el suyo; solo el admin escribe | No | Sí |
| 15 | **Emails enviados** (tipo, id del proveedor) | `recordatorios_enviados` | No repetir emails | Usuario (lo suyo) | Resend | Sí |
| 16 | **Conversación con Fulcro** | Solo en el navegador (`sessionStorage`, se borra al cerrar la pestaña). **No se guarda en el servidor** | Continuidad del chat | Usuario | **Anthropic** (pregunta + hasta 8 mensajes previos + resumen) | Sí, para la función |
| 17 | **Capturas de pantalla del banco** | No se guardan: van en memoria al servidor y a la IA | Importar movimientos | — | **Anthropic** (imagen completa: puede llevar nombre, IBAN, saldo…) | Sí, para la función (opcional) |
| 18 | **Extractos CSV/Excel** | Se procesan **en el navegador**; solo se guardan los movimientos que el usuario confirma | Importar | Usuario | Solo si la detección automática falla: cabeceras + **3 filas de ejemplo truncadas** a Anthropic | Sí (minimizado, bien) |
| 19 | **Datos técnicos**: IP, user-agent, registros de peticiones | Logs de Vercel y Supabase (no hay en el código, pero existen en el proveedor) | Funcionamiento y seguridad | Proveedores y Eric (panel de cada proveedor) | Vercel, Supabase | Sí (inevitable). Hay que declararlo |
| 20 | **Token de sesión** | `localStorage` (clave de Supabase `sb-…-auth-token`) | Mantener la sesión | Navegador del usuario | No | Sí (estrictamente necesario) |
| 21 | **Copias locales en el dispositivo** (`localStorage`): ~30 claves `palanca_*` | Navegador | Preferencias; respaldo si falta una tabla (límites, periodo, saldo…); lote de importación para deshacer | Quien use ese dispositivo | No | Sí, pero **no se borran al cerrar sesión** (§B R8) |

**Minimización propuesta** (🔧, durante el desarrollo):
- Quitar `perfiles.email`, que duplica `auth.users`, o justificar su uso.
- Analítica desactivada por defecto o sin almacenamiento en el dispositivo.
- Purgar las claves `palanca_*` del usuario al cerrar sesión.
- Avisar en la pantalla de capturas de que se tapen IBAN y nombres.
- Valorar un recorte automático del concepto en lo que se envía a la IA.

### A.2 Seguridad implementada (comprobada en código y SQL)

| Control | Estado | Detalle |
|---|---|---|
| Autenticación | ✅ | Supabase Auth con email y contraseña; recuperación por email |
| RLS en todas las tablas de usuario | ✅ en el SQL / 👤 en la BD real | Patrón `usuario_id = auth.uid()::text` en select, insert, update y delete para `authenticated`. El `with check` impide escribir filas a nombre de otro |
| Tablas sensibles sin políticas de escritura | ✅ | `planes` (nadie puede ponerse Premium), `eventos` (solo vía función), `planes_historial` y `admins` (sin políticas) |
| Funciones con permisos elevados | ✅ | Todas comprueban `auth.uid()` o `soy_admin()` (admin = email en `admins` **y verificado**). `revoke … from public, anon`. `recordatorios_candidatos()` solo para `service_role` |
| Borrado de cuenta | ✅ | `borrar_mi_cuenta()` borra **todas** las tablas con `usuario_id` y el usuario de Auth |
| API del servidor | ✅ | `/api/consultor`, `/api/leer-capturas` y `/api/mapear-columnas` exigen JWT válido y fallan cerrado. Límites de uso en la BD (atómicos). Claves de IA solo en el servidor |
| Cron de emails | ✅ | `CRON_SECRET` obligatorio. Clave `service_role` solo en el servidor |
| Baja de emails | ✅ | Enlace firmado con HMAC (`timingSafeEqual`), página de confirmación (los antivirus no dan de baja solos) y `List-Unsubscribe` en un clic |
| XSS | ✅ (riesgo bajo) | Un único `dangerouslySetInnerHTML`, con dibujos de logos empaquetados (no vienen del usuario) |
| Secretos en el cliente | ✅ | Solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (públicas por diseño) y `VITE_FULCRO_ACTIVO` |
| Cabeceras de seguridad (CSP, frame-ancestors, Referrer-Policy…) | 🔧 | **No hay** (`vercel.json` solo tiene el cron) |
| Copias de seguridad | 👤 | Dependen del plan de Supabase. No verificable desde el código |
| Logs | ✅ / 🔧 | El código solo registra códigos de error (sin datos financieros). Revisar logs de Supabase y Vercel y su retención |

### A.3 Derechos de los usuarios (qué existe hoy)

| Derecho (RGPD) | Estado | Cómo |
|---|---|---|
| Acceso (art. 15) | ✅ parcial | Lo ve todo en la app + descarga JSON completa (25 tablas, `exportarDatos.js`). Falta la información del art. 15.1 (fines, destinatarios, plazos) → la política |
| Rectificación (art. 16) | ✅ | Editar nombre, año y cada movimiento |
| Portabilidad (art. 20) | ✅ | CSV (reimportable) y JSON |
| Supresión (art. 17) | ✅ | Tu cuenta → borrar cuenta (irreversible, con confirmación). ⚖️ Conservación tras pagos (facturas) cuando se cobre |
| Oposición o retirada | ✅ parcial | Interruptores de analítica, recordatorios y avisos de renovación. 🔧 Falta oposición explícita al uso de IA (no usar Fulcro basta, pero conviene decirlo) |
| Limitación (art. 18) | 🔧 | Sin mecanismo (por email al responsable) |
| Contacto con el responsable | ✅ / 👤 | Email personal de Eric en la política actual. Decidir el canal definitivo |
| Reclamar ante la AEPD | ✅ | Mencionado en la política |

### A.4 Documentación legal publicada hoy

- **Hay:** una «Política de privacidad» (modal en `PoliticaPrivacidad.jsx`, «pensada para una beta cerrada»), que se acepta en el registro.
- **No hay:** aviso legal, condiciones de uso, condiciones de contratación ni política de cookies.
- La política actual tiene **inexactitudes respecto al código** (ver §B R3).

---

## B. Riesgos (por gravedad)

### 🔴 Críticos o altos — actuar ya

**R1 · Políticas «Acceso abierto fase 1» en los SQL base** (⛔ si existen en la BD)
- `supabase-schema.sql`, `-fase1b`, `-fase2`, `-fuentes`, `-objetivos`, `-presupuesto` y `-planificaciones` crean las tablas con `using (true) with check (true)`.
- Solo quedan cerradas si después se ejecutó `supabase-auth-rls.sql`, que borra todas las políticas previas y crea las de usuario.
- Si en algún proyecto (p. ej. un palanca dev creado de cero con los SQL en orden) faltó ese paso, **cualquiera con la clave pública (está en el JS de la app) podría leer y modificar los movimientos de todos**.
- **Qué hacer:** ejecutar `supabase-auditoria-seguridad.sql` (solo lectura) en palanca dev y en producción. Debe salir sin filas.
- Si sale algo: no seguir usando ese proyecto con datos reales y ejecutar `supabase-auth-rls.sql` (y `supabase-migracion-localstorage.sql` para las tablas nuevas) **en ese proyecto**.
- A futuro (🔧): un único SQL de esquema limpio sin políticas abiertas, para que crear un entorno nuevo no pueda dejarlas por error.

**R2 · La versión de pruebas es pública y (según la documentación) usa la base de producción**
- `palanca-git-develop-…vercel.app` es accesible por cualquiera con el enlace.
- Si Preview sigue apuntando al proyecto «palanca», código no publicado escribe en datos reales y cualquiera puede registrarse ahí.
- **Qué hacer** (👤, en Vercel):
  1. Apuntar Preview a palanca dev (variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del entorno Preview).
  2. Activar *Deployment Protection* en las previews.
- Mientras tanto, no compartir el enlace de pruebas.

**R3 · La política de privacidad publicada no describe lo que hace el código** (⛔ antes de abrir al público; corregir ya si hay usuarios beta)

| Lo que dice | Lo que hace el código |
|---|---|
| «Fulcro solo recibe **resúmenes agregados y anónimos**» | Recibe agregados, **nombres de comercios**, la **pregunta en texto libre** (puede contener cualquier cosa) y hasta 8 mensajes previos. Es **seudónimo, no anónimo**: va ligado a la sesión del usuario |
| Solo nombra a Anthropic para las capturas | Anthropic también recibe los datos de **Fulcro** y, al importar CSV con IA, **3 filas de ejemplo** (fecha, concepto, importe) |
| Base jurídica: «tu consentimiento» para todo | Para prestar el servicio, la base adecuada suele ser la **ejecución del contrato** (art. 6.1.b RGPD). ⚖️ |
| Supabase «en Irlanda», transferencias con «garantías» | No verificable desde el código. 👤 Confirmar la región del proyecto y los DPA |
| Datos recogidos | Omite el nombre, el objetivo, el saldo inicial, los compromisos fijos, los alias, el plan, los datos técnicos (IP y logs) y el almacenamiento en el dispositivo |
| «Si borras tu cuenta, se eliminan tus datos de forma permanente» | Cierto en la BD. Las copias de seguridad del proveedor y los logs pueden conservarlos un tiempo. Hay que decirlo con su plazo. 👤 |

### 🟠 Medios — durante el desarrollo

**R4 · Sin cabeceras de seguridad HTTP.**
- Faltan `Content-Security-Policy` (limitar scripts y conexiones a Supabase y a la propia app), `frame-ancestors 'none'` (anti-clickjacking), `Referrer-Policy`, `Permissions-Policy` y `X-Content-Type-Options`.
- Importa más porque **el token de sesión vive en `localStorage`**: ante cualquier XSS, la CSP es la última barrera.
- Se configura en `vercel.json`, a probar primero en preview.

**R5 · Analítica activada por defecto y con almacenamiento en el dispositivo.**
- `perfiles.analitica` vale `true` por defecto.
- Para contar visitas se guarda `palanca_ultima_visita` en `localStorage`.
- El art. 22.2 LSSI exige consentimiento para almacenar o leer información en el terminal salvo que sea estrictamente necesaria para el servicio pedido; la analítica propia, en principio, no lo es. ⚖️
- **Opciones:**
  1. Analítica opcional (desactivada por defecto) con un interruptor claro.
  2. Contar las visitas en el servidor sin guardar nada en el dispositivo y mantener la oposición. ⚖️
- Es la razón principal por la que hoy **podría** hacer falta un aviso de consentimiento; si se elige la opción 2, probablemente no.

**R6 · Fulcro: asesoramiento financiero y transparencia de la IA.**
- El *prompt* lo encuadra como «orientación educativa» y prohíbe recomendar productos concretos. Bien.
- Hay que validar que no constituye **asesoramiento en materia de inversión** (Ley 6/2023 de los Mercados de Valores y de los Servicios de Inversión, MiFID II). ⚖️
- Hay que informar de que es una IA (Reglamento (UE) 2024/1689 de IA, art. 50, obligaciones de transparencia). ⚖️
- Conviene un aviso visible: «Fulcro es una IA; orientación educativa, no asesoramiento financiero».

**R7 · Datos de terceros en los conceptos de los movimientos.**
- «Bizum de Marta», transferencias a personas, nóminas con el nombre de la empresa…
- Palanca trata datos de personas que no son usuarias.
- Mitigación: declararlo en la política, no enviar conceptos completos a la IA salvo en la pregunta concreta, y permitir editarlos. ⚖️

**R8 · Datos financieros en el dispositivo que sobreviven al cierre de sesión.**
- Cierre de sesión actual: solo borra las píldoras.
- Se quedan en el navegador los límites por categoría, el saldo de respaldo, los compromisos heredados, el lote de importación, el periodo, etc., además de la conversación de Fulcro en `sessionStorage` hasta cerrar la pestaña.
- En un ordenador compartido, otra persona podría verlos con las herramientas del navegador. Los datos van separados por identificador de usuario, así que **no aparecen en la sesión de otro usuario dentro de la app**.
- 🔧 Purgar `palanca_*_<id>` y la conversación al cerrar sesión.

**R9 · Imágenes de capturas a un proveedor de EE. UU.**
- Pueden contener IBAN, nombre y saldos.
- Hay que verificar en los términos comerciales de Anthropic la retención y el no uso para entrenamiento de los datos de la API, y documentar la transferencia internacional (cap. V RGPD).
- 👤 ⚖️ Añadir un aviso previo en la pantalla de importar.

**R10 · Registro de actividades y evaluación de impacto.**
- Faltan el registro de actividades de tratamiento (art. 30 RGPD; la exención para menos de 250 empleados no aplica a tratamientos no ocasionales ni de riesgo) y el análisis de si hace falta una **EIPD** (art. 35).
- Datos económicos detallados + elaboración de perfiles e «insights» automáticos + IA → probable riesgo alto.
- Consultar la lista de la AEPD de tratamientos que requieren EIPD. ⚖️

**R11 · Procedimiento de brechas de seguridad.** No existe. Arts. 33–34 RGPD: notificar a la AEPD en 72 h y, si hay alto riesgo, a los afectados. 🔧 Documento interno breve.

### 🟡 Bajos

- **R12 · Enlace de baja sin caducidad** (HMAC sin fecha). Riesgo bajo: solo permite dar de baja los recordatorios.
- **R13 · Política `fulcro_uso_ins`:** el usuario puede insertar filas suyas directamente. Solo puede gastar su propio cupo; no afecta a otros.
- **R14 · Email del administrador** escrito en el SQL (`admins`). Está bien que no esté en la app; es solo un apunte.
- **R15 · Menores.** Edad mínima de 14 años en el alta (coincide con el art. 7 LOPDGDD para el consentimiento), pero no se verifica. **Contratar una suscripción** requiere capacidad de obrar. ⚖️ Valorar 18 años para Premium.

### ¿Es «categoría especial» (art. 9 RGPD)?

- **No automáticamente.** Los datos financieros no figuran en la lista del art. 9 (salud, ideología, origen étnico, orientación sexual, etc.).
- **Pero** los conceptos pueden *revelar* categorías especiales de forma indirecta: farmacia o clínica (salud), cuota a un sindicato o partido, donaciones a una confesión religiosa.
- Además, la información patrimonial detallada es de **alto riesgo** para el interesado (fraude, extorsión, discriminación).
- **Conclusión:** tratarlos con medidas de riesgo alto (cifrado, RLS, minimización, EIPD) sin calificarlos de art. 9. Que lo valide el abogado ⚖️, sobre todo si se categorizan automáticamente gastos de salud.

---

## C. Proveedores (actuales y previstos)

| Proveedor | Estado | Función | Qué recibe (comprobado en código) | Dónde / transferencias | Garantías a tener | Configuración actual |
|---|---|---|---|---|---|---|
| **Supabase** | Actual | BD, Auth, funciones | **Todo**: cuenta, datos financieros, uso, IPs en logs | 👤 Región del proyecto (la política dice Irlanda: **verificar**). Supabase Inc. es de EE. UU.: posible acceso remoto | DPA de Supabase (encargado, art. 28). SCC o Data Privacy Framework si hay transferencia | RLS por usuario (👤 verificar en la BD real), Auth email+contraseña. 👤 Confirmación de email, contraseña mínima, MFA, copias |
| **Vercel** | Actual | Alojamiento de la web y de las funciones `/api`, cron | Todas las peticiones (IP, user-agent), el cuerpo de las llamadas a `/api` (resúmenes, imágenes en tránsito), logs | EE. UU. y región de las funciones (👤 configurar UE si es posible) | DPA de Vercel + SCC/DPF | Variables de entorno por entorno. 🔧 Deployment Protection en previews, cabeceras |
| **Anthropic** | Actual (Fulcro, capturas, mapeo de columnas) | IA | Fulcro: resumen + detalle + pregunta + historial. Capturas: imágenes. Mapeo: cabeceras + 3 filas | EE. UU. | DPA comercial de Anthropic, transferencias (SCC/DPF), 👤 **verificar retención y no entrenamiento** en sus términos para API | Clave solo en el servidor; límites diarios y total en la BD |
| **Resend** | Actual (dormido hasta `RECORDATORIOS_ACTIVOS=true`) | Envío de emails | Email, nombre, asunto y cuerpo (sin importes; nombre del seguro y fecha en avisos de renovación) | EE. UU. (👤 región) | DPA + SCC/DPF | Con `List-Unsubscribe`. 👤 **Desactivar el seguimiento de aperturas y clics** de Resend si está activo |
| **GitHub** | Actual | Código fuente | **Ningún dato de usuario** (solo código y documentos; el email del admin aparece en un SQL) | EE. UU. | No es encargado de datos de usuarios | ✅ Sin `.env` ni secretos en el repo |
| **Supabase Auth (emails del sistema)** | Actual | Confirmación y recuperación de contraseña | Email | Igual que Supabase (👤 ¿SMTP propio o el de Supabase?) | DPA de Supabase | 👤 Plantillas en español, remitente |
| Fuentes tipográficas | Actual | Geist, Instrument Sans… | **Nada**: van empaquetadas (`@fontsource`), sin Google Fonts | — | — | ✅ Sin peticiones a terceros |
| Analítica de terceros, píxeles, monitorización (Sentry…) | **No hay** | — | — | — | — | ✅ Ninguna |
| **Pasarela de pagos** (Stripe, Paddle, Lemon Squeezy…) | Prevista 👤 | Cobro de suscripciones | Email, datos de pago (en la pasarela), plan | Según proveedor | DPA. Un *merchant of record* (Paddle, Lemon Squeezy) asume IVA y facturación | — |
| **Open Banking** (agregador AIS) | Previsto 👤 | Conectar cuentas | Movimientos reales del banco | — | ⚖️ Requiere un **proveedor autorizado de información sobre cuentas** (RDL 19/2018, PSD2) o ser uno. Palanca no puede leer cuentas directamente | — |
| Push (VAPID) | Previsto | Notificaciones | Suscripción push del navegador | Servicios push de los navegadores | — | — |

---

## D. Documentación

| # | Documento | Estado | Borrador |
|---|---|---|---|
| 1 | Aviso legal (art. 10 LSSI) | 🔧 👤 ⚖️ ⛔ | [borradores/01-aviso-legal.md](borradores/01-aviso-legal.md) |
| 2 | Política de privacidad (RGPD arts. 13–14; información por capas, art. 11 LOPDGDD) | 🔧 (corregir la actual) 👤 ⚖️ ⛔ | [borradores/02-politica-privacidad.md](borradores/02-politica-privacidad.md) |
| 3 | Política de cookies y almacenamiento | 🔧 ⚖️ | [borradores/03-politica-cookies.md](borradores/03-politica-cookies.md) |
| 4 | Condiciones de uso | 🔧 👤 ⚖️ ⛔ | [borradores/04-condiciones-uso.md](borradores/04-condiciones-uso.md) |
| 5–7 | Contratación y suscripción, renovaciones y cancelación, desistimiento | 🔧 👤 ⚖️ (⛔ antes de cobrar) | [borradores/05-condiciones-contratacion.md](borradores/05-condiciones-contratacion.md) |
| 8 | Proveedores y encargados del tratamiento | 🔧 👤 | [borradores/08-encargados.md](borradores/08-encargados.md) |
| 9 | Procedimiento de derechos (y de brechas) | 🔧 | [borradores/09-derechos-y-brechas.md](borradores/09-derechos-y-brechas.md) |
| — | Registro de actividades de tratamiento (art. 30), interno | 🔧 ⚖️ | Incluido en 08 (estructura) |
| — | Evaluación de impacto (art. 35), si procede | ⚖️ | Pendiente de la decisión del abogado |

**Normativa de referencia** (textos oficiales; validar la vigencia y la versión consolidada):
- RGPD — Reglamento (UE) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- LOPDGDD — Ley Orgánica 3/2018: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673
- LSSI — Ley 34/2002: https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758
- TRLGDCU — RDL 1/2007 (consumidores; incluye la transposición de la Directiva 2019/770 de contenidos y servicios digitales): https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555
- Ley 7/1998 de Condiciones Generales de la Contratación: https://www.boe.es/buscar/act.php?id=BOE-A-1998-8789
- Reglamento (UE) 2024/1689 de Inteligencia Artificial: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- RDL 19/2018 de servicios de pago (Open Banking): https://www.boe.es/buscar/act.php?id=BOE-A-2018-16036
- Ley 6/2023 de los Mercados de Valores y de los Servicios de Inversión: https://www.boe.es/buscar/act.php?id=BOE-A-2023-7053
- Guías de la AEPD (cookies, EIPD, brechas): https://www.aepd.es

---

## E. Funcionalidades pendientes (cuando el producto esté estable)

1. **Páginas legales** accesibles sin sesión y desde la app (pie, alta, Tu cuenta), con versión y fecha. Registro de qué versión aceptó cada usuario (🔧 una columna o tabla `aceptaciones`).
2. **Alta:** casillas separadas.
   - Obligatoria: condiciones + privacidad (información).
   - Opcionales: analítica (si se elige la opción 1 de R5) y comunicaciones comerciales.
   - Nunca premarcadas.
3. **Aviso de IA:**
   - en Fulcro: «Es una IA; orientación educativa»;
   - en Importar con capturas: qué se envía, a quién, y la recomendación de tapar IBAN y nombres.
4. **Cierre de sesión seguro:** purgar el almacenamiento local del usuario.
5. **Cabeceras de seguridad** (CSP…) en `vercel.json`.
6. **Centro de privacidad en Tu cuenta** (ya existe casi todo):
   - descargar datos y borrar cuenta;
   - interruptores (analítica, recordatorios, avisos, comerciales);
   - «qué ve Fulcro» (vista previa del resumen que se envía);
   - contacto para ejercer derechos.
7. **Suscripciones (antes de cobrar):**
   - pantalla de información previa;
   - aceptación expresa;
   - email de confirmación en soporte duradero;
   - cancelar en Tu cuenta tan fácil como contratar;
   - aviso previo de la renovación;
   - facturas.
   Ver el borrador 05.
8. **Emails:** separar en el código y en las preferencias los **operativos** de los **comerciales** (§7 abajo). Desactivar el seguimiento de aperturas y clics.
9. **Brechas:** procedimiento interno y registro de incidentes.

### Clasificación de los emails (§7 del encargo)

| Email | Estado | Tipo | Base / requisito |
|---|---|---|---|
| Confirmación de registro, recuperación de contraseña (Supabase Auth) | Actual | Operativo | Necesario para el contrato. Sin consentimiento aparte |
| Avisos de seguridad (cambio de email o contraseña, accesos) | Previsto | Operativo | Contrato y obligación de seguridad |
| «Tu prueba Premium termina el…» | Actual (plantilla) | Operativo-contractual | Contrato. Informa del fin de la prueba |
| Aviso de **renovación de seguro** | Actual, solo si se activa | Servicio pedido por el usuario | Consentimiento o petición (interruptor en Tu cuenta) ✅ |
| «Dos minutos para ponerte al día», «Tu dinero sigue aquí», «Tu primer paso», «Llevas X días» | Actual (dormido) | **Frontera**: animan a usar el servicio contratado | ⚖️ Si se consideran comerciales, valen para clientes si son de productos similares, con baja fácil en cada email (art. 21.2 LSSI). Hoy: activados por defecto y con baja ✅. Recomendación: dejarlos en «recordatorios del servicio», sin promociones |
| Informe semanal o mensual con cifras (`reporteSemanal.js`) | Previsto (no conectado) | Servicio | Opcional y opt-in. **Sin importes en el email** (cualquiera puede leer un correo) o solo con enlace a la app |
| Promociones, newsletter, ofertas Premium | Previsto 👤 | **Comercial** | Consentimiento expreso separado (art. 21 LSSI) o la excepción de cliente, con baja en cada envío. Lista y preferencia **separadas** de los recordatorios |

---

## F. Información pendiente de Eric (👤)

1. **Titular:** ¿persona física (autónomo) o sociedad? Nombre o razón social, **NIF**, domicilio, datos registrales si es sociedad.
2. **Contacto público:** email de contacto y de privacidad (¿un `privacidad@` en dominio propio?), y si se publica un teléfono.
3. **Dominio definitivo** (hoy `palanca-zeta.vercel.app`).
4. **Proveedor de pagos** y si actuará como *merchant of record*.
5. **Planes:** nombres, precio final con impuestos, mensual o anual, prueba gratuita (duración y si pide tarjeta), qué incluye cada uno y política de reembolsos.
6. **Edad mínima** para usar la app y para contratar.
7. **Analítica:** opción 1 (opcional y desactivada por defecto) u opción 2 (servidor, sin dispositivo, con oposición).
8. **Newsletter o comunicaciones comerciales:** ¿sí o no?
9. **IA:** qué funciones habrá (Fulcro, capturas, mapeo), en qué planes, y si se ofrece la app **sin** IA.
10. **Open Banking:** ¿se incorporará? ¿Con qué agregador autorizado?
11. **Conservación:**
    - cuentas inactivas (¿borrado o aviso tras X meses?);
    - copias de seguridad (plazo del plan de Supabase);
    - logs;
    - datos de facturación (obligación fiscal, a validar).
12. **Región** del proyecto Supabase de producción y de dev, y de las funciones de Vercel.
13. **Estado de los DPA** con Supabase, Vercel, Anthropic y Resend (¿aceptados en sus paneles?).
14. **Supabase Auth:**
    - confirmación de email obligatoria (sí/no);
    - política de contraseñas;
    - protección de contraseñas filtradas;
    - MFA;
    - plan con copias de seguridad.
15. **Resultado de `supabase-auditoria-seguridad.sql`** en palanca dev y en producción.
16. **Vercel:** ¿Preview ya apunta a palanca dev? ¿Activar *Deployment Protection*?
17. **Usuarios beta actuales:** cuántos hay y si se les informará de la política corregida.

---

## G. Plan de trabajo

### Ahora (riesgos graves y prevención)
1. 👤 Ejecutar `supabase-auditoria-seguridad.sql` en dev y en producción (R1).
2. 👤 Preview → palanca dev + Deployment Protection (R2).
3. 🔧 Corregir la política de privacidad **publicada** con lo que hace hoy el código (R3), aunque siga siendo provisional: Fulcro no «anónimo», Anthropic en las tres funciones, datos técnicos y del dispositivo, base jurídica a validar.
4. 👤 Desactivar el seguimiento de aperturas y clics en Resend (si se usa) y no activar `RECORDATORIOS_ACTIVOS` en producción hasta revisar el texto.

### Durante el desarrollo (decisiones y preparativos)
5. Responder la lista F.
6. 🔧 Purga del almacenamiento local al cerrar sesión (R8).
7. 🔧 Cabeceras de seguridad, probadas en preview (R4).
8. 🔧 Decidir y aplicar la analítica sin dispositivo o opt-in (R5).
9. 🔧 Aviso previo en «Importar con capturas» y aviso «es una IA» en Fulcro (R6, R9).
10. 🔧 Un SQL de esquema limpio y la comprobación de seguridad en el CI (R1).
11. Mantener el registro de proveedores (doc 08) al añadir cualquier servicio.

### Antes de la beta pública
12. ⚖️ Revisión por un abogado de los documentos 1–4 y 8–9 con los datos de F.
13. 🔧 Páginas legales públicas, aceptación versionada, casillas separadas en el alta.
14. 🔧 Centro de privacidad en Tu cuenta, separación de emails operativos y comerciales.
15. ⚖️ EIPD (si procede) y registro de actividades. Procedimiento de brechas.
16. 👤 DPA y transferencias documentadas con cada proveedor.

### Antes de empezar a cobrar
17. ⚖️ Condiciones de contratación, desistimiento (y su excepción, si se usa), renovación y cancelación (doc 05).
18. 🔧 Flujo de compra con información previa, aceptación expresa, confirmación en soporte duradero, cancelación en línea y aviso de renovación.
19. 👤 Pasarela, facturación e IVA (OSS si hay clientes de otros países de la UE) con asesoría fiscal.

---

## H. Bloqueantes para el lanzamiento público

| # | Condición | Estado |
|---|---|---|
| 1 | RLS sin políticas abiertas en producción (comprobación sin filas) | 👤 ⛔ |
| 2 | Previews sin acceso a datos de producción | 👤 ⛔ |
| 3 | Titular identificado + aviso legal publicado | 👤 ⛔ |
| 4 | Política de privacidad exacta (proveedores, IA, bases jurídicas, plazos, derechos) y validada | 🔧 ⚖️ ⛔ |
| 5 | Condiciones de uso (incluido el carácter no profesional de Fulcro) | 🔧 ⚖️ ⛔ |
| 6 | Analítica conforme (opt-in o sin almacenamiento en el dispositivo) | 🔧 ⚖️ ⛔ |
| 7 | DPA y transferencias con Supabase, Vercel, Anthropic y Resend | 👤 ⛔ |
| 8 | Cabeceras de seguridad básicas | 🔧 (recomendado, no estrictamente legal) |
| 9 | Procedimiento de derechos y de brechas | 🔧 ⛔ |
| 10 | Condiciones de contratación y flujo de compra conforme | ⛔ **solo antes de cobrar** |
| — | Banner de cookies | ➖ **Probablemente no necesario** si la analítica pasa al servidor sin almacenamiento en el dispositivo: el resto (sesión, preferencias, datos que el propio usuario guarda) es estrictamente necesario. ⚖️ Ver doc 03 |
| — | Categoría especial (art. 9) | ➖ No automáticamente, con matices (§B) ⚖️ |
| — | Licencia de entidad de pago | ➖ Hoy no: Palanca no accede a cuentas bancarias. ⛔ Sí si se incorpora Open Banking (vía agregador autorizado) |
