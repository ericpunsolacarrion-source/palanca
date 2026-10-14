# Sistema visual de Palanca (v2)

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
- **Marca**: "La P que crece" (dos barras ascendentes + la "P" en índigo).
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
