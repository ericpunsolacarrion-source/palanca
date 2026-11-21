# Conector de Palanca para Claude (MCP)

Permite que cualquier usuario conecte **su** Claude con **su** cuenta de Palanca
y le pida, desde el chat: resúmenes, buscar movimientos, importar un Excel o una
lista, cuadrar el saldo, deshacer una importación o borrar movimientos.

## Piezas

| Pieza | Dónde | Qué hace |
|---|---|---|
| Servidor MCP | `api/mcp.js` (HTTP) + `api/_mcpNucleo.js` (lógica) | Transporte HTTP sin estado (POST → JSON). Sin token válido: 401 + `WWW-Authenticate: Bearer resource_metadata=…`. |
| Metadatos del recurso | `api/oauth-recurso.js`, servido en `/.well-known/oauth-protected-resource` (`vercel.json`) | RFC 9728: dice que el servidor de autorización es Supabase Auth (`<proyecto>/auth/v1`). |
| Inicio de sesión | **Servidor OAuth 2.1 de Supabase Auth** (registro dinámico de clientes + PKCE) | Claude se registra solo, el usuario entra con su cuenta y Supabase emite un token **de ese usuario**. |
| Pantalla de permiso | `src/components/ConsentimientoClaude.jsx` en `/oauth/consent` (+ `src/lib/oauthClaude.js`) | «¿Conectar Claude con tu Palanca?» → Permitir / No permitir. Si no hay sesión, primero el acceso normal. |
| Motor | `src/servidor/motorServidor.js` → `api/_motor.js` (**generado**: `npm run motor:api`; un test avisa si queda desfasado) | Las mismas reglas que la app (bolsas, totales, importador, plantilla). |

## Seguridad
- Nunca la service key: cada consulta usa el token del usuario → **RLS** (`usuario_id = auth.uid()`).
- Toda escritura en dos tiempos: sin `confirmar` devuelve vista previa; con `confirmar: true` la hace.
- Borrar filtra además por `usuario_id` y solo lo que el usuario ve.
- Errores al cliente sin detalles internos.
- El usuario quita el acceso desde los conectores de Claude.

## Herramientas
`resumen`, `listar_movimientos`, `listar_categorias` (solo lectura) ·
`importar_movimientos` (formato de la plantilla, sin duplicar) · `cuadrar_saldo`
(ajuste visible) · `deshacer_importacion` · `borrar_movimientos` (destructivas).

## Configuración (una vez, en Supabase)
Authentication → **OAuth Server**: activarlo, **Authorization path** = `/oauth/consent`
(con el Site URL = `https://palanca-zeta.vercel.app`) y **permitir el registro
dinámico de clientes** (dynamic client registration).

## Para el usuario
En la app: *Tu cuenta → Conecta tu asistente de IA* (pasos y dirección para copiar;
«muy pronto» mientras `/api/conector-estado` diga que no está activado).

Claude → Configuración → Conectores → *Añadir conector personalizado* →
URL `https://palanca-zeta.vercel.app/api/mcp` → Conectar → entrar en Palanca →
Permitir.

## Pruebas
`api/mcp.test.js` (protocolo, RLS simulada, importar/deshacer/cuadrar),
`api/mcpHttp.test.js` (401, metadatos, motor al día), e2e `tests/e2e/conector.mjs`
(pantalla de permiso). Probado también en solo lectura contra la cuenta real de Eric.
