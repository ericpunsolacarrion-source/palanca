# Sistema visual de Palanca

> **Estado (04-11-2026):** conviven dos diseños.
> - **v5 «Bosque»** (abajo): se ve en la versión de pruebas y en local.
> - **v2**: sigue en la app pública hasta que Eric diga «lánzalo».
>
> v3 «Vidrio» y v4 «El punto de apoyo» se retiraron; v4 se rechazó el 03-11 («hemos ido a peor»).
> Interruptor: `src/lib/diseno.js` (`<html data-diseno="v5">`), que se fuerza con `?diseno=v5` o `?diseno=v2`.

## v5 «Bosque» (en pruebas desde el 2026-11-04; sustituye a v4)

**Idea:** un producto financiero oscuro, sereno y preciso. Verde profundo casi
negro, superficies que se distinguen por escalones de luz (no por sombras),
un solo acento (menta) que significa «acción» o «va bien», y las cifras
mandando. Referencias estudiadas: Finerd (capturas de Eric: tarjetas
jerarquizadas, calendario de cobros con logos, estados de pago claros),
Revolut, Monzo, Linear y Apple. De Finerd se toma el calendario de cobros con
logos, las filas que son barras y los estados claros; lo propio de Palanca es
el patrimonio como protagonista, la comparación contra tu media y Fulcro.

Se activa en la versión de pruebas y en local (`src/lib/diseno.js`); la app
pública sigue en v2. `?diseno=v5|v2` lo fuerza. Quien tuviera v3 o v4
guardado pasa a v5. Todo el estilo vive en `src/diseno-v5.css`, bajo
`:root[data-diseno='v5']`.

### Color (tokens en `diseno-v5.css` §1)
| Rol | Token | Valor |
|---|---|---|
| Fondo | `--bg` | `#0a100d` (+ un brillo verde muy suave arriba) |
| Menú lateral | `--bg-lateral` | `#0c1310` |
| Tarjeta | `--card-bg` | `#111916` |
| Tarjeta elevada / hover | `--card-bg-2`, `--superficie-3`, `--superficie-4` | `#16201b`, `#1b2721`, `#223029` |
| Bordes | `--border`, `--borde-fuerte` | `#1e2a24`, `#2b3a32` |
| Texto | `--text-h`, `--text`, `--text-3` | `#edf3ef`, `#a9b6af`, `#87958d` (AA sobre tarjeta) |
| Acento (acción, «va bien», ingreso) | `--accent`, `--accent-2` | `#3dd68c`, `#6fe4ab` (texto encima: `--tinta-accent`) |
| Inversión | `--inversion` | `#e2b85c` (dorado; nunca como gasto) |
| Gasto | `--gasto` | `#d3dcd7` neutro: gastar no es un error |
| Estado | `--aviso`, `--critico`, `--info` | `#f2b84b`, `#ef7468`, `#79aef2` (siempre con texto) |
| Gráficos | `--cat-1…6`, `--cat-otros` | `#199e70 #d95926 #3987e5 #c98500 #9085e9 #d55181`, `#4f5d56` |

La paleta de gráficos está **validada** (bandas de luz, croma, separación para
daltonismo ΔE ≥ 8 entre vecinos, contraste ≥ 3:1 sobre `--card-bg`). Rojo
(`--critico`) solo para «te has pasado» o un error, nunca para un gasto normal.

### Letra
Geist en todo. Cifras con `font-variant-numeric: tabular-nums` y algo de
tracking negativo (`.num`). Jerarquía: título de sección 21 px (barra
superior), título de tarjeta 15 px/600, cifra héroe 32–44 px/600, KPI
17–28 px/600, etiqueta 13 px, metadato 12 px. Sin mayúsculas espaciadas
ni letra mono (las de v2 se neutralizan en v5).

### Forma, espacio y profundidad
Radios 8 / 12 / 16 / 20. Tarjetas con borde fino de 1 px y un brillo interior
de 1 px; sombra solo en lo que flota (paneles, menús, tooltips). Espacio entre
tarjetas 16 px; relleno 20 px (16 en móvil).

### Logo
«La P que crece» (dos barras y la P) en menta. Mismo dibujo que v2
(`Marca` en `Icono.jsx`), con el color del acento.

### Comercios y servicios (`lib/marcas.js`, `v5/Avatar.jsx`, `docs/LOGOS.md`)
Cada movimiento lleva el logo real de su empresa:
- 3.512 marcas, 3.488 con logo oficial;
- 98 iconos de app (`public/logos/apps/`), que tienen prioridad.

Las marcas sin logo libre llevan su color y su monograma. Los comercios sin marca, un tono oscuro estable con su inicial. Inversión, traspasos y ajustes llevan su icono.

### Componentes (prefijo `v5-`)
- **Botón:** `.v5-boton` (secundario), `.primario` (menta), `.fantasma`, `.peligro`, `.icono-solo`.
- **Insignia de estado:** `.v5-insignia` + `bien | aviso | critico | info | inversion`.
- **Tarjeta:** `.v5-tarjeta` + `.v5-tarjeta-cab` (h2 + acción).
- **KPI:** `.v5-kpi-fila` / `.v5-kpi` (`.destacado` para la cifra principal).
- **Segmentado:** `.sub-tabs` (vistas) y `.v5-seg` (periodo de un gráfico).
- **Panel lateral:** `v5/Panel.jsx`. Entra por la derecha en el ordenador y sube como hoja en el móvil; Escape cierra y el foco vuelve.
- **Lista con avatar:** `.v5-lista` / `.v5-fila`.
- **Filas-barra:** `.v5-cats`. El relleno es el valor; la raya, tu media.
- **Gráficos:** `v5/Graficos.jsx`.
  - `GraficoArea` (evolución) y `GraficoBarras` (entra/sale): un solo eje, rejilla recesiva, tooltip al pasar el ratón o el dedo, tabla oculta para lectores de pantalla.
  - `Leyenda`.
  - `Anillo` (presupuesto).

### Navegación
- **Ordenador (≥ 1024 px):** menú lateral con «Nuevo movimiento» arriba.
  - Inicio.
  - *Tu dinero:* Movimientos, Patrimonio, Base.
  - *Planificar:* Presupuesto, Objetivos.
  - Fulcro, abajo.
  - La barra superior lleva el título de la sección, su frase, ocultar importes y Tu cuenta.
- **Móvil:** barra inferior con Inicio · Movimientos · [+] · Base · Plan. Plan agrupa Presupuesto, Patrimonio y Objetivos en subpestañas.
- Los id internos no cambian: `inversiones` es Patrimonio y `simulador` es Objetivos. Así siguen valiendo los enlaces de Fulcro y las píldoras.
- «Nuevo movimiento» abre un panel encima de lo que estés viendo, sin cambiar de pantalla.

### Pantallas
- **Inicio (`v5/InicioV5.jsx`):** retícula de 12 en el ordenador.
  - Patrimonio con evolución (6/12/24 meses), disponible/invertido y fiabilidad.
  - El mes: ahorro, entra/sale/invertido contra tu media (solo con el mes cerrado), presupuesto o ritmo de gasto, accesos rápidos.
  - Avisos.
  - Entra y sale en 6 meses.
  - Próximos cobros.
  - En qué se va (contra tu media).
  - Últimos movimientos.
- **Movimientos (`v5/MovimientosV5.jsx`):**
  - Buscar, periodo, importar y nuevo.
  - Filtro por tipo.
  - Resumen de lo filtrado.
  - Tabla por días: concepto con avatar, categoría, cuenta e importe alineado.
  - Detalle a la derecha (panel en móvil) con editar (la edición de siempre) y eliminar con confirmación.
- **Patrimonio (`v5/PatrimonioV5.jsx`):**
  - Cifras: neto, disponible (estimación hasta cuadrar con el banco), invertido (aportado, no valor de mercado) y este mes.
  - Evolución, composición por plataforma y comparativas a 1/6/12/24 meses.
  - Debajo, Inversión (aportar/retirar e historial).
- **Base (`Recurrentes.jsx` en v5 + `v5/CalendarioBase.jsx`):**
  - Cifras (al mes, al año, pagado este mes, lo que pide atención).
  - Calendario mensual con logos por día, importe del día, estados y navegación por meses; tocar un día lista sus cobros y abre su ficha.
  - Reparto anual, plan de ahorro.
  - Lista de compromisos con avatar y estado («Pagado», «Por confirmar», «Mañana», «En 9 días»…).
  - Confirmar y deshacer siguen siendo 1:1.
- **Presupuesto (`Presupuesto.jsx` → `PresupuestoV5`):**
  - Anillo de lo gastado.
  - Ritmo frente al día del mes.
  - Por categoría contra tu media: no hay presupuestos por categoría y no se inventan.
  - Tu regla.
- **Objetivos:** objetivos de ahorro y simuladores a la izquierda; planificación de los próximos meses a la derecha.
- **Fulcro:** panel acoplado a la derecha (ordenador), burbujas y fichas en el lenguaje v5; Escape cierra.
- **Tu cuenta:** panel lateral derecho en el ordenador; Escape cierra.

### Análisis (`v5/AnalisisV5.jsx`, lógica en `lib/analisis.js`)
El centro de control del mes, en una retícula de 12:
- Tu mes (8) + Objetivo de inversión (4).
- Entra, sale y queda (8) + Tasa de ahorro (4).
- En qué se va (7) + Qué ha cambiado (5).
- Tu futuro (12; controles a la izquierda y gráfico a la derecha).

Reglas:
- **Comparación justa:** el mes en curso se compara hasta el mismo día de los meses anteriores; un mes cerrado, con meses completos. Nunca «389 % más» porque el mes va por el día 7.
- **Insights:** cada uno dice qué cambió, frente a qué, cuántos euros y si es bueno (menta), malo (ámbar) o normal (gris, «en tu línea habitual»).
  - La flecha indica hacia dónde se movió la cifra; el color, si conviene.
  - Con menos de 2 meses de referencia, se dice en vez de comparar.
  - Lo que no es habitual (un viaje de otro mes) no cuenta como «ahorro».
- **Entra, sale y queda:** barras de entrada (menta) y salida (neutra) y un punto con lo que quedó, rojo y bajo el 0 si ese mes salió más de lo que entró. El mes en curso va atenuado y con asterisco.
- **En qué se va:** cada fila a su propia escala, porque lo que importa es lo gastado frente a SU media (raya blanca). Ámbar si se pasa; flecha si sube 3 meses seguidos.
- **Tu futuro:** la rentabilidad es una hipótesis editable (0–12 %, por defecto 7 %).
  - Dorado = invertido, línea neutra = sin invertir; la franja entre ambos es el interés compuesto.
  - Siempre con el aviso de simulación.
  - Misma fórmula que el simulador (`serieProyeccion` ≡ `proyectarInteresCompuesto`).

### Presupuesto · límites por categoría (`v5/LimitesCategoria.jsx`)
Tres valores que nunca se mezclan, cada uno con su forma:
- **Gastado:** la barra; ámbar desde el 85 % del límite, rojo si te pasas.
- **Tu límite:** raya menta gruesa y columna «Tu límite».
- **Media:** raya blanca fina y columna «Media/mes».

Columna «Queda» (o «Te pasas X»). Se editan todos a la vez («Editar límites»); vaciar un campo quita el límite. Los límites no tocan el presupuesto general ni los movimientos.

La configuración del presupuesto general son dos tarjetas de opción (porcentaje o cantidad fija), con un ejemplo calculado con tus datos.

### Movimiento
Entradas de 0,16–0,28 s con curva `cubic-bezier(0.16, 1, 0.3, 1)`; barras y
anillos se rellenan al aparecer. `prefers-reduced-motion` lo anula todo
(`index.css`).

### Calidad (`npm run e2e`, y en GitHub en cada subida)
- **Recorrido de 19 pasos en 390, 1280 y 1920:**
  - nuevo movimiento en panel;
  - buscar y filtrar;
  - editar y eliminar desde el detalle;
  - importar;
  - calendario y lista de Base;
  - confirmar y deshacer;
  - presupuesto;
  - Patrimonio;
  - Objetivos;
  - Fulcro;
  - Tu cuenta.
- **Auditoría de 12 vistas × 5 anchos (390, 820, 1280, 1440, 1920):** scroll lateral, texto cortado, contraste AA sobre fondo oscuro, botones sin nombre y errores.
- **`node tests/e2e/capturas.mjs v5 <carpeta>`:** capturas de todas las pantallas y estados (acceso, bienvenida, análisis, detalle, nuevo, cuenta).

# v2 (el que sigue en la app pública)

> **Leer antes de tocar cualquier estilo.** Define cómo se ve Palanca para que
> cada pantalla nueva parezca del mismo producto y no "hecha con IA".
> Tokens en `src/index.css`; capa de reglas comunes al final de `src/App.css`
> ("SISTEMA VISUAL v2"); iconos en `src/components/Icono.jsx`.

## Principio
**Confianza de banco, precisión de instrumento.** Sobria como una app
financiera seria; futurista por la *precisión* (tipografía técnica, líneas
finas, cifras alineadas, datos limpios), **nunca por el neón**.

## Lo que NO hacemos (señas de "diseño de IA")
- ❌ Degradados de marca (morado→cian) en botones, barras, textos o logos.
- ❌ Resplandores (`glow`, `text-shadow` de color), manchas de color de fondo.
- ❌ Emojis en la interfaz (👋, 🚀…) y destellos ✦ como icono de "IA".
- ❌ Caracteres Unicode como iconos (◆ ≡ ◐ ▲). Solo iconos de `Icono.jsx`.
- ❌ Bordes de color a un lado de las tarjetas para "decorar".
- ❌ Más de un color de acento. Mayúsculas espaciadas sin regla.

## Color
| Token | Uso |
|---|---|
| `--bg` `#0a0b0e` | Fondo. Liso, sin degradados. |
| `--card-bg` / `--card-bg-2` | Superficie 1 (tarjetas) / 2 (hover, campos, elevación). |
| `--border` / `--borde-fuerte` | Línea fina por defecto / línea de énfasis. |
| `--text-h` · `--text` · `--text-3` | Principal (cifras, títulos) · secundario · metadatos. |
| `--accent` `#5b67e8` | **Único acento.** Rellenos (botón principal, selección). Texto blanco encima (4,6:1). |
| `--accent-2` `#8e98ff` | El acento en claro: enlaces, estados activos, líneas de gráfico. |
| `--ingreso` · `--gasto` · `--inversion` | Solo con significado (verde · rosa · dorado), calmados. |
| `--cat-1…6` | Gráficos por categoría (distinguibles, sin significado). |

El color **siempre significa algo**. Si no significa nada, es gris.

## Tipografía
- **Geist** (texto) y **Geist Mono** (etiquetas técnicas), autoalojadas
  (`@fontsource-variable/*`): funcionan sin conexión en la PWA.
- Cifras con dígitos tabulares en toda la app (no bailan al animar).
- Escala: 11 · 12 · 13 · 15 · 17 · 22 · 32 · 40 px (`--fs-*`).
- **Títulos** en frase normal ("Gasto por categoría"), peso 600, tracking negativo.
- **Etiquetas de sección (overline)**: Geist Mono 11 px, MAYÚSCULAS, tracking
  0,08em, `--text-3`. Es la única mayúscula de la app y siempre igual.

## Forma y espacio
- Rejilla de 4 px (`--sp-*`). Radios: 8 (controles) · 12 (tarjetas) · 999 (píldoras).
- **Elevación plana**: la jerarquía la dan superficie y línea, no sombras.
  Solo las hojas/modales llevan sombra (para separarse del fondo).

## Iconos y marca
- `Icono.jsx`: rejilla 24, trazo 1,6, puntas redondeadas, `currentColor`.
  Si falta un icono, se dibuja en ese mismo estilo y se añade ahí.
- **Marca**: "La P que crece": índigo sobre oscuro dentro de la app; blanca
  sobre índigo como icono de la app y favicon.
  Detalle y mascota aparcada en `docs/marca/README.md`. El consultor "Fulcro"
  usa un icono de conversación (claridad antes que guiño).

## Componentes base
- **Botón principal**: relleno `--accent`, texto blanco, sin degradado ni brillo.
- **Navegación inferior**: iconos de línea; activo = icono `--accent-2`,
  texto `--text-h` y una rayita superior. Globo de avisos en `--gasto`.
- **Tarjeta de métrica**: punto de color + etiqueta; la cifra manda.
- **Campos**: sin flechas de sistema en numéricos; fechas con `InputFecha`
  (dd/mm/aaaa o calendario).

## Movimiento
Entradas cortas (≤450 ms, `cubic-bezier(0.16,1,0.3,1)`), sin rebotes
gratuitos; todo respeta `prefers-reduced-motion`.
