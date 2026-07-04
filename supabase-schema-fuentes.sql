-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y "Run"
-- Añade "fuentes" reutilizables (ej. "Restaurante", "Oficina", "Alquiler")
-- que el usuario puede asignar a cada movimiento, para diferenciar por
-- ejemplo dos nóminas de trabajos distintos.

create table fuentes (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (usuario_id, tipo, nombre)
);

create index fuentes_usuario_id_idx on fuentes (usuario_id);

alter table fuentes enable row level security;

create policy "Acceso abierto fase 1"
  on fuentes
  for all
  using (true)
  with check (true);

alter table movimientos
  add column fuente_id uuid references fuentes(id) on delete set null;
