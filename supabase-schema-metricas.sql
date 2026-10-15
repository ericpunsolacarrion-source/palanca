-- ============================================================================
-- MÉTRICAS DE USO + AHORROS NEGOCIADOS + BORRADO COMPLETO DE CUENTA
-- Ejecutar en Supabase: SQL Editor -> (vaciar el editor) -> pegar TODO -> Run.
-- Se puede ejecutar varias veces sin romper nada (también si ya lo ejecutaste antes).
--
-- Qué hace:
--  0) fulcro_uso: registro de uso de Fulcro (por si faltaba en este proyecto).
--  1) eventos: registro mínimo de uso (qué tipo de acción y cuándo). NUNCA
--     importes, conceptos ni textos. Se escribe solo vía registrar_evento().
--  2) perfiles.analitica: el usuario puede desactivarlo desde "Tu cuenta".
--  3) ahorros_negociados: lo que cada usuario consigue bajando recibos (antes
--     solo en el móvil).
--  4) admins + palanca_metricas(): panel de métricas, SOLO para administradores.
--  5) borrar_mi_cuenta(): ahora borra TODAS las tablas con datos del usuario
--     (la versión anterior se dejaba fijos, gastos rápidos, escenarios y Fulcro).
--  6) planes: Gratis / Premium por usuario (con origen, importe, caducidad e
--     historial). SOLO el administrador puede cambiarlos (admin_cambiar_plan).
--  7) recordatorios por email: preferencia (perfiles.recordatorios), registro
--     de envíos y la lista de candidatos (solo para el servidor).
--  8) comercios_alias: la MEMORIA de comercios de cada usuario ("ALIPAM23" del
--     banco es Mercadona). Se aprende al importar y al corregir un movimiento.
-- ============================================================================

-- 0) Registro de uso de Fulcro (mismo SQL que supabase-schema-fulcro.sql) -----
-- Incluido aquí para que este archivo funcione aunque ese no se ejecutara
-- en este proyecto (las métricas lo necesitan). Es seguro repetirlo.
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
       and u.email_confirmed_at is not null  -- email verificado: nadie puede "hacerse pasar"
  );
$$;
revoke all on function public.soy_admin() from public, anon;
grant execute on function public.soy_admin() to authenticated;

-- 6) Planes: Gratis / Premium --------------------------------------------------
-- Sin fila = Gratis. Premium "efectivo" = plan premium y sin caducar (hasta
-- nulo o >= hoy). origen: manual (lo das tú), prueba (periodo de prueba),
-- invitacion (beta, amigos), pago (cuando haya pasarela de pago, la misma
-- tabla se rellenará sola). importe_mensual: lo que paga al mes (para los
-- ingresos); una cuota anual de 48 € = 4 €/mes.
create table if not exists public.planes (
  usuario_id       text primary key,
  plan             text not null default 'gratis' check (plan in ('gratis', 'premium')),
  origen           text not null default 'manual' check (origen in ('manual', 'prueba', 'invitacion', 'pago')),
  importe_mensual  numeric not null default 0 check (importe_mensual >= 0 and importe_mensual < 10000),
  desde            date not null default current_date,
  hasta            date,
  nota             text check (char_length(nota) <= 300),
  updated_at       timestamptz not null default now()
);
alter table public.planes enable row level security;
drop policy if exists planes_sel on public.planes;
-- El usuario puede LEER su plan (para la app y su descarga de datos). No hay
-- políticas de insert/update/delete: nadie se puede poner Premium a sí mismo.
create policy planes_sel on public.planes
  for select to authenticated using (usuario_id = auth.uid()::text);

create table if not exists public.planes_historial (
  id               bigint generated always as identity primary key,
  usuario_id       text not null,
  plan             text not null,
  origen           text not null,
  importe_mensual  numeric not null,
  hasta            date,
  nota             text,
  cambiado_por     text,
  created_at       timestamptz not null default now()
);
create index if not exists planes_historial_fecha_idx on public.planes_historial (created_at desc);
alter table public.planes_historial enable row level security;  -- sin políticas: solo vía funciones

-- Plan efectivo del usuario conectado (para activar funciones Premium en la app).
create or replace function public.mi_plan()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
              'plan', case when p.plan = 'premium' and (p.hasta is null or p.hasta >= (now() at time zone 'Europe/Madrid')::date)
                           then 'premium' else 'gratis' end,
              'origen', p.origen,
              'hasta', p.hasta)
       from public.planes p where p.usuario_id = auth.uid()::text),
    jsonb_build_object('plan', 'gratis')
  );
$$;
revoke all on function public.mi_plan() from public, anon;
grant execute on function public.mi_plan() to authenticated;

-- Dar / quitar Premium (solo administradores). Guarda cada cambio en el historial.
create or replace function public.admin_cambiar_plan(
  p_usuario_id text,
  p_plan text,
  p_origen text default 'manual',
  p_importe numeric default 0,
  p_hasta date default null,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quien text;
  v_origen text := coalesce(p_origen, 'manual');
  v_importe numeric := coalesce(p_importe, 0);
  v_hasta date := p_hasta;
  v_nota text := nullif(trim(coalesce(p_nota, '')), '');
begin
  if not public.soy_admin() then
    raise exception 'Solo administradores';
  end if;
  if p_plan not in ('gratis', 'premium') then
    raise exception 'Plan no válido';
  end if;
  if not exists (select 1 from auth.users where id::text = p_usuario_id) then
    raise exception 'Usuario no encontrado';
  end if;
  if p_plan = 'gratis' then
    v_importe := 0;
    v_hasta := null;
  end if;
  select email into v_quien from auth.users where id = auth.uid();

  insert into public.planes as pl (usuario_id, plan, origen, importe_mensual, desde, hasta, nota, updated_at)
  values (p_usuario_id, p_plan, v_origen, v_importe, current_date, v_hasta, v_nota, now())
  on conflict (usuario_id) do update
     set plan = excluded.plan,
         origen = excluded.origen,
         importe_mensual = excluded.importe_mensual,
         -- "desde" solo se reinicia al pasar de gratis a premium
         desde = case when pl.plan = excluded.plan then pl.desde else excluded.desde end,
         hasta = excluded.hasta,
         nota = excluded.nota,
         updated_at = now();

  insert into public.planes_historial (usuario_id, plan, origen, importe_mensual, hasta, nota, cambiado_por)
  values (p_usuario_id, p_plan, v_origen, v_importe, v_hasta, v_nota, v_quien);

  return (select to_jsonb(pl) from public.planes pl where pl.usuario_id = p_usuario_id);
end;
$$;
revoke all on function public.admin_cambiar_plan(text, text, text, numeric, date, text) from public, anon;
grant execute on function public.admin_cambiar_plan(text, text, text, numeric, date, text) to authenticated;

-- 7) Recordatorios por email ------------------------------------------------------
-- Activados por defecto (clientes con cuenta: LSSI art. 21.2) y con baja en un
-- clic en cada email y en Tu cuenta. Quien se da de baja no recibe nada más.
alter table public.perfiles add column if not exists recordatorios boolean not null default true;

create table if not exists public.recordatorios_enviados (
  id            bigint generated always as identity primary key,
  usuario_id    text not null,
  tipo          text not null check (tipo ~ '^[a-z_]{2,40}$'),
  proveedor_id  text,
  created_at    timestamptz not null default now()
);
create index if not exists recordatorios_enviados_idx on public.recordatorios_enviados (usuario_id, created_at desc);
alter table public.recordatorios_enviados enable row level security;
drop policy if exists recordatorios_sel on public.recordatorios_enviados;
create policy recordatorios_sel on public.recordatorios_enviados
  for select to authenticated using (usuario_id = auth.uid()::text);

-- Datos mínimos para decidir a quién escribir (la decisión está en
-- src/lib/recordatorios.js). SOLO la puede llamar el servidor (service_role).
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
           'envios', coalesce(e.por_tipo, '{}'::jsonb)
         )
    from auth.users u
    join public.perfiles p on p.usuario_id = u.id::text
    left join act_u a on a.uid = u.id::text
    left join movs_u m on m.uid = u.id::text
    left join public.planes pl on pl.usuario_id = u.id::text
    left join env_u e on e.uid = u.id::text
   where u.email is not null
     and u.email_confirmed_at is not null
     and p.recordatorios
     and lower(u.email) not like 'test%';
$$;
revoke all on function public.recordatorios_candidatos() from public, anon, authenticated;
grant execute on function public.recordatorios_candidatos() to service_role;

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
  plan_u as (
    select usuario_id as uid, origen, importe_mensual, hasta,
           case
             when plan = 'premium' and (hasta is null or hasta >= v_hoy) and origen = 'prueba' then 'prueba'
             when plan = 'premium' and (hasta is null or hasta >= v_hoy) then 'premium'
             when plan = 'premium' then 'caducado'
             else 'gratis'
           end as tipo_plan
      from public.planes
  ),
  pu as (
    select u.uid, u.email, u.alta,
           coalesce(pl.tipo_plan, 'gratis') as tipo_plan, pl.origen, coalesce(pl.importe_mensual, 0) as importe_mensual, pl.hasta as plan_hasta,
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
      left join plan_u pl on pl.uid = u.uid
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
    'planes', jsonb_build_object(
      'gratis', (select count(*) from pu2 where tipo_plan = 'gratis'),
      'premium', (select count(*) from pu2 where tipo_plan = 'premium'),
      'prueba', (select count(*) from pu2 where tipo_plan = 'prueba'),
      'caducado', (select count(*) from pu2 where tipo_plan = 'caducado'),
      'ingresos_mes', (select coalesce(sum(importe_mensual), 0) from pu2 where tipo_plan = 'premium'),
      'caducan7', (select count(*) from pu2 where tipo_plan in ('premium', 'prueba') and plan_hasta between v_hoy and v_hoy + 7),
      'altas30', (select count(*) from public.planes_historial h join usuarios u on u.uid = h.usuario_id
                   where h.plan = 'premium' and h.created_at > now() - interval '30 days'),
      'bajas30', (select count(*) from public.planes_historial h join usuarios u on u.uid = h.usuario_id
                   where h.plan = 'gratis' and h.created_at > now() - interval '30 days')
    ),
    'por_plan', (select coalesce(jsonb_agg(jsonb_build_object(
                   'plan', tipo_plan, 'n', n, 'activos7', a7, 'activos30', a30,
                   'cada_cuanto', cc, 'dias_activos', da, 'movs30', mv
                 ) order by tipo_plan), '[]'::jsonb)
                 from (
                   select tipo_plan, count(*) n,
                          count(*) filter (where ultima >= v_hoy - 6) a7,
                          count(*) filter (where dias30 > 0) a30,
                          round(avg(cada_cuanto), 1) cc,
                          round(avg(dias30) filter (where dias30 > 0), 1) da,
                          round(avg(movs30) filter (where dias30 > 0), 1) mv
                     from pu2 group by tipo_plan
                 ) x),
    'recordatorios', jsonb_build_object(
      'enviados30', (select count(*) from public.recordatorios_enviados r join usuarios u on u.uid = r.usuario_id
                      where r.created_at > now() - interval '30 days'),
      'por_tipo', (select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb) from (
                     select r.tipo, count(*) n from public.recordatorios_enviados r join usuarios u on u.uid = r.usuario_id
                      where r.created_at > now() - interval '30 days' group by r.tipo) z),
      -- Volvieron: entraron en la app en las 48 h siguientes al email.
      'volvieron30', (select count(*) from public.recordatorios_enviados r join usuarios u on u.uid = r.usuario_id
                       where r.created_at > now() - interval '30 days'
                         and exists (select 1 from act a where a.uid = r.usuario_id
                                       and a.dia between (r.created_at at time zone 'Europe/Madrid')::date
                                                     and (r.created_at at time zone 'Europe/Madrid')::date + 2)),
      'clics30', (select count(*) from public.eventos e join usuarios u on u.uid = e.usuario_id
                   where e.tipo = 'clic_email' and e.created_at > now() - interval '30 days'),
      'bajas', (select count(*) from public.perfiles p join usuarios u on u.uid = p.usuario_id where not p.recordatorios)
    ),
    'cambios_plan', (select coalesce(jsonb_agg(c order by c->>'fecha' desc), '[]'::jsonb) from (
                       select jsonb_build_object(
                                'email', u.email, 'plan', h.plan, 'origen', h.origen,
                                'importe_mensual', h.importe_mensual, 'hasta', h.hasta,
                                'nota', h.nota, 'fecha', h.created_at) c
                         from public.planes_historial h join usuarios u on u.uid = h.usuario_id
                        order by h.created_at desc limit 20) z),
    'lista', (select coalesce(jsonb_agg(jsonb_build_object(
                'uid', uid, 'email', email, 'alta', alta, 'ultima', ultima, 'estado', estado,
                'plan', tipo_plan, 'plan_origen', origen, 'plan_hasta', plan_hasta, 'importe_mensual', importe_mensual,
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

-- 8) Memoria de comercios -----------------------------------------------------------
create table if not exists public.comercios_alias (
  usuario_id  text not null,
  clave       text not null check (char_length(clave) between 1 and 120),
  nombre      text not null check (char_length(nombre) between 1 and 80),
  categoria   text check (char_length(categoria) <= 60),
  updated_at  timestamptz not null default now(),
  primary key (usuario_id, clave)
);
alter table public.comercios_alias enable row level security;
drop policy if exists palanca_sel on public.comercios_alias;
drop policy if exists palanca_ins on public.comercios_alias;
drop policy if exists palanca_upd on public.comercios_alias;
drop policy if exists palanca_del on public.comercios_alias;
create policy palanca_sel on public.comercios_alias for select to authenticated using (usuario_id = auth.uid()::text);
create policy palanca_ins on public.comercios_alias for insert to authenticated with check (usuario_id = auth.uid()::text);
create policy palanca_upd on public.comercios_alias for update to authenticated using (usuario_id = auth.uid()::text) with check (usuario_id = auth.uid()::text);
create policy palanca_del on public.comercios_alias for delete to authenticated using (usuario_id = auth.uid()::text);

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
