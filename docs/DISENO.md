# Sistema visual de Palanca

> **Estado (31-10-2026):** conviven dos diseños.
> - **v3 «Vidrio»**, el nuevo, elegido por Eric: se ve en la versión de pruebas y en local.
> - **v2**, el oscuro de abajo: sigue en la app pública hasta que Eric diga «lánzalo» con el diseño.
>
> Interruptor: `src/lib/diseno.js` (`<html data-diseno="v3">`). Se fuerza con
> `?diseno=v3` o `?diseno=v2` y el navegador lo recuerda. Estilos v3:
> `src/diseno-v3.css`, que se carga después de `App.css` y solo actúa con
> `data-diseno="v3"`.

## v3 «Vidrio» (el nuevo)

**Idea:** papel cálido con luz, tarjetas de cristal claro y **una sola tarjeta
sólida verde por pantalla** (la que manda). Sereno, preciso y cercano. Nunca
neón-fintech, banco corporativo ni app de juguete.

### Color
| Token | Valor | Uso |
|---|---|---|
| `--pino` | `#14332C` | Marca: logo, menú activo, textos de marca. |
| `--verde` / `--accent` | `#1F6B57` | Acción principal, la tarjeta sólida, el «+», enlaces y selección. Texto blanco encima. |
| `--laton` | `#C9973F` | Solo **inversión y Fulcro** (el punto de apoyo). En texto, `--inversion` `#9C7224`. |
| `--gasto` | `#A9502C` | Terracota: vencimientos, pasarse del presupuesto, gasto. |
| `--ingreso` | `#23794F` | Ingresos y cifras que mejoran. |
| Fondo | `#F0EADF → #E6DDCE` | Papel con 3 luces suaves (verde arriba a la derecha, latón a la izquierda y verde abajo). Es fijo y no es un degradado de marca. |
| Cristal | blanco al 74 % | Tarjetas, con borde blanco y sombra suave. Para cifras, nunca menos de un 70 % de opacidad. |
| Texto | `#16201C` · `#56615C` · `#7F8A84` | Principal · secundario · metadatos. |

### Logo
**«La P que crece»** (el mismo dibujo, `Marca` en `Icono.jsx`) en **verde
pino**. El icono de la app y el favicon pasarán a P blanca sobre pino cuando
el diseño v3 se lance al público. Hasta entonces se mantienen en índigo,
porque se ven también en la app pública.

### Letra
**Plus Jakarta Sans** (autoalojada, `@fontsource-variable/plus-jakarta-sans`),
en peso 800 para cifras y títulos y 600–700 para el resto. Cifras con
dígitos tabulares. **Sin mayúsculas espaciadas ni letra mono**: las etiquetas
van en frase normal.

### Reglas
- **Una tarjeta sólida por pantalla.** En Inicio es «Ahorrado en oct.»; las demás son de cristal.
- **El cristal, sobre el fondo con luz.** Nunca cristal sobre cristal ni texto pequeño sobre cristal transparente.
- **Navegación flotante de cristal** con el **«+» verde** en el centro (apuntar un gasto).
  - La pestaña activa es una píldora pino.
  - Los iconos tienen nombre accesible (`aria-label`).
- **Fulcro en la cabecera** (icono en latón), en lugar del botón flotante.
- Lo que sigue igual que en v2: sin emojis, iconos de `Icono.jsx` y el color siempre significa algo.

### Inicio (v3)
1. Saludo.
2. Patrimonio en cristal, compacto: cifra, variación del mes y línea.
3. **Cuadrícula de 4 tarjetas:**
   - ahorrado (sólida, con barritas de los 6 meses);
   - gastado (presupuesto libre o ritmo);
   - ingresos (el mayor del mes);
   - invertido este mes (plataformas).
4. Acciones, avisos y el resto de Inicio.

Todas las cifras salen de `resumenDelMes` y `agregarPorMes`, como siempre.

---

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
