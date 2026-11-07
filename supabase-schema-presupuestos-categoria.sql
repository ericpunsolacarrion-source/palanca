-- Límites de gasto POR CATEGORÍA (Presupuesto v5). Aditivo: no toca ninguna
-- tabla existente ni ningún movimiento. Ejecutar en Supabase: SQL Editor →
-- New query → pegar y "Run". Se puede ejecutar dos veces sin romper nada.
--
-- Mientras no se ejecute, la app guarda los límites en el navegador de cada
-- usuario (y los sube aquí sola en cuanto la tabla exista).

create table if not exists public.presupuestos_categoria (
  usuario_id text not null,
  categoria_id text not null,
  categoria_nombre text not null,
  importe numeric not null check (importe > 0),
  importe_centimos bigint not null check (importe_centimos > 0),
  updated_at timestamptz not null default now(),
  primary key (usuario_id, categoria_id)
);

alter table public.presupuestos_categoria enable row level security;

-- Cada usuario solo ve y cambia los suyos (mismo patrón que supabase-auth-rls.sql).
drop policy if exists palanca_sel on public.presupuestos_categoria;
drop policy if exists palanca_ins on public.presupuestos_categoria;
drop policy if exists palanca_upd on public.presupuestos_categoria;
drop policy if exists palanca_del on public.presupuestos_categoria;
create policy palanca_sel on public.presupuestos_categoria for select to authenticated using (usuario_id = auth.uid()::text);
create policy palanca_ins on public.presupuestos_categoria for insert to authenticated with check (usuario_id = auth.uid()::text);
create policy palanca_upd on public.presupuestos_categoria for update to authenticated using (usuario_id = auth.uid()::text) with check (usuario_id = auth.uid()::text);
create policy palanca_del on public.presupuestos_categoria for delete to authenticated using (usuario_id = auth.uid()::text);

-- ROLLBACK (solo si quieres deshacerlo): drop table public.presupuestos_categoria;
