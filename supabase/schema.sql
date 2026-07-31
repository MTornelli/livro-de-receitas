-- ============================================================================
--  Livro de Receitas — schema do Supabase
--  Rode este arquivo inteiro no SQL Editor do seu projeto (roda mais de uma
--  vez sem quebrar nada).
-- ============================================================================

-- ── Tabela de receitas ──────────────────────────────────────────────────────
-- Guarda apenas as receitas criadas pelo usuário. As receitas nativas do app
-- (molhos-mãe, receitas de chefs) continuam no HTML e não vão para o banco.
create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- id numérico que a receita já tem no app (Date.now()). Serve para a migração
  -- ser idempotente: se você abrir o app duas vezes, a mesma receita não entra
  -- duplicada. Também é o id que a lista de compras usa, então ele é a chave
  -- que o front continua enxergando.
  local_id    text not null,

  emoji       text not null default '🍽️',
  name        text not null,
  category    text not null default 'Minhas receitas',
  time_label  text not null default '—',
  description text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  steps       jsonb not null default '[]'::jsonb,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Uma receita só pode existir uma vez por usuário. É isto que faz a migração
-- e o upsert do app serem seguros de repetir.
create unique index if not exists recipes_user_local_id_idx
  on public.recipes (user_id, local_id);

-- Listagem por usuário, mais recentes primeiro.
create index if not exists recipes_user_created_idx
  on public.recipes (user_id, created_at desc);

-- ── updated_at automático ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Sem isto, a chave anon (que fica visível no código do site) daria acesso a
-- todas as receitas de todo mundo. Com isto, cada usuário só alcança as suas.
alter table public.recipes enable row level security;

drop policy if exists "recipes_select_own" on public.recipes;
create policy "recipes_select_own" on public.recipes
  for select using (auth.uid() = user_id);

drop policy if exists "recipes_insert_own" on public.recipes;
create policy "recipes_insert_own" on public.recipes
  for insert with check (auth.uid() = user_id);

drop policy if exists "recipes_update_own" on public.recipes;
create policy "recipes_update_own" on public.recipes
  for update using (auth.uid() = user_id)
           with check (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on public.recipes;
create policy "recipes_delete_own" on public.recipes
  for delete using (auth.uid() = user_id);
