# Logos de marcas (comercios y servicios)

Dónde viven:
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
