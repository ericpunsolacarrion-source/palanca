# Colaboración Claude + Codex

Dos agentes trabajan en el mismo repo sin pisarse. Eric reparte las tareas.

## Reparto

| Quién | Rama | Cómo entrega |
|---|---|---|
| Claude Code | `develop` (y su rama `claude/*`) | Commit y push directo, como hasta ahora |
| Codex | `codex/<tema>` desde `develop` | PR contra `develop`; Claude lo revisa antes de fusionar |
| Eric | — | Decide qué se hace y cuándo se lanza (`main`) |

## Reglas

1. **Una tarea, un dueño.** Nunca los dos en la misma pantalla o fichero a la vez.
   Si una tarea toca algo que el otro tiene abierto, se espera.
2. **Revisión cruzada.**
   - Los PR de Codex los revisa Claude: motor, diseño y tests.
   - Si Eric quiere, Codex puede revisar lo de Claude: le pide un review en la PR o en el commit.
3. **Mismas reglas.** `AGENTS.md`, que lee Codex, resume `CLAUDE.md`. Si cambian
   las reglas, se actualizan los dos.
4. **Antes de fusionar:** tests en verde (`npx vitest run`), build OK, y una prueba en
   la versión de pruebas (Vercel crea preview por PR).
5. **Producción:** nada llega a `main` sin que Eric diga «lánzalo».

## Tareas buenas para Codex

Acotadas y con criterio claro de "hecho":

- un test que falta;
- un ajuste visual concreto;
- una pregunta nueva de Fulcro con su caso de test;
- un texto o una traducción.

Las tareas que tocan el motor financiero o la base de datos, mejor con Claude o con revisión
cuidadosa.
