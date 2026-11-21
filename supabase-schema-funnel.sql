-- ============================================================================
-- Palanca — FUNNEL Y RETENCIÓN para el panel de fundador (ADITIVO: no cambia
-- ninguna tabla ni ninguna política; solo crea una función).
--
-- Pegar TAL CUAL en Supabase → SQL Editor (vacía el editor antes) → Run.
-- Se puede ejecutar varias veces. Para quitarlo:  drop function public.palanca_funnel(boolean);
--
-- Mide lo que hace la gente REGISTRANDO movimientos (por cuándo los registra,
-- movimientos.created_at; no por la fecha que pone al gasto). Solo recuentos y
-- fechas: nunca importes, conceptos, categorías ni notas.
--
-- Seguridad: es SECURITY DEFINER (puede leer auth.users y contar movimientos
-- de todos) pero lo primero que hace es comprobar public.soy_admin() en el
-- servidor; a cualquier otro usuario le da error. No se puede llamar sin sesión.
-- Requiere supabase-schema-metricas.sql (soy_admin y la tabla admins).
--
-- Definiciones (día = fecha en hora de Madrid; día 0 = día del alta):
--   registro      cuenta creada (sin test* y, salvo que se pida, sin admins)
--   confirmado    email confirmado (si la confirmación está desactivada, todos)
--   primer_mov    ha registrado al menos 1 movimiento
--   activacion    ≥ 5 movimientos registrados en sus 7 primeros días (día 0–6)
--   dN            registra algún movimiento el día N o después; solo cuenta
--                 entre los que llevan al menos N días de alta («elegibles»)
-- Los ajustes de saldo (categoría «Ajuste», p. ej. el saldo inicial) no cuentan.
-- ============================================================================

create or replace function public.palanca_funnel(p_incluir_admin boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  r jsonb;
begin
  if not public.soy_admin() then
    raise exception 'Solo administradores';
  end if;

  with
  usuarios as (
    select u.id::text as uid,
           lower(coalesce(u.email, '')) as email,
           (u.created_at at time zone 'Europe/Madrid')::date as alta,
           u.email_confirmed_at is not null as confirmado
      from auth.users u
     where lower(coalesce(u.email, '')) not like 'test%'
       and (p_incluir_admin or lower(coalesce(u.email, '')) not in (select email from public.admins))
  ),
  movs as (
    select m.usuario_id as uid, (m.created_at at time zone 'Europe/Madrid')::date as dia
      from public.movimientos m
      join usuarios u on u.uid = m.usuario_id
     where not exists (select 1 from public.categorias c where c.id = m.categoria_id and c.nombre = 'Ajuste')
  ),
  pu as (
    select u.uid, u.email, u.alta, u.confirmado,
           count(m.dia) as movs,
           count(m.dia) filter (where m.dia <= u.alta + 6) as movs7,
           max(m.dia) as ultimo,
           bool_or(m.dia >= u.alta + 3) is true as r3,
           bool_or(m.dia >= u.alta + 7) is true as r7,
           bool_or(m.dia >= u.alta + 14) is true as r14,
           bool_or(m.dia >= u.alta + 30) is true as r30
      from usuarios u
      left join movs m on m.uid = u.uid
     group by u.uid, u.email, u.alta, u.confirmado
  )
  select jsonb_build_object(
    'generado', now(),
    'hoy', v_hoy,
    'embudo', jsonb_build_object(
      'registro', (select count(*) from pu),
      'confirmado', (select count(*) from pu where confirmado),
      'primer_mov', (select count(*) from pu where movs >= 1),
      'activacion', (select count(*) from pu where movs7 >= 5),
      'activacion_elegibles', (select count(*) from pu where alta <= v_hoy - 7),
      'd3', (select count(*) from pu where r3 and alta <= v_hoy - 3),
      'd3_elegibles', (select count(*) from pu where alta <= v_hoy - 3),
      'd7', (select count(*) from pu where r7 and alta <= v_hoy - 7),
      'd7_elegibles', (select count(*) from pu where alta <= v_hoy - 7),
      'd14', (select count(*) from pu where r14 and alta <= v_hoy - 14),
      'd14_elegibles', (select count(*) from pu where alta <= v_hoy - 14),
      'd30', (select count(*) from pu where r30 and alta <= v_hoy - 30),
      'd30_elegibles', (select count(*) from pu where alta <= v_hoy - 30)
    ),
    'cohortes', (select coalesce(jsonb_agg(jsonb_build_object(
                   'semana', semana, 'n', n,
                   'd3', d3, 'd3_elegibles', e3, 'd7', d7, 'd7_elegibles', e7,
                   'd14', d14, 'd14_elegibles', e14, 'd30', d30, 'd30_elegibles', e30
                 ) order by semana desc), '[]'::jsonb)
                 from (
                   select date_trunc('week', alta)::date as semana, count(*) as n,
                          count(*) filter (where r3 and alta <= v_hoy - 3) d3, count(*) filter (where alta <= v_hoy - 3) e3,
                          count(*) filter (where r7 and alta <= v_hoy - 7) d7, count(*) filter (where alta <= v_hoy - 7) e7,
                          count(*) filter (where r14 and alta <= v_hoy - 14) d14, count(*) filter (where alta <= v_hoy - 14) e14,
                          count(*) filter (where r30 and alta <= v_hoy - 30) d30, count(*) filter (where alta <= v_hoy - 30) e30
                     from pu
                    where alta > v_hoy - 84
                    group by 1
                 ) c),
    'usuarios', (select coalesce(jsonb_agg(jsonb_build_object(
                   'email', email, 'alta', alta, 'movimientos', movs, 'ultimo_movimiento', ultimo,
                   'dias_sin_actividad', v_hoy - coalesce(ultimo, alta)
                 ) order by coalesce(ultimo, alta) desc, alta desc), '[]'::jsonb)
                 from (select * from pu order by coalesce(ultimo, alta) desc limit 500) l)
  ) into r;
  return r;
end;
$$;

revoke all on function public.palanca_funnel(boolean) from public, anon;
grant execute on function public.palanca_funnel(boolean) to authenticated;
