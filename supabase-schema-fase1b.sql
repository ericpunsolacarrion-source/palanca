-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y "Run"
-- Onboarding (objetivo) + categorías ampliables + fijo/variable

-- 1) Perfil del usuario (objetivo elegido en el onboarding)
create table perfiles (
  usuario_id text primary key,
  objetivo text not null check (objetivo in ('ahorro', 'jubilacion', 'planificacion', 'otro')),
  created_at timestamptz not null default now()
);

alter table perfiles enable row level security;

create policy "Acceso abierto fase 1"
  on perfiles
  for all
  using (true)
  with check (true);

-- 2) Categorías ampliables por el usuario (antes eran una lista fija)
create table categorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (usuario_id, tipo, nombre)
);

create index categorias_usuario_id_idx on categorias (usuario_id);

alter table categorias enable row level security;

create policy "Acceso abierto fase 1"
  on categorias
  for all
  using (true)
  with check (true);

-- 3) movimientos: la categoría pasa a referenciar la tabla nueva,
--    y añadimos si el movimiento es fijo o variable (para presupuestos
--    y previsiones futuras).
alter table movimientos drop column categoria;

alter table movimientos
  add column categoria_id uuid references categorias(id) on delete set null;

alter table movimientos
  add column es_fijo boolean not null default false;
