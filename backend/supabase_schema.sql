-- Run this in Supabase: Dashboard -> SQL Editor -> New query

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  category text not null default 'Uncategorized',
  description text not null,
  txn_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on expenses(user_id);

-- Row Level Security: even though our backend uses the service-role key
-- (which bypasses RLS), enabling this protects you if the anon key is
-- ever used directly from the frontend later.
alter table expenses enable row level security;

create policy "Users can view their own expenses"
  on expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own expenses"
  on expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own expenses"
  on expenses for delete
  using (auth.uid() = user_id);
