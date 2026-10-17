# AGENTS.md — instrucciones para Codex (y cualquier agente de IA)

Palanca es una PWA de finanzas personales: React + Vite + vite-plugin-pwa,
backend Supabase, deploy en Vercel. En este repo también trabaja Claude Code;
las reglas son las mismas para los dos (ver `CLAUDE.md`, que manda si hay duda).

## Antes de empezar

Lee, por este orden:

1. `CLAUDE.md`: reglas de cálculo, arquitectura de datos y formato.
2. `docs/ESTADO.md`: qué está vivo y qué falta.
3. `docs/PENDIENTES.md`: lista maestra de lo pendiente.
4. `docs/COLABORACION-IA.md`: cómo trabajamos dos IAs en el mismo repo.
5. Según la tarea:
   - `docs/MOTOR.md`: contrato del motor financiero, inamovible.
   - `docs/DISENO.md`: sistema visual. Hay que leerlo antes de tocar estilos.
   - `docs/PANTALLAS.md`: guía pantalla a pantalla.

## Reglas que no se negocian

- **Ramas.**
  - Trabaja siempre en una rama `codex/<tema>`, creada desde `develop`.
  - Abre un PR contra `develop`.
  - Nunca empujes a `main`, ni a `develop` directamente, ni a ramas `claude/*`.
  - `main` = producción. Solo Eric decide lanzar.
- **Cálculos.**
  - Gasto, ahorro, inversión, traspasos y devoluciones se calculan **solo** con `src/lib/movimientosUtils.js` y `src/lib/categorias.js`.
  - No recalcules a mano en componentes.
- **Datos.**
  - `App.jsx` carga todos los movimientos una vez y los pasa por props.
  - No añadas consultas a Supabase por pantalla.
- **Formato.** Usa `formatearEuros`, `formatearFecha` y `formatearPorcentaje`.
- **Diseño.**
  - Un solo acento, sin degradados de marca ni resplandores.
  - Los iconos salen de `src/components/Icono.jsx`.
- **Fulcro (asistente).**
  - Las cifras las da el motor (`src/lib/respuestasLocales.js`). La IA solo redacta.
  - Las preguntas nuevas deben resolverse primero en el motor.
- **Secretos.**
  - Nunca escribas claves en el código ni en commits (`.env` no se sube).
  - El SQL para Supabase va en un fichero `supabase-*.sql`, como un único bloque limpio.
- **Idioma.** El texto visible y los comentarios van en español, con el tono de la app.

## Antes de abrir el PR

```bash
npm ci
npx vitest run     # todos los tests en verde
npx vite build     # el build tiene que compilar
```

- Si cambias una pantalla, actualiza `docs/PANTALLAS.md`.
- Lo que dejes a medias o para más adelante se apunta en `docs/PENDIENTES.md`.
- En la descripción del PR explica qué cambia, cómo lo has probado y qué queda pendiente.
