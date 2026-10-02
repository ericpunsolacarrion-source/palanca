# Palanca — guía pantalla a pantalla

App en producción: https://palanca-zeta.vercel.app
PWA instalable (React + Vite + vite-plugin-pwa) · Backend Supabase · Deploy automático: push a `main` → Vercel.

**Misión**: ayudar a jóvenes a estructurar sus finanzas desde el inicio (Fase 1).
A futuro (Fase 2): familias, login real con Supabase Auth.

---

## Flujo de entrada

### 1. Pantalla de ID (`PantallaId.jsx`)
- El usuario escribe un **ID libre** (ej. "eric2026") que se guarda en localStorage.
- No hay contraseña (limitación consciente de Fase 1: cualquiera que conozca el ID accede a esos datos).
- El mismo ID en otro dispositivo recupera los mismos datos.

### 2. Onboarding (`Onboarding.jsx`) — solo la primera vez
- Pregunta el **objetivo**: Ahorrar / Jubilación / Planificación / Otro → se guarda en `perfiles.objetivo`.
- Pide el **correo electrónico** (validado) → `perfiles.email`. La validación es **infalible**: el error se limpia en vivo al corregir el correo (con pista verde cuando es válido) y el botón nunca se queda colgado (try/catch). Los correos recogidos se ven en Supabase → Table Editor → `perfiles`.
- Pide (opcional) el **saldo inicial de liquidez** (cuánto tiene ahora en cuenta) para que la bolsa de ahorro líquido parta de una base real; se registra como un movimiento de **ajuste** ("Saldo inicial"), editable después.
- Al completar, siembra las categorías iniciales: Nomina (ingreso) y Vivienda, Comida, Ocio, Transporte, Ahorro, Inversion (gasto).

---

## Navegación

Barra inferior **siempre visible** (solo el contenido central hace scroll), con blur y 5 pestañas: Dashboard · Movimientos · Presupuesto · Inversión · Simulador. En escritorio (≥860 px) se convierte en píldoras horizontales.

### 3. Dashboard

Portada de interpretación. Su trabajo es responder, en este orden: **qué ha pasado este periodo, cuánto patrimonio tienes, cómo estás ahorrando y qué trayectoria estás construyendo**.

- **Banner "Completa tu cuenta"** cuando corresponda.
- **Recordatorio** si lleva 2+ días sin registrar movimientos.
- **Selector de periodo global**: gobierna las métricas del periodo elegido.
- **Métricas principales**: ingresos, gastos, inversión y ahorro/ratio.
- **Patrimonio**: patrimonio total y sus bolsas; permite revisar/ajustar liquidez.
- **Tasa de ahorro**: única visualización histórica mantenida en portada para leer comportamiento.
- **Píldora contextual**: una sola observación accionable cuando aporta contexto.
- **Proyección de futuro**: una única lectura de trayectoria, después del estado actual.
- **Últimos movimientos**: los 5 más recientes, solo lectura.

### Qué NO vive en la portada

El dashboard no debe convertirse en un catálogo de todos los análisis de Palanca. Se mantienen fuera de la portada:
- gasto por categoría;
- evolución mensual detallada;
- comparativas;
- camino de logros;
- demás análisis secundarios.

Esos contenidos pueden existir en sus módulos o pantallas propias sin competir con las cuatro preguntas de la portada.

## 4. Movimientos (`MovimientosTab.jsx`)
Cuatro sub-pestañas por frecuencia de uso: **Nuevo · Recurrentes · Historial · Importar**
(el historial se consulta a diario; el importador, una o dos veces). Se puede llegar también
desde las **tarjetas de métrica del dashboard** (Ingresos/Gastos/Inversión),
que abren una **vista filtrada** de los movimientos de ese tipo en el mes en
curso, con su total y botón "← Movimientos".
- **Nuevo** (`RegistroMovimiento.jsx`): alta **rápida y sin fricción**. Toggle de 3 opciones **Gasto/Ingreso/Inversión** (la inversión en dorado; mismo modelo `tipo=gasto` + categoría `Inversion`). **Importe grande centrado** con separador de miles **en vivo** (`InputImporte`, usado en TODOS los campos € de la app; muestra el € al final) y **autofocus**. En modo gasto, **gastos rápidos personalizables** (`GastosRapidos.jsx` + `lib/useGastosRapidos.js`, localStorage): el usuario crea/edita/borra sus atajos (café 1,50 €, comer…) y los registra **en un toque**. Además, sugerencias del histórico (`lib/sugerencias.js`): tira **"Repetir"**, **importes frecuentes** y **categorías ordenadas por frecuencia**. Categoría y concepto en **selector compacto** de una sola fila deslizable. Fecha, Variable/Fijo, nota plegada. Toast al terminar.
  - **Categoría** = tipo general (Nomina, Comida, Dividendos…), ampliable por el usuario.
  - **Concepto** = origen específico (ej. "Nómina restaurante" vs "Nómina bar"), también ampliable. Sirve para gente con varios trabajos.
  - **Fijo/Variable** = base para futuras previsiones.
- **Recurrentes** (`Recurrentes.jsx` + `lib/useRecurrentes.js`, localStorage con pub/sub; badge de pendientes en la pestaña): movimientos que se repiten cada mes (alquiler, nómina, suscripciones), presentados como una **checklist mensual**. Cada recurrente activo es un ítem con una **casilla** y muestra un **contador de días** hasta el próximo cobro ("en N días" / "mañana" / "toca ya") y una **racha "llevas N meses"** (histórico conservado en `mesesAplicados`: al empezar mes nuevo el check se reinicia, pero el registro de meses anteriores se mantiene). Al marcar la casilla aparece una **frase de confirmación** explícita ("¿Confirmas X € el DD/MM? Se registrará como movimiento.") con **importe y fecha editables** (`InputFecha`) antes de registrar — el importe se ajusta si es variable (nómina). La fecha por defecto es el día del mes configurado (acotado al último día; hoy si no hay día). Distinción visual clara: pendientes vs **hechos este mes** (check verde, tachado, "llevas N meses"). La configuración (crear/editar/pausar/borrar, día del mes) queda debajo en "Configurar recurrentes". El movimiento registrado va a Supabase (`es_fijo=true`).
- **Importar** (`ImportadorCsv.jsx` + `lib/importarCsv.js`): cargar el histórico desde un **CSV** (ej. exportado de Excel o del banco). Proceso en 3 pasos (elegir archivo → revisar columnas → confirmar) con **explicación clara**, ejemplo visible y guía para "Excels caóticos". **Mapeo de columnas** siempre revisable (details plegable, se abre solo si faltan columnas obligatorias) y **asistente IA opcional** ("Deducir columnas con IA"): endpoint `api/mapear-columnas.js` que recibe **solo cabeceras + 2-3 filas de ejemplo** (blindado también en el servidor), infiere el mapeo y lo devuelve; el resto del CSV se procesa **en el navegador** de forma determinista, sin enviar el grueso de los datos a ningún modelo. **Privacidad** explicada al usuario (`lib/mapearColumnasIA.js`); la API key vive solo en el servidor; degrada con elegancia si no está activado. **Previsualización** con resumen (se importarán / duplicados omitidos / con errores y sus motivos, sin abortar por filas malas), **detección de duplicados** (fecha+tipo+importe+concepto) y **deshacer** por importación (`lib/useImportaciones.js`). Crea categorías/plataformas que falten. Para cargar datos reales por script, ver `docs/IMPORT-REAL.md`.
- **Historial** (`ListaMovimientos.jsx`): resumen del mes arriba y todo el histórico **agrupado por meses en acordeón** (mes actual desplegado, anteriores plegados). **Chips de filtro** coherentes con las dos bolsas: Todos · Ingresos · Gastos · Inversión · Ahorro/Ajuste; al filtrar se muestra la **lista plana** (sin acordeón) para no ocultar resultados de meses plegados. Cada movimiento es una **tarjeta compacta y premium**: barra de acento por tipo (dorado inversión, rosa gasto, verde ingreso), concepto con truncado, importe con color por tipo, fecha + nota inline, badge "Fijo" solo cuando aplica, entrada escalonada y microinteracción al tocar (respeta `prefers-reduced-motion`). **Editar** inline / **Eliminar** (modal). Las inversiones en dorado con ↗. El campo de fecha (alta y edición) usa `InputFecha`: se puede **escribir dd/mm/aaaa** o abrir el **calendario** del sistema.

### 5. Presupuesto (`Presupuesto.jsx`)
Dos modos a elegir:
- **Por tasa de ahorro**: "quiero ahorrar el 20%" → calcula cuánto puede gastar según sus ingresos reales del mes.
- **Gasto máximo fijo**: "quiero gastar máximo 500 €/mes".
Estética premium: bloque **hero centrado** (objetivo + cifra disponible en degradado + subtítulo), barra de progreso, y **Gastado / Te queda / Ahorro real** como tarjetas de stat limpias. Incluye el **presupuesto diario** en una caja destacada y desglose por categoría con mini-barras. Incluye una **estimación de gasto mensual** (media de meses con datos, provisional si <2 meses). Al cambiar entre método por tasa (%) y por euros (€) el valor se limpia. Acordeón **"¿Qué método me conviene?"** que explica la diferencia: por % el límite en euros se adapta a los ingresos (flexible); por € fijos el excedente de los meses buenos se ahorra solo (construye patrimonio más rápido, menos adaptativo).

**Planificación de meses futuros** (`PlanificacionFutura.jsx`, debajo del presupuesto): prepara hasta **6 meses vista** (ingreso esperado, gasto máximo, inversión). El **superávit** (ingreso − gasto) se reparte explícitamente en **inversión + ahorro líquido** (en vivo en el formulario, en el resumen de cada mes y en la proyección), con las **medias reales como referencia**. El **acumulado proyectado** ("Si cumples tus planes… X a inversión + Y a ahorro líquido → sumarías Z a tu patrimonio en N meses") suma ambas bolsas sin doble conteo. Los planes quedan **guardados** (tabla `planificaciones`); cuando el mes planificado es el actual, se muestra la comparación **plan vs real**.

### 6. Inversión (`Inversiones.jsx`)
- Una inversión ES un movimiento con categoría `Inversion` (misma tabla) — registrada aquí o en Movimientos, todo queda sincronizado.
- **Total invertido** en dorado + **media mensual configurable**: un selector alterna entre **"12 meses"** (últimos 12) y **"Desde el inicio"** (todo el histórico desde la primera aportación). Afecta a la etiqueta y a la línea de media del gráfico.
- Desglose por **plataforma** (Trade Republic, MyInvestor… = campo "fuente").
- **Gráfico de barras doradas deslizable**: abarca desde el primer mes en que se invirtió hasta hoy (scroll horizontal, arranca en el mes actual y no deja ir antes de la primera aportación). El **eje Y escala dinámicamente al máximo real** de los datos con un margen superior (HEADROOM), de modo que cualquier aportación —incluidas las de 1.720€ o más— se ve completa con su cifra anclada encima (alturas en píxeles, no en % de un contenedor fijo, para que la cifra nunca se corte). El eje muestra el **año en enero** ("Ene 2026") para no perderse al deslizar. **Línea de media** (últimos 12 meses) en dorado claro con etiqueta legible, por encima de las barras y en la misma escala; las cifras llevan sombra sutil para leerse aunque la cruce.
- Formulario de nueva aportación (plataforma como chips, importe, fecha).
- **Historial colapsado por mes** (acordeón): por defecto una línea por mes ("Mes AAAA — N aportaciones — total"); al tocar se despliega el detalle (fecha, plataforma, importe) con animación suave. El mes más reciente arranca abierto. Editar/eliminar por aportación.

### 7. Simulador (`Simulador.jsx`)
Cuatro sub-pestañas:
- **Ahorro** (`AhorroObjetivo.jsx`): **múltiples objetivos** (fondo de emergencia, entrada de un piso, un viaje…). Al crear/editar, el usuario **elige explícitamente el tipo de bolsa** que sigue el objetivo: ahorro líquido, inversión o patrimonio total (badge de color en la tarjeta). El **progreso se deriva solo de la bolsa** correspondiente (`bolsas()`), no de un importe manual. El **ritmo mensual depende del tipo** (`ritmoMensualPorTipo` en `movimientosUtils`): ahorro líquido = superávit que NO se invierte; inversión = media de aportaciones; patrimonio = todo el superávit. Con ese ritmo se calculan las frases ("a tu ritmo de ahorro/inversión/crecimiento lo alcanzarías en N meses" / "para la fecha necesitas X/mes"). Crear, editar y borrar. Tabla `objetivos_ahorro` (aditiva; SQL en `supabase-schema-objetivos.sql`). El tipo por objetivo se guarda en localStorage (`lib/useObjetivoTipo.js`).
- **Interés compuesto** (`InteresCompuesto.jsx`): balance inicial, depósito mensual (inicio/fin de mes), años y rentabilidad → "Puedes ahorrar X", gráfico circular (inicial/depósitos/interés), barras apiladas por año y tabla año a año. **Guardado claro** (`SimulacionesGuardadas.jsx`): botón evidente "Guardar esta simulación" bajo los resultados, confirmación por toast, y sección "Tus simulaciones guardadas (N)" con cada una recuperable ("Cargar ›"). Mismo patrón en Hipoteca.
- **Hipoteca** (`Hipoteca.jsx`): calcular cuota (sistema francés: importe, TIN, plazo → cuota, intereses totales, total pagado) y **amortización anticipada** por reducción de plazo (cuánto ahorras en tiempo e intereses con una aportación extra). Guarda simulaciones. Incluye **píldoras de alto valor** en acordeón (reducir plazo vs cuota, por qué amortizar pronto, TIN vs TAE, mirar el total pagado, impacto de la aportación extra) y una línea contextual con el total de intereses de la propia simulación.
- **Independencia** (`IndependenciaFinanciera.jsx`): regla del 4% (patrimonio = 25× gasto anual). **Bloqueado hasta llevar 30 días** de historial. Permite **guardar varios escenarios** (conservador/realista/optimista…) con nombre y **compararlos en una tabla** enfrentada (ahorro/mes, rentabilidad, tiempo hasta la independencia), con el más rápido resaltado; tocar un escenario carga sus valores. Escenarios en localStorage (`lib/useEscenariosIF.js`).

---

## Reglas de cálculo (ver CLAUDE.md, implementadas en `movimientosUtils.js`)

Dos capas: **flujo mensual** (no cambia) y **stock acumulado** (dos bolsas).

- **Flujo** — **Gasto** = consumo (excluye Inversion) · **Inversión** = parte del ahorro, en dorado · **Superávit/Ahorro** = ingresos − gastos de consumo · **Ratio** = ahorro/ingresos. Invertir NO penaliza el ratio ni agota el presupuesto.
- **Stock** (`bolsas()`) — **Bolsa de inversión** = Σ aportaciones (categoría Inversion) · **Bolsa de ahorro líquido** = saldo inicial + Σ(superávit − inversión) + ajustes · **Patrimonio** = inversión + liquidez.
- **Ajustes** (categoría `Ajuste`, `esAjuste()`): la reconciliación de saldo. **Excluidos del flujo** (no cuentan como gasto/ingreso del mes ni tocan el ratio) pero **sí mueven la liquidez**; signo según `tipo` ingreso/gasto.
- Agregaciones mensuales siempre por `fecha` del movimiento; meses sin datos a cero
- Formato: 1.234,56 € · dd/mm/aaaa · porcentajes con coma

## Datos (Supabase, RLS abierto en Fase 1)

| Tabla | Qué guarda |
|---|---|
| `movimientos` | tipo, categoria_id, fuente_id, importe, fecha, es_fijo, nota |
| `categorias` / `fuentes` | etiquetas por usuario y tipo (ingreso/gasto) |
| `perfiles` | objetivo del onboarding, **email**, fecha de alta |
| `presupuestos` | metodo (tasa/fijo), tasa objetivo, gasto máximo, objetivo inversión mensual |
| `simulaciones_guardadas` | simulaciones de hipoteca e interés compuesto (jsonb) |
| `objetivos_ahorro` | objetivos de ahorro múltiples (nombre, importe objetivo/actual, fecha) |
| `planificaciones` | planificación de meses futuros (mes, ingreso/gasto/inversión previstos) |

`App.jsx` carga TODOS los movimientos una vez (fuente única); las pantallas derivan por props. Tras cualquier escritura → `onGuardado()` refresca todo.

## Extras transversales

- **Sistema de logros** (`lib/hitos.js` + `Hitos.jsx` celebración + `Logros.jsx` camino): logros por niveles en **familias alineadas con las dos bolsas**: Ahorro líquido (métrica `bolsaLiquidez`), Inversión (`invertidoTotal`), **Patrimonio** (`patrimonio`, ❖), Constancia y Objetivos, **escalera larga** (hasta decenas de miles de €). Al alcanzar uno nuevo salta una **celebración a pantalla** (rayos giratorios + glow). El "camino de logros" (tarjeta en el dashboard) abre un panel — renderizado con **`createPortal` a `document.body`** para que la hoja inferior no quede fuera de pantalla por el `transform` del contenedor — con los conseguidos (glow), el **próximo** (barra + meta) y los **lejanos** difuminados. **Fácilmente ampliable**: añadir una entrada al array `HITOS`.
- **Toast** de éxito/error al guardar en toda la app; **modal propio** para confirmar borrados.
- Skeletons de carga, estados vacíos con acción, aviso de error de conexión con reintento.
- PWA auto-actualizable (sin quedarse con versiones viejas en caché).
- Diseño: oscuro con morado #8b5cf6 + cian #22d3ee, verde ingresos, rosa gastos, dorado inversión; tarjetas con borde degradado; mobile-first con layout de columnas en escritorio.
- **Scroll sin barra lateral** en toda la app (regla global en `index.css`), para un recorrido limpio y minimalista.

## Consultor IA — "Fulcro" (`Consultor.jsx`)

Botón flotante **"Fulcro"** (el punto de apoyo sobre el que pivota una palanca;
encima de la barra inferior) que abre un panel de chat. Orienta con los datos
reales del usuario: envía un **resumen estructurado**
(`lib/resumenParaIA.js`, agregados —no movimientos en bruto) al endpoint
serverless `api/consultor.js`, que es la única pieza que conoce la API key. El
encuadre es educativo (no asesoramiento regulado): sin recomendaciones de compra
concretas ni promesas de rentabilidad. Degrada con elegancia si no está
configurado. Puesta en marcha y variables de entorno en `docs/CONSULTOR-IA.md`.

## Reporte semanal por email

`lib/reporteSemanal.js` genera el contenido del resumen semanal (listo, sin
activar el envío). Detalle y plantilla de Edge Function en `docs/REPORTE_SEMANAL.md`.

## Pendiente conocido (próximos pasos naturales)

1. **Supabase Auth** (login real con email/contraseña): imprescindible antes de abrir al público; hoy cualquiera con el ID de otro accede a sus datos. Plan completo y no destructivo en `docs/AUTH_MIGRACION.md` (requiere sesión conjunta: toca el panel de Supabase y migra datos).
2. Activar el envío del reporte semanal (infraestructura: proveedor de email + Edge Function + cron; ver `docs/REPORTE_SEMANAL.md`).
3. Notificaciones push reales (el recordatorio actual solo se ve al abrir la app).
4. Splash screens específicos de iOS.
