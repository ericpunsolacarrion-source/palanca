-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y "Run"

-- 1) Objetivo de inversión mensual (se guarda junto a la tasa de ahorro)
alter table presupuestos
  alter column tasa_ahorro_objetivo drop not null;

alter table presupuestos
  add column objetivo_inversion_mensual numeric;

-- 2) Simulaciones guardadas (hipoteca e interés compuesto)
create table simulaciones_guardadas (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null check (tipo in ('hipoteca', 'interes_compuesto')),
  nombre text not null,
  datos jsonb not null,
  created_at timestamptz not null default now()
);

create index simulaciones_guardadas_usuario_id_idx on simulaciones_guardadas (usuario_id);

alter table simulaciones_guardadas enable row level security;

create policy "Acceso abierto fase 1"
  on simulaciones_guardadas
  for all
  using (true)
  with check (true);
