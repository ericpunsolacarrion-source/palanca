-- Comprobación (no cambia nada): lista lo que le falta a la base de datos
-- respecto a los SQL del proyecto. Sin filas = todo al día (16-10-2026: OK en palanca).
-- Al añadir un SQL nuevo, añadir aquí sus tablas, columnas y funciones.
with esperado(tipo, nombre) as (values
  ('tabla','movimientos'),('tabla','categorias'),('tabla','fuentes'),('tabla','perfiles'),
  ('tabla','presupuestos'),('tabla','planificaciones'),('tabla','objetivos_ahorro'),
  ('tabla','simulaciones_guardadas'),('tabla','recurrentes'),('tabla','recurrentes_confirmaciones'),
  ('tabla','gastos_rapidos'),('tabla','escenarios_simulador'),('tabla','comercios_alias'),
  ('tabla','ahorros_negociados'),('tabla','fulcro_uso'),('tabla','eventos'),('tabla','admins'),
  ('tabla','planes'),('tabla','planes_historial'),('tabla','recordatorios_enviados'),
  ('columna','movimientos.categoria_id'),('columna','movimientos.fuente_id'),('columna','movimientos.es_fijo'),
  ('columna','presupuestos.metodo'),('columna','presupuestos.gasto_maximo_fijo'),('columna','presupuestos.objetivo_inversion_mensual'),
  ('columna','objetivos_ahorro.tipo'),('columna','recurrentes.periodo_meses'),('columna','recurrentes.mes_inicio'),
  ('columna','perfiles.anio_nacimiento'),('columna','perfiles.saldo_inicial'),('columna','perfiles.ultima_reconciliacion'),
  ('columna','perfiles.analitica'),('columna','perfiles.recordatorios'),('columna','perfiles.avisos_renovacion'),
  ('columna','perfiles.email'),('columna','perfiles.nombre'),
  ('funcion','borrar_mi_cuenta'),('funcion','fulcro_reservar'),('funcion','fulcro_registrar'),
  ('funcion','registrar_evento'),('funcion','soy_admin'),('funcion','palanca_metricas'),
  ('funcion','mi_plan'),('funcion','admin_cambiar_plan'),('funcion','recordatorios_candidatos')
)
select tipo as falta_tipo, nombre as falta
from esperado e
where not case tipo
  when 'tabla' then exists (select 1 from information_schema.tables t where t.table_schema = 'public' and t.table_name = e.nombre)
  when 'columna' then exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = split_part(e.nombre, '.', 1) and c.column_name = split_part(e.nombre, '.', 2))
  else exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = e.nombre)
end
order by 1, 2;
