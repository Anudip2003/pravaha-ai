-- Run once in Supabase SQL Editor to enable saved cash-flow planning settings.

create table if not exists finance_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_income numeric not null default 0 check (monthly_income >= 0),
  category_budgets jsonb not null default '{}'::jsonb check (jsonb_typeof(category_budgets) = 'object'),
  recurring_expenses jsonb not null default '[]'::jsonb check (jsonb_typeof(recurring_expenses) = 'array'),
  updated_at timestamptz not null default now()
);

alter table finance_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'finance_settings'
      and policyname = 'Users can view their own finance settings'
  ) then
    create policy "Users can view their own finance settings"
      on finance_settings for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'finance_settings'
      and policyname = 'Users can create their own finance settings'
  ) then
    create policy "Users can create their own finance settings"
      on finance_settings for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'finance_settings'
      and policyname = 'Users can update their own finance settings'
  ) then
    create policy "Users can update their own finance settings"
      on finance_settings for update
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'finance_settings'
      and policyname = 'Users can delete their own finance settings'
  ) then
    create policy "Users can delete their own finance settings"
      on finance_settings for delete using (auth.uid() = user_id);
  end if;
end $$;