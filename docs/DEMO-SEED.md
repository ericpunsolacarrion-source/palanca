# Datos de demostración (36 meses)

`scripts/seed-demo.mjs` rellena la app con 3 años de datos inventados pero
realistas para un **usuario de demo separado** (`demo2026` por defecto), sin
tocar datos reales ni el esquema (solo inserta filas; aditivo y reversible).

La historia que cuentan los datos: un joven en España que progresa a lo largo
de 3 años —ingresos e inversión crecientes, algún mes en rojo al principio— para
que al entrar con ese usuario se iluminen **todas** las funcionalidades:
dashboard con proyección, evolución de 6 meses, gasto por categoría, inversión
de 12 meses, presupuesto, objetivo de inversión mensual (con el mes actual
superándolo, >100 %), múltiples objetivos de ahorro e historial en acordeón.

## Requisitos

- Node 18+ (usa `fetch` y el cliente `@supabase/supabase-js`, ya instalado).
- Un `.env` en la raíz con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
  (los mismos que usa la app).
- La tabla `objetivos_ahorro` creada (`supabase-schema-objetivos.sql`). Si aún
  no existe, el resto se siembra igual y solo se omiten los objetivos de ahorro.

## Uso

```bash
# Sembrar (borra el demo anterior y lo regenera de cero)
node scripts/seed-demo.mjs

# Solo borrar los datos del usuario demo
node scripts/seed-demo.mjs --clean

# Usar otro id de demo
USUARIO_DEMO=demoX node scripts/seed-demo.mjs
```

Después, entra en la app con el ID **`demo2026`** para ver todo lleno.

## Notas

- Los datos son **deterministas** (semilla fija): regenerar da el mismo
  resultado. Cambia la semilla en el script si quieres otra variación.
- Cada inversión se crea como un movimiento `tipo=gasto` + categoría `Inversion`
  (modelo único), así se refleja de forma coherente en Inversión y en el
  dashboard.
- Para limpiar del todo al terminar: `node scripts/seed-demo.mjs --clean`.
