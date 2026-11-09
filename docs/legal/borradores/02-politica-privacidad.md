# Política de privacidad — BORRADOR PRELIMINAR (sustituye a la actual cuando se valide)

> ⚠️ **Borrador de trabajo, no es asesoramiento legal.** Refleja lo que hace el código a 09-11-2026 (ver la auditoría). Debe revisarlo un abogado.
> Referencias: RGPD arts. 13–14; LOPDGDD art. 11 (información por capas).
> **[PENDIENTE DE ERIC]** = falta el dato · **[⚖️ VALIDAR]** = decisión jurídica.

## Capa 1 (resumen breve, junto al formulario de alta)

| Concepto | Información |
|---|---|
| Responsable | [PENDIENTE DE ERIC: titular] |
| Finalidad | Prestarte el servicio de Palanca (organizar tus finanzas); con tu permiso, estadísticas de uso y recordatorios |
| Base jurídica | Ejecución del contrato (art. 6.1.b RGPD); consentimiento u oposición en lo opcional [⚖️ VALIDAR] |
| Destinatarios | Proveedores que nos ayudan a prestar el servicio (alojamiento, IA, email). Algunos están en EE. UU., con garantías |
| Derechos | Acceso, rectificación, supresión, portabilidad, oposición y limitación. Puedes descargar y borrar tus datos desde Tu cuenta |
| Más información | En esta política completa |

## Capa 2 (política completa)

### 1. Responsable

- **Titular:** [PENDIENTE DE ERIC], NIF [PENDIENTE DE ERIC], domicilio [PENDIENTE DE ERIC].
- **Contacto de privacidad:** [PENDIENTE DE ERIC: email].
- **Delegado de protección de datos (DPD):** [⚖️ VALIDAR si es obligatorio según el art. 37 RGPD y el art. 34 LOPDGDD; probablemente no, pero confirmar por el tratamiento a gran escala de datos económicos].

### 2. Qué datos tratamos

**a) Cuenta**
- Email y contraseña (la contraseña se guarda cifrada por nuestro proveedor de autenticación).
- Nombre (opcional).
- Año de nacimiento (opcional).
- Tu objetivo al registrarte.
- Día de cobro de la nómina (opcional).

**b) Datos financieros que introduces o importas**
- Ingresos, gastos e inversiones: importe, fecha, categoría y concepto.
- Saldo inicial y ajustes.
- Compromisos fijos (recibos, seguros, nómina).
- Presupuestos, objetivos, planificaciones y simulaciones.
- Nombres de tus bancos o plataformas.
- Alias de comercios.

Los **conceptos** pueden incluir nombres de otras personas (p. ej. «Bizum de Marta»): los tratamos solo para mostrártelos [⚖️ VALIDAR: datos de terceros].

**c) Uso del servicio**
- Qué tipo de acción usas y cuándo («abrió la app», «importó un extracto»), sin importes ni textos.
- Cuántas preguntas haces a Fulcro (fecha, modelo de IA y volumen), para aplicar límites.
- Qué emails te hemos enviado.

**d) Datos técnicos**
- Dirección IP, navegador y registros de acceso que generan automáticamente nuestros proveedores de alojamiento.
- El identificador de tu sesión, guardado en tu navegador.

**e) Suscripción** [cuando exista]
- Plan, fechas, importe y estado del pago.
- Los datos de la tarjeta los trata el proveedor de pagos [PENDIENTE DE ERIC]; Palanca no los guarda.

### 3. Para qué y con qué base

| Finalidad | Base jurídica [⚖️ VALIDAR] | Datos |
|---|---|---|
| Crear y mantener tu cuenta, guardar y calcular tus finanzas, mostrarte análisis y previsiones | Ejecución del contrato (6.1.b) | a, b, d |
| Fulcro (asistente con IA), importar capturas y reconocer columnas de un extracto | Ejecución del contrato al usar la función (6.1.b). [⚖️ VALIDAR si conviene consentimiento específico por la transferencia a EE. UU.] | Ver §5 |
| Seguridad, prevención del abuso y límites de uso | Interés legítimo (6.1.f) | c, d |
| Estadísticas internas de uso | [⚖️ VALIDAR: interés legítimo con oposición, o consentimiento si se guarda algo en tu dispositivo (art. 22.2 LSSI)] | c |
| Recordatorios del servicio por email (como mucho uno cada 3 días; sin importes) | [⚖️ VALIDAR: contrato o interés legítimo; baja en cada email] | Email, nombre, uso |
| Avisos de renovación de seguros | Consentimiento (lo activas tú en Tu cuenta) | Compromisos marcados como seguro |
| Comunicaciones comerciales | Consentimiento expreso separado [PENDIENTE DE ERIC: ¿habrá?] | Email |
| Facturación [cuando exista] | Obligación legal (6.1.c) | e |

**No** vendemos tus datos, **no** los usamos para publicidad y **no** hacemos perfiles para terceros. Las previsiones e *insights* de la app son cálculos automáticos para ti, sin efectos jurídicos ni decisiones que te afecten de forma significativa (art. 22 RGPD) [⚖️ VALIDAR].

### 4. Quién recibe tus datos (encargados del tratamiento)

| Proveedor | Para qué | Ubicación / garantías |
|---|---|---|
| Supabase | Base de datos y autenticación | [PENDIENTE DE ERIC: región del proyecto]. [⚖️ VALIDAR transferencias: SCC o Marco de Privacidad de Datos UE-EE. UU.] |
| Vercel | Alojamiento de la web y de las funciones del servidor | EE. UU./UE [PENDIENTE DE ERIC: región]. [⚖️ VALIDAR garantías] |
| Anthropic | IA de Fulcro, lectura de capturas y reconocimiento de columnas | EE. UU. [⚖️ VALIDAR garantías y retención según sus términos comerciales] |
| Resend | Envío de emails | [PENDIENTE DE ERIC: región]. [⚖️ VALIDAR garantías] |
| [Proveedor de pagos] | Cobros | [PENDIENTE DE ERIC] |

### 5. Inteligencia artificial: qué se envía y qué no

- **Fulcro**
  - Se envía:
    - un resumen calculado por Palanca (totales, medias, categorías, evolución, objetivos);
    - los detalles relacionados con tu pregunta (p. ej. lo gastado en una categoría o en un comercio por meses);
    - tu pregunta;
    - hasta 8 mensajes anteriores de la conversación.
  - **No** se envían tu email ni tu nombre, ni la lista completa de movimientos.
  - Es **seudónimo, no anónimo**: va asociado a tu sesión.
  - La conversación se guarda solo en tu navegador hasta que cierras la pestaña.
- **Importar con capturas:** se envían las imágenes que eliges. **Pueden contener tu nombre, IBAN o saldos: te recomendamos taparlos.** No las guardamos.
- **Importar un extracto (CSV/Excel):** se procesa en tu navegador. Solo si no reconocemos el formato, enviamos las **cabeceras y como mucho 3 filas de ejemplo** para identificar las columnas.
- Fulcro es una IA: ofrece **orientación educativa, no asesoramiento financiero** [⚖️ VALIDAR].
- [⚖️ VALIDAR: retención de los datos por Anthropic y no uso para entrenar modelos, según sus términos comerciales vigentes.]

### 6. Cuánto tiempo los conservamos

- **Mientras tengas la cuenta.** Si la borras, se eliminan de la base de datos al momento.
- Pueden permanecer en las **copias de seguridad** del proveedor hasta [PENDIENTE DE ERIC: plazo según el plan de Supabase] y en los registros técnicos hasta [PENDIENTE DE ERIC].
- **Cuentas inactivas:** [PENDIENTE DE ERIC: política, p. ej. aviso y borrado tras X meses sin uso].
- **Facturación:** el plazo que marque la ley [⚖️ VALIDAR: obligaciones fiscales y mercantiles].

### 7. Tus derechos

Acceso, rectificación, supresión, oposición, limitación y portabilidad. Desde **Tu cuenta** puedes:
- descargar todos tus datos (CSV y JSON);
- corregirlos en la propia app;
- borrar tu cuenta y todos tus datos;
- desactivar las estadísticas de uso, los recordatorios y los avisos de renovación.

Para todo lo demás, escribe a [PENDIENTE DE ERIC: email de privacidad]. Responderemos en un mes como máximo (art. 12.3 RGPD).

Puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).

### 8. Seguridad

- Cada usuario solo puede acceder a sus propios datos (control de acceso por filas en la base de datos).
- Conexiones cifradas (HTTPS).
- Las claves de los servicios de IA y de email solo están en el servidor.
- El administrador ve **recuentos** de uso, nunca tus importes ni tus movimientos.

### 9. Menores

Palanca no está dirigida a menores de [PENDIENTE DE ERIC: 14 o 18] años [⚖️ VALIDAR; art. 7 LOPDGDD; contratación de suscripciones].

### 10. Cambios

Avisaremos en la app de los cambios importantes. Versión [X], fecha [PENDIENTE].
