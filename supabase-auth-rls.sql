-- ============================================================================
-- Palanca — PASO 4: Row Level Security (aislamiento de datos por usuario Auth)
--
-- Pegar TAL CUAL en Supabase → SQL Editor y ejecutar (vacía el editor antes).
-- Es IDEMPOTENTE: se puede volver a ejecutar sin problema.
--
-- QUÉ HACE:
--  1) Añade perfiles.anio_nacimiento (si falta).
--  2) Crea la función borrar_mi_cuenta() (derecho de supresión).
--  3) Activa RLS en TODAS las tablas: cada usuario solo lee/escribe SUS filas
--     (usuario_id = auth.uid()). Los accesos sin login (ID antiguo) quedan
--     bloqueados desde la app; los datos antiguos siguen en la BD.
--
-- ROLLBACK (si algo fallara, para volver atrás): ver el bloque comentado al
-- final de este archivo.
-- ============================================================================

-- 1) Columna año de nacimiento -----------------------------------------------
alter table public.perfiles add column if not exists anio_nacimiento int;

-- 2) Borrado de la propia cuenta y todos sus datos ---------------------------
create or replace function public.borrar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid text := auth.uid()::text;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;
  delete from public.movimientos          where usuario_id = uid;
  delete from public.presupuestos         where usuario_id = uid;
  delete from public.planificaciones      where usuario_id = uid;
  delete from public.objetivos_ahorro     where usuario_id = uid;
  delete from public.simulaciones_guardadas where usuario_id = uid;
  delete from public.fuentes              where usuario_id = uid;
  delete from public.categorias           where usuario_id = uid;
  delete from public.perfiles             where usuario_id = uid;
  delete from auth.users                  where id = auth.uid();
end;
$$;

grant execute on function public.borrar_mi_cuenta() to authenticated;

-- 3) RLS + políticas en todas las tablas -------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'movimientos','categorias','fuentes','perfiles',
    'presupuestos','planificaciones','objetivos_ahorro','simulaciones_guardadas'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists palanca_sel on public.%I;', t);
    execute format('drop policy if exists palanca_ins on public.%I;', t);
    execute format('drop policy if exists palanca_upd on public.%I;', t);
    execute format('drop policy if exists palanca_del on public.%I;', t);
    execute format(
      'create policy palanca_sel on public.%I for select to authenticated using (usuario_id = auth.uid()::text);', t);
    execute format(
      'create policy palanca_ins on public.%I for insert to authenticated with check (usuario_id = auth.uid()::text);', t);
    execute format(
      'create policy palanca_upd on public.%I for update to authenticated using (usuario_id = auth.uid()::text) with check (usuario_id = auth.uid()::text);', t);
    execute format(
      'create policy palanca_del on public.%I for delete to authenticated using (usuario_id = auth.uid()::text);', t);
  end loop;
end $$;

-- ============================================================================
-- ROLLBACK (NO ejecutar salvo que quieras deshacer RLS):
--
-- do $$
-- declare t text;
-- begin
--   foreach t in array array[
--     'movimientos','categorias','fuentes','perfiles',
--     'presupuestos','planificaciones','objetivos_ahorro','simulaciones_guardadas'
--   ]
--   loop
--     execute format('alter table public.%I disable row level security;', t);
--   end loop;
-- end $$;
-- ============================================================================
