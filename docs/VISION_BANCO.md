# Visión: competencia y conexión con el banco

Investigación del 15-10-2026. Hay que reverificar precios y plazos antes de firmar nada.

## 1. Dónde estamos frente a la competencia

| App | Cómo entran los datos | Cómo gana dinero | Su punto débil (nuestra oportunidad) |
|---|---|---|---|
| **Fintonic** (líder en España, AISP n.º 6892 del BdE) | Conexión bancaria | Bróker de préstamos (10 entidades) | Empuja a endeudarte; opiniones que se quejan de publicidad y de desconexiones |
| **Monefy / Spendee / Wallet** | Manual (Wallet también con banco) | Suscripción | No aconsejan: solo apuntan |
| **Emma / Rocket Money** (UK/EE. UU.) | Banco | Premium + cancelar o negociar recibos | No operan en España en español |
| **Revolut / N26 analytics** | Solo su propio banco | Banco | No ven el resto de tus cuentas |

**Posicionamiento de Palanca:** no te vendemos préstamos. Te ayudamos a ahorrar e invertir (Fulcro, Plan de ahorro, negociar recibos). Hoy funciona sin dar acceso al banco: extracto o capturas. Esa privacidad es un argumento de venta frente a Fintonic.

## 2. Conexión bancaria: el camino

Base legal: PSD2 (RDL 19/2018). Leer cuentas es un **servicio de información sobre cuentas (AISP)**. Lo supervisa el **Banco de España**.

### Fase A — vía un agregador con licencia (lo realista, sin licencia propia)
- Palanca actúa como **agente o cliente** de un AISP que ya está registrado. Ellos firman con los bancos y gestionan la SCA.
- Candidatos para España:
  - **Enable Banking**: cobra por volumen, con mínimo mensual.
  - **Tink** (Visa).
  - **Salt Edge**.
  - **Arcopay** (antes Afterbanks), española.
  - **Unnax**, española.
- **GoCardless Bank Account Data (Nordigen) ya no acepta altas nuevas desde julio de 2025.** Queda descartado.
- Qué nos exigen a nosotros:
  - contrato y diligencia debida del agregador;
  - RGPD: EIPD (evaluación de impacto), registro de tratamientos, DPO recomendable, política de privacidad nueva;
  - seguridad básica demostrable.
- Coste estimado: de cero a unos cientos de euros al mes al principio. Viable cuando haya usuarios que paguen.

### Fase B — licencia AISP propia (cuando haya tracción)
- Registro en el Banco de España. **No exige capital inicial**, pero sí:
  - **seguro de responsabilidad civil profesional** (directrices EBA/GL/2017/08);
  - programa de actividades;
  - gobierno corporativo;
  - plan de seguridad y de incidentes;
  - empresa constituida en España.
- Requisitos técnicos:
  - certificados **eIDAS QWAC/QSealC**;
  - APIs Berlin Group / Redsys de los bancos españoles;
  - reporte de incidentes (DORA).

### Certificaciones ("ISO")
- La ley **no exige ISO 27001** para un AISP. Sí la piden en la práctica los agregadores, los bancos y los inversores.
- Ruta recomendada:
  1. Políticas de seguridad y controles mínimos (cifrado, MFA, logs, copias, gestión de accesos).
  2. **ISO 27001** cuando haya presupuesto. Unos 6–12 meses con consultora.
  3. **ENS** solo si se trabaja con la Administración.
  4. **SOC 2** solo si se va a EE. UU.
- **DORA** (desde enero de 2025) aplica a las entidades financieras. Si somos AISP, nos toca la gestión de riesgo TIC y de proveedores (Supabase, Vercel).

### Lo que viene: PSD3 / PSR
- Acuerdo político en noviembre de 2025. Textos finales en abril de 2026. Pendiente de publicación oficial. Aplicación prevista hacia 2027–2028.
- Cambios previstos:
  - **panel de permisos** obligatorio para el usuario;
  - probable **fin de la renovación del consentimiento cada 180 días**;
  - prohibición de obstáculos de los bancos al acceso.
- Efecto: la conexión bancaria será más estable y menos molesta. Buen momento para entrar en 2027.
- FIDA (datos de seguros, inversión y pensiones) sigue en negociación. Sería la siguiente ola.

## 3. Qué podemos hacer YA para estar listos (sin coste)
1. **Capa de "fuentes" en los datos.** Cada movimiento sabe de dónde vino: manual, extracto, captura o, en el futuro, banco. La importación ya deduplica, y el banco será "una importación automática diaria".
2. **Seguridad**:
   - revisar RLS en todas las tablas;
   - nada sensible en localStorage (ahora: el registro de ahorros negociados → moverlo a BD);
   - MFA opcional en Supabase.
3. **Privacidad**:
   - exportar y borrar la cuenta (derechos RGPD);
   - política de privacidad clara.
   Es requisito para cualquier agregador.
4. **Métricas de producto**: retención a 30 días y cuántos importan su año. Sin tracción, ningún agregador ni inversor se mueve.

**Hecho (15-10-2026):** exportar y borrar la cuenta (completo), ahorros en BD, política actualizada y panel de métricas (docs/METRICAS.md). Pendiente: MFA opcional y revisión de RLS de todas las tablas.

## 4. Orden propuesto
| Cuándo | Qué |
|---|---|
| Ahora | Lanzar; extracto y capturas como vía principal; medir |
| +1–3 meses | Exportar y borrar cuenta; ahorros en BD; política de privacidad; hablar con Enable Banking y Arcopay (demo y precio) |
| +3–6 meses | Piloto de conexión bancaria vía agregador (Premium); EIPD |
| 2027+ | Con tracción: licencia AISP propia + ISO 27001, coincidiendo con PSR |

## Fuentes
- Banco de España — entidades de información de cuentas: https://clientebancario.bde.es/pcb/es/menu-horizontal/podemosayudarte/entidades/guia_textual/tiposentidadessometidas/entidades-prestadoras-de-servicios-de-informacion-de-cuentas.html
- EBA — directrices sobre el seguro de responsabilidad civil profesional (PII) en PSD2: https://www.eba.europa.eu/documents/10180/1956339/Guidelines+on+PII+under+PSD2+%28EBA-GL-2017-08%29_ES.pdf/05c2ee38-c3e4-4fc7-936c-206a3e03738b
- Guía AISP (fuente comercial): https://crassula.io/es/guides/licenses/aisp/
- GoCardless cierra altas: https://actualbudget.org/docs/advanced/bank-sync/gocardless/
- Enable Banking frente a GoCardless: https://openbankingtracker.com/api-aggregators/enablebanking/vs/gocardless
- PSD3/PSR: https://www.arthurcox.com/insights/psd3-and-psr-final-compromise-texts-published/ · https://openbankingtracker.com/guides/psd3-psr-readiness
- Fintonic: https://elreferente.es/?p=18719 · https://www.publico.es/ahorro-inteligente/mejores-apps-empezar-ahorrar-2026.html
