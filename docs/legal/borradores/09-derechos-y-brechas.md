# Procedimiento de derechos de los interesados y de brechas de seguridad — BORRADOR INTERNO

> Borrador de trabajo [⚖️ VALIDAR]. Referencias: RGPD arts. 12–22 (derechos) y 33–34 (brechas); LOPDGDD arts. 12–18.

## 1. Derechos: cómo se atienden

| Derecho | Autoservicio en la app (existe hoy) | Si llega por email a [PENDIENTE DE ERIC: email de privacidad] |
|---|---|---|
| Acceso | Ve todo en la app; Tu cuenta → Tus datos → «Todo (JSON)» | Enviar el JSON + la información del art. 15 (fines, destinatarios, plazos, origen, derechos) |
| Rectificación | Editar movimientos, nombre y año | Corregir en un mes |
| Supresión | Tu cuenta → Borrar cuenta (borra todas las tablas y el usuario de Auth) | Verificar la identidad (que escriba desde el email de la cuenta). Borrado con `borrar_mi_cuenta` o desde el panel de Supabase. ⚖️ Conservar solo lo que obligue la ley (facturas) |
| Portabilidad | CSV y JSON | Igual |
| Oposición | Interruptores: analítica, recordatorios, avisos de renovación | Aplicar el interruptor o excluir |
| Limitación | — | Marcar la cuenta [🔧 sin mecanismo hoy] |
| Retirar el consentimiento | Interruptores | Igual |

**Plazos y reglas:**
- Plazo de respuesta: **un mes**, ampliable dos meses más en casos complejos, avisando (art. 12.3).
- Es **gratuito**.
- Registrar cada solicitud: fecha, derecho, respuesta y fecha de respuesta [🔧 hoja interna].
- **Identidad:** el email de la cuenta es el canal de verificación; no pedir documentos innecesarios.

## 2. Brechas de seguridad (borrador)

1. **Detectar y contener**:
   - revocar claves;
   - cerrar el acceso;
   - revisar `supabase-auditoria-seguridad.sql`, los logs de Supabase y los de Vercel.
2. **Evaluar**: qué datos, cuántos usuarios y qué riesgo (los datos financieros detallados apuntan a riesgo alto).
3. **Notificar a la AEPD en 72 h** desde que se conoce, salvo que sea improbable que suponga un riesgo (art. 33). Sede electrónica de la AEPD.
4. **Comunicar a los afectados** sin dilación si hay alto riesgo (art. 34), con lenguaje claro y medidas recomendadas.
5. **Documentar** toda brecha, también las no notificadas (art. 33.5) [🔧 registro interno].
6. **Revisión posterior** y medidas para que no se repita.

**Contactos:** responsable [PENDIENTE DE ERIC]; asesor legal [PENDIENTE DE ERIC]; soporte de Supabase, Vercel, Anthropic y Resend.
