-- PERIODO FINANCIERO: «Mi mes empieza el día…» (docs/PERIODO.md).
-- SOLO PARA EL PROYECTO «palanca dev». No ejecutar en producción (palanca).
-- Antes de pegar: comprueba arriba a la izquierda del panel de Supabase que el
-- proyecto abierto es palanca dev, y vacía el SQL Editor.
--
-- Aditivo y seguro:
--  · Añade UNA columna a perfiles con valor 1 por defecto: todos los perfiles
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

-- Comprobación (debe salir 1 fila por perfil, todas con 1):
-- select dia_inicio_periodo, count(*) from public.perfiles group by 1;

-- ROLLBACK (solo si quieres deshacerlo):
-- alter table public.perfiles drop constraint if exists perfiles_dia_inicio_periodo_rango;
-- alter table public.perfiles drop column if exists dia_inicio_periodo;
