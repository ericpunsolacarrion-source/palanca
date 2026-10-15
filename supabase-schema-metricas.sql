-- ============================================================================
-- MÉTRICAS DE USO + AHORROS NEGOCIADOS + BORRADO COMPLETO DE CUENTA
-- Ejecutar en Supabase: SQL Editor -> (vaciar el editor) -> pegar TODO -> Run.
-- Se puede ejecutar varias veces sin romper nada.
--
-- Qué hace:
--  1) eventos: registro mínimo de uso (qué tipo de acción y cuándo). NUNCA
--     importes, conceptos ni textos. Se escribe solo vía registrar_evento().
--  2) perfiles.analitica: el usuario puede desactivarlo desde "Tu cuenta".
--  3) ahorros_negociados: lo que cada usuario consigue bajando recibos (antes
--     solo en el móvil).
--  4) admins + palanca_metricas(): panel de métricas, SOLO para administradores.
--  5) borrar_mi_cuenta(): ahora borra TODAS las tablas con datos del usuario
--     (la versión anterior se dejaba fijos, gastos rápidos, escenarios y Fulcro).
-- ============================================================================

-- 1) Eventos de uso ----------------------------------------------------------
create table if not exists public.eventos (
  id          bigint generated always as identity primary key,
  usuario_id  text not null,
  tipo        text not null check (tipo ~ '^[a-z_]{2,40}$'),
  created_at  timestamptz not null default now()
);
create index if not exists eventos_usuario_fecha_idx on public.eventos (usuario_id, created_at desc);
create index if not exists eventos_fecha_idx on public.eventos (created_at desc);

alter table public.eventos enable row level security;
drop policy if exists eventos_sel on public.eventos;
-- Cada usuario puede ver (y exportar) los suyos. No hay política de insert:
-- solo se escribe con registrar_evento(), que pone límites.
create policy eventos_sel on public.eventos
  for select to authenticated using (usuario_id = auth.uid()::text);

-- 2) Desactivar la analítica (por defecto activa) ----------------------------
alter table public.perfiles add column if not exists analitica boolean not null default true;

create or replace function public.registrar_evento(p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_hoy int;
begin
  if v_uid is null or p_tipo is null or p_tipo !~ '^[a-z_]{2,40}$' then
    return;
  end if;
  if exists (select 1 from public.perfiles where usuario_id = v_uid and analitica = false) then
    return;
  end if;
  select count(*) into v_hoy from public.eventos
   where usuario_id = v_uid and created_at > now() - interval '1 day';
  if v_hoy >= 500 then
    return;  -- tope anti-abuso
  end if;
  insert into public.eventos (usuario_id, tipo) values (v_uid, p_tipo);
end;
$$;
revoke all on function public.registrar_evento(text) from public, anon;
grant execute on function public.registrar_evento(text) to authenticated;

-- 3) Ahorros negociados --------------------------------------------------------
create table if not exists public.ahorros_negociados (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    text not null,
  rec_id        text not null,
  nombre        text not null,
  antes         numeric not null,
  despues       numeric not null,
  ahorro_anual  numeric not null check (ahorro_anual > 0),
  fecha         date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (usuario_id, rec_id)
);
alter table public.ahorros_negociados enable row level security;
drop policy if exists palanca_sel on public.ahorros_negociados;
drop policy if exists palanca_ins on public.ahorros_negociados;
drop policy if exists palanca_upd on public.ahorros_negociados;
drop policy if exists palanca_del on public.ahorros_negociados;
create policy palanca_sel on public.ahorros_negociados for select to authenticated using (usuario_id = auth.uid()::text);
create policy palanca_ins on public.ahorros_negociados for insert to authenticated with check (usuario_id = auth.uid()::text);
create policy palanca_upd on public.ahorros_negociados for update to authenticated using (usuario_id = auth.uid()::text) with check (usuario_id = auth.uid()::text);
create policy palanca_del on public.ahorros_negociados for delete to authenticated using (usuario_id = auth.uid()::text);

-- 4) Administradores y panel de métricas -------------------------------------
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;  -- sin políticas: la app no la lee
insert into public.admins (email) values ('ericpunsolacarrion@gmail.com') on conflict do nothing;

create or replace function public.soy_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
      join auth.users u on lower(u.email) = a.email
     where u.id = auth.uid()
  );
$$;
revoke all on function public.soy_admin() from public, anon;
grant execute on function public.soy_admin() to authenticated;

-- Día "activo" = el usuario abrió la app (evento) o apuntó algo o preguntó a
-- Fulcro ese día (hora de Madrid). Así hay histórico desde el primer día,
-- antes incluso de existir la tabla de eventos. Se excluyen emails test*.
create or replace function public.palanca_metricas(p_incluir_admin boolean default false)
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
           (u.created_at at time zone 'Europe/Madrid')::date as alta
      from auth.users u
     where lower(coalesce(u.email, '')) not like 'test%'
       and (p_incluir_admin or lower(coalesce(u.email, '')) not in (select email from public.admins))
  ),
  actividad as (
    select usuario_id as uid, (created_at at time zone 'Europe/Madrid')::date as dia from public.eventos
    union
    select usuario_id, (created_at at time zone 'Europe/Madrid')::date from public.movimientos
    union
    select usuario_id, (created_at at time zone 'Europe/Madrid')::date from public.fulcro_uso
  ),
  act as (
    select a.uid, a.dia from actividad a join usuarios u on u.uid = a.uid
  ),
  -- Movimientos "de verdad": sin el saldo inicial ni ajustes del onboarding.
  movs as (
    select m.usuario_id as uid, m.tipo, m.created_at
      from public.movimientos m
      join usuarios u on u.uid = m.usuario_id
     where not exists (
       select 1 from public.categorias c where c.id = m.categoria_id and c.nombre = 'Ajuste'
     )
  ),
  act_u as (
    select uid,
           max(dia) as ultima,
           count(*) as dias_total,
           count(*) filter (where dia > v_hoy - 30) as dias30,
           min(dia) filter (where dia > v_hoy - 30) as primero30,
           max(dia) filter (where dia > v_hoy - 30) as ultimo30
      from act group by uid
  ),
  movs_u as (
    select uid,
           count(*) as movs,
           count(*) filter (where created_at > now() - interval '30 days') as movs30,
           count(*) filter (where tipo = 'gasto' and created_at > now() - interval '30 days') as gastos30
      from movs group by uid
  ),
  fijos_u as (select usuario_id as uid, count(*) as fijos from public.recurrentes group by usuario_id),
  fulcro_u as (
    select usuario_id as uid, count(*) as fulcro from public.fulcro_uso
     where coalesce(modelo, '') not like 'capturas:%' group by usuario_id
  ),
  imp_u as (
    select usuario_id as uid, count(*) as importaciones from public.eventos
     where tipo like 'importacion%' group by usuario_id
  ),
  ahorro_u as (select usuario_id as uid, sum(ahorro_anual) as ahorrado from public.ahorros_negociados group by usuario_id),
  pu as (
    select u.uid, u.email, u.alta,
           a.ultima, coalesce(a.dias_total, 0) as dias_total, coalesce(a.dias30, 0) as dias30,
           a.primero30, a.ultimo30,
           coalesce(m.movs, 0) as movs, coalesce(m.movs30, 0) as movs30, coalesce(m.gastos30, 0) as gastos30,
           coalesce(f.fijos, 0) as fijos, coalesce(fu.fulcro, 0) as fulcro,
           coalesce(i.importaciones, 0) as importaciones, coalesce(ah.ahorrado, 0) as ahorrado
      from usuarios u
      left join act_u a on a.uid = u.uid
      left join movs_u m on m.uid = u.uid
      left join fijos_u f on f.uid = u.uid
      left join fulcro_u fu on fu.uid = u.uid
      left join imp_u i on i.uid = u.uid
      left join ahorro_u ah on ah.uid = u.uid
  ),
  pu2 as (
    select pu.*,
           case
             when movs = 0 and dias_total <= 1 then 'sin_empezar'
             when ultima >= v_hoy - 6 then 'activo'
             when ultima >= v_hoy - 29 then 'en_riesgo'
             else 'dormido'
           end as estado,
           case when dias30 >= 2 then (ultimo30 - primero30)::numeric / (dias30 - 1) end as cada_cuanto
      from pu
  ),
  dias as (
    select (v_hoy - g)::date as dia from generate_series(0, 29) g
  ),
  cohortes as (
    select date_trunc('week', alta)::date as semana, uid, alta from usuarios
     where alta > v_hoy - 63
  )
  select jsonb_build_object(
    'generado', now(),
    'hoy', v_hoy,
    'usuarios', jsonb_build_object(
      'total', (select count(*) from usuarios),
      'nuevos7', (select count(*) from usuarios where alta > v_hoy - 7),
      'nuevos30', (select count(*) from usuarios where alta > v_hoy - 30)
    ),
    'activos', jsonb_build_object(
      'hoy', (select count(distinct uid) from act where dia = v_hoy),
      'd7', (select count(distinct uid) from act where dia > v_hoy - 7),
      'd30', (select count(distinct uid) from act where dia > v_hoy - 30),
      'dau_medio', round((select count(*) from act where dia > v_hoy - 30)::numeric / 30, 2)
    ),
    'frecuencia', jsonb_build_object(
      'dias_activos_medio', (select round(avg(dias30), 1) from pu2 where dias30 > 0),
      'cada_cuanto_medio', (select round(avg(cada_cuanto), 1) from pu2 where cada_cuanto is not null),
      'registran30', (select count(*) from pu2 where gastos30 > 0),
      'movs_por_activo', (select round(avg(movs30), 1) from pu2 where dias30 > 0)
    ),
    'estados', (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb) from (select estado, count(*) n from pu2 group by estado) s),
    'embudo', jsonb_build_object(
      'altas', (select count(*) from pu2),
      'primer_movimiento', (select count(*) from pu2 where movs >= 1),
      'diez_movimientos', (select count(*) from pu2 where movs >= 10),
      'fijos', (select count(*) from pu2 where fijos >= 1),
      'fulcro', (select count(*) from pu2 where fulcro >= 1),
      'vuelve', (select count(*) from pu2 where dias_total >= 3)
    ),
    'serie', (select jsonb_agg(jsonb_build_object(
                'dia', d.dia,
                'activos', coalesce(x.n, 0),
                'altas', coalesce(y.n, 0)
              ) order by d.dia)
              from dias d
              left join (select dia, count(*) n from act group by dia) x on x.dia = d.dia
              left join (select alta, count(*) n from usuarios group by alta) y on y.alta = d.dia),
    'retencion', (select coalesce(jsonb_agg(jsonb_build_object(
                    'semana', semana,
                    'n', n,
                    's1', s1, 's2', s2, 's4', s4
                  ) order by semana desc), '[]'::jsonb)
                  from (
                    select c.semana, count(*) n,
                      case when max(c.alta) <= v_hoy - 7 then count(*) filter (where c.s1) end s1,
                      case when max(c.alta) <= v_hoy - 14 then count(*) filter (where c.s2) end s2,
                      case when max(c.alta) <= v_hoy - 28 then count(*) filter (where c.s4) end s4
                    from (
                      select co.semana, co.uid, co.alta,
                             bool_or(a.dia between co.alta + 1 and co.alta + 7) is true as s1,
                             bool_or(a.dia between co.alta + 8 and co.alta + 14) is true as s2,
                             bool_or(a.dia between co.alta + 22 and co.alta + 28) is true as s4
                        from cohortes co left join act a on a.uid = co.uid and a.dia > co.alta
                       group by co.semana, co.uid, co.alta
                    ) c group by c.semana
                  ) x),
    'eventos30', (select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb) from (
                    select e.tipo, count(*) n from public.eventos e join usuarios u on u.uid = e.usuario_id
                     where e.created_at > now() - interval '30 days' group by e.tipo) s),
    'ahorrado_total', (select coalesce(sum(ahorrado), 0) from pu2),
    'lista', (select coalesce(jsonb_agg(jsonb_build_object(
                'email', email, 'alta', alta, 'ultima', ultima, 'estado', estado,
                'dias30', dias30, 'cada_cuanto', round(cada_cuanto, 1),
                'movs', movs, 'movs30', movs30, 'fijos', fijos, 'fulcro', fulcro,
                'importaciones', importaciones
              ) order by ultima desc nulls last, alta desc), '[]'::jsonb)
              from (select * from pu2 order by ultima desc nulls last, alta desc limit 300) l)
  ) into r;

  return r;
end;
$$;
revoke all on function public.palanca_metricas(boolean) from public, anon;
grant execute on function public.palanca_metricas(boolean) to authenticated;

-- 5) Borrado completo de la cuenta --------------------------------------------
-- Recorre TODAS las tablas públicas con columna usuario_id (también las que se
-- creen en el futuro). Si una tabla depende de otra (claves foráneas), reintenta
-- en otra pasada.
create or replace function public.borrar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  t record;
  pendientes int;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;
  for pasada in 1..5 loop
    pendientes := 0;
    for t in
      select c.table_name
        from information_schema.columns c
        join information_schema.tables tb
          on tb.table_schema = c.table_schema and tb.table_name = c.table_name
       where c.table_schema = 'public' and c.column_name = 'usuario_id'
         and tb.table_type = 'BASE TABLE'
    loop
      begin
        execute format('delete from public.%I where usuario_id = $1', t.table_name) using uid;
      exception when foreign_key_violation then
        pendientes := pendientes + 1;
      end;
    end loop;
    exit when pendientes = 0;
  end loop;
  if pendientes > 0 then
    raise exception 'No se han podido borrar todos los datos';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;
