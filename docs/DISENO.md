# Sistema visual de Palanca

> **Estado (03-11-2026):** conviven dos diseños.
> - **v4 «El punto de apoyo»**, el definitivo, elegido por Eric: se ve en la versión de pruebas y en local.
> - **v2**, el oscuro de abajo: sigue en la app pública hasta que Eric diga «lánzalo» con el diseño.
>
> Interruptor: `src/lib/diseno.js` (`<html data-diseno="v4">`). Se fuerza con `?diseno=v4` o `?diseno=v2`. El v3 «Vidrio» se retiró: quien lo tuviera guardado pasa a v4.
> Estilos v4: `src/diseno-v4.css`, que se carga después de `App.css` y solo actúa con `data-diseno="v4"`.
> Manual de marca con maquetas: capturas v4.1 / v4.2 enviadas a Eric (01-11).

## v4 «El punto de apoyo»

**Idea:** Palanca es el punto fijo desde el que mueves tu dinero. Es un instrumento de precisión: tinta sobre papel, el latón como firma y una barra (el Fiel) que se equilibra con tus datos.

**Nunca:**
- cristal, degradados, sombras ni resplandores;
- gasto en rojo ni mensajes que culpan;
- más de un camino para apuntar;
- iconos sin nombre en la navegación;
- latón en algo que no trabaje para ti.

### Color (60 papel · 30 tinta · 7 ahorro/gasto · 3 latón y teja)
| Token | Valor | Significa |
|---|---|---|
| `--papel` | `#F4EFE6` | Fondo: el lugar estable. |
| `--hoja` | `#FBF9F4` | Tarjetas, con filete `--filete` `#DDD5C6` de 1 px y radio 8. |
| `--tinta` | `#1A1A17` | Lo tuyo: texto, cifras, botón principal y logo. |
| `--laton` / `--laton-texto` | `#B8873A` / `#7F5C1E` | Lo que trabaja: inversión, el ▲ del logo y del Fiel. El latón claro nunca va como texto sobre papel. |
| `--ahorro-v4` | `#2F6B4F` | Lo que apartas (y los ingresos). |
| `--gasto` | `#4A4A45` | Consumo: neutro, **nunca rojo** (el rojo hace que la gente deje de mirar su dinero). |
| `--teja` | `#A4462E` | Actuar ahora: una renovación negociable, pasarse del presupuesto. |

Todo el texto pasa AA (≥ 4,5:1); lo comprueba la auditoría automática.

### Logo «La P de apoyo»
P maciza con el fulcro (▲ latón) como contraforma, sobre una rejilla de 24:
- fuste de 4;
- panza de radio 5,5;
- ▲ con base de 5,8 a 1,7 del borde.

Componente `Marca` (`Icono.jsx`). El logotipo es «palanca» en minúsculas, en serifa.

Icono de la app y favicon: P en papel sobre tinta. **Pendiente de cambiar al lanzar**, porque ahora se ven también en la app pública.

### Letra
- **Source Serif 4** para las cifras y los títulos.
- **Instrument Sans** para la interfaz.
- Las dos van autoalojadas (`@fontsource-variable/*`).
- Cifras tabulares; sin mayúsculas espaciadas ni letra mono.

### La firma: el Fiel (`Fiel` en `InicioV4.jsx`)
- Barra con el apoyo (▲) al 25 %.
- Su inclinación es el ratio de ahorro del mes ÷ 30 × 6°, con un tope de ±6°:
  - sube si ahorras;
  - queda plana si te quedas igual;
  - baja si gastas más de lo que entra.
- Al cambiar el dato se asienta como una balanza (600 ms). No se anima nada más.

### Navegación
**Inicio · Dinero · Apuntar · Fijos · Futuro.** «Futuro» agrupa Presupuesto, Inversión y Simuladores con subpestañas.

- **Móvil:** barra sólida abajo, con el nombre bajo cada icono y «Apuntar» (bloque de tinta) en el centro.
- **Ordenador** (≥ 1024 px): menú lateral, con «Apuntar» arriba.
- **Fulcro:** se abre desde la cabecera. En el ordenador es un panel lateral.

### Inicio (`Inicio.jsx` + `InicioV4.jsx`; cálculo en `balanceInicio`, `lib/inicio.js`)
1. **Patrimonio.**
2. **Balance del mes:**
   - los días 1–3, «Octubre, cerrado»;
   - del día 4 en adelante, «Noviembre en curso»;
   - incluye el Fiel y 4 cifras (entró, se fue, apartaste, invertido), cada una **contra tu media** de los meses previos con datos;
   - la etiqueta «tu mejor mes» solo aparece si supera a todos.
3. **«Noviembre empieza»** (días 1–3): propuesta de meta con tu media. Es el único bloque en tinta.
4. Avisos (lo próximo).
5. **Lo que apartas cada mes:** barras con la línea de tu media.
6. **En qué se fue:** cada categoría frente a su media; se destaca **lo que más sube**, no lo más grande.
7. Últimos movimientos.

En el ordenador, los bloques 1, 2, 5 y 6 van a la izquierda y el resto a la derecha.

### Pantalla grande
El ancho decide la distribución, no el tipo de aparato:
- **menos de 600 px:** móvil;
- **600–1023 px:** columna centrada de 760 px;
- **1024 px o más:** menú lateral y dos columnas.

Las columnas son contenedores (`.ini-col`, `.col-a`/`.col-b`) que en el móvil desaparecen (`display: contents`) y se ordenan con `order`.

### Calidad: auditoría automática (`npm run e2e`, y en GitHub en cada subida)
La app real con datos simulados (`tests/e2e`) pasa por:
- el **recorrido completo** (16 pasos), en móvil y en ordenador;
- la **auditoría visual**: 11 pantallas × 3 anchos.

Falla si encuentra:
- scroll lateral;
- textos cortados;
- contraste por debajo de 4,5:1;
- botones sin nombre;
- errores de la app.

Las capturas quedan en `tests/e2e/salida/` (y como artefacto en GitHub).

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
