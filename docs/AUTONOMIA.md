# Palanca — Modelo de trabajo autónomo

> Objetivo: que el desarrollo avance **cada día** con mínima intervención (15–20
> min del responsable), manteniendo **producción siempre segura**.

## El bucle diario
1. **Disparo:** una rutina programada (días laborables, ~07:40) arranca una
   sesión de trabajo en la nube.
2. **Trabajo en DEV:** rama `feature/*` salida de `develop`; se itera
   **prueba-error** con `build` + `lint` + `tests` (vitest) + preview contra
   **`palanca-dev`**. Nunca se toca producción.
3. **Entrega:** `push` de la rama + **PR hacia `develop`** con un resumen claro
   de qué se hizo y por qué.
4. **Bloqueo:** si aparece una duda que requiere decisión del responsable, se
   **para esa tarea**, se anota, se **notifica al móvil** y se sigue con la
   siguiente del backlog (no se queda parado todo).
5. **Revisión humana (15–20 min/día):** el responsable mira PRs y dudas y aprueba.
6. **Producción:** `develop → main` **solo con aprobación explícita** (un toque
   desde el móvil, GitHub). **Nunca automático.**

## Guardarraíles (inamovibles)
- Nunca trabajar sobre `main` directamente.
- `palanca-dev` para todo; **producción intocable sin aprobación**.
- El contrato del motor (`docs/MOTOR.md`) no se reabre; cambios del motor
  **siempre vía PR revisada**.
- Migraciones: primero en dev; en prod solo tras validar y con OK.
- Cambios grandes o que tocan datos: PR + resumen, nunca merge directo a `main`.

## Qué hace falta para "encenderlo"
- **Vercel:** variables por entorno + Production Branch = `main` (una vez).
- **Acceso GitHub** (token / `gh`): para abrir PRs y para que la rutina en la
  nube trabaje sobre el repo.
- **(Opcional) Token Supabase de DEV:** para aplicar migraciones en dev sin
  pegar SQL a mano.
- **Canal de notificación al móvil** (app de Claude / push).
- **Backlog priorizado** (abajo).

## Backlog (propuesta — reordénalo a tu gusto)
- **P1 · Terminar entornos:** Vercel scoping + desplegar `develop` como staging
  (para que puedas abrir el "Palanca de dev" desde el móvil).
- **P2 · Motor Fase 1 (cierre):** lecturas secundarias a céntimos, quitar
  columnas en euros, re-añadir `NOT NULL` en `*_centimos`.
- **P3 · Motor Fase 2:** nodos + apuntes derivados (mata `esInversion`/`esAjuste`).
  En PRs pequeñas y revisables.
- **P4 · Base:** presencia ambiente en el Dashboard + más pulido.
- **P5 · Tests:** ampliar cobertura del motor y de los flujos críticos.
- **P6 · (Producto) Monetización con Stripe (modo test):** planes premium,
  prototipo visual. Requiere **claves de test de Stripe** (nunca claves *live*
  en dev).

## Notas honestas
- El bucle hace **el grueso** del trabajo y se autoverifica (build/lint/tests/
  preview), pero **seguirá necesitando tu criterio** en decisiones de producto y
  en las aprobaciones a producción. No es magia infalible; es un equipo que
  trabaja solo y te consulta cuando toca.
- **Stripe** se integra en **modo test** cuando se priorice; sirve para ver el
  diseño y el flujo de pago sin cobrar de verdad.
