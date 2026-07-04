-- Ejecutar esto en Supabase: SQL Editor -> New query -> pegar y "Run"

create table movimientos (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  categoria text not null check (categoria in ('Nomina', 'Vivienda', 'Comida', 'Ocio', 'Transporte', 'Ahorro')),
  importe numeric not null check (importe > 0),
  fecha date not null,
  nota text,
  created_at timestamptz not null default now()
);

create index movimientos_usuario_id_idx on movimientos (usuario_id);

-- Fase 1 no tiene login real, así que no hay auth.uid() con el que filtrar.
-- Habilitamos RLS pero con una política abierta: cualquiera con la clave
-- pública puede leer/escribir. El aislamiento entre usuarios lo hace el
-- filtro por usuario_id en el propio código de la app, no la base de datos.
-- (Esto es una limitación conocida de fase 1 - ver README para más detalle)
alter table movimientos enable row level security;

create policy "Acceso abierto fase 1"
  on movimientos
  for all
  using (true)
  with check (true);
