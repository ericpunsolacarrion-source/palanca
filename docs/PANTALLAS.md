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
- **Métricas principales** (`MetricasPrincipales.jsx`): el **ahorro del mes como número hero** (verde/rosa con glow) + frase "Estás ahorrando el X% de tus ingresos"; debajo fila con Ingresos / Gastos / Inversión, barra de ratio de ahorro, y el **objetivo de inversión mensual** configurable con barra de progreso dorada (enlazado a las inversiones reales del mes).
- **Comparativas** (`Comparativas.jsx`): microcomparativas contra el propio historial ("estás ahorrando un X% más que el mes pasado", "has gastado un Y% menos"). Solo contra uno mismo, nunca con otros usuarios. Máx. 2.
- **Píldora educativa** (`Pildora.jsx` + `lib/pildoras.js`): 1 nota contextual breve según el estado del mes (ahorro parado sin invertir / excedente alto / gasta más de lo que ingresa), descartable de forma permanente.
- **Proyección de futuro** (`ProyeccionFuturo.jsx`): el momento "ajá". Toma el ahorro mensual medio REAL y muestra el contraste "dinero parado" vs "invertido al 7%" a 5/10/20/30 años, con el extra que aporta invertir. Estado vacío que invita a registrar si no hay base. Reutiliza `proyectarInteresCompuesto` de `movimientosUtils`.
- **Tasa de ahorro mensual** (`GraficoTasaAhorro.jsx`): línea de 6 meses, **interactiva** — al tocar un mes muestra "may · 61% · 1.100,00 € ahorrados".
- **Gasto por categoría (este mes)** (`GraficoCategorias.jsx`): barra apilada de colores + leyenda con euros y porcentaje.
- **Evolución 6 meses** (`GraficoEvolucion.jsx`): barras verde/rosa por mes, **interactiva** — tocar un mes muestra sus ingresos y gastos.
- **Últimos movimientos**: los 5 más recientes, solo lectura (editar/borrar se hace en Movimientos).

### 4. Movimientos (`MovimientosTab.jsx`)
Dos sub-pestañas:
- **Nuevo** (`RegistroMovimiento.jsx`): toggle de 3 opciones **Gasto/Ingreso/Inversión** (la inversión en dorado). Inversión crea el mismo modelo que desde la pantalla de Inversión (movimiento `tipo=gasto` + categoría `Inversion`), no un tipo nuevo: fija categoría, muestra "Plataforma" y siempre variable. **Importe grande centrado** como protagonista, categoría y concepto como **chips** tocables (con "+ Nuevo" para crear al vuelo), fecha, toggle Variable/Fijo, nota opcional plegada. Toast "Guardado" al terminar.
  - **Categoría** = tipo general (Nomina, Comida, Dividendos…), ampliable por el usuario.
  - **Concepto** = origen específico (ej. "Nómina restaurante" vs "Nómina bar"), también ampliable. Sirve para gente con varios trabajos.
  - **Fijo/Variable** = base para futuras previsiones.
- **Historial** (`ListaMovimientos.jsx`): resumen del mes arriba (ingresado/gastado) y todo el histórico **agrupado por meses en acordeón** — el mes actual desplegado, los anteriores plegados con cabecera (mes + resumen `+ingresos −gastos`) que se despliega al tocar, para no tener scroll infinito. Cada fila: fecha dd/mm/aaaa, badge Fijo/Variable, **Editar** (formulario inline) / **Eliminar** (modal propio). Las inversiones aparecen en dorado con ↗.

### 5. Presupuesto (`Presupuesto.jsx`)
Dos modos a elegir:
- **Por tasa de ahorro**: "quiero ahorrar el 20%" → calcula cuánto puede gastar según sus ingresos reales del mes.
- **Gasto máximo fijo**: "quiero gastar máximo 500 €/mes".
Muestra: disponible del mes en grande, barra de progreso (roja si se pasa), gastado / te queda / ahorro real, **presupuesto diario** ("puedes gastar 16,85 €/día durante los 27 días que quedan") y desglose "en qué se te va el presupuesto" por categoría con mini-barras. Incluye una **estimación de gasto mensual** basada en la media de los meses con datos ("estimación basada en tus últimos N meses"; marcada como provisional si hay <2 meses), calculada en `movimientosUtils.js`.

### 6. Inversión (`Inversiones.jsx`)
- Una inversión ES un movimiento con categoría `Inversion` (misma tabla) — registrada aquí o en Movimientos, todo queda sincronizado.
- **Total invertido** en dorado + media mensual de los últimos 12 meses.
- Desglose por **plataforma** (Trade Republic, MyInvestor… = campo "fuente").
- **Gráfico de barras doradas** de 12 meses con importe encima, mes debajo y línea de media punteada.
- Formulario de nueva aportación (plataforma como chips, importe, fecha).
- Historial agrupado por mes con editar/eliminar por aportación.

### 7. Simulador (`Simulador.jsx`)
Cuatro sub-pestañas:
- **Ahorro** (`AhorroObjetivo.jsx`): **múltiples objetivos de ahorro** (fondo de emergencia, entrada de un piso, un viaje…). Cada uno con nombre, importe objetivo, cuánto llevas y fecha opcional; barra de progreso, % y proyección con tu ritmo real ("a tu ritmo lo alcanzarías en N meses" / "para la fecha necesitas X/mes"). Crear, editar y borrar. Tabla nueva `objetivos_ahorro` (aditiva; degrada si aún no existe). SQL en `supabase-schema-objetivos.sql`.
- **Interés compuesto** (`InteresCompuesto.jsx`): balance inicial, depósito mensual (inicio/fin de mes), años y rentabilidad → "Puedes ahorrar X", gráfico circular (inicial/depósitos/interés), barras apiladas por año y tabla año a año. Permite **guardar simulaciones** con nombre.
- **Hipoteca** (`Hipoteca.jsx`): calcular cuota (importe, TIN, plazo → cuota, intereses totales, total pagado) y **amortización anticipada** (cuánto ahorras en tiempo e intereses aportando extra al mes). También guarda simulaciones.
- **Independencia** (`IndependenciaFinanciera.jsx`): regla del 4% (patrimonio = 25× gasto anual). **Bloqueado hasta llevar 30 días** de historial. Texto explicativo de cómo se calcula.

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

`App.jsx` carga TODOS los movimientos una vez (fuente única); las pantallas derivan por props. Tras cualquier escritura → `onGuardado()` refresca todo.

## Extras transversales

- **Celebración de hitos** (`Hitos.jsx` + `lib/hitos.js`): overlay con glow al alcanzar por primera vez un logro (primera inversión, 20% de ahorro, 7 días registrando, objetivo de inversión cumplido). Se celebra una vez por hito; baseline para no celebrar retroactivamente.
- **Toast** de éxito/error al guardar en toda la app; **modal propio** para confirmar borrados.
- Skeletons de carga, estados vacíos con acción, aviso de error de conexión con reintento.
- PWA auto-actualizable (sin quedarse con versiones viejas en caché).
- Diseño: oscuro con morado #8b5cf6 + cian #22d3ee, verde ingresos, rosa gastos, dorado inversión; tarjetas con borde degradado; mobile-first con layout de columnas en escritorio.

## Consultor IA (`Consultor.jsx`)

Botón flotante "Consultor" (encima de la barra inferior) que abre un panel de
chat. Orienta con los datos reales del usuario: envía un **resumen estructurado**
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
