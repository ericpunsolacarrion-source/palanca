# Consultor IA — puesta en marcha

> **Este documento se ha sustituido por [`FULCRO.md`](FULCRO.md)**, que es la
> fuente única y actual: activación (solo en dev por ahora), variables de
> entorno, modelo y coste, alcance, seguridad y banco de pruebas.

Resumen rápido para activarlo en el entorno de pruebas:

1. Supabase: ejecutar `supabase-schema-fulcro.sql` (tabla de uso + funciones
   del cupo diario atómico).
2. console.anthropic.com: poner un **límite de gasto mensual** y crear una API key.
3. Vercel → Settings → Environment Variables: `ANTHROPIC_API_KEY` **solo en
   "Preview"** (no en Production mientras Fulcro esté en pruebas).
4. Redesplegar `develop` y abrir su enlace de prueba.
