# Palanca — Entornos y ramas

> Cómo se separan producción y desarrollo. Objetivo: **ningún preview ni entorno
> de desarrollo (ni el que usa Claude) debe tocar la base de datos de producción.**

## Modelo

| Rama | Entorno | Base de datos Supabase |
|---|---|---|
| `main` | **PROD** (producción, usuarios reales) | **palanca** (`gbbcqsxndqnlgzwlbhky`) |
| `develop` | **DEV/STAGING** (interno) | **palanca-dev** (`salondursqfjxcwporhu`) |
| `feature/*` | **DEV** (previews de Vercel) | **palanca-dev** |
| Local / Claude (`npm run dev`) | DEV | **palanca-dev** |

Flujo: `develop → feature/nombre → develop`, y `develop → main` **solo cuando lo
decida el responsable**. Nunca trabajar directamente sobre `main`.

## Variables de entorno

El frontend lee solo dos (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
El backend `/api` usa además `ANTHROPIC_API_KEY` (clave del modelo, solo servidor).

### Local (`.env`, no se sube a git)
Apunta **siempre a palanca-dev**:

```
VITE_SUPABASE_URL=https://salondursqfjxcwporhu.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key de palanca-dev>
```

La anon key de dev se saca en: Supabase → proyecto **palanca-dev** → Project
Settings → API → Project API keys → `anon public`.

### Vercel (dashboard → Settings → Environment Variables)
Cada variable se define **acotada por entorno**:

| Variable | Production (`main`) | Preview + Development (`develop`, `feature/*`) |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://gbbcqsxndqnlgzwlbhky.supabase.co` | `https://salondursqfjxcwporhu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key de **palanca** | anon key de **palanca-dev** |
| `ANTHROPIC_API_KEY` | (igual en todos) | (igual en todos) |

Y en Vercel → Settings → Git: **Production Branch = `main`**. Así, solo el deploy
de `main` habla con la DB de producción; los previews de `develop`/`feature/*`
hablan con palanca-dev.

## Montar / actualizar la base de datos de desarrollo

1. En el proyecto **palanca-dev**: SQL Editor → pegar `supabase-schema-completo.sql`
   (en la raíz del repo) → Run. Crea todo el esquema idéntico a prod (idempotente).
2. Auth: en palanca-dev, crea un usuario de prueba (sign up en la app apuntando a
   dev, o Authentication → Add user). Ajusta la confirmación de email según prefieras.
3. (Opcional) Sembrar datos de juego: `node scripts/seed-demo.mjs` con el `.env`
   apuntando a dev (usuario `demo2026`).

## Reglas de seguridad de datos

- **Nunca** apuntar local/preview/Claude a la DB de prod.
- Los scripts (`scripts/seed-demo.mjs`, `scripts/import-real.mjs`) usan el `.env`:
  con `.env` → dev, operan sobre dev. `import-real.mjs` (datos reales) solo debe
  ejecutarse intencionadamente contra prod.
- El SQL se aplica manualmente; aplicar primero en dev, y en prod solo tras validar.
