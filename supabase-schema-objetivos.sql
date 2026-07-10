-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y "Run"
-- Objetivos de ahorro múltiples por usuario (aditivo, no toca nada existente).

create table objetivos_ahorro (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  nombre text not null,
  importe_objetivo numeric not null check (importe_objetivo > 0),
  importe_actual numeric not null default 0 check (importe_actual >= 0),
  fecha_objetivo date,
  created_at timestamptz not null default now()
);

create index objetivos_ahorro_usuario_id_idx on objetivos_ahorro (usuario_id);

alter table objetivos_ahorro enable row level security;

create policy "Acceso abierto fase 1"
  on objetivos_ahorro
  for all
  using (true)
  with check (true);
