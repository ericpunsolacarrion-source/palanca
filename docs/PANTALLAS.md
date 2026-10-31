# Palanca — guía pantalla a pantalla

App en producción: https://palanca-zeta.vercel.app
PWA instalable (React + Vite + vite-plugin-pwa) · Backend Supabase · Deploy automático: push a `main` → Vercel.

**Misión**: ayudar a jóvenes a estructurar sus finanzas desde el inicio (Fase 1).
A futuro (Fase 2): familias, login real con Supabase Auth.

---

## Flujo de entrada

### 1. Acceso (`Auth.jsx`)
- Arriba, la **propuesta**: marca, "Tu dinero, por fin claro." y 3 ventajas (en Crear cuenta).
- Abre en **Crear cuenta** si el dispositivo nunca entró (`palanca_ya_entro`); si no, en **Entrar**.
- Crear cuenta: email + una contraseña (con ojo para verla; sin repetirla) + aceptar la privacidad. Mensaje neutro anti-enumeración. Recuperar contraseña por email.

### 2. Alta por pasos (`Onboarding.jsx`) — solo la primera vez
Una pregunta por pantalla, barra de progreso y botón atrás:
1. **Nombre** ("¿Cómo te llamamos?"; se saluda por el nombre de pila).
2. **Objetivo** (un toque y avanza): saber en qué se me va · controlar suscripciones · ahorrar más · preparar mi futuro → `perfiles.objetivo`.
3. **Saldo de hoy** (opcional, "Lo pongo después") → movimiento de **ajuste** "Saldo inicial".
4. **Año de nacimiento** (opcional, "Prefiero no decirlo"; 1900 – año actual − 14).
Al terminar: datos de ejemplo + demo rápida (ver §3). El saldo inicial NO cuenta como "ahorrado" en logros ni como "+X este mes".

---

## Navegación

> **Diseño v3 (versión de pruebas):** barra flotante de cristal con solo iconos (la activa en píldora pino) y un «+» verde en el centro que abre Movimientos → Nuevo (gasto). Fulcro se abre desde el icono de la cabecera. En Inicio, tras el patrimonio, una cuadrícula de 4 tarjetas (ahorrado sólida, gastado, ingresos, invertido este mes). Ver `docs/DISENO.md`.

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

**Demo avanzada** (`lib/tours.js` → `TOUR_AVANZADO`, mismo `TourRapido.jsx`): 18 pasos en 7 capítulos (Inicio, Movimientos, Fijos, Plan, Inversión, Fulcro, Tus datos) que se pueden saltar. Cada paso abre su pestaña y subpestaña, **resalta la pieza** de la que habla y añade una línea de "hasta dónde llega". En el capítulo Fulcro le hace una pregunta **en directo** (respuesta al momento, sin IA). Corre siempre con los **datos de ejemplo** (si el usuario tiene datos propios, se activan solo durante la demo) y al salir vuelve a los suyos. Se abre desde Tu cuenta → "Demo avanzada: todo lo que puede hacer Palanca" y desde el último paso de la rápida. Evento de métricas: `tour_avanzado`.

### 4. Movimientos (`MovimientosTab.jsx`)
Tres sub-pestañas por frecuencia de uso: **Nuevo · Historial · Importar** (los recurrentes viven ahora en su propia pestaña **Fijos**, ver §4b)
(el historial se consulta a diario; el importador, una o dos veces). Se puede llegar también
desde las **tarjetas de métrica del dashboard** (Ingresos/Gastos/Inversión),
que abren una **vista filtrada** de los movimientos de ese tipo en el mes en
curso, con su total y botón "← Movimientos".
- **Nuevo** (`RegistroMovimiento.jsx` + `lib/apunte.js`, rediseño 16-10-2026): **apuntar es escribir una frase: «45,90 € en Mercadona»**. Plano, sin tarjeta. Selector fino **Gasto · Ingreso · Inversión** (marca deslizante). Tira de **rápidos** (accesos propios en gasto; «Repetir» del histórico con el **nombre del sitio**, nunca el saldo inicial). **Importe grande centrado con el € pegado** (el campo se ajusta a la cifra; verde en ingreso, dorado en inversión) y, si está vacío, los importes habituales de ese sitio o categoría. **«¿Dónde?»** con autocompletado de tus sitios (`lugaresConocidos` agrupa por comercio real: lo importado y lo apuntado son lo mismo): un toque pone la **categoría** y, si no hay importe, el último pagado; un sitio nuevo se categoriza con el mismo motor que el importador («Cepsa» → Transporte) y se marca «Elegida por el sitio». El sitio se guarda como concepto (tabla `fuentes`). **Categoría en una fila** (la elegida delante) + «Más» (todas + crear nueva, con «¿Querías decir…?»). **Tres chips**: fecha (Hoy / Ayer / calendario), **«Se repite»** (cada mes, 2, 3, 6 meses o año: además crea el **fijo** con este mes ya pagado, `fijoDesdeApunte`) y nota. El botón dice lo que hace: **«Guardar 45,90 € · Comida»**. Se mantienen: aviso de importe desproporcionado, aviso de doble toque, deshacer en el toast y encadenar varios seguidos.
  - **Categoría** = tipo general (Nomina, Comida, Dividendos…), ampliable por el usuario.
  - **Concepto** = origen específico (ej. "Nómina restaurante" vs "Nómina bar"), también ampliable. Sirve para gente con varios trabajos.
  - **Fijo/Variable** = base para futuras previsiones.
- **Importar → "Trae tu historial"** (`ImportarHistorial.jsx`): el gancho de entrada (un año de movimientos de golpe).
  1. **Elegir**: *Extracto del banco* (recomendado; Excel .xlsx, ".xls" que en realidad es HTML, CSV/TXT en UTF-8 o Windows-1252 — `lib/leerArchivo.js`, todo en el navegador) con guía "¿Cómo descargo el extracto?"; o *Capturas de la app del banco* (hasta 20; se reducen en el móvil y se leen con IA en `api/leer-capturas.js` — Haiku 5.5 + salida estructurada, sin guardar imágenes, tope diario; solo activo con la clave y en pruebas, como Fulcro). Excel binario antiguo y PDF: mensaje claro (convertir o usar capturas).
  2. **Motor** (`lib/importarCsv.js`): localiza la cabecera aunque el extracto traiga líneas del banco antes; entiende "F. Operación", "Importe (EUR)", **Cargo/Abono (Debe/Haber)**, fechas dd/mm/aa, con hora, AAAA/MM/DD y números de serie de Excel; el signo decide gasto/ingreso.
  3. **Revisar**: cifras (nuevos y meses), duplicados exactos fuera, **"parecen ya apuntados a mano"** (mismo día e importe) excluidos por defecto con opción de incluirlos, y **categorías por comercio** (`lib/revisionImportacion.js`): "Mercadona · 34 movimientos → Comida"; cambiar una cambia todo el comercio. Los grupos son por **comercio real** (ver [IDENTIDAD.md](IDENTIDAD.md)): «ALIPAM23» y «ALIPAM77» van juntos. Cada grupo muestra «En el banco: …» y su nombre se puede **renombrar** (lápiz; sugiere comercios que ya conoces y corrige erratas: «mercadoma» → «Mercadona», tomando su categoría). Lo renombrado se **recuerda**: en el siguiente extracto sale con la etiqueta **Reconocido**. Duplicados también a ±3 días (cargos que el banco asienta tarde) y devoluciones junto a su comercio. Las filas con **fecha futura** (cargos programados) no se importan, ni las operaciones no completadas (Revolut: REVERTED). Los grupos se ordenan: primero lo no reconocido («Otros», necesita al usuario) y después por dinero. La categoría que trae el banco (ING) es solo una pista. Ingresos especiales: **Desde tu ahorro** (traspaso de vuelta, neutro) y **Retirada de inversión**. La categoría la sugiere `lib/categorizar.js`: primero tu historial, luego un diccionario de comercios y empresas españolas (súper, gasolineras, luz, telefonía, seguros, plataformas, bancos…), que también marca suscripciones y recibos negociables.
  4. **Resumen de tu historial**: periodo, gasto e ingreso medios, % de ahorro, dónde más se va, pagos periódicos detectados y cuánto podrías ahorrar negociando → Ver mi inicio / Revisar suscripciones y recibos.
  Lotes con **deshacer**. Entrada destacada en "Primeros pasos" ("Lo más rápido: trae tu último año del banco").
- **Historial** (`ListaMovimientos.jsx`): resumen del mes arriba y todo el histórico **agrupado por meses en acordeón** (mes actual desplegado, anteriores plegados). **Chips de filtro** coherentes con las dos bolsas: Todos · Ingresos · Gastos · Inversión · Ahorro/Ajuste; al filtrar se muestra la **lista plana** (sin acordeón) para no ocultar resultados de meses plegados. Cada movimiento es una **tarjeta compacta y premium**: barra de acento por tipo (dorado inversión, rosa gasto, verde ingreso), concepto con truncado, importe con color por tipo, fecha + nota inline, badge "Fijo" solo cuando aplica, entrada escalonada y microinteracción al tocar (respeta `prefers-reduced-motion`). **Editar** inline (importe, fecha, **comercio** y **categoría**; muestra «En el banco: …»; al cambiar la categoría ofrece «¿Poner también X a los otros N movimientos de Y?» y lo recuerda para los próximos) / **Eliminar** (modal). El concepto visible y el **buscador** usan el comercio reconocido («mercadona» encuentra los «ALIPAM23»). Las inversiones en dorado con ↗. El campo de fecha (alta y edición) usa `InputFecha`: se puede **escribir dd/mm/aaaa** o abrir el **calendario** del sistema.

### 4b. Fijos — suscripciones y gastos fijos (`Recurrentes.jsx`, pestaña propia)

Puerta de entrada del producto (foco: suscripciones + seguimiento financiero).
- **Héroe**: coste **prorrateado al mes** de todos los gastos fijos activos (una anual de 120 € cuenta 10 €/mes), coste al año y nº de compromisos; estado ("Todo al día" / "Próximo · X · mañana").
- **Calendario de cobros** (`CalendarioCobros.jsx`): línea de tiempo de los **próximos 30 días** con una burbuja por cobro (tamaño ∝ importe, color por compromiso, carriles para que no se pisen, tocar abre la ficha), total de los 30 días y lista de los 4 primeros. Debajo, **"En qué se va tu año"**: barra apilada del coste anual por compromiso (top 5 + Otros) con % del total.
- **Periodicidad** (`lib/periodicidad.js`): Mensual · Bimestral · Trimestral · Semestral · Anual + "mes en que se cobra". Un compromiso no mensual solo está **pendiente en los meses en que toca**; el resto del tiempo su anillo es discontinuo y la ficha dice "Este mes no toca · próximo cobro …". Columnas `periodo_meses` y `mes_inicio` (SQL en `supabase-schema-periodicidad.sql`); sin ese SQL todo se guarda como mensual y se avisa.
- **Compromisos** (`lib/useRecurrentes.js`, Supabase con pub/sub; globo en la pestaña = cobros por confirmar + sin día). **El día de cobro es obligatorio** al darlos de alta: es lo que permite avisar y apuntar cada cobro en su fecha. Estado de cada cobro del mes (`estadoCobro` en `lib/periodicidad.js`):
  - **Esperando** (antes de su día): "Se cobra el 15/10 (mañana). Ese día te pediremos que lo confirmes." + "Ya me lo han cobrado" para adelantos (fecha de hoy).
  - **Por confirmar** (desde su día): anillo índigo; un toque en el anillo (o en el inicio) lo confirma y crea el movimiento **con la fecha del día de cobro**, no la de hoy (`confirmarCobro`). Importe variable → se ajusta en la ficha.
  - **Hecho**: anillo verde; tocarlo deshace (borra el movimiento creado y la confirmación).
  - **Ya en tus movimientos** (`lib/conciliarFijos.js`): si el cargo del mes ya está apuntado o importado (mismo comercio, ±7 días del día de cobro, importe parecido), el fijo sale **hecho** sin pedir confirmar, y la ficha dice «Ya está en tus movimientos…». Así nunca se cuenta dos veces.
  - **Sin día** (compromisos antiguos): la ficha pide el día antes de nada.
  - **Pausar** es directo; **Reactivar** vuelve a preguntar el día de cobro (y el mes, si no es mensual), porque tras una pausa suele cambiar.
  - **Tu plan de ahorro** (`PlanAhorro.jsx` + `lib/negociables.js`): de los fijos, qué se puede **negociar** (luz y gas, móvil e internet, seguros, comisiones, gimnasio) con un ahorro **orientativo** (horquillas conservadoras) y el **momento ideal** (seguros: de 45 a 30 días antes de renovar; aviso en el inicio "Momento de negociar…"). Cada recibo abre una hoja con pasos marcables, enlace al comparador oficial de la CNMC (energía), **guion de llamada con sus datos** (copiable), "Prepararlo con Fulcro" y "¿Lo has conseguido? Nuevo precio" → actualiza el fijo y suma a "Ya ahorras X € al año" (en este dispositivo). Las digitales (Netflix…) aparte: no se negocian, se pausan o rotan; el agua no se cambia de compañía.
  - **Cargos periódicos detectados** (`SuscripcionesDetectadas.jsx` + `lib/suscripciones.js`): encima de la lista, si en tus movimientos (p. ej. un extracto importado) hay un mismo comercio cobrando un importe estable cada ≈mes (≥3 cargos) o ≈año (≥2), se muestra una tarjeta "Hemos detectado N cargos periódicos · X € al año" con cada uno (importe, día, nº de cargos y aviso "Ha subido de A a B" si el precio subió). **Añadir** lo crea como compromiso en Base (solo mensuales; las anuales se muestran con su fecha de renovación). **×** lo descarta (localStorage, por dispositivo). No reaparece lo que ya está en Base (por fuente o nombre) ni lo que dejó de cobrarse.

### 5. Plan → Presupuesto (`Presupuesto.jsx`)
Dos modos a elegir:
- **Por tasa de ahorro**: "quiero ahorrar el 20%" → calcula cuánto puede gastar según sus ingresos reales del mes.
- **Gasto máximo fijo**: "quiero gastar máximo 500 €/mes".
Estética premium: bloque **hero centrado** (objetivo + cifra disponible en degradado + subtítulo), barra de progreso, y **Gastado / Te queda / Ahorro real** como tarjetas de stat limpias. Incluye el **presupuesto diario** en una caja destacada y desglose por categoría con mini-barras. Incluye una **estimación de gasto mensual** (media de meses con datos, provisional si <2 meses). Al cambiar entre método por tasa (%) y por euros (€) el valor se limpia. Acordeón **"¿Qué método me conviene?"** que explica la diferencia: por % el límite en euros se adapta a los ingresos (flexible); por € fijos el excedente de los meses buenos se ahorra solo (construye patrimonio más rápido, menos adaptativo).

**Planificación de meses futuros** (`PlanificacionFutura.jsx`, debajo del presupuesto): prepara hasta **6 meses vista** (ingreso esperado, gasto máximo, inversión). El **superávit** (ingreso − gasto) se reparte explícitamente en **inversión + ahorro líquido** (en vivo en el formulario, en el resumen de cada mes y en la proyección), con las **medias reales como referencia**. El **acumulado proyectado** ("Si cumples tus planes… X a inversión + Y a ahorro líquido → sumarías Z a tu patrimonio en N meses") suma ambas bolsas sin doble conteo. Los planes quedan **guardados** (tabla `planificaciones`); cuando el mes planificado es el actual, se muestra la comparación **plan vs real**.

### 6. Inversión (`Inversiones.jsx`)
- **Aportar / Retirar**: retirar (vender o rescatar) registra un ingreso de categoría `Inversion`: baja el total invertido y vuelve a la liquidez; no es ingreso y el patrimonio no cambia (lo retirado por encima de lo aportado entra como ganancia).
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
  índigo, negritas y listas (render seguro, sin HTML). Cada respuesta lleva su
  origen en mono ("Motor · calculado al momento" / "Fulcro · análisis"); las
  del motor muestran una **ficha** (etiqueta, cifra grande, detalle y desglose
  con barra fina proporcional) y el texto no repite el desglose. La respuesta llega **en
  streaming**. Botón **"Nueva"** para empezar de cero; la conversación se
  conserva en la sesión del navegador.
- **Datos**: envía el resumen del motor (`lib/resumenParaIA.js`) con el
  `panorama` de toda su historia, y, si la pregunta nombra una categoría,
  comercio o mes, solo ese desglose (`lib/contextoFulcro.js`) más los
  `hechosDelMotor` de esa pregunta (`hechosParaIA`). Nunca movimientos uno a uno.
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


## Tu cuenta (botón de la cabecera)
- Nombre y año de nacimiento.
- Ver la demo rápida, la **demo avanzada** y ver la app con datos de ejemplo.
- **Tus datos**:
  - descargar los movimientos en CSV (formato español; Palanca lo reimporta tal cual);
  - descargar todo en JSON (todas las tablas, también los eventos).
- Interruptor **"Ayudar a mejorar Palanca"** (`perfiles.analitica`). Solo aparece si la columna existe.
- **Métricas de Palanca (admin)**: solo si `soy_admin()` lo permite. Abre `PanelMetricas.jsx` a pantalla completa (ver METRICAS.md).
- Cerrar sesión y borrar la cuenta. El borrado elimina todas las tablas con `usuario_id` (`borrar_mi_cuenta()`).
