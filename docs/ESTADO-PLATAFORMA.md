# Palanca — Estado de la plataforma (dossier para planificación)

> Documento de contexto para planificar el crecimiento. **No contiene datos
> sensibles** (ni claves, ni URLs del proyecto, ni connection string, ni datos
> personales de usuarios). Describe qué es Palanca, cómo está construida, qué
> hace hoy y qué queda por delante.

---

## 1. Qué es Palanca

App/PWA de **finanzas personales** para gente joven que empieza a organizar su
dinero. Misión (Fase 1): ayudar a estructurar las finanzas desde el inicio y
acompañar del "no sé dónde estoy" al "doy mi primer paso hacia la inversión".
El listón de producto es alto: algo **único, premium y que la gente sienta
imprescindible**.

- **Estética**: oscura, futurista, minimalista. Color solo con significado:
  verde ingreso, rosa gasto, dorado inversión, morado/cian de marca.
- **Público**: personas jóvenes en sus primeros pasos con el dinero.
- **Diferencial actual**: modelo de "dos bolsas" (flujo mensual + patrimonio
  acumulado) con honestidad sobre la fiabilidad de los datos (reconciliación),
  proyección de futuro como "momento ajá", y un consultor educativo con IA.

---

## 2. Stack técnico y despliegue

- **Frontend**: React 19 + Vite + `vite-plugin-pwa` (instalable, auto-actualizable).
- **Estado/estilos**: CSS con **tokens de diseño centralizados en `index.css`**
  (colores, espaciados, radios, tipografías). Sin librería de componentes.
- **Backend**: Supabase (Postgres + Auth + PostgREST). El cliente usa la anon key.
- **Funciones serverless** (Vercel `/api`): `consultor.js` (chat IA "Fulcro") y
  `mapear-columnas.js` (asistente de importación). La API key del modelo vive
  solo en el servidor.
- **Deploy**: push a `main` → Vercel (build `vite build` + PWA).
- **Calidad**: `npm run build` + `oxlint`. Disciplina: incremental, commits
  frecuentes, verificar que compila y no romper nada.

---

## 3. Arquitectura de datos (principios)

- **Fuente única de datos en la app**: `App.jsx` carga **todos** los movimientos
  del usuario una vez; cada pantalla deriva lo que necesita por props
  (`movimientos` histórico o `movimientosMes`). Tras crear/editar/borrar se
  refresca todo con un único `cargarMovimientos()`.
- **Fuente única de cálculo**: `src/lib/movimientosUtils.js`. Toda regla de
  negocio (totales, bolsas, medias, proyección, agregación mensual) vive ahí; los
  componentes no recalculan a mano.
- **Tablas** (Postgres, todas con columna `usuario_id`):
  `movimientos, categorias, fuentes, perfiles, presupuestos, planificaciones,
  objetivos_ahorro, simulaciones_guardadas`.
- **Conceptos calculados (NO son tablas)**: las "dos bolsas", la reconciliación
  y los logros se **derivan** de `movimientos` (p. ej. la reconciliación son
  movimientos de categoría `Ajuste`; los logros se calculan en `hitos.js`).
- Datos de UI ligeros en `localStorage` por usuario (recurrentes definidos,
  tipo de objetivo, píldoras descartadas, escenarios de simulador, gastos
  rápidos, fecha de reconciliación). Documentado como fácilmente migrable.

---

## 4. Modelo financiero (el núcleo — no tocar sin cuidado)

Dos capas, definidas una sola vez en `movimientosUtils.js`:

### Flujo mensual
- **Gasto** = consumo (movimientos tipo `gasto` **excluyendo** categoría `Inversion`).
- **Inversión** = movimientos tipo `gasto` con categoría `Inversion` (se muestra
  en dorado, nunca como gasto negativo).
- **Superávit/Ahorro** = ingresos − gastos de consumo. **La inversión ES parte
  del ahorro** (invertir no penaliza el ratio ni agota el presupuesto).
- **Ratio de ahorro** = ahorro / ingresos × 100.

### Stock acumulado (dos bolsas)
- **Bolsa de inversión** = Σ aportaciones (categoría `Inversion`).
- **Bolsa de ahorro líquido** = saldo inicial + Σ(superávit − inversión) + ajustes.
- **Patrimonio total** = inversión + liquidez.

### Reconciliación (honestidad)
- Movimientos de categoría `Ajuste` (excluidos del flujo, pero afectan a la
  liquidez). El usuario introduce su saldo real de banco y la app crea un
  **ajuste visible y explicado** para cuadrar la liquidez teórica con la real.
- **Indicador de fiabilidad**: mientras no se reconcilie, avisa de que la
  liquidez es una estimación; muestra "reconciliado hace N días" y avisa si se
  desvía. Principio innegociable: nunca mostrar una cifra de liquidez como un
  hecho cuando es una estimación sin verificar.

### Reglas transversales
- Agregación mensual siempre por el campo **`fecha`** del movimiento (cuándo
  ocurrió), nunca por `created_at`. Meses sin datos aparecen a cero.
- Formato: `1.234,56 €` (es-ES), fechas `dd/mm/aaaa`, porcentajes con coma.

---

## 5. Seguridad (plataforma cerrada)

- **Autenticación**: solo con **Supabase Auth (email + contraseña)**. Registro,
  login, recuperación de contraseña, sesión persistente, mostrar/ocultar
  contraseña. El sistema antiguo de "ID en localStorage" fue **retirado**.
- **RLS activo y verificado** en las 8 tablas. Políticas: cada usuario solo lee
  y escribe filas cuyo `usuario_id = auth.uid()`, **solo para el rol
  `authenticated`**. Sin acceso anónimo/público: sin login, 0 filas y escritura
  bloqueada. Aislamiento entre usuarios comprobado con dos cuentas reales.
- **Privacidad/consentimiento**: casilla de consentimiento **no premarcada** en
  el registro + enlace a **política de privacidad**. Derecho de supresión:
  función RPC `borrar_mi_cuenta()` (elimina todos los datos del usuario y su
  cuenta de Auth) accesible desde el panel de cuenta.
- **IA (Fulcro)**: solo recibe **resúmenes agregados y anónimos**, nunca
  movimientos en bruto.

---

## 6. Pantallas y funcionalidades (detalle)

### Acceso / onboarding
- **Pantalla de acceso**: entrar / crear cuenta / recuperar, con estética de
  marca, validación con feedback en vivo, ojo para ver la contraseña.
- **Onboarding** del primer arranque: pide **nombre**, **año de nacimiento**
  (año, no edad), **objetivo** (Ahorrar / Jubilación / Planificación / Otro) y,
  opcional, **saldo inicial de liquidez**. Editable después en Cuenta.
- **Primer arranque guiado** (nuevo): tarjeta "Empieza aquí" en el dashboard que
  aparece hasta que el usuario registra su primer ingreso y su primer gasto, con
  botones directos que abren el alta en el modo correcto. Al completarlos,
  desaparece y el dashboard cobra vida (tasa de ahorro + proyección) = "momento
  ajá".

### Dashboard
- **Selector de periodo global**: un único control (‹ › + desplegable + "Hoy")
  que gobierna a la vez métricas, tasa de ahorro, gasto por categoría y
  evolución; recalcula toda la pantalla para el mes elegido.
- **Métricas principales**: ingresos del mes vs media, ahorro del mes como
  número hero, tarjetas clicables (Ingresos/Gastos/Inversión), barra de ratio y
  objetivo de inversión mensual.
- **Patrimonio y bolsas**: patrimonio total = inversión (clicable → apartado
  Inversión) + ahorro líquido, con el indicador de fiabilidad y botón "Ajustar
  saldo" (reconciliación).
- **Tasa de ahorro mensual**: gráfico de línea deslizable por el historial, con
  degradado y glow; al pasar por un mes muestra %, comparación con el mes
  anterior (▲/▼ pts) y euros ahorrado/invertido.
- **Gasto por categoría** (del periodo): barra apilada navegable al detalle.
- **Evolución (6 meses)**: barras ingresos/gastos interactivas.
- **Comparativas** contra el propio historial ("ahorras un X% más que el mes
  pasado"), máx. 2.
- **Camino de logros**: progreso por familias con **difuminado progresivo** que
  da sensación de camino infinito.
- **Píldora educativa**: nota contextual; al cerrarla no desaparece para
  siempre (vuelve con un movimiento nuevo o en otra sesión).
- **Proyección de futuro**: "dinero parado" vs "invertido al 7%" a 5/10/20/30
  años (el momento "ajá"), reutiliza el interés compuesto de la fuente única.
- **Saludo personalizado** con el nombre.

### Movimientos
- Sub-pestañas por frecuencia de uso: **Nuevo · Recurrentes · Historial · Importar**.
- **Nuevo**: alta rápida (toggle Gasto/Ingreso/Inversión, importe grande con
  separador de miles en vivo, gastos rápidos personalizables, sugerencias del
  histórico, categoría/concepto en chips, fecha que se puede **escribir o abrir
  calendario**, Variable/Fijo, nota).
- **Recurrentes**: **checklist mensual**. Cada recurrente lleva día del mes,
  contador de días al próximo cobro, racha "llevas N meses" (histórico
  conservado), y al marcarlo pide **confirmación explícita** ("¿Confirmas X € el
  DD/MM?") con importe (ajustable si varía) y fecha antes de registrar.
  Distinción visual pendiente/hecho.
- **Historial**: agrupado por meses en acordeón, con filtros (Ingresos, Gastos,
  Inversión, Ahorro/Ajuste); tarjetas compactas y premium con acento por tipo.
- **Importar CSV**: 3 pasos (elegir → revisar columnas → confirmar), con
  explicación y privacidad; mapeo de columnas revisable + **asistente IA** que
  envía solo cabeceras + 2-3 filas de ejemplo (el resto se procesa en el
  navegador); detección de duplicados y deshacer por importación. *(Futuro:
  importación directa desde el banco y varios bancos por usuario.)*

### Presupuesto
- Dos métodos: por **tasa de ahorro** (%) o por **gasto máximo fijo** (€).
- Estética premium: hero centrado, barra de progreso, tarjetas de stat
  (Gastado / Te queda / Ahorro real), gasto diario, desglose por categoría.
- **Planificación a futuro** (hasta 6 meses): el superávit previsto se reparte
  en **invertir + ahorro líquido**; proyección del patrimonio acumulado;
  comparación plan vs real cuando llega el mes.

### Inversión
- Total invertido + **media mensual configurable** (12 meses o desde el inicio).
- Gráfico de barras deslizable con eje Y que escala al máximo real, cifras
  ancladas y línea de media legible por encima.
- Alta de aportación (plataforma, importe, fecha) e **historial colapsado por
  mes** (acordeón).

### Simulador
- **Objetivos de ahorro**: metas por tipo de bolsa (ahorro líquido / inversión /
  patrimonio); el progreso se deriva de la bolsa y el ritmo mensual depende del
  tipo. Frases de "a tu ritmo lo alcanzas en N meses".
- **Interés compuesto**: proyección con gráficos y tabla; **guardar simulaciones**
  con nombre (flujo claro con confirmación).
- **Hipoteca**: cuota (sistema francés) + amortización anticipada; píldoras
  educativas; guardar simulaciones.
- **Independencia financiera** (regla del 4%): escenarios comparables; se
  desbloquea con 30 días de historial.

### Cuenta / ajustes
- Panel de cuenta: editar nombre y año de nacimiento, cerrar sesión y **borrar
  cuenta y todos los datos**.

---

## 7. Extras transversales

- **Logros** (`hitos.js` + celebración a pantalla + camino en dashboard): por
  familias (ahorro líquido / inversión / patrimonio / constancia / objetivos),
  escalera larga, ampliable añadiendo entradas al array.
- **Consultor IA "Fulcro"**: chat flotante con encuadre **educativo** (no
  asesoramiento regulado); recibe un resumen estructurado y anónimo.
- **Toasts**, modal de confirmación, skeletons, estados vacíos con acción,
  aviso de error con reintento, PWA auto-actualizable.

---

## 8. Estado por áreas (para priorizar)

- **Seguridad**: ✅ cerrada (Auth + RLS + consentimiento + supresión). Lista para
  enseñar a terceros.
- **Onboarding de usuario nuevo**: ✅ base (arranque guiado); margen para reforzar
  estados vacíos y el "momento ajá".
- **Núcleo financiero (dos bolsas + reconciliación)**: ✅ sólido y verificado.
- **Producto/estética**: ✅ nivel alto y coherente; siempre hay margen premium.

---

## 9. Pendiente / ideas de futuro (roadmap conocido)

- **Importación bancaria directa** y soporte de **varios bancos por usuario**
  (idea aplazada; hoy solo CSV con asistente IA).
- **Logros que no salten antes de tiempo**: al registrar la nómina, el logro
  puede dispararse porque en ese instante todo el ingreso cuenta como ahorro;
  revisar para que no celebre prematuramente por un ingreso recién metido.
- **Reporte semanal por email** (infraestructura preparada, envío sin activar).
- **Notificaciones push reales** (hoy el recordatorio solo se ve al abrir la app).
- Reforzar **estados vacíos que enganchan** en todos los bloques y el momento
  "ajá" temprano.
- Revisión profesional de la **política de privacidad** antes de abrir al público.

---

## 10. Reglas de desarrollo (constraints que respetar)

- `movimientosUtils.js` = **fuente única de cálculo**. No duplicar reglas ni
  tocar el modelo de dos bolsas / reconciliación a la ligera.
- **Tokens de diseño en `index.css`** (no colores/medidas sueltas).
- **Arquitectura de datos única en `App.jsx`** (una carga, props hacia abajo).
- Ampliaciones **aditivas y reversibles**, sin regresiones.
- Incremental, commits frecuentes, verificar build + que el usuario logueado
  sigue viendo sus datos. Ante cualquier acción que pueda exponer datos o cerrar
  accesos: parar y confirmar.
