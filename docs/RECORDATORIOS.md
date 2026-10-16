# Recordatorios (app y email)

## Qué hay
- **En la app (ya funciona):** tras 3 o más días sin apuntar, Inicio muestra "Llevas X días sin apuntar nada" y el botón "Ponerme al día".
- **Frases motivadoras: RETIRADAS** (15-10-2026, no convencieron). Están pendientes de rediseñar; se reactivan con `CON_FRASE` (ver PENDIENTES.md).
- **Frecuencia: PROVISIONAL**, pendiente de decidir con Eric.
- **Por email (preparado, APAGADO):** la función `api/recordatorios.js` se ejecuta una vez al día a las 17:00 UTC (`vercel.json`), es decir, a las 18:00 o 19:00 en España. Las reglas están en `src/lib/recordatorios.js`, con tests.

| Email | Cuándo | Asunto |
|---|---|---|
| `sin_empezar` | 2-6 días tras el alta sin apuntar nada (una vez) | Tu primer paso en Palanca (2 minutos) |
| `inactivo` | 3-6 días sin entrar (una vez por racha) | {Nombre}, dos minutos para ponerte al día |
| `te_echamos` | 14-21 días sin entrar (una vez por racha) | Tu dinero sigue aquí |
| `renovacion` | ~6 semanas antes (38–45 días) de renovar un seguro guardado en Fijos. **Solo si el cliente lo activa** en Tu cuenta («Avisarme antes de renovar un seguro»). Una vez por renovación | «{seguro}» se renueva el {fecha} |
| `prueba_termina` | 1-2 días antes de acabar la prueba Premium | Tu prueba de Premium termina el {fecha} |
| `invitacion_premium` | En Gratis, ≥8 días activos en el mes y ≥21 días de antigüedad, como mucho cada 60 días. Solo con `PREMIUM_ACTIVO=true` | {Nombre}, llevas N días cuidando tu dinero |

Reglas de convivencia:
- **Frecuencia:** como máximo **1 email cada 3 días** por persona y 2 por racha sin entrar; después, silencio.
- **Contenido:** sin importes ni datos financieros.
- **Pie (LSSI):** remitente identificado y **baja en un clic**. Hay enlace en cada email y cabecera `List-Unsubscribe` para Gmail y Apple Mail. Al pinchar la baja se abre una página que pide confirmar, para que los antivirus del correo no den de baja a nadie al revisar los enlaces.
- **Desde la app:** Tu cuenta → Recordatorios por email.
- **Base legal:** son clientes con cuenta y Palanca les escribe sobre su propio servicio (LSSI art. 21.2), con oposición sencilla en cada envío. Quien se da de baja no recibe nada más.

**Por qué 6 semanas y no 1 mes (decisión de Eric, 16-10-2026: email + aviso, solo si el cliente quiere):** para no renovar un seguro hay que avisar por escrito **al menos 1 mes antes** (Ley de Contrato de Seguro, art. 22). Un aviso justo a 1 mes llegaría tarde para eso; a las 6 semanas hay tiempo de comparar y de avisar. En la app, el aviso "Momento de negociar" sale desde 45 días antes hasta 14 (después entra el aviso normal de renovación). Preferencia: `perfiles.avisos_renovacion` (null = no ha decidido: aviso en la app con invitación a activarlo; true = app + email; false = nada). SQL: `supabase-schema-renovaciones.sql`.

## Medición (panel de métricas)
- Enviados, **% que vuelve en 48 h**, clics y bajas en los últimos 30 días, y recuento por tipo.
- Los botones llevan `?desde=email_<tipo>`. La app lo cuenta como evento `clic_email` y limpia la URL.

## Cómo activarlo (cuando se lance)
1. **Dominio propio** (unos 10–15 €/año, por ejemplo palanca.app). Es imprescindible para que los emails no acaben en spam: no se puede enviar "como" @gmail.com ni desde vercel.app.
2. **Resend** (resend.com, gratis hasta 3.000 emails/mes): crear cuenta → Domains → añadir el dominio y poner los registros DNS que indica → API Keys → crear clave.
3. **Supabase** → Project Settings → API → copiar la clave **service_role** (es secreta: solo va a Vercel, nunca a la app).
4. **Vercel** → Settings → Environment Variables, en **Production**:
   - `RECORDATORIOS_ACTIVOS` = `true`
   - `CRON_SECRET` = una frase larga aleatoria
   - `SUPABASE_SERVICE_ROLE_KEY` = la clave del paso 3
   - `RESEND_API_KEY` = la clave del paso 2
   - `RECORDATORIOS_REMITENTE` = `Palanca <hola@tudominio>`
   - `RECORDATORIOS_SECRETO` = otra frase larga aleatoria (firma los enlaces de baja)
   - `APP_URL` = la dirección de la app
   - **Para probar:** `RECORDATORIOS_SOLO_A` = tu email. Solo te llegarán a ti; cuando lo veas bien, borra esta variable.
5. **Comprobar sin enviar nada:**
   ```
   curl -H "Authorization: Bearer <CRON_SECRET>" "https://<app>/api/recordatorios?simular=1"
   ```
   Devuelve a quién se escribiría hoy y con qué asunto.

Vercel solo ejecuta tareas programadas en **producción**, así que en `develop` no se envía nunca nada.

## Siguiente
- **Notificaciones push en el móvil.** En iPhone solo funcionan si la app está instalada en la pantalla de inicio (iOS 16.4 o posterior). Hace falta: claves VAPID, guardar la suscripción de cada dispositivo y enviar desde esta misma función. Las mismas reglas valen para ambos canales.
- **Probar variantes de asunto (A/B)** cuando haya volumen.
