-- Palanca · Fulcro: registro de uso y límite diario de preguntas.
-- Ejecutar en Supabase: SQL Editor -> (vaciar el editor) -> pegar -> "Run".
-- Es seguro ejecutarlo más de una vez.
--
-- Cada pregunta a Fulcro deja una fila con los tokens consumidos: sirve para
-- (1) aplicar el límite diario por usuario en el servidor y (2) ver el coste real.
-- El usuario solo puede LEER e INSERTAR sus propias filas (no borrarlas ni
-- editarlas), así no puede "resetear" su contador.

create table if not exists public.fulcro_uso (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      text not null,
  modelo          text not null,
  tokens_entrada  int not null default 0,
  tokens_salida   int not null default 0,
  tokens_cache    int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists fulcro_uso_usuario_fecha_idx
  on public.fulcro_uso (usuario_id, created_at desc);

alter table public.fulcro_uso enable row level security;

drop policy if exists fulcro_uso_sel on public.fulcro_uso;
drop policy if exists fulcro_uso_ins on public.fulcro_uso;
create policy fulcro_uso_sel on public.fulcro_uso
  for select to authenticated using (usuario_id = auth.uid()::text);
create policy fulcro_uso_ins on public.fulcro_uso
  for insert to authenticated with check (usuario_id = auth.uid()::text);
