-- Palanca · Periodicidad de los compromisos de Base (suscripciones, recibos…)
-- Ejecutar en Supabase: SQL Editor -> (vaciar el editor) -> pegar -> "Run".
-- Es seguro ejecutarlo más de una vez.

alter table public.recurrentes
  add column if not exists periodo_meses int not null default 1
    check (periodo_meses in (1, 2, 3, 6, 12));

alter table public.recurrentes
  add column if not exists mes_inicio int
    check (mes_inicio between 1 and 12);
