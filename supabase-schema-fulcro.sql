-- Palanca · Fulcro: registro de uso y límite diario de preguntas.
-- Ejecutar en Supabase: SQL Editor -> (vaciar el editor) -> pegar -> "Run".
-- Es seguro ejecutarlo más de una vez.
--
-- Cada pregunta a Fulcro deja una fila con los tokens consumidos: sirve para
-- (1) aplicar el límite diario por usuario en el servidor y (2) ver el coste real.
-- El usuario solo puede LEER e INSERTAR sus propias filas (no borrarlas ni
-- editarlas), así no puede "resetear" su contador.

create table if not exists public.fulcro_uso (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      text not null,
  modelo          text not null,
  tokens_entrada  int not null default 0,
  tokens_salida   int not null default 0,
  tokens_cache    int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists fulcro_uso_usuario_fecha_idx
  on public.fulcro_uso (usuario_id, created_at desc);

alter table public.fulcro_uso enable row level security;

drop policy if exists fulcro_uso_sel on public.fulcro_uso;
drop policy if exists fulcro_uso_ins on public.fulcro_uso;
create policy fulcro_uso_sel on public.fulcro_uso
  for select to authenticated using (usuario_id = auth.uid()::text);
create policy fulcro_uso_ins on public.fulcro_uso
  for insert to authenticated with check (usuario_id = auth.uid()::text);

-- ── v2 (2026-10-14): límite diario ATÓMICO y en hora de España ─────────────
-- Antes, varias preguntas lanzadas a la vez podían pasar el límite (se contaba
-- y luego se insertaba). Ahora el servidor RESERVA cada pregunta con un
-- bloqueo por usuario, contando el día en hora de Madrid. Los usuarios ya no
-- insertan filas directamente: solo vía estas funciones.

create or replace function public.fulcro_reservar(p_limite int, p_modelo text)
returns table (reserva_id uuid, usadas_hoy int)
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  v_desde timestamptz := date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
  v_usadas int;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('fulcro:' || v_uid));
  select count(*) into v_usadas from public.fulcro_uso u
   where u.usuario_id = v_uid and u.created_at >= v_desde;
  if coalesce(p_limite, 0) > 0 and v_usadas >= p_limite then
    return query select null::uuid, v_usadas;
    return;
  end if;
  insert into public.fulcro_uso (usuario_id, modelo)
  values (v_uid, left(coalesce(p_modelo, '?'), 60))
  returning public.fulcro_uso.id into v_id;
  return query select v_id, v_usadas + 1;
end $$;

create or replace function public.fulcro_registrar(p_id uuid, p_entrada int, p_salida int, p_cache int, p_modelo text)
returns void
language sql security definer set search_path = public as $$
  update public.fulcro_uso
     set tokens_entrada = greatest(coalesce(p_entrada, 0), 0),
         tokens_salida  = greatest(coalesce(p_salida, 0), 0),
         tokens_cache   = greatest(coalesce(p_cache, 0), 0),
         modelo         = left(coalesce(p_modelo, modelo), 60)
   where id = p_id and usuario_id = auth.uid()::text and tokens_salida = 0;
$$;

revoke all on function public.fulcro_reservar(int, text) from public, anon;
revoke all on function public.fulcro_registrar(uuid, int, int, int, text) from public, anon;
grant execute on function public.fulcro_reservar(int, text) to authenticated;
grant execute on function public.fulcro_registrar(uuid, int, int, int, text) to authenticated;

drop policy if exists fulcro_uso_ins on public.fulcro_uso;

-- Lectura de capturas (api/leer-capturas.js): registra su uso con modelo
-- "capturas:…" para su propio límite diario. Solo esas filas, solo las suyas.
drop policy if exists fulcro_uso_ins_capturas on public.fulcro_uso;
create policy fulcro_uso_ins_capturas on public.fulcro_uso
  for insert to authenticated
  with check (usuario_id = auth.uid()::text and modelo like 'capturas:%');
