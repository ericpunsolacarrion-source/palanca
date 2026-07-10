-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y "Run"
-- Planificación de meses futuros (aditivo, no toca nada existente).

create table if not exists planificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  mes text not null, -- 'YYYY-MM'
  ingreso_previsto numeric not null default 0 check (ingreso_previsto >= 0),
  gasto_previsto numeric not null default 0 check (gasto_previsto >= 0),
  inversion_prevista numeric not null default 0 check (inversion_prevista >= 0),
  nota text,
  created_at timestamptz not null default now(),
  unique (usuario_id, mes)
);

create index if not exists planificaciones_usuario_id_idx on planificaciones (usuario_id);

alter table planificaciones enable row level security;

drop policy if exists "Acceso abierto fase 1" on planificaciones;
create policy "Acceso abierto fase 1" on planificaciones for all using (true) with check (true);
