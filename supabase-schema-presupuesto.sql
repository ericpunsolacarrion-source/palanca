-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y "Run"

create table presupuestos (
  usuario_id text primary key,
  tasa_ahorro_objetivo numeric not null check (tasa_ahorro_objetivo >= 0 and tasa_ahorro_objetivo <= 100),
  updated_at timestamptz not null default now()
);

alter table presupuestos enable row level security;

create policy "Acceso abierto fase 1"
  on presupuestos
  for all
  using (true)
  with check (true);
