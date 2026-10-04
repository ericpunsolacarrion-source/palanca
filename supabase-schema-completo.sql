-- ============================================================================
-- Palanca — Esquema COMPLETO consolidado (idempotente)
--
-- Para montar una base de datos desde cero IDÉNTICA a producción (p. ej. el
-- proyecto palanca-dev). Pegar TAL CUAL en Supabase → SQL Editor → Run.
-- Vacía el editor antes de pegar. Seguro de re-ejecutar: usa "if not exists"
-- y recrea las políticas RLS.
--
-- Reúne y deja al día todo lo que en prod se aplicó por fases (los otros
-- supabase-*.sql) + las columnas de céntimos + las columnas nuevas de
-- recurrentes_confirmaciones (importe_centimos, movimiento_id).
-- ============================================================================

-- ── Tablas ──────────────────────────────────────────────────────────────────

create table if not exists public.perfiles (
  usuario_id text primary key,
  objetivo text not null check (objetivo in ('ahorro','jubilacion','planificacion','otro')),
  email text,
  nombre text,
  anio_nacimiento int,
  saldo_inicial numeric,
  saldo_inicial_centimos bigint,
  ultima_reconciliacion timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null check (tipo in ('ingreso','gasto')),
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (usuario_id, tipo, nombre)
);
create index if not exists categorias_usuario_id_idx on public.categorias (usuario_id);

create table if not exists public.fuentes (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null check (tipo in ('ingreso','gasto')),
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (usuario_id, tipo, nombre)
);
create index if not exists fuentes_usuario_id_idx on public.fuentes (usuario_id);

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null check (tipo in ('ingreso','gasto')),
  categoria_id uuid references public.categorias(id) on delete set null,
  fuente_id uuid references public.fuentes(id) on delete set null,
  importe numeric not null check (importe > 0),
  importe_centimos bigint,
  fecha date not null,
  nota text,
  es_fijo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists movimientos_usuario_id_idx on public.movimientos (usuario_id);

create table if not exists public.presupuestos (
  usuario_id text primary key,
  tasa_ahorro_objetivo numeric check (tasa_ahorro_objetivo is null or (tasa_ahorro_objetivo >= 0 and tasa_ahorro_objetivo <= 100)),
  objetivo_inversion_mensual numeric,
  objetivo_inversion_mensual_centimos bigint,
  metodo text not null default 'tasa' check (metodo in ('tasa','fijo')),
  gasto_maximo_fijo numeric,
  gasto_maximo_fijo_centimos bigint,
  updated_at timestamptz not null default now()
);

create table if not exists public.planificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  mes text not null,
  ingreso_previsto numeric not null default 0 check (ingreso_previsto >= 0),
  ingreso_previsto_centimos bigint,
  gasto_previsto numeric not null default 0 check (gasto_previsto >= 0),
  gasto_previsto_centimos bigint,
  inversion_prevista numeric not null default 0 check (inversion_prevista >= 0),
  inversion_prevista_centimos bigint,
  nota text,
  created_at timestamptz not null default now(),
  unique (usuario_id, mes)
);
create index if not exists planificaciones_usuario_id_idx on public.planificaciones (usuario_id);

create table if not exists public.objetivos_ahorro (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  nombre text not null,
  importe_objetivo numeric not null check (importe_objetivo > 0),
  importe_objetivo_centimos bigint,
  importe_actual numeric not null default 0 check (importe_actual >= 0),
  importe_actual_centimos bigint,
  fecha_objetivo date,
  tipo text,
  created_at timestamptz not null default now()
);
create index if not exists objetivos_ahorro_usuario_id_idx on public.objetivos_ahorro (usuario_id);

create table if not exists public.simulaciones_guardadas (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null check (tipo in ('hipoteca','interes_compuesto')),
  nombre text not null,
  datos jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists simulaciones_guardadas_usuario_id_idx on public.simulaciones_guardadas (usuario_id);

create table if not exists public.recurrentes (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null,
  nombre text not null,
  importe numeric not null,
  importe_centimos bigint,
  categoria_id uuid,
  categoria_nombre text,
  fuente_id uuid,
  dia_mes int,
  confirmar boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.recurrentes_confirmaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  recurrente_id uuid not null references public.recurrentes(id) on delete cascade,
  mes text not null,
  importe_centimos bigint,
  movimiento_id uuid,
  created_at timestamptz not null default now(),
  unique (recurrente_id, mes)
);

create table if not exists public.gastos_rapidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  nombre text not null,
  importe numeric,
  importe_centimos bigint,
  categoria_id uuid,
  categoria_nombre text,
  created_at timestamptz not null default now()
);

create table if not exists public.escenarios_simulador (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null default 'independencia',
  nombre text not null,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Borrado de la propia cuenta (derecho de supresión) ──────────────────────
create or replace function public.borrar_mi_cuenta()
returns void language plpgsql security definer set search_path = public as $$
declare uid text := auth.uid()::text;
begin
  if uid is null then raise exception 'No autenticado'; end if;
  delete from public.recurrentes_confirmaciones where usuario_id = uid;
  delete from public.recurrentes            where usuario_id = uid;
  delete from public.gastos_rapidos         where usuario_id = uid;
  delete from public.escenarios_simulador   where usuario_id = uid;
  delete from public.movimientos            where usuario_id = uid;
  delete from public.presupuestos           where usuario_id = uid;
  delete from public.planificaciones        where usuario_id = uid;
  delete from public.objetivos_ahorro       where usuario_id = uid;
  delete from public.simulaciones_guardadas where usuario_id = uid;
  delete from public.fuentes                where usuario_id = uid;
  delete from public.categorias             where usuario_id = uid;
  delete from public.perfiles               where usuario_id = uid;
  delete from auth.users                    where id = auth.uid();
end; $$;
grant execute on function public.borrar_mi_cuenta() to authenticated;

-- ── RLS: cada usuario solo lee/escribe SUS filas (usuario_id = auth.uid()) ──
do $$
declare t text; pol record;
begin
  foreach t in array array[
    'perfiles','categorias','fuentes','movimientos','presupuestos',
    'planificaciones','objetivos_ahorro','simulaciones_guardadas',
    'recurrentes','recurrentes_confirmaciones','gastos_rapidos','escenarios_simulador'
  ]
  loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I;', pol.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy palanca_sel on public.%I for select to authenticated using (usuario_id = auth.uid()::text);', t);
    execute format('create policy palanca_ins on public.%I for insert to authenticated with check (usuario_id = auth.uid()::text);', t);
    execute format('create policy palanca_upd on public.%I for update to authenticated using (usuario_id = auth.uid()::text) with check (usuario_id = auth.uid()::text);', t);
    execute format('create policy palanca_del on public.%I for delete to authenticated using (usuario_id = auth.uid()::text);', t);
  end loop;
end $$;
