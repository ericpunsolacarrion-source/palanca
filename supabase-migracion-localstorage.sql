-- ============================================================================
-- Palanca — Migración de datos de localStorage a Supabase
--
-- Pegar TAL CUAL en Supabase → SQL Editor y ejecutar (vacía el editor antes).
-- Idempotente. Crea tablas nuevas para datos reales del usuario, añade columnas
-- y aplica RLS con la MISMA política que el resto (solo authenticated, cada
-- usuario solo lo suyo). No toca las tablas ni políticas existentes.
-- ============================================================================

-- 1) Recurrentes (definición) ------------------------------------------------
create table if not exists public.recurrentes (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     text not null,
  tipo           text not null,            -- 'gasto' | 'ingreso'
  nombre         text not null,
  importe        numeric not null,
  categoria_id   uuid,
  categoria_nombre text,
  fuente_id      uuid,
  dia_mes        int,                      -- 1..31 o null
  confirmar      boolean not null default false,  -- importe variable
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- 2) Confirmaciones de recurrentes (histórico de meses → racha) --------------
create table if not exists public.recurrentes_confirmaciones (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     text not null,
  recurrente_id  uuid not null references public.recurrentes(id) on delete cascade,
  mes            text not null,            -- 'YYYY-MM'
  created_at     timestamptz not null default now(),
  unique (recurrente_id, mes)
);

-- 3) Gastos rápidos ----------------------------------------------------------
create table if not exists public.gastos_rapidos (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       text not null,
  nombre           text not null,
  importe          numeric,
  categoria_id     uuid,
  categoria_nombre text,
  created_at       timestamptz not null default now()
);

-- 4) Escenarios de simulador (independencia financiera, etc.) ----------------
create table if not exists public.escenarios_simulador (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     text not null,
  tipo           text not null default 'independencia',
  nombre         text not null,
  datos          jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

-- 5) Columnas nuevas en tablas existentes ------------------------------------
alter table public.objetivos_ahorro add column if not exists tipo text;         -- liquidez|inversion|patrimonio
alter table public.perfiles         add column if not exists saldo_inicial numeric;
alter table public.perfiles         add column if not exists ultima_reconciliacion timestamptz;

-- 6) RLS en las tablas nuevas (mismo patrón: authenticated + usuario_id) ------
do $$
declare t text;
begin
  foreach t in array array[
    'recurrentes','recurrentes_confirmaciones','gastos_rapidos','escenarios_simulador'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists palanca_sel on public.%I;', t);
    execute format('drop policy if exists palanca_ins on public.%I;', t);
    execute format('drop policy if exists palanca_upd on public.%I;', t);
    execute format('drop policy if exists palanca_del on public.%I;', t);
    execute format('create policy palanca_sel on public.%I for select to authenticated using (usuario_id = auth.uid()::text);', t);
    execute format('create policy palanca_ins on public.%I for insert to authenticated with check (usuario_id = auth.uid()::text);', t);
    execute format('create policy palanca_upd on public.%I for update to authenticated using (usuario_id = auth.uid()::text) with check (usuario_id = auth.uid()::text);', t);
    execute format('create policy palanca_del on public.%I for delete to authenticated using (usuario_id = auth.uid()::text);', t);
  end loop;
end $$;
