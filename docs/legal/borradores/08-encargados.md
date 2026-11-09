# Proveedores, encargados del tratamiento y registro de actividades — BORRADOR INTERNO

> Documento interno (no se publica tal cual). Base para la política de privacidad, el registro del art. 30 RGPD y la gestión de los contratos del art. 28.
> Actualizarlo **cada vez** que se añada o quite un proveedor.

## 1. Encargados del tratamiento

| Proveedor | Rol | Datos | Ubicación | Contrato del art. 28 (DPA) | Transferencia internacional | Estado |
|---|---|---|---|---|---|---|
| Supabase | Encargado (BD, Auth) | Todos los datos de la cuenta y financieros; logs | [PENDIENTE DE ERIC: región] | [PENDIENTE: ¿aceptado en el panel?] | [⚖️ VALIDAR: SCC o DPF] | Actual |
| Vercel | Encargado (alojamiento, funciones, cron) | Peticiones, IP, cuerpo de las llamadas a /api en tránsito, logs | [PENDIENTE: región de funciones] | [PENDIENTE] | [⚖️ VALIDAR] | Actual |
| Anthropic | Encargado (IA) | Resumen financiero seudónimo + pregunta + historial (Fulcro); imágenes (capturas); cabeceras + 3 filas (importador) | EE. UU. | [PENDIENTE: términos comerciales / DPA] | [⚖️ VALIDAR] | Actual |
| Resend | Encargado (email) | Email, nombre, contenido del email | [PENDIENTE] | [PENDIENTE] | [⚖️ VALIDAR] | Actual (dormido) |
| [Pasarela de pagos] | Encargado o responsable independiente (según el modelo) | Email, pago | [PENDIENTE] | [PENDIENTE] | [⚖️] | Previsto |
| [Agregador Open Banking] | [⚖️ VALIDAR rol] | Movimientos bancarios | [PENDIENTE] | [PENDIENTE] | [⚖️] | Previsto |
| GitHub | No trata datos de usuarios | — | — | — | — | Actual (solo código) |

## 2. Registro de actividades de tratamiento (art. 30) — estructura

Por cada actividad: nombre · finalidad · base jurídica · categorías de interesados · categorías de datos · destinatarios · transferencias · plazo de supresión · medidas de seguridad.

**Actividades:**
1. **Gestión de cuentas.**
2. **Prestación del servicio de finanzas personales**, con datos de terceros en los conceptos.
3. **Asistente con IA (Fulcro).**
4. **Importación de movimientos:** CSV en el navegador; capturas e importador con IA.
5. **Estadísticas internas de uso.**
6. **Recordatorios y avisos por email.**
7. **Suscripciones y facturación** (futuro).
8. **Atención de derechos y seguridad.**

**Medidas de seguridad comunes:**
- RLS por usuario.
- HTTPS.
- Secretos solo en el servidor.
- Funciones con permisos elevados restringidas.
- Mínimo acceso del administrador (solo recuentos).
- Borrado completo de la cuenta.
- 🔧 Cabeceras de seguridad, purga local al cerrar sesión y procedimiento de brechas.
