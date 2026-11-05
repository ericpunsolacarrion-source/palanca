# Logos de marcas (comercios y servicios)

**Iconos de App Store (05-11, tarde):** Repsol, BP, Iberdrola, Mercadona, Lidl, Carrefour, Aldi, IKEA, Too Good To Go e HiperDino (nuevas: Too Good To Go e HiperDino), recortados de capturas de la App Store que pasó Eric. Siguen sin logo 31: Dia, Mutua Madrileña, PcComponentes, Telepizza, BlaBlaCar, Bankinter, Basic-Fit, MásMóvil, Openbank, Alcampo, Naturgy, Holaluz, Primark, Vueling, Allianz, Sanitas, Adeslas, Eroski, Consum, Endesa, Mapfre, Cepsa, Yoigo, Shein, Renfe, Bizum, McFit, Galp, Digi, Bolt, DKV. Con una captura de su ficha de App Store se añaden igual (`indice.js` se parchea si no está `LOGOS_TMP`).

**Iconos de app (05-11):** 72 iconos reales recortados de las capturas del móvil de Eric (`public/logos/apps/*.webp`, 128 px, ≈180 KB en total, no se precargan). Tienen prioridad sobre el vector. Incluyen españolas que no tenían logo libre: CaixaBank, Línea Directa, Cabify, Wallapop, Mango, Lefties, Trade Republic, MyInvestor, Alsa, InfoJobs, coches.net, Quirónsalud, Agencia Tributaria, DGT, imagin… Se declaran en `scripts/logos/apps.json` (clave → nombre y patrón). Para añadir más: captura del móvil → recorte → webp con el mismo nombre que la clave.

**Catálogo (04-11, ampliado):** 3.481 marcas, 3.432 con logo oficial (todo Simple Icons + las revisadas a mano). Índice ligero `src/lib/logos/indice.js` (≈69 KB comprimido, se carga tras el primer pintado) y dibujos por inicial `src/lib/logos/dibujos-*.js`, que solo se descargan si hacen falta (no se precargan en la PWA; quedan en caché al usarse). Se regenera con `scripts/logos/catalogo.py`. Reconocimiento estricto: si el nombre de la marca es una sola palabra corriente (diccionarios de inglés y español) o una pasarela de pago (SumUp, Stripe, Klarna…), solo cuenta si es todo el texto («Bar Delta» no lleva el logo de Delta). Colores como el icono de la app en el móvil para las principales (Netflix negro con N roja, Spotify negro con verde, YouTube blanco con rojo…).

Dónde viven (versión anterior, solo revisadas):
- **Datos:** `src/lib/logosMarcas.js`, generado; no se edita a mano.
- **Reconocimiento:** `src/lib/marcas.js` (`logoDe`).
- **Dibujo:** `src/components/v5/Avatar.jsx`.

Se cargan en un archivo aparte (unos 63 KB comprimidos) después del primer pintado. Hasta entonces se ve el monograma. Nada se pide a internet al usar la app.

## Estado (04-11-2026)
- **153 marcas** registradas.
- **104 con logo oficial:**
  - 94 de **Simple Icons** (CC0).
  - De la colección SVG Logos (CC0): Microsoft.
  - De Simple Icons vía Iconify: Prime Video, ChatGPT/OpenAI, LinkedIn, Canva, Amazon, Adobe, Xbox y Nintendo.
  - Disney+, de **Streamline** (CC BY 4.0, con atribución en «Tu cuenta»).
- **49 pendientes** de logo oficial, con color de marca y monograma (`pendiente: true`):
  - *Supermercados:* Mercadona, Dia, Eroski, Alcampo, Consum, El Corte Inglés.
  - *Energía y combustible:* Repsol, Cepsa, BP, Galp, Iberdrola, Endesa, Naturgy, Holaluz.
  - *Telefonía:* Yoigo, MásMóvil, Digi.
  - *Compras:* Shein, Temu, Wallapop, Mango, Primark, Decathlon, PcComponentes.
  - *Comida:* Telepizza, Domino's.
  - *Transporte:* Cabify, Bolt, BlaBlaCar, Renfe, Vueling.
  - *Bancos e inversión:* BBVA, Santander, ING, Bankinter, Openbank, Trade Republic, MyInvestor, Bizum.
  - *Seguros y gimnasios:* Mapfre, Allianz, AXA, Mutua Madrileña, Sanitas, Adeslas, DKV, Línea Directa, Basic-Fit, McFit.

  No están en ninguna colección abierta descargable. Su SVG oficial está en Wikimedia Commons (upload.wikimedia.org), que el entorno de trabajo de Claude no tiene permitido. Para completarlos, Eric tiene que añadir `upload.wikimedia.org` y `commons.wikimedia.org` en *Allowed domains* del entorno, o pasar los SVG.

## Reglas
- **Encuadre:** cuadrado redondeado (radio 28 % del lado), símbolo centrado al 56 %; los logos que son una palabra, al 76 %.
- **Color:** el de la marca. El símbolo va en blanco o negro según contraste, salvo los ajustes de `AJUSTE`, por ejemplo el amarillo de Lidl o el de McDonald's.
- **Reconocimiento:**
  - Primero el patrón de cada logo sobre el texto normalizado (los más específicos antes: «YouTube Music» gana a «YouTube»), luego la marca del directorio de comercios.
  - Los medios de pago (Visa, Mastercard, Apple Pay…) solo cuentan si son todo el texto: «COMPRA TARJ VISA BAR PACO» no lleva el logo de Visa.
- **Cómo añadir una marca:** se edita el generador (`logos/generar.py` y `logos/a_app.py` del scratchpad de diseño; pendiente de pasarlos a `scripts/`) y se regenera.
