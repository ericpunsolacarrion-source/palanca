# Costes de Palanca y margen de Premium

Estudio del 15-10-2026. Las cifras de IA salen del código real (tamaños medidos) y de los precios oficiales de Anthropic. Los servicios marcados **(verificar)** hay que confirmarlos en su web antes de lanzar. Cambio usado: **1 $ ≈ 0,90 €**.

## 1. Lo que cuesta cada uso (variable)

Modelo: **Claude Haiku 5.5**, a 0,10 $ por millón de tokens de entrada y 0,50 $ por millón de salida. La parte repetida de la entrada que se guarda en caché se cobra a una décima parte.

### Fulcro (una pregunta)
Medido en el código:
- Instrucciones fijas: 12.031 caracteres (≈ 3.400 tokens). Van en caché tras la primera pregunta.
- Resumen de los datos del usuario: unos 3.000 caracteres (≈ 900 tokens), más el detalle según la pregunta y hasta 8 mensajes de historial.
- Respuesta con esfuerzo bajo: unos 700 tokens de media. Tope: 4.000.

| Caso | Entrada | Salida | Coste |
|---|---|---|---|
| Normal | ≈ 2.000–4.000 tokens + instrucciones en caché | ≈ 700 | **≈ 0,0006 $ (0,05 céntimos)** |
| Peor caso | 8.000 sin caché | 4.000 (tope) | **≈ 0,0028 $ (0,25 céntimos)** |

### Importar con capturas (cada envío de hasta 4 capturas)
- Cada captura se reduce a 1568 px de lado largo y cuenta como ≈ (ancho × alto) / 750 tokens: unos 1.500 por captura de móvil.
- Normal: ≈ 7.000 tokens de entrada + ≈ 1.700 de salida → **≈ 0,0016 $**.
- Peor caso, con el tope de salida de 8.000: **≈ 0,005 $**.
- Traer un año entero por capturas (unas 60 capturas, 15 envíos): **≈ 0,03–0,07 $**.

### Lo que no cuesta nada
- **Subir el extracto (Excel/CSV/HTML)** se procesa en el propio móvil: no hay IA ni se guarda el archivo, solo los movimientos. **0 €.**
- Solo si no se reconocen las columnas se pregunta a la IA, una vez por archivo: menos de 0,001 $.

### Por usuario al mes
| Usuario | Uso | Coste IA/mes |
|---|---|---|
| Gratis | 5 preguntas + 1 importación por capturas | **< 0,02 €** |
| Premium normal | 60 preguntas + 1 año de capturas el primer mes | **≈ 0,05–0,25 €** |
| Premium al tope (abuso) | 10 preguntas/día × 30 + 25 envíos/día | **≈ 0,75 € + 0,12 €/día de capturas** |

Los topes diarios ya existen y se cambian con variables de entorno: `FULCRO_LIMITE_DIARIO` = 10 y `CAPTURAS_LIMITE_DIARIO` = 25. Conclusión: **la IA no es el problema de costes.** Con Haiku 5.5 cuesta céntimos al mes por persona.

## 2. Lo que cuesta tener la app en marcha (fijo)

| Servicio | Ahora | Al cobrar a clientes |
|---|---|---|
| **Supabase** (base de datos y cuentas) | Gratis. Ojo: el plan gratis se pausa tras 1 semana sin actividad y no tiene copias diarias | **Pro: 25 $/mes** |
| **Vercel** (alojamiento) | Hobby gratis | **Pro: 20 $/mes por miembro**. El plan Hobby es para uso no comercial **(verificar)** |
| **Dominio** (para emails y marca) | — | **≈ 12–15 €/año** |
| **Resend** (emails) | — | Gratis hasta 3.000/mes, 100 al día; Pro 20 $/mes **(verificar)** |
| **Stripe** (cobros) | — | Sin cuota fija; ≈ 1,5 % + 0,25 € por cobro con tarjeta europea **(verificar)** |
| **Anthropic** (IA) | Pago por uso | Ver punto 1 |

**Total fijo al lanzar con cobro: ≈ 45 €/mes** (Supabase + Vercel + dominio), o **≈ 65 €/mes** cuando se pasen los 3.000 emails al mes.

**Costes de negocio, no de la app** (consultar con gestoría):
- Alta como autónomo o sociedad: en España la tarifa plana de autónomo ronda los 80 €/mes el primer año.
- IVA.
- A partir de cierto volumen de ventas a otros países de la UE, IVA de cada país (régimen OSS).

## 3. Margen por cliente Premium

| | Mensual 3,99 € | Anual 29,99 € |
|---|---|---|
| Precio con IVA | 3,99 € | 29,99 € |
| − IVA 21 % | 3,30 € | 24,79 € |
| − Stripe (1,5 % + 0,25 €) | 3,30 − 0,31 = **2,99 €** | 24,79 − 0,70 = **24,09 €** (2,01 €/mes) |
| − IA (uso normal) | ≈ 0,15 € | ≈ 0,15 €/mes |
| **Queda por cliente y mes** | **≈ 2,85 €** | **≈ 1,85 €** |

Cómo se lee:
- **3,99 €/mes se sostiene.** De cada cuota quedan unos 2,85 €. Los 0,25 € fijos de Stripe pesan un 8 % en la mensual; en la anual, mucho menos.
- **Para cubrir los ≈ 45 €/mes fijos:** unos **16 clientes mensuales** o **25 anuales**. Con autónomo incluido (≈ 125 €/mes), unos **45 clientes mensuales**.
- **El anual a 29,99 € deja menos por mes** (1,85 €), aunque cobra todo por adelantado y retiene mejor. Alternativa: **34,99 €/año** (≈ 2,25 €/mes netos, sigue siendo un 27 % más barato que el mensual).
- **El precio fundador a 19,99 €/año** deja ≈ 1,20 €/mes. Vale como captación limitada, por ejemplo a los 100 primeros, pero no como precio normal.

## 4. Vigilancia
- **Coste real de la IA:** la tabla `fulcro_uso` guarda los tokens de cada pregunta. Al mes de lanzar, comparar con esta estimación.
- **Abuso:** si alguien llega al tope a diario, sale en el panel (Fulcro por usuario).

## 5. Revisión y optimización (15-10-2026)

### Variables (IA): qué está hecho y qué queda
| | Medida | Efecto |
|---|---|---|
| ✔ | **Respuestas al momento sin IA** (`src/lib/respuestasLocales.js`). Las preguntas de datos se calculan en el móvil: "¿cuánto he gastado en gasolina los 3 últimos meses?", "¿cuánto he pagado de Spotify hasta ahora?", "¿cuándo me cobran el seguro de la moto?", "¿cuánto pago en fijos?", "¿en qué gasto más?", ingresos, ahorro e inversión de un periodo, el último pago de algo | **0 €**, al instante y exacto. No gastan preguntas del día: siguen funcionando aunque se acaben las de IA. En el panel se miden como "Respuestas de Fulcro sin IA" |
| ✔ | Las de criterio van a la IA ("¿me conviene…?", "¿cómo ahorro más?"). Ante la duda, también: mejor gastar 0,05 céntimos que contestar mal. Debajo de cada respuesta al momento hay un botón "Que lo analice Fulcro" | Calidad intacta |
| ✔ | El modelo más barato (Haiku 5.5), esfuerzo bajo y respuesta con tope de 4.000 tokens | — |
| ✔ | **Caché**: las instrucciones y el resumen del usuario se leen a 1/10 del precio desde la 2.ª pregunta de una conversación | ≈ −60 % de entrada en conversaciones |
| ✔ | Topes por persona y día (10 preguntas, 25 envíos de capturas). Los saludos y gracias no llaman a la IA | Coste máximo acotado |
| ✔ | Extracto Excel/CSV antes que capturas: se procesa en el móvil a 0 € y la app lo propone primero | — |
| ☐ | Historial de 8 → 4 mensajes | ≈ −20–30 % de entrada en charlas largas. Pequeño, a decidir |
| ☐ | **Límite de gasto mensual en Anthropic** (Console → Limits), por ejemplo 10 $/mes | Seguro contra sustos. **Hacerlo hoy** |

### Fijos: recomendación
| Servicio | Recomendación |
|---|---|
| Supabase | **Gratis hasta el primer cobro.** Con usuarios activos no se pausa. Pasar a **Pro (25 $)** el día que haya clientes de pago: copias diarias, sin pausas |
| Vercel | Gratis (Hobby) mientras no se cobre; **Pro (20 $) al cobrar** (verificar condiciones). Alternativa a estudiar: Cloudflare Pages, gratis y con uso comercial permitido (verificar), pero obliga a adaptar las funciones `/api`. Ahorraría ≈ 20 $/mes |
| Resend | Gratis (3.000 emails/mes). Con nuestros topes da para unos 1.000 usuarios activos |
| Dominio | Comprarlo en un registrador a precio de coste (≈ 10–15 €/año) |
| Stripe | Empujar el **plan anual**: los 0,25 € fijos por cobro pesan un 8 % en la cuota mensual y un 2 % en la anual. Si se vende mucho fuera de España, valorar una pasarela que gestione el IVA de cada país (*Merchant of Record*: cobra más, ≈ 5 %, pero ahorra gestoría) |

### Resumen
- **IA:** céntimos por usuario. Con las respuestas al momento, las preguntas de datos (probablemente la mayoría) pasan a costar 0.
- **Lo que pesa son los fijos al cobrar (≈ 45 €/mes) y el autónomo.**
- La palanca de margen es **vender el anual** y llegar a los **16–45 clientes** que cubren costes (punto 3).
