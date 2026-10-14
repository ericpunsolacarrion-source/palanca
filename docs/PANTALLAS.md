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

Cabecera con la **marca**, el **ojo** (modo discreto) y el acceso a la cuenta. Barra inferior **siempre visible** (solo el contenido central hace scroll), con **iconos SVG propios** (`Icono.jsx`), indicador del activo y **5 pestañas**: Inicio · Movimientos · **Fijos** (con globo de cobros por confirmar) · **Plan** (segmentado Presupuesto | Simuladores; internamente pestañas `presupuesto` y `simulador`) · Inversión. En escritorio (≥860 px) se convierte en píldoras horizontales.

### 3. Inicio (`Inicio.jsx` + `lib/inicio.js`)
Dos vistas con un segmentado arriba: **Resumen** (por defecto, lo esencial en 5 segundos) y **Análisis** (los gráficos por periodo).

**Resumen**, en orden de importancia:
1. **Patrimonio** (`Patrimonio.jsx`, héroe): cifra grande, **cambio del mes** (hoy vs cierre del mes anterior, `cambioPatrimonioMes`), **línea de evolución** de 6 meses (`evolucionPatrimonio`), barra de reparto **Disponible / Invertido** (Invertido lleva a Inversión) y pie con la fiabilidad ("Cuadrado con tu banco hace N días") + **Ajustar saldo** (crea un ajuste visible).
2. **Acciones rápidas**: Gasto (principal) · Ingreso · Importar; recordatorio discreto si llevas 3+ días sin apuntar.
3. **Avisos** (`AvisosCobros.jsx` + `lib/avisos.js`): "**Hoy se cobra X** · ¿te lo han cobrado?" con botón **Confirmar** (a un toque, con deshacer; si el importe es variable abre su ficha en Fijos), cobros en ≤3 días, renovaciones anuales/semestrales (14 días), ingresos fijos que tocan ("Hoy entra Nómina") y subidas de precio. Sin compromisos: invitación a Fijos. "Activar avisos en este móvil" = notificaciones locales.
4. **Así va [mes]** (`resumenDelMes`): ahorro del mes (verde/rosa) y % de lo ingresado; Ingresos · Gastos · Invertido; si hay presupuesto, barra con marca de **hoy** y "te quedan X € · Y €/día" (lleva a Presupuesto); si no, **ritmo** frente a lo gastado hasta el mismo día en los 3 meses previos ("gastas un 12 % menos que de costumbre a estas alturas"); **En qué se va** (top 3 + Resto); "Ver análisis completo".
5. **Últimos movimientos**: 5, con concepto legible (los extractos en MAYÚSCULAS se pasan a "Mercadona"), categoría y fecha relativa (Hoy/Ayer/12 oct). "Ver todos" abre el historial.

**Análisis**: selector de periodo global, métricas del periodo (`MetricasPrincipales`), gasto por categoría, tasa de ahorro, evolución, comparativas, píldora educativa, proyección de futuro y camino de logros.

**Modo discreto** (ojo de la cabecera, `lib/privacidad.js`): oculta TODAS las cifras de la app (`formatearEuros` → "•••• €"); se recuerda en el dispositivo.

**Usuario nuevo — datos de ejemplo y demo rápida** (`lib/datosDemo.js`, `TourRapido.jsx`): sin nada propio (el saldo inicial no cuenta) la app se enseña **llena con 6 meses de ejemplo** (en memoria, ids `demo-…`, nunca se guardan; editar/borrar/confirmar el ejemplo avisa y no escribe) con un aviso "Estás viendo datos de ejemplo · Ver demo · Empezar con mis datos". La **demo rápida** (6 pasos que recorren las pestañas y resaltan su botón) se abre sola la primera vez y siempre desde Tu cuenta → "Ver la demo rápida". El ejemplo desaparece al apuntar lo primero o al pulsar "Empezar con mis datos" (recordado por usuario). Fulcro, logros e hitos usan solo datos reales.

### 4. Movimientos (`MovimientosTab.jsx`)
Tres sub-pestañas por frecuencia de uso: **Nuevo · Historial · Importar** (los recurrentes viven ahora en su propia pestaña **Fijos**, ver §4b)
(el historial se consulta a diario; el importador, una o dos veces). Se puede llegar también
desde las **tarjetas de métrica del dashboard** (Ingresos/Gastos/Inversión),
que abren una **vista filtrada** de los movimientos de ese tipo en el mes en
curso, con su total y botón "← Movimientos".
- **Nuevo** (`RegistroMovimiento.jsx`): alta **rápida y sin fricción**. Toggle de 3 opciones **Gasto/Ingreso/Inversión** (la inversión en dorado; mismo modelo `tipo=gasto` + categoría `Inversion`). **Importe grande centrado** con separador de miles **en vivo** (`InputImporte`, usado en TODOS los campos € de la app; muestra el € al final) y **autofocus**. En modo gasto, **gastos rápidos personalizables** (`GastosRapidos.jsx` + `lib/useGastosRapidos.js`, localStorage): el usuario crea/edita/borra sus atajos (café 1,50 €, comer…) y los registra **en un toque**. Además, sugerencias del histórico (`lib/sugerencias.js`): tira **"Repetir"**, **importes frecuentes** y **categorías ordenadas por frecuencia**. Categoría y concepto en **selector compacto** de una sola fila deslizable. Fecha, Variable/Fijo, nota plegada. Toast al terminar.
  - **Categoría** = tipo general (Nomina, Comida, Dividendos…), ampliable por el usuario.
  - **Concepto** = origen específico (ej. "Nómina restaurante" vs "Nómina bar"), también ampliable. Sirve para gente con varios trabajos.
  - **Fijo/Variable** = base para futuras previsiones.
- **Importar** (`ImportadorCsv.jsx` + `lib/importarCsv.js`): cargar el histórico desde un **CSV** (ej. exportado de Excel o del banco). Proceso en 3 pasos (elegir archivo → revisar columnas → confirmar) con **explicación clara**, ejemplo visible y guía para "Excels caóticos". **Mapeo de columnas** siempre revisable (details plegable, se abre solo si faltan columnas obligatorias) y **asistente IA opcional** ("Deducir columnas con IA"): endpoint `api/mapear-columnas.js` que recibe **solo cabeceras + 2-3 filas de ejemplo** (blindado también en el servidor), infiere el mapeo y lo devuelve; el resto del CSV se procesa **en el navegador** de forma determinista, sin enviar el grueso de los datos a ningún modelo. **Privacidad** explicada al usuario (`lib/mapearColumnasIA.js`); la API key vive solo en el servidor; degrada con elegancia si no está activado. **Previsualización** con resumen (se importarán / duplicados omitidos / con errores y sus motivos, sin abortar por filas malas), **detección de duplicados** (fecha+tipo+importe+concepto) y **deshacer** por importación (`lib/useImportaciones.js`). Crea categorías/plataformas que falten. Para cargar datos reales por script, ver `docs/IMPORT-REAL.md`.
- **Historial** (`ListaMovimientos.jsx`): resumen del mes arriba y todo el histórico **agrupado por meses en acordeón** (mes actual desplegado, anteriores plegados). **Chips de filtro** coherentes con las dos bolsas: Todos · Ingresos · Gastos · Inversión · Ahorro/Ajuste; al filtrar se muestra la **lista plana** (sin acordeón) para no ocultar resultados de meses plegados. Cada movimiento es una **tarjeta compacta y premium**: barra de acento por tipo (dorado inversión, rosa gasto, verde ingreso), concepto con truncado, importe con color por tipo, fecha + nota inline, badge "Fijo" solo cuando aplica, entrada escalonada y microinteracción al tocar (respeta `prefers-reduced-motion`). **Editar** inline / **Eliminar** (modal). Las inversiones en dorado con ↗. El campo de fecha (alta y edición) usa `InputFecha`: se puede **escribir dd/mm/aaaa** o abrir el **calendario** del sistema.

### 4b. Fijos — suscripciones y gastos fijos (`Recurrentes.jsx`, pestaña propia)

Puerta de entrada del producto (foco: suscripciones + seguimiento financiero).
- **Héroe**: coste **prorrateado al mes** de todos los gastos fijos activos (una anual de 120 € cuenta 10 €/mes), coste al año y nº de compromisos; estado ("Todo al día" / "Próximo · X · mañana").
- **Calendario de cobros** (`CalendarioCobros.jsx`): línea de tiempo de los **próximos 30 días** con una burbuja por cobro (tamaño ∝ importe, color por compromiso, carriles para que no se pisen, tocar abre la ficha), total de los 30 días y lista de los 4 primeros. Debajo, **"En qué se va tu año"**: barra apilada del coste anual por compromiso (top 5 + Otros) con % del total.
- **Periodicidad** (`lib/periodicidad.js`): Mensual · Bimestral · Trimestral · Semestral · Anual + "mes en que se cobra". Un compromiso no mensual solo está **pendiente en los meses en que toca**; el resto del tiempo su anillo es discontinuo y la ficha dice "Este mes no toca · próximo cobro …". Columnas `periodo_meses` y `mes_inicio` (SQL en `supabase-schema-periodicidad.sql`); sin ese SQL todo se guarda como mensual y se avisa.
- **Compromisos** (`lib/useRecurrentes.js`, Supabase con pub/sub; globo en la pestaña = cobros por confirmar + sin día). **El día de cobro es obligatorio** al darlos de alta: es lo que permite avisar y apuntar cada cobro en su fecha. Estado de cada cobro del mes (`estadoCobro` en `lib/periodicidad.js`):
  - **Esperando** (antes de su día): "Se cobra el 15/10 (mañana). Ese día te pediremos que lo confirmes." + "Ya me lo han cobrado" para adelantos (fecha de hoy).
  - **Por confirmar** (desde su día): anillo índigo; un toque en el anillo (o en el inicio) lo confirma y crea el movimiento **con la fecha del día de cobro**, no la de hoy (`confirmarCobro`). Importe variable → se ajusta en la ficha.
  - **Hecho**: anillo verde; tocarlo deshace (borra el movimiento creado y la confirmación).
  - **Sin día** (compromisos antiguos): la ficha pide el día antes de nada.
  - **Pausar** es directo; **Reactivar** vuelve a preguntar el día de cobro (y el mes, si no es mensual), porque tras una pausa suele cambiar.
  - **Cargos periódicos detectados** (`SuscripcionesDetectadas.jsx` + `lib/suscripciones.js`): encima de la lista, si en tus movimientos (p. ej. un extracto importado) hay un mismo comercio cobrando un importe estable cada ≈mes (≥3 cargos) o ≈año (≥2), se muestra una tarjeta "Hemos detectado N cargos periódicos · X € al año" con cada uno (importe, día, nº de cargos y aviso "Ha subido de A a B" si el precio subió). **Añadir** lo crea como compromiso en Base (solo mensuales; las anuales se muestran con su fecha de renovación). **×** lo descarta (localStorage, por dispositivo). No reaparece lo que ya está en Base (por fuente o nombre) ni lo que dejó de cobrarse.

### 5. Plan → Presupuesto (`Presupuesto.jsx`)
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

### 7. Plan → Simuladores (`Simulador.jsx`)
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

Botón flotante **"Fulcro"** (icono de conversación, encima de la barra inferior)
que abre un panel de chat. Guía completa (qué ve, alcance, coste, seguridad y
pruebas) en **`docs/FULCRO.md`**.
- **Solo en dev por ahora**: al abrir, pregunta a `GET /api/consultor` si está
  activo; si no (sin clave o en producción), muestra "Próximamente".
- **Bienvenida**: saludo breve, hasta 3 *insights* de sus números, 4
  **sugerencias según sus datos** (p. ej. "¿Me compensa seguir con Netflix?" si
  subió de precio) y el desplegable **"Qué ve Fulcro"** (privacidad).
- **Conversación**: el usuario en burbuja; Fulcro como texto limpio con línea
  índigo, negritas y listas (render seguro, sin HTML). La respuesta llega **en
  streaming**. Botón **"Nueva"** para empezar de cero; la conversación se
  conserva en la sesión del navegador.
- **Datos**: envía el resumen del motor (`lib/resumenParaIA.js`) y, si la
  pregunta nombra una categoría, comercio o mes, solo ese desglose
  (`lib/contextoFulcro.js`). Nunca movimientos uno a uno.
- **Gratis y local**: saludos, "gracias" y "vale/ok" se responden en la app sin
  IA ni gastar cupo (salvo que "vale" responda a una pregunta de Fulcro: eso va
  a la IA). No se reenvían en el historial.
- **Cupo**: 10 preguntas/día (servidor, atómico); el pie muestra "Te quedan N
  preguntas hoy" cuando quedan 5 o menos y bloquea el campo al llegar a 0.
- Se puede abrir con una pregunta desde cualquier pantalla con el evento
  `palanca-fulcro`.

## Reporte semanal por email

`lib/reporteSemanal.js` genera el contenido del resumen semanal (listo, sin
activar el envío). Detalle y plantilla de Edge Function en `docs/REPORTE_SEMANAL.md`.

## Pendiente conocido (próximos pasos naturales)

1. ~~Supabase Auth~~ ✅ hecho (login con email/contraseña + RLS por usuario; ver `docs/ESTADO.md`).
2. Activar el envío del reporte semanal (infraestructura: proveedor de email + Edge Function + cron; ver `docs/REPORTE_SEMANAL.md`).
3. Notificaciones push reales con la app cerrada (hoy los avisos de Fijos lanzan una notificación local solo al abrir la app).
4. Splash screens específicos de iOS.
