-- Amplía los objetivos del alta: "suscripciones" (Controlar suscripciones y
-- recibos) no estaba permitido y bloqueaba crear la cuenta.
alter table public.perfiles drop constraint if exists perfiles_objetivo_check;
alter table public.perfiles add constraint perfiles_objetivo_check
  check (objetivo in ('ahorro', 'jubilacion', 'planificacion', 'suscripciones', 'otro'));
