# Política de cookies y almacenamiento local — BORRADOR PRELIMINAR

> ⚠️ **Borrador, no es asesoramiento legal.** Referencia: art. 22.2 LSSI y la Guía sobre el uso de las cookies de la AEPD.
> El art. 22.2 no se limita a las cookies: incluye `localStorage` y `sessionStorage`.

## Recomendación técnica (para decidir, no implementar todavía)

**Inventario real**, comprobado en el código a 09-11-2026:

| Tecnología | Clave o ejemplo | Para qué | ¿Estrictamente necesaria? |
|---|---|---|---|
| Cookies | **Ninguna propia.** Ni cookies de terceros, píxeles ni scripts externos | — | — |
| `localStorage` | `sb-<proyecto>-auth-token` (Supabase) | Mantener la sesión iniciada | **Sí** |
| `localStorage` | `palanca_ocultar_importes`, `palanca_diseno`, `palanca_base_vista`, `palanca_base_ritmo`, `palanca_tour_visto_*`, `palanca_avisos_*`, `palanca_pildoras_*`, `palanca_demo_fuera_*`, `palanca_hitos_*`, `palanca_ya_entro` | Preferencias y estado de la interfaz pedidos por el usuario | **Sí** (personalización pedida por el usuario; criterio AEPD a validar ⚖️) |
| `localStorage` | `palanca_presu_cat_*`, `palanca_periodo_*`, `palanca_saldo_*`, `palanca_recurrentes_*`, `palanca_gastos_rapidos_*`, `palanca_escenarios_if_*`, `palanca_objetivo_tipo_*`, `palanca_comercios_*`, `palanca_importaciones_*`, `palanca_ahorros_negociados_*`, `palanca_susc_descartadas_*` | Guardar **tus propios datos** cuando la tabla aún no existe, y poder deshacer una importación | **Sí** (parte del servicio) |
| `localStorage` | `palanca_ultima_visita` | **Contar visitas para las estadísticas internas** | **No** → requiere consentimiento o eliminarse ⚖️ |
| `sessionStorage` | `palanca_fulcro_conversacion_*` | Conversación con Fulcro mientras la pestaña esté abierta | **Sí** |
| Service Worker y caché (PWA) | Archivos de la app y logos | Funcionar sin conexión y más rápido | **Sí** |
| `localStorage` | `palanca_metricas` | Panel del administrador | Sí (solo administrador) |

**Conclusión:**
- Hoy, lo único no necesario es `palanca_ultima_visita` (analítica).
- **Si se elimina**, contando las visitas en el servidor, **no haría falta banner de cookies**. Bastaría esta política informativa, accesible desde el pie y desde Tu cuenta [⚖️ VALIDAR].
- **Si en el futuro** se añade analítica de terceros, píxeles o publicidad, entonces sí: banner con «Aceptar» y «Rechazar» al mismo nivel, sin cargar nada antes de aceptar, y opción de retirar el consentimiento.

## Texto propuesto (borrador)

Palanca **no usa cookies publicitarias ni de terceros**.

Para funcionar, guarda en tu navegador:
1. el identificador de tu sesión;
2. tus preferencias de pantalla;
3. algunos datos tuyos mientras se sincronizan;
4. la conversación con Fulcro hasta que cierras la pestaña.

Es imprescindible para el servicio que pides, por eso no te pedimos permiso.

Al cerrar sesión borramos de este dispositivo tus datos guardados [🔧 pendiente de implementar]. Puedes borrarlo todo desde la configuración de tu navegador.

[Lista de la tabla anterior en formato legible.] Última actualización: [PENDIENTE].
