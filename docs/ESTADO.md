# Palanca — Estado del proyecto (empieza aquí)

> **Mapa de una pantalla para orientarse rápido.** Léelo al empezar cualquier
> sesión: qué está vivo, dónde mirar, qué sigue. Mantenerlo al día tras cada
> cambio relevante o despliegue.
>
> **Última actualización:** 2026-08-03 · **Último deploy:** `a549a33`

---

## Qué es
PWA de finanzas personales (React 19 + Vite + Supabase). Estética oscura,
premium, minimalista. Misión y detalle de negocio: **[ESTADO-PLATAFORMA.md](ESTADO-PLATAFORMA.md)**.

## Qué está vivo en producción (verificado)
- **Motor con precisión al céntimo (Fase 1):** todo el dinero se guarda y se
  calcula en **céntimos enteros** (patrimonio exacto, sin deriva de float).
  Doble escritura `importe` + `*_centimos` en las 7 tablas de dinero.
- **Módulo "Base"** (antes "Recurrentes"): la *biografía del dinero fijo* —
  héroe de gastos fijos, compromisos con historia, hoja de detalle, sello al
  confirmar, y **anillo-interruptor 1:1** (marcar crea movimiento; volver a
  tocar lo borra por completo, sin huérfanos).
- Resto de la app previo (dashboard, presupuesto, inversión, simuladores,
  consultor IA "Fulcro", importación CSV, auth + RLS).

## Dónde mirar (documentos clave)
| Tema | Documento |
|---|---|
| **Contrato del motor** (invariantes, inamovible) | **[MOTOR.md](MOTOR.md)** |
| Guía pantalla a pantalla | [PANTALLAS.md](PANTALLAS.md) |
| Estado de plataforma / negocio (dossier largo) | [ESTADO-PLATAFORMA.md](ESTADO-PLATAFORMA.md) |
| Reglas de cálculo y disciplina | [../CLAUDE.md](../CLAUDE.md) |

Código núcleo del cálculo: `src/lib/movimientosUtils.js` (`bolsas`, `totalesDe`).
Frontera euros↔céntimos: `src/lib/importe.js` (`aCentimos`/`aEuros`).

## Roadmap del motor (diseñado en MOTOR.md, orden acordado)
1. **Fase 1 — Precisión decimal.** ✅ Desplegada.
   - Pendiente housekeeping (baja prioridad): conmutar lecturas de las tablas
     secundarias a céntimos, retirar columnas en euros, re-añadir `NOT NULL` en
     `*_centimos` (tras un tiempo con doble escritura en prod).
2. **Fase 2 — Nodos + apuntes derivados.** ⬜ Pendiente. Mata la semántica por
   nombre de categoría (`esInversion`/`esAjuste`); el patrimonio deriva de
   apuntes entre nodos.
3. **Fase 3 — Historia versionada.** ⬜ Editar/borrar = anexar versión; nada se
   pierde (append-only).
4. **Fase 4 — Reconciliación por atestación + residuo.** ⬜ El ajuste deja de
   ser un tapón; residuo derivado reabsorbible.

## Deuda técnica / cosas a vigilar
- Housekeeping de Fase 1 (arriba).
- **Base · "Total pagado":** exacto desde ahora (guarda el importe real por
  confirmación); las confirmaciones hechas **antes** del arreglo del anillo no
  tienen `movimiento_id` → al deshacerlas se quita la marca pero no se borra su
  movimiento antiguo. No hacer deshacer+remarcar en esas.
- La valoración a mercado, multidivisa y dividendos NO están (patrimonio a
  coste); son ampliaciones previstas (ver MOTOR.md §F2b/§10).

## Cómo trabajar aquí
- **No romper nunca los datos reales.** Cambios incrementales y verificables.
- Antes de dar algo por hecho: `npm run build`, `oxlint` (`npm run lint`) y
  `npm test` (vitest) en verde.
- **Deploy = push a `main`** → Vercel. Verifica build local antes de desplegar.
- SQL para Supabase: un único bloque limpio; recordar vaciar el SQL Editor.
- Respetar el contrato de **MOTOR.md**: no reabrirlo salvo contradicción
  objetiva con una invariante.
