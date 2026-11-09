-- AUDITORÍA DE SEGURIDAD (SOLO LECTURA: no crea, no cambia y no borra nada).
-- Ejecutar primero en «palanca dev» y después en «palanca» (producción).
-- Supabase → SQL Editor → vaciar el editor → pegar → Run.
-- Resultado esperado: SIN FILAS. Cada fila que salga es un problema a corregir.
-- Ver docs/legal/AUDITORIA-LEGAL-2026-11.md §B (R1).

with tablas as (
  select c.relname as tabla, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
),
politicas as (
  select tablename as tabla, policyname as politica, cmd, roles::text as roles,
         coalesce(qual, '') as usando, coalesce(with_check, '') as comprobando
    from pg_policies where schemaname = 'public'
)
-- 1) Tablas SIN Row Level Security (cualquiera con la clave pública podría leerlas)
select '1. Tabla sin RLS' as problema, tabla as donde, '' as detalle
  from tablas where not rls
union all
-- 2) Políticas abiertas a todo el mundo: «using (true)» / «with check (true)»
--    (las «Acceso abierto fase 1» de los primeros SQL)
select '2. Política abierta', tabla || ' · ' || politica, cmd || ' · ' || roles
  from politicas
 where usando in ('true', '(true)') or comprobando in ('true', '(true)')
union all
-- 3) Políticas para «anon» o «public» (usuarios SIN sesión)
select '3. Política para usuarios sin sesión', tabla || ' · ' || politica, cmd || ' · ' || roles
  from politicas
 where roles like '%anon%' or roles like '%public%'
union all
-- 4) Políticas de usuario que NO filtran por auth.uid() (posible acceso a filas ajenas)
select '4. Política sin filtro por usuario', tabla || ' · ' || politica, cmd || ' · using: ' || left(usando, 80)
  from politicas
 where usando <> '' and usando not like '%auth.uid()%'
   and comprobando not like '%auth.uid()%'
union all
-- 5) Funciones con permisos elevados (security definer) que puede ejecutar «anon»
select '5. Función elevada ejecutable sin sesión', p.proname, ''
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
   and has_function_privilege('anon', p.oid, 'execute')
order by 1, 2;

-- Para ver TODAS las políticas (informativo, no es un problema en sí):
-- select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2;
