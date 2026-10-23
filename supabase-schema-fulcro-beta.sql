-- Fulcro · cupo TOTAL por usuario para la beta (FULCRO_LIMITE_TOTAL en Vercel).
-- Igual que fulcro_reservar (v3) pero cuenta TODAS las preguntas del usuario,
-- no solo las de hoy. Las capturas no cuentan (tienen su propio tope).
create or replace function public.fulcro_reservar_total(p_limite int, p_modelo text)
returns table (reserva_id uuid, usadas_hoy int)
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  v_usadas int;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('fulcro:' || v_uid));
  select count(*) into v_usadas from public.fulcro_uso u
   where u.usuario_id = v_uid
     and coalesce(u.modelo, '') not like 'capturas:%';
  if coalesce(p_limite, 0) > 0 and v_usadas >= p_limite then
    return query select null::uuid, v_usadas;
    return;
  end if;
  insert into public.fulcro_uso (usuario_id, modelo)
  values (v_uid, left(coalesce(p_modelo, '?'), 60))
  returning public.fulcro_uso.id into v_id;
  return query select v_id, v_usadas + 1;
end $$;

revoke all on function public.fulcro_reservar_total(int, text) from public, anon;
grant execute on function public.fulcro_reservar_total(int, text) to authenticated;
