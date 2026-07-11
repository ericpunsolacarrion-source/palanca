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
- Pide el **correo electrónico** (validado) → `perfiles.email`. Los correos recogidos se ven en Supabase → Table Editor → `perfiles`.
- Al completar, siembra las categorías iniciales: Nomina (ingreso) y Vivienda, Comida, Ocio, Transporte, Ahorro, Inversion (gasto).

---

## Navegación

Barra inferior **siempre visible** (solo el contenido central hace scroll), con blur y 5 pestañas: Dashboard · Movimientos · Presupuesto · Inversión · Simulador. En escritorio (≥860 px) se convierte en píldoras horizontales.

### 3. Dashboard
Escaparate del mes actual, de arriba abajo:
- **Banner "Completa tu cuenta"** si el usuario aún no dejó su email (usuarios antiguos).
- **Banner recordatorio** si lleva 2+ días sin registrar movimientos (botón directo a registrar).
- **Métricas principales** (`MetricasPrincipales.jsx`): bloque superior tipo hero. **Línea fina de ingresos** ("Este mes X € · media Y €/mes" con ≈/▲/▼ frente a la media del último año); el **ahorro del mes como número hero** (verde/rosa con glow); debajo **3 tarjetas de métrica** (Ingresos verde, Gastos rosa, Inversión dorado) con acento de color y **clicables** → llevan a los movimientos del mes filtrados por ese tipo. Barra de ratio, y el **objetivo de inversión mensual** con barra dorada que **puede superar el 100 %** (`progresoObjetivo`).
- **Comparativas** (`Comparativas.jsx`): microcomparativas contra el propio historial ("estás ahorrando un X% más que el mes pasado"). Solo contra uno mismo. Máx. 2.
- **Camino de logros** (`Logros.jsx`): tarjeta con el progreso (X/Y desbloqueados y el próximo por conseguir) que abre un panel con TODOS los logros por categoría (desbloqueados con glow, pendientes con barra de progreso). Ver Extras.
- **Píldora educativa** (`Pildora.jsx` + `lib/pildoras.js`): 1 nota contextual breve según el estado del mes (ahorro parado sin invertir / excedente alto / gasta más de lo que ingresa), descartable de forma permanente.
- **Proyección de futuro** (`ProyeccionFuturo.jsx`): el momento "ajá". Toma el ahorro mensual medio REAL y muestra el contraste "dinero parado" vs "invertido al 7%" a 5/10/20/30 años, con el extra que aporta invertir. Estado vacío que invita a registrar si no hay base. Reutiliza `proyectarInteresCompuesto` de `movimientosUtils`.
- **Tasa de ahorro mensual** (`GraficoTasaAhorro.jsx`): línea **deslizable** por todo el historial, arranca en el mes más reciente; al pasar por un mes muestra el **porcentaje + los euros**: cuánto ahorró (verde) y cuánto invirtió (dorado) ese mes.
- **Gasto por categoría (este mes)** (`GraficoCategorias.jsx`): barra apilada + leyenda. **Navegable**: al tocar una categoría se abre el detalle con todos sus movimientos del periodo (fecha, concepto, importe) y botón "← Categorías".
- **Evolución 6 meses** (`GraficoEvolucion.jsx`): barras verde/rosa por mes, **interactiva** — tocar un mes muestra ingresos, gastos y el **resultado neto** (= +ingresos − gastos, en verde/rosa).
- **Últimos movimientos**: los 5 más recientes, solo lectura (editar/borrar se hace en Movimientos).

### 4. Movimientos (`MovimientosTab.jsx`)
Tres sub-pestañas (Nuevo · Recurrentes · Historial). Se puede llegar también
desde las **tarjetas de métrica del dashboard** (Ingresos/Gastos/Inversión),
que abren una **vista filtrada** de los movimientos de ese tipo en el mes en
curso, con su total y botón "← Movimientos".
- **Nuevo** (`RegistroMovimiento.jsx`): alta **rápida y sin fricción**. Toggle de 3 opciones **Gasto/Ingreso/Inversión** (la inversión en dorado; mismo modelo `tipo=gasto` + categoría `Inversion`). **Importe grande centrado** con separador de miles **en vivo** (`InputImporte`, usado en TODOS los campos € de la app; muestra el € al final) y **autofocus**. En modo gasto, **gastos rápidos personalizables** (`GastosRapidos.jsx` + `lib/useGastosRapidos.js`, localStorage): el usuario crea/edita/borra sus atajos (café 1,50 €, comer…) y los registra **en un toque**. Además, sugerencias del histórico (`lib/sugerencias.js`): tira **"Repetir"**, **importes frecuentes** y **categorías ordenadas por frecuencia**. Categoría y concepto en **selector compacto** de una sola fila deslizable. Fecha, Variable/Fijo, nota plegada. Toast al terminar.
  - **Categoría** = tipo general (Nomina, Comida, Dividendos…), ampliable por el usuario.
  - **Concepto** = origen específico (ej. "Nómina restaurante" vs "Nómina bar"), también ampliable. Sirve para gente con varios trabajos.
  - **Fijo/Variable** = base para futuras previsiones.
- **Recurrentes** (`Recurrentes.jsx` + `lib/useRecurrentes.js`, localStorage con pub/sub; badge de pendientes en la pestaña): movimientos que se repiten cada mes (alquiler, nómina, suscripciones). Se configuran una vez y se registran cada mes sin rellenar nada. Los **gastos** se registran automáticos de un toque; los **ingresos** (nómina) piden **confirmar/ajustar el importe** cada mes (la nómina varía). Pausar/activar, editar y borrar. El movimiento registrado va a Supabase (`es_fijo=true`).
- **Historial** (`ListaMovimientos.jsx`): resumen del mes arriba y todo el histórico **agrupado por meses en acordeón** (mes actual desplegado, anteriores plegados). Cada movimiento es una **tarjeta futurista y animada**: barra de acento por tipo (dorado inversión, rosa gasto, verde ingreso), entrada escalonada y microinteracción al tocar (respeta `prefers-reduced-motion`). Fecha dd/mm/aaaa, badge Fijo/Variable, **Editar** inline / **Eliminar** (modal). Las inversiones en dorado con ↗.

### 5. Presupuesto (`Presupuesto.jsx`)
Dos modos a elegir:
- **Por tasa de ahorro**: "quiero ahorrar el 20%" → calcula cuánto puede gastar según sus ingresos reales del mes.
- **Gasto máximo fijo**: "quiero gastar máximo 500 €/mes".
Muestra: disponible del mes en grande, barra de progreso (roja si se pasa), gastado / te queda / ahorro real, **presupuesto diario** y desglose por categoría con mini-barras. Incluye una **estimación de gasto mensual** (media de meses con datos, provisional si <2 meses). Al cambiar entre método por tasa (%) y por euros (€) el valor se limpia. Acordeón **"¿Qué método me conviene?"** que explica la diferencia: por % el límite en euros se adapta a los ingresos (flexible); por € fijos el excedente de los meses buenos se ahorra solo (construye patrimonio más rápido, menos adaptativo).

**Planificación de meses futuros** (`PlanificacionFutura.jsx`, debajo del presupuesto): prepara hasta **6 meses vista** (ingreso esperado, gasto máximo, inversión), con el ahorro derivado en vivo y las **medias reales como referencia**. Muestra el **acumulado proyectado** ("Si cumples tus planes… X ahorrados + Y invertidos en N meses") como recompensa motivadora. Los planes quedan **guardados** (tabla `planificaciones`); cuando el mes planificado es el actual, se muestra la comparación **plan vs real**.

### 6. Inversión (`Inversiones.jsx`)
- Una inversión ES un movimiento con categoría `Inversion` (misma tabla) — registrada aquí o en Movimientos, todo queda sincronizado.
- **Total invertido** en dorado + media mensual de los últimos 12 meses.
- Desglose por **plataforma** (Trade Republic, MyInvestor… = campo "fuente").
- **Gráfico de barras doradas deslizable**: abarca desde el primer mes en que se invirtió hasta hoy (scroll horizontal, arranca en el mes actual y no deja ir antes de la primera aportación). El importe de cada mes va **anclado encima de su barra** y el eje muestra el **año en enero** ("Ene 2026") para no perderse al deslizar. Línea de media (últimos 12 meses) punteada.
- Formulario de nueva aportación (plataforma como chips, importe, fecha).
- Historial agrupado por mes con editar/eliminar por aportación.

### 7. Simulador (`Simulador.jsx`)
Cuatro sub-pestañas:
- **Ahorro** (`AhorroObjetivo.jsx`): **múltiples objetivos de ahorro** (fondo de emergencia, entrada de un piso, un viaje…). Cada uno con nombre, importe objetivo, cuánto llevas y fecha opcional; barra de progreso, % y proyección con tu ritmo real ("a tu ritmo lo alcanzarías en N meses" / "para la fecha necesitas X/mes"). Crear, editar y borrar. Tabla nueva `objetivos_ahorro` (aditiva; degrada si aún no existe). SQL en `supabase-schema-objetivos.sql`.
- **Interés compuesto** (`InteresCompuesto.jsx`): balance inicial, depósito mensual (inicio/fin de mes), años y rentabilidad → "Puedes ahorrar X", gráfico circular (inicial/depósitos/interés), barras apiladas por año y tabla año a año. Permite **guardar simulaciones** con nombre.
- **Hipoteca** (`Hipoteca.jsx`): calcular cuota (sistema francés: importe, TIN, plazo → cuota, intereses totales, total pagado) y **amortización anticipada** por reducción de plazo (cuánto ahorras en tiempo e intereses con una aportación extra). Guarda simulaciones. Incluye **píldoras de alto valor** en acordeón (reducir plazo vs cuota, por qué amortizar pronto, TIN vs TAE, mirar el total pagado, impacto de la aportación extra) y una línea contextual con el total de intereses de la propia simulación.
- **Independencia** (`IndependenciaFinanciera.jsx`): regla del 4% (patrimonio = 25× gasto anual). **Bloqueado hasta llevar 30 días** de historial. Permite **guardar varios escenarios** (conservador/realista/optimista…) con nombre y **compararlos en una tabla** enfrentada (ahorro/mes, rentabilidad, tiempo hasta la independencia), con el más rápido resaltado; tocar un escenario carga sus valores. Escenarios en localStorage (`lib/useEscenariosIF.js`).

---

## Reglas de cálculo (ver CLAUDE.md, implementadas en `movimientosUtils.js`)

- **Gasto** = consumo (excluye Inversion) · **Inversión** = parte del ahorro, en dorado
- **Ahorro** = ingresos − gastos de consumo · **Ratio** = ahorro/ingresos
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

- **Sistema de logros** (`lib/hitos.js` + `Hitos.jsx` celebración + `Logros.jsx` camino): logros por niveles en 4 dimensiones, **escalera larga** (Ahorro e Inversión hasta 10k/25k/50k €, Constancia, Objetivos). Al alcanzar uno nuevo salta una **celebración a pantalla** (rayos giratorios + glow). El "camino de logros" (tarjeta en el dashboard) abre un panel — renderizado con **`createPortal` a `document.body`** para que la hoja inferior no quede fuera de pantalla por el `transform` del contenedor — con los conseguidos (glow), el **próximo** (barra + meta) y los **lejanos** difuminados. **Fácilmente ampliable**: añadir una entrada al array `HITOS`.
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
