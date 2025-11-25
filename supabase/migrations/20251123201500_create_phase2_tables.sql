-- Create groups table
create table public.groups (
  id uuid not null default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (id)
);

-- Create group_members table
create table public.group_members (
  id uuid not null default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- 'owner', 'admin', 'member'
  joined_at timestamptz not null default now(),
  primary key (id),
  unique (group_id, user_id)
);

-- Create recipes table
create table public.recipes (
  id uuid not null default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  instructions text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

-- Create ingredients table
create table public.ingredients (
  id uuid not null default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity text,
  unit text,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- Create tags table
create table public.tags (
  id uuid not null default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (id),
  unique (group_id, name)
);

-- Create recipe_tags table
create table public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- Enable RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.tags enable row level security;
alter table public.recipe_tags enable row level security;

-- RLS Policies

-- Groups:
-- Users can view groups they are members of
create policy "Users can view groups they belong to"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );

-- Users can insert groups (anyone authenticated)
create policy "Users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

-- Group Members:
-- Users can view members of their groups
create policy "Users can view members of their groups"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

-- Users can insert themselves as members (usually handled by backend or trigger, but for now allow if they are the creator of the group or invited - simplified for now to allow creator to add themselves)
-- Actually, when creating a group, we need to add the creator to group_members.
create policy "Users can join groups"
  on public.group_members for insert
  with check (user_id = auth.uid()); 

-- Recipes:
-- Users can view recipes of their groups
create policy "Users can view recipes of their groups"
  on public.recipes for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = recipes.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Users can insert recipes to their groups
create policy "Users can create recipes in their groups"
  on public.recipes for insert
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = recipes.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Users can update recipes in their groups
create policy "Users can update recipes in their groups"
  on public.recipes for update
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = recipes.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Users can delete recipes in their groups
create policy "Users can delete recipes in their groups"
  on public.recipes for delete
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = recipes.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Ingredients:
-- Inherit access from recipe
create policy "Users can view ingredients of visible recipes"
  on public.ingredients for select
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = ingredients.recipe_id
      and exists (
        select 1 from public.group_members
        where group_members.group_id = recipes.group_id
        and group_members.user_id = auth.uid()
      )
    )
  );

create policy "Users can manage ingredients of visible recipes"
  on public.ingredients for all
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = ingredients.recipe_id
      and exists (
        select 1 from public.group_members
        where group_members.group_id = recipes.group_id
        and group_members.user_id = auth.uid()
      )
    )
  );

-- Tags:
-- View tags of their groups
create policy "Users can view tags of their groups"
  on public.tags for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = tags.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can manage tags of their groups"
  on public.tags for all
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = tags.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Recipe Tags:
-- View/Manage if they have access to the recipe
create policy "Users can view recipe tags"
  on public.recipe_tags for select
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_tags.recipe_id
      and exists (
        select 1 from public.group_members
        where group_members.group_id = recipes.group_id
        and group_members.user_id = auth.uid()
      )
    )
  );

create policy "Users can manage recipe tags"
  on public.recipe_tags for all
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_tags.recipe_id
      and exists (
        select 1 from public.group_members
        where group_members.group_id = recipes.group_id
        and group_members.user_id = auth.uid()
      )
    )
  );
