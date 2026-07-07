# Palanca — PWA de finanzas personales

React + Vite + vite-plugin-pwa. Backend: Supabase (anon key en `.env`).
Deploy: push a `main` → Vercel (https://palanca-zeta.vercel.app).

**Guía detallada pantalla a pantalla: `docs/PANTALLAS.md`** (leerla al
empezar a trabajar en la app; mantenerla al día cuando cambien pantallas).

## Reglas de cálculo (única definición, aplicar en TODA la app)

Implementadas en `src/lib/movimientosUtils.js` (`totalesDe`, `agregarPorMes`).
No recalcular a mano en componentes: usar siempre estas utilidades.

- **Gasto** = movimientos de tipo `gasto` EXCLUYENDO la categoría `Inversion`.
  El gasto es solo consumo.
- **Inversión** = movimientos de tipo `gasto` con categoría `Inversion`
  (`esInversion()` en `src/lib/categorias.js`). Se muestra en dorado, nunca
  como gasto negativo.
- **Ahorro** = ingresos − gastos de consumo. La inversión ES parte del
  ahorro (invertir no penaliza el ratio de ahorro ni agota el presupuesto).
- **Ratio de ahorro** = ahorro / ingresos × 100 (0 si no hay ingresos).
- Toda agregación mensual agrupa por el campo **`fecha`** del movimiento
  (cuándo ocurrió), nunca por `created_at` ni asumiendo el mes actual.
  Meses sin datos aparecen a cero, no se omiten.

## Arquitectura de datos

- `App.jsx` carga **todos** los movimientos del usuario una sola vez
  (fuente única). Las pantallas reciben `movimientos` (histórico completo)
  o `movimientosMes` (mes actual) por props y derivan de ahí.
- Tras crear/editar/borrar, se llama `onGuardado()` → `cargarMovimientos()`
  y toda la app se refresca. No añadir consultas propias por pantalla.
- Una inversión ES una fila de `movimientos` con categoría `Inversion` y
  `fuente_id` = plataforma. No existe tabla separada de inversiones.

## Formato

- Moneda: `formatearEuros` (es-ES → `1.234,56 €`).
- Fechas visibles: `formatearFecha` (dd/mm/aaaa).
- Porcentajes con decimales: `formatearPorcentaje` (coma decimal).

## Decisiones tomadas sin consultar (ambigüedad menor)

- Captura de email: se guarda en `perfiles.email` (minúsculas). Si la
  columna aún no existe, el alta NO se bloquea (se crea el perfil sin
  email) y el banner `CapturaEmail` del dashboard lo pide después; el
  banner solo aparece cuando la columna ya existe en la BD.

- El historial de Movimientos muestra todo el histórico (no solo el mes);
  el resumen superior sí es del mes actual.
- El recordatorio "días sin registrar" usa `created_at` (cuándo se registró),
  no `fecha`, porque mide inactividad del usuario.
- Independencia financiera se desbloquea con 30 días de historial (medidos
  desde la primera `fecha`).

## Operativa

- El usuario tiene nivel básico: para SQL en Supabase, darle un único bloque
  limpio y recordarle vaciar el SQL Editor antes de pegar.
- Trabajo autónomo autorizado: construir, probar en preview, commit y push
  sin pedir confirmación. Limpiar usuarios de prueba (`test*`) de Supabase
  al terminar.
