# Migración a Supabase Auth (seguridad real)

Estado: **plan listo, NO activado.** Requiere una sesión conjunta porque toca
el panel de Supabase y afecta a los usuarios existentes. Ejecutarlo a medias
deja sin acceso a las cuentas actuales, por eso no se ha activado en caliente.

## Por qué no está hecho ya

Hoy el aislamiento de datos se basa solo en un `usuario_id` de texto guardado
en localStorage, con RLS abierta (`using (true)`). Cualquiera que conozca el ID
de otro accede a sus datos. La solución es Supabase Auth + RLS por `auth.uid()`,
pero ese cambio:

1. Necesita configurar el proveedor de email en el **panel** (no vía SQL/API).
2. Al endurecer las RLS, las filas actuales (con `usuario_id` de texto) dejan de
   ser visibles hasta vincularlas a una cuenta Auth real.

Las cuentas reales actuales a preservar: `eric`, `Eric`, `ines` (+ su email en
`perfiles.email` cuando lo dejen).

## Estrategia (no destructiva)

Añadir una columna `auth_uid uuid` a cada tabla, **sin borrar** `usuario_id`.
Durante una ventana de migración, cada usuario real crea su cuenta y se vincula
su `usuario_id` de texto a su `auth.uid()`. Cuando todos estén migrados, se
endurecen las RLS y se puede retirar `usuario_id`.

## Paso a paso (para la sesión conjunta)

### 1. Panel de Supabase
- Authentication → Providers → **Email**: activar.
- Para pruebas rápidas: desactivar "Confirm email" (o configurar SMTP para
  producción real).
- Authentication → URL Configuration: añadir `https://palanca-zeta.vercel.app`.

### 2. Esquema (SQL, en un editor limpio)
```sql
alter table perfiles              add column auth_uid uuid;
alter table movimientos           add column auth_uid uuid;
alter table categorias            add column auth_uid uuid;
alter table fuentes               add column auth_uid uuid;
alter table presupuestos          add column auth_uid uuid;
alter table simulaciones_guardadas add column auth_uid uuid;
```

### 3. Código (cambios principales)
- `supabaseClient`: usar `supabase.auth` (signUp / signInWithPassword / getSession
  / onAuthStateChange).
- Sustituir `PantallaId` por una pantalla de **registro / inicio de sesión**
  (email + contraseña). El onboarding sigue igual tras crear cuenta.
- `useUsuarioId` → `useSesion`: expone `session.user.id` (el `auth_uid`).
- En TODAS las escrituras, guardar `auth_uid: session.user.id` además (o en vez)
  de `usuario_id`. En las lecturas, filtrar por `auth_uid`.

### 4. Vincular datos existentes (una vez por usuario real)
Cada usuario real inicia sesión con su nuevo email/contraseña; se obtiene su
`auth.uid()` y se ejecuta (sustituyendo los valores):
```sql
-- Ejemplo: vincular el usuario de texto 'eric' a su nueva cuenta Auth
update perfiles               set auth_uid = '<UID>' where usuario_id = 'eric';
update movimientos            set auth_uid = '<UID>' where usuario_id = 'eric';
update categorias             set auth_uid = '<UID>' where usuario_id = 'eric';
update fuentes                set auth_uid = '<UID>' where usuario_id = 'eric';
update presupuestos           set auth_uid = '<UID>' where usuario_id = 'eric';
update simulaciones_guardadas set auth_uid = '<UID>' where usuario_id = 'eric';
```

### 5. Endurecer las RLS (cuando todos estén migrados)
```sql
-- Repetir el patrón para cada tabla:
drop policy "Acceso abierto fase 1" on movimientos;
create policy "solo dueño" on movimientos
  for all using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());
-- ...idem en perfiles, categorias, fuentes, presupuestos, simulaciones_guardadas
```

### 6. Limpieza final (opcional, cuando esté estable)
- `alter table ... drop column usuario_id;` en cada tabla.
- Quitar `useUsuarioId`/localStorage del ID.

## Rollback
Mientras no se ejecute el paso 5 (endurecer RLS), todo es reversible: la app
sigue funcionando con el modelo actual. El punto de no retorno es el paso 5.

## Recomendación
Hacer los pasos 1–4 en una sesión, verificar con una cuenta de prueba que ve
solo sus datos, migrar las cuentas reales, y solo entonces ejecutar el paso 5.
