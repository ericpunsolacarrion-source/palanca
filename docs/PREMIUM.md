# Premium: propuesta de precio y beneficios (para decidir)

Estado: **propuesta en revisión**. Eric (15-10-2026): 3,99 €/mes le parece bien. La garantía de ahorro queda descartada. Referidos solo si el invitado paga. Costes y margen: **[COSTES.md](COSTES.md)**. La app ya cuenta y gestiona planes (panel de métricas), pero aún no bloquea nada.

## Principio
**Lo que crea el hábito es gratis.** Apuntar, importar el extracto, fijos y avisos, presupuesto, patrimonio y descargar tus datos. Con eso la gente se queda.

**Premium paga lo que nos cuesta dinero (la IA) y lo que te ahorra dinero (negociar recibos).** Así el precio se justifica solo: *Premium se paga con lo que te ayuda a ahorrar*.

## Qué incluye cada plan
| | Gratis | Premium |
|---|---|---|
| Apuntar, fijos, avisos de cobro, presupuesto, patrimonio, inversión | Sí | Sí |
| Importar extracto (Excel/CSV), todo el historial | Sí | Sí |
| Descargar tus datos, sin anuncios | Sí | Sí |
| **Fulcro** (asistente) | 5 preguntas al mes | Sin límite |
| **Importar con capturas** del móvil (IA) | 1 importación de prueba | Sin límite |
| **Plan de ahorro de recibos** | Ver cuánto podrías ahorrar | Guiones para negociar, aviso antes de cada renovación, seguimiento de lo ahorrado |
| Simuladores avanzados (independencia financiera, escenarios guardados) | Básico | Completo |
| (Futuro) **Conexión con el banco** | — | Sí |

## Precio
- **Premium: 3,99 €/mes** (visto bueno de Eric). **Anual: por decidir** entre 29,99 € (≈ 1,85 €/mes netos) y 34,99 € (≈ 2,25 €/mes netos); ver COSTES.md §3. IVA incluido: el precio que ve el cliente es el final.
- **Referencias:** según una comparativa de septiembre de 2026, Spendee Plus cuesta unos 1,99 $/mes y Wallet Premium unos 5,99 $/mes. Hay que verificarlo en las tiendas. Palanca queda en medio, con más valor (IA y ahorro real).
- **Por qué se sostiene:** si negociar luz, teléfono o seguro ahorra 100 € al año o más (rangos de `negociables.js`: energía 8–20 %, telefonía 10–30 %), la cuota anual se recupera unas tres veces.

## Palancas de conversión
1. **Precio fundador:** los **primeros 100** clientes, **19,99 €/año para siempre**. Da urgencia real, ingresos tempranos y embajadores.
2. **Prueba de 14 días sin tarjeta.** Al acabar se pasa a Gratis **sin cobrar nada**: en finanzas la confianza lo es todo y no hay trucos. Ya está: `origen = prueba` + email `prueba_termina`.
3. **Mostrar Premium en el momento justo**, no con anuncios:
   - al gastar la 5.ª pregunta de Fulcro del mes;
   - en el resumen de "Trae tu historial" ("podrías ahorrar 120–310 €/año: Premium te guía para conseguirlo");
   - al abrir un recibo negociable;
   - en el email `invitacion_premium` a usuarios enganchados (ya programado y apagado).
4. **Invita a un amigo (decidido):** quien invita recibe **1 mes gratis** solo si su invitado se **da de alta y paga** Premium. Nada por altas que no pagan.
5. ~~Garantía de ahorro~~: **descartada**. No podemos medir el ahorro real de forma fiable.

## Cobro
- **Stripe Checkout + Portal del cliente:** suscripción, cambio de plan, factura y baja en un clic. Comisión europea habitual: alrededor del 1,5 % + 0,25 € por cobro con tarjeta europea (comprobar la tarifa vigente).
- Al ser una **app web (PWA), no pasa por la App Store**: nos ahorramos el 15–30 % de Apple.
- El webhook de Stripe escribirá en la tabla `planes` (`origen = pago`), así que el panel no cambia.

## Decisiones para Eric
1. ~~¿Precio mensual?~~ **3,99 €/mes** ✔. Falta el anual (29,99 € o 34,99 €) y si hay precio fundador.
2. ¿El límite de Fulcro en Gratis: 5 preguntas al mes?
3. ~~¿Garantía de ahorro?~~ Descartada ✔.
4. ¿Cuándo activamos el cobro? Recomendación: tras 4–6 semanas de uso real, mirando en el panel la retención de la semana 4.
