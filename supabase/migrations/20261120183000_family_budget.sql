begin;

create table if not exists public.family_budget_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  paid_by_profile_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text,
  category text not null default 'egyeb',
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'HUF',
  spent_at timestamptz not null default now(),
  split jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_budget_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  target_cents bigint not null check (target_cents > 0),
  saved_cents bigint not null default 0 check (saved_cents >= 0),
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  provider text,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'HUF',
  billing_cycle text not null default 'monthly',
  next_billing_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_budget_transactions_family_date_idx
  on public.family_budget_transactions(family_id, spent_at desc);
create index if not exists family_budget_goals_family_idx
  on public.family_budget_goals(family_id, deadline);
create index if not exists family_subscriptions_family_idx
  on public.family_subscriptions(family_id, next_billing_at);

alter table public.family_budget_transactions enable row level security;
alter table public.family_budget_goals enable row level security;
alter table public.family_subscriptions enable row level security;

revoke all on table public.family_budget_transactions from anon, authenticated;
revoke all on table public.family_budget_goals from anon, authenticated;
revoke all on table public.family_subscriptions from anon, authenticated;

grant select, insert, update, delete on public.family_budget_transactions to authenticated;
grant select, insert, update, delete on public.family_budget_goals to authenticated;
grant select, insert, update, delete on public.family_subscriptions to authenticated;

drop policy if exists family_budget_transactions_family on public.family_budget_transactions;
create policy family_budget_transactions_family
on public.family_budget_transactions
for all to authenticated
using ((select private.is_family_member(family_id)))
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
);

drop policy if exists family_budget_goals_family on public.family_budget_goals;
create policy family_budget_goals_family
on public.family_budget_goals
for all to authenticated
using ((select private.is_family_member(family_id)))
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
);

drop policy if exists family_subscriptions_family on public.family_subscriptions;
create policy family_subscriptions_family
on public.family_subscriptions
for all to authenticated
using ((select private.is_family_member(family_id)))
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
);

commit;
