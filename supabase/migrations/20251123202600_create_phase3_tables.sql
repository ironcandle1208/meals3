-- Create schedules table
create table public.schedules (
  id uuid not null default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  date date not null,
  meal_type text not null, -- 'breakfast', 'lunch', 'dinner', 'snack'
  recipe_id uuid references public.recipes(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- Create shopping_items table
create table public.shopping_items (
  id uuid not null default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  is_purchased boolean not null default false,
  source_type text not null default 'manual', -- 'auto', 'manual'
  created_at timestamptz not null default now(),
  primary key (id)
);

-- Enable RLS
alter table public.schedules enable row level security;
alter table public.shopping_items enable row level security;

-- RLS Policies

-- Schedules:
-- Users can view schedules of their groups
create policy "Users can view schedules of their groups"
  on public.schedules for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = schedules.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Users can manage schedules of their groups
create policy "Users can manage schedules of their groups"
  on public.schedules for all
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = schedules.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Shopping Items:
-- Users can view shopping items of their groups
create policy "Users can view shopping items of their groups"
  on public.shopping_items for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = shopping_items.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Users can manage shopping items of their groups
create policy "Users can manage shopping items of their groups"
  on public.shopping_items for all
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = shopping_items.group_id
      and group_members.user_id = auth.uid()
    )
  );
