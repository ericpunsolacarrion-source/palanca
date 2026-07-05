-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y "Run"

alter table presupuestos
  add column metodo text not null default 'tasa' check (metodo in ('tasa', 'fijo'));

alter table presupuestos
  add column gasto_maximo_fijo numeric;
