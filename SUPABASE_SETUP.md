# Setup Supabase (Plano Gratis)

## 1) Criar projeto
1. Acesse https://supabase.com
2. Crie um projeto novo (free).
3. Em `Project Settings > API`, copie:
- `Project URL`
- `anon public key`

## 2) Configurar no projeto
Edite `config.js` na raiz:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "SUA_ANON_PUBLIC_KEY"
};
```

## 3) Criar modelo relacional (eventos + tabelas filhas)
No Supabase SQL Editor, execute:

```sql
create table if not exists public.events (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  owner_username text not null default '',
  owner_email text not null default '',
  nome text not null default '',
  dia_semana text not null default '',
  hora_inicio text not null default '',
  tipo text not null default '',
  limite_jogadores integer not null default 0,
  limite_goleiros integer not null default 0,
  match_duration_minutes integer not null default 10,
  active_match_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_players (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default '',
  posicao text not null default '',
  nivel integer not null default 0,
  mensalista boolean not null default false,
  gols_total integer not null default 0,
  assists_total integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_teams (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  player_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_matches (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  team_a_id text not null default '',
  team_b_id text not null default '',
  team_a_snapshot jsonb,
  team_b_snapshot jsonb,
  score jsonb not null default '{"teamA":0,"teamB":0}'::jsonb,
  created_at timestamptz not null default now(),
  start_time timestamptz,
  end_time timestamptz,
  duration_configured_sec integer not null default 0,
  remaining_sec integer not null default 0,
  elapsed_sec integer not null default 0,
  duration_real_sec integer not null default 0,
  status text not null default 'Em andamento',
  is_clock_running boolean not null default false,
  last_tick_at bigint,
  history_immutable boolean not null default false
);

create table if not exists public.event_match_goals (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  match_id text not null references public.event_matches(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  player_id text not null default '',
  player_name text not null default '',
  assist_player_id text not null default '',
  assist_player_name text not null default '',
  team_id text not null default '',
  team_name text not null default '',
  "timestamp" timestamptz not null default now(),
  elapsed_sec integer not null default 0
);

create index if not exists idx_events_owner_user_id on public.events(owner_user_id);
create index if not exists idx_event_players_event_id on public.event_players(event_id);
create index if not exists idx_event_players_owner_user_id on public.event_players(owner_user_id);
create index if not exists idx_event_teams_event_id on public.event_teams(event_id);
create index if not exists idx_event_teams_owner_user_id on public.event_teams(owner_user_id);
create index if not exists idx_event_matches_event_id on public.event_matches(event_id);
create index if not exists idx_event_matches_owner_user_id on public.event_matches(owner_user_id);
create index if not exists idx_event_match_goals_event_id on public.event_match_goals(event_id);
create index if not exists idx_event_match_goals_match_id on public.event_match_goals(match_id);
create index if not exists idx_event_match_goals_owner_user_id on public.event_match_goals(owner_user_id);

alter table public.events enable row level security;
alter table public.event_players enable row level security;
alter table public.event_teams enable row level security;
alter table public.event_matches enable row level security;
alter table public.event_match_goals enable row level security;

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
on public.events
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
on public.events
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "event_players_select_own" on public.event_players;
create policy "event_players_select_own"
on public.event_players
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "event_players_insert_own" on public.event_players;
create policy "event_players_insert_own"
on public.event_players
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "event_players_update_own" on public.event_players;
create policy "event_players_update_own"
on public.event_players
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "event_players_delete_own" on public.event_players;
create policy "event_players_delete_own"
on public.event_players
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "event_teams_select_own" on public.event_teams;
create policy "event_teams_select_own"
on public.event_teams
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "event_teams_insert_own" on public.event_teams;
create policy "event_teams_insert_own"
on public.event_teams
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "event_teams_update_own" on public.event_teams;
create policy "event_teams_update_own"
on public.event_teams
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "event_teams_delete_own" on public.event_teams;
create policy "event_teams_delete_own"
on public.event_teams
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "event_matches_select_own" on public.event_matches;
create policy "event_matches_select_own"
on public.event_matches
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "event_matches_insert_own" on public.event_matches;
create policy "event_matches_insert_own"
on public.event_matches
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "event_matches_update_own" on public.event_matches;
create policy "event_matches_update_own"
on public.event_matches
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "event_matches_delete_own" on public.event_matches;
create policy "event_matches_delete_own"
on public.event_matches
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "event_match_goals_select_own" on public.event_match_goals;
create policy "event_match_goals_select_own"
on public.event_match_goals
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "event_match_goals_insert_own" on public.event_match_goals;
create policy "event_match_goals_insert_own"
on public.event_match_goals
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "event_match_goals_update_own" on public.event_match_goals;
create policy "event_match_goals_update_own"
on public.event_match_goals
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "event_match_goals_delete_own" on public.event_match_goals;
create policy "event_match_goals_delete_own"
on public.event_match_goals
for delete
to authenticated
using (auth.uid() = owner_user_id);
```

## 4) Auth usado no app
- Login: `email + senha`
- Cadastro: `nome de exibicao + usuario + email + senha`
- O email fica no Supabase Auth (`auth.users`).
- Os dados ficam separados por usuario com `owner_user_id` em cada tabela.

## 5) Fluxo final
1. Abrir `login.html`
2. Criar conta com `nome + usuario + email + senha`
3. Entrar
4. Criar/editar eventos normalmente
5. Dados ficam no banco (tabelas `events`, `event_players`, `event_teams`, `event_matches`, `event_match_goals`)

## Observacoes
- O projeto nao usa `localStorage` como origem dos dados.
- `pessoas.html` ficou como redirecionamento para `login.html` por compatibilidade.
