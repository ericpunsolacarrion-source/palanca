-- PERIODO FINANCIERO: «Mi mes empieza el día…» (docs/PERIODO.md).
-- SOLO PARA EL PROYECTO «palanca dev». No ejecutar en producción (palanca).
-- Antes de pegar: comprueba arriba a la izquierda del panel de Supabase que el
-- proyecto abierto es palanca dev, y vacía el SQL Editor.
--
-- Aditivo y seguro:
--  · Añade TRES columnas a perfiles (día de inicio, día de cobro, automático) con valor 1 por defecto: todos los perfiles
--    existentes siguen exactamente igual (1 = mes natural, como hasta ahora).
--  · No toca movimientos, fechas ni importes. No crea tablas.
--  · RLS: perfiles ya tiene sus políticas por usuario; la columna nueva queda
--    cubierta por ellas (cada usuario solo lee y cambia su propia fila).
--  · Se puede ejecutar dos veces sin romper nada.
-- Mientras no se ejecute, la app guarda el ajuste en el navegador del usuario.

alter table public.perfiles
  add column if not exists dia_inicio_periodo smallint not null default 1;

alter table public.perfiles drop constraint if exists perfiles_dia_inicio_periodo_rango;
alter table public.perfiles
  add constraint perfiles_dia_inicio_periodo_rango check (dia_inicio_periodo between 1 and 28);

-- Día de cobro de la nómina que el usuario dice en el alta (1–31, o vacío si
-- no cobra nómina o varía) y si Palanca ajusta el día de inicio sola según
-- cuándo llega la nómina de verdad. Por defecto NO (perfiles existentes igual).
alter table public.perfiles
  add column if not exists dia_cobro_nomina smallint;
alter table public.perfiles drop constraint if exists perfiles_dia_cobro_nomina_rango;
alter table public.perfiles
  add constraint perfiles_dia_cobro_nomina_rango check (dia_cobro_nomina is null or dia_cobro_nomina between 1 and 31);
alter table public.perfiles
  add column if not exists periodo_automatico boolean not null default false;

-- Comprobación (debe salir 1 fila por perfil, todas con 1):
-- select dia_inicio_periodo, count(*) from public.perfiles group by 1;

-- ROLLBACK (solo si quieres deshacerlo):
-- alter table public.perfiles drop constraint if exists perfiles_dia_inicio_periodo_rango;
-- alter table public.perfiles drop column if exists dia_inicio_periodo;
-- alter table public.perfiles drop constraint if exists perfiles_dia_cobro_nomina_rango;
-- alter table public.perfiles drop column if exists dia_cobro_nomina;
-- alter table public.perfiles drop column if exists periodo_automatico;
