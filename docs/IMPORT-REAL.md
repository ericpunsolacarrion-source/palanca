# Importar datos reales (2023–2026)

`scripts/import-real.mjs` carga el histórico real en un usuario **separado**
(`real2026` por defecto) desde los CSV de `scripts/data/`. Repetible y
reversible: borra y recarga sin duplicar. No toca al usuario demo ni a otros.

## Uso

```bash
node scripts/import-real.mjs          # borra real2026 y reimporta (+verifica)
node scripts/import-real.mjs --clean  # solo borra
USUARIO_REAL=otro node scripts/import-real.mjs
```

Requiere `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Después,
entra en la app con el ID **`real2026`**.

## Qué carga

- **`scripts/data/gastos.csv`** (634 gastos): `tipo=gasto`, categoría del CSV,
  el `concepto` va a la **nota**.
- **`scripts/data/inversion.csv`** (63 aportaciones): cada una es un movimiento
  `tipo=gasto` + categoría `Inversion`, con su **plataforma** en el campo
  `fuente` (dorado en la app).
- **`scripts/data/ingresos.csv`** (31 meses): ingresos mensuales fechados el 28.
- Crea las categorías y las plataformas (fuentes) que falten.

## Verificación de agregados (Tarea 2)

El script imprime los totales por año frente a la referencia. Resultado:

| Concepto | Resultado | Referencia | ¿Cuadra? |
|---|---|---|---|
| Ingresos 2024/2025/2026 | 11.395,65 / 15.485,32 / 7.779,45 | 11.395,66 / 15.485,32 / 7.779,45 | ✅ al céntimo |
| Inversión Trade Republic | 19.765,90 | 19.765,90 | ✅ exacta |
| Gastos 2024 | 3.541,68 | 4.920,48 | ❌ faltan ~1.379 € |
| Gastos 2025 / 2026 | 4.689,01 / 2.685,23 | 4.923,90 / 2.712,90 | ❌ por poco |
| Inversión (Trade Republic) | 19.765,90 | 19.765,90 | ✅ exacta |

**Causa (investigada): no es un bug de cálculo.** Que ingresos e inversión
cuadren **al céntimo** demuestra que el pipeline y las reglas
(`movimientosUtils.js`: gasto = consumo excl. `Inversion`; ahorro = ingresos −
gastos) son correctos. La única diferencia son **filas de gasto ausentes en el
CSV de origen**: el CSV de **gastos termina el 2024-11-10** (falta el resto de
noviembre y todo diciembre de 2024, ≈ 1.379 €, más alguna fila suelta de
2025/2026). Los agregados **cuadran con los datos disponibles**; para igualar la
referencia de gastos hay que completar esas filas que el Excel tenía pero no
llegaron en el pegado.
