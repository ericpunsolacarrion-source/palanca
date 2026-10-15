# Métricas de uso (panel de administración)

Para saber **quién usa Palanca, cada cuánto vuelve y qué hace**, sin herramientas
de terceros y sin ver nunca el dinero de nadie.

## Cómo se activa (una vez)
1. Supabase → SQL Editor → **vaciar el editor** → pegar `supabase-schema-metricas.sql` entero → Run.
   Se puede ejecutar varias veces sin romper nada.
2. Entrar en la app con `ericpunsolacarrion@gmail.com` → Tu cuenta → **Métricas de Palanca (admin)**.
   Para añadir otro admin: `insert into admins (email) values ('otro@mail.com');`

No hace falta tocar Vercel. Hasta que se ejecute el SQL, la app funciona igual: no
registra eventos y el panel dice que falta el SQL.

## Quién puede verlo
- **Solo los emails de la tabla `admins`** (de serie, el tuyo) y con el **email confirmado**.
- La comprobación la hace la **base de datos** (`soy_admin()` dentro de cada función): aunque alguien manipulara la app, `palanca_metricas()` y `admin_cambiar_plan()` le responden "Solo administradores".
- La tabla `admins` no se puede leer desde la app.

## Premium y Gratis (`planes`)
- **Sin fila = Gratis.** Premium vigente = `plan = 'premium'` y `hasta` vacío o ≥ hoy. Al pasar la fecha queda como **Caducado** sin hacer nada.
- `origen`: `pago` · `prueba` · `invitacion` · `manual`. `importe_mensual` es lo que paga al mes (una cuota anual se divide entre 12). Cuenta para **Ingresos al mes** solo si es Premium vigente y no está en prueba.
- **Solo el admin cambia planes**, desde el panel: toca el plan de un usuario en la lista → ficha (Gratis/Premium, cómo lo tiene, importe, hasta, nota). Por dentro llama a `admin_cambiar_plan()`, que guarda cada cambio en `planes_historial` (quién, cuándo, qué).
- El usuario puede **leer** su plan (`mi_plan()` devuelve `{plan: 'premium'|'gratis', origen, hasta}`), pero no escribirlo: no hay políticas de insert/update.
- Cuando haya pasarela de pago (Stripe), su webhook escribirá en esta misma tabla con `origen = 'pago'`. El panel no cambia.
- Métricas:
  - Premium / En prueba / Gratis / Caducados;
  - % de conversión;
  - ingresos al mes y al año;
  - pruebas que terminan en 7 días;
  - pasos a Premium y bajas en 30 días;
  - comparativa de uso por plan;
  - cambios recientes;
  - columna y filtro de plan en la lista.

## Qué se guarda
- Tabla `eventos`: `usuario_id`, `tipo`, `created_at`. **Nada más**: ni importes, ni conceptos, ni textos.
- Se escribe solo con `registrar_evento()`, que respeta `perfiles.analitica = false`
  (Tu cuenta → "Ayudar a mejorar Palanca") y tiene un tope de 500 eventos al día por usuario.
- Tipos (`src/lib/analitica.js`):
  - `visita`: abrir la app o volver a ella tras 30 minutos.
  - `movimiento`, `movimiento_rapido`.
  - `cobro_confirmado`, `fijo_nuevo`.
  - `importacion`, `importacion_capturas`.
  - `ahorro_negociado`, `tour`, `datos_ejemplo`, `exportacion`.
  - Para añadir uno: llamar a `registrarEvento('nombre_en_minusculas')` tras la acción, y ponerle un nombre legible en `EVENTOS` de `PanelMetricas.jsx`.

## Definiciones (todas en `palanca_metricas()`, hora de Madrid)
| Métrica | Definición |
|---|---|
| **Día activo** | Ese día abrió la app (`visita`), creó un movimiento o preguntó a Fulcro. Así hay **histórico desde el primer día** (los movimientos y el uso de Fulcro ya tenían fecha). |
| Activos hoy / 7 / 30 días | Usuarios distintos con algún día activo en ese periodo. |
| **Entran cada** | Para quien tiene ≥2 días activos en 30 días: (último − primero) / (nº días − 1). Media de todos. |
| Días activos al mes | Media de días activos en 30 días entre los que entraron. |
| **Enganche** | Activos de un día medio ÷ activos del mes. 20 % ≈ entran 6 días al mes; las apps de finanzas buenas rondan el 15–25 %. |
| Apuntan gastos | Usuarios con algún gasto creado en los últimos 30 días. |
| Estados | Activo (≤7 días), En riesgo (8–30), Dormido (>30), Sin empezar (alta sin apuntar nada). |
| Embudo | Alta → apunta algo → 10 movimientos → añade un fijo → pregunta a Fulcro → vuelve ≥3 días. Los ajustes y el saldo inicial no cuentan como movimientos. |
| Retención | Por semana de alta: % que vuelve en la semana 1 (días 1–7), 2 (8–14) y 4 (22–28). "—" si la cohorte aún no ha llegado. |
| Ahorro negociado | Suma de lo que los usuarios dicen haber conseguido bajando recibos (€/año). |

Se excluyen siempre los emails `test*` y, salvo que marques "Incluir mi propia cuenta", los admins.

## Qué mirar (y qué hacer)
- **Embudo, "Apuntan algo"** bajo → el problema son los primeros minutos (alta, ejemplo, importar).
- **Retención de la semana 1** bajo → no hay motivo para volver: avisos de cobro, recordatorio de extracto, notificaciones push.
- **"En riesgo" crece** → son los que hay que recuperar (email o push "llevas X días sin…").
- **Entran cada** ~7 días es sano para finanzas personales. El objetivo es el hábito semanal, no el diario.

## Rendimiento
Medido en Postgres 16: 45 ms con 43 usuarios y unos 3,6 s con 3.000 usuarios y
210.000 registros. Por encima de unos 2.000 usuarios activos conviene precalcular
cada noche (vista materializada + `pg_cron`). El límite de Supabase es de 8 s por consulta.

## Privacidad
- Base legal: interés legítimo, con oposición en un clic (está en la política de privacidad).
- El usuario puede ver y descargar sus eventos en Tu cuenta → Todo (JSON).
- Al borrar la cuenta se borran también sus eventos.
