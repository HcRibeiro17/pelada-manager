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

## 3) Criar tabela de dados do app
No Supabase SQL Editor, execute:

```sql
create table if not exists public.app_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"eventos":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_user_data enable row level security;

drop policy if exists "select own data" on public.app_user_data;
create policy "select own data"
on public.app_user_data
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own data" on public.app_user_data;
create policy "insert own data"
on public.app_user_data
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own data" on public.app_user_data;
create policy "update own data"
on public.app_user_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## 4) Auth usado no app
- Login: `email + senha`
- Cadastro: `nome de exibicao + usuario + email + senha`
- O email fica no Supabase Auth (`auth.users`).
- A tabela `app_user_data` guarda somente os dados do app por `user_id`.

## 5) Fluxo final
1. Abrir `login.html`
2. Criar conta com `nome + usuario + email + senha`
3. Entrar
4. Criar/editar eventos normalmente
5. Dados ficam no banco (tabela `app_user_data`)

## Observacoes
- O projeto nao usa mais `localStorage` como origem dos dados.
- `pessoas.html` ficou como redirecionamento para `login.html` por compatibilidade.
