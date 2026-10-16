-- Avisos de renovación de seguros (por email y en la app), SOLO si el cliente
-- lo activa en Tu cuenta. Ejecutar en Supabase (proyecto palanca):
-- SQL Editor -> vaciar el editor -> pegar -> Run. Se puede ejecutar más de una vez.

-- 1) Preferencia del cliente: null = aún no ha decidido, true = sí, false = no.
alter table public.perfiles add column if not exists avisos_renovacion boolean;

-- 2) Los candidatos a recordatorio llevan ahora sus próximas renovaciones.
create or replace function public.recordatorios_candidatos()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  with
  hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  act as (
    select usuario_id as uid, (created_at at time zone 'Europe/Madrid')::date as dia from public.eventos
    union
    select usuario_id, (created_at at time zone 'Europe/Madrid')::date from public.movimientos
    union
    select usuario_id, (created_at at time zone 'Europe/Madrid')::date from public.fulcro_uso
  ),
  act_u as (
    select uid, max(dia) as ultima, count(*) filter (where dia > (select d from hoy) - 30) as dias30
      from act group by uid
  ),
  movs_u as (
    select m.usuario_id as uid, count(*) as movs
      from public.movimientos m
     where not exists (select 1 from public.categorias c where c.id = m.categoria_id and c.nombre = 'Ajuste')
     group by m.usuario_id
  ),
  -- Renovaciones de seguros guardados en Fijos (semestrales o anuales, con día):
  -- la próxima fecha de cada uno en los próximos 13 meses.
  ren as (
    select r.usuario_id as uid, r.nombre, min(x.f) as fecha
      from public.recurrentes r
      cross join lateral generate_series(0, 13) k
      cross join lateral (select (date_trunc('month', (select d from hoy)) + make_interval(months => k))::date as mes) g
      cross join lateral (select (g.mes + (least(r.dia_mes, extract(day from (g.mes + interval '1 month - 1 day'))::int) - 1))::date as f) x
     where r.activo and r.tipo = 'gasto'
       and r.periodo_meses >= 6 and r.dia_mes is not null and r.mes_inicio is not null
       and mod(extract(month from g.mes)::int - r.mes_inicio + 12, r.periodo_meses) = 0
       and x.f >= (select d from hoy)
       and (lower(coalesce(r.categoria_nombre, '')) like '%seguro%'
            or lower(r.nombre) ~ 'seguro|mapfre|mutua|allianz|axa|generali|linea directa|línea directa|zurich|reale|ocaso|santalucia|pelayo|catalana|fiatc|liberty|verti|qualitas|sanitas|adeslas|dkv|asisa|direct seguros|regal')
     group by r.usuario_id, r.id, r.nombre
  ),
  ren_u as (
    select uid, jsonb_agg(jsonb_build_object('nombre', nombre, 'fecha', fecha) order by fecha) as lista
      from ren where fecha <= (select d from hoy) + 60
     group by uid
  ),
  env_u as (
    select usuario_id as uid, max(ult) as ultimo, jsonb_object_agg(tipo, ult) as por_tipo
      from (select usuario_id, tipo, max(created_at) as ult
              from public.recordatorios_enviados group by usuario_id, tipo) z
     group by usuario_id
  )
  select jsonb_build_object(
           'uid', u.id::text,
           'email', u.email,
           'nombre', p.nombre,
           'alta', (u.created_at at time zone 'Europe/Madrid')::date,
           'ultima', a.ultima,
           'dias30', coalesce(a.dias30, 0),
           'movs', coalesce(m.movs, 0),
           'plan', case
                     when pl.plan = 'premium' and (pl.hasta is null or pl.hasta >= (select d from hoy)) and pl.origen = 'prueba' then 'prueba'
                     when pl.plan = 'premium' and (pl.hasta is null or pl.hasta >= (select d from hoy)) then 'premium'
                     else 'gratis'
                   end,
           'plan_hasta', pl.hasta,
           'ultimo_envio', e.ultimo,
           'envios', coalesce(e.por_tipo, '{}'::jsonb),
           'avisos_renovacion', p.avisos_renovacion,
           'renovaciones', coalesce(rn.lista, '[]'::jsonb)
         )
    from auth.users u
    join public.perfiles p on p.usuario_id = u.id::text
    left join act_u a on a.uid = u.id::text
    left join movs_u m on m.uid = u.id::text
    left join public.planes pl on pl.usuario_id = u.id::text
    left join env_u e on e.uid = u.id::text
    left join ren_u rn on rn.uid = u.id::text
   where u.email is not null
     and u.email_confirmed_at is not null
     and p.recordatorios
     and lower(u.email) not like 'test%';
$$;
revoke all on function public.recordatorios_candidatos() from public, anon, authenticated;
grant execute on function public.recordatorios_candidatos() to service_role;
