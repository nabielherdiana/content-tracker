-- Content Tracker Schema (Supabase / PostgreSQL)
-- Safe to run in Supabase SQL Editor

create extension if not exists pgcrypto;

-- =============================================
-- Helpers
-- =============================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =============================================
-- Profiles
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  preferred_language text not null default 'id' check (preferred_language in ('id', 'en')),
  preferred_theme text not null default 'system' check (preferred_theme in ('light', 'dark', 'system')),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Backfill support for existing deployments where columns may not exist yet.
alter table public.profiles
  add column if not exists preferred_language text,
  add column if not exists preferred_theme text;

alter table public.profiles
  alter column preferred_language set default 'id',
  alter column preferred_theme set default 'system';

update public.profiles
set preferred_language = 'id'
where preferred_language is null
   or preferred_language not in ('id', 'en');

update public.profiles
set preferred_theme = 'system'
where preferred_theme is null
   or preferred_theme not in ('light', 'dark', 'system');

alter table public.profiles
  alter column preferred_language set not null,
  alter column preferred_theme set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_language_allowed'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_allowed
      check (preferred_language in ('id', 'en'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_theme_allowed'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_theme_allowed
      check (preferred_theme in ('light', 'dark', 'system'));
  end if;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger set_timestamp_profiles
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- keep trigger idempotent
 drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- Content Items (core task table)
-- =============================================
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  brief text,
  platform text,
  content_type text,
  status text not null default 'To Do' check (status in ('Backlog','To Do','On Going','Review','Revision','Done','Cancelled')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Urgent')),
  deadline date,
  publish_date timestamp with time zone,
  assignee uuid references auth.users(id) on delete set null,
  notes text,
  references_links jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  objective text,
  target_audience text,
  key_message text,
  call_to_action text,
  script_or_outline text,
  approval_status text,
  revision_notes text,
  source_brief text,
  estimated_effort numeric,
  actual_effort numeric,
  content_pillar text,
  campaign_name text,
  custom_fields_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.content_items enable row level security;

drop policy if exists "Users manage own content items" on public.content_items;
create policy "Users manage own content items"
  on public.content_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_timestamp_content_items
  before update on public.content_items
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- Custom Field Definitions
-- =============================================
create table if not exists public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  name text not null,
  field_type text not null check (field_type in ('text','textarea','number','date','select','multi-select','boolean','url')),
  is_required boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (user_id, key)
);

alter table public.custom_field_definitions enable row level security;

drop policy if exists "Users manage own custom field definitions" on public.custom_field_definitions;
create policy "Users manage own custom field definitions"
  on public.custom_field_definitions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_timestamp_custom_field_definitions
  before update on public.custom_field_definitions
  for each row execute procedure public.handle_updated_at();

-- Optional options table for select/multi-select
create table if not exists public.custom_field_options (
  id uuid primary key default gen_random_uuid(),
  field_definition_id uuid not null references public.custom_field_definitions(id) on delete cascade,
  value text not null,
  label text not null,
  order_index integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.custom_field_options enable row level security;

drop policy if exists "Users manage options for own custom fields" on public.custom_field_options;
create policy "Users manage options for own custom fields"
  on public.custom_field_options
  for all
  using (
    exists (
      select 1 from public.custom_field_definitions d
      where d.id = field_definition_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.custom_field_definitions d
      where d.id = field_definition_id
        and d.user_id = auth.uid()
    )
  );

-- Custom values table (future-friendly queryable model)
create table if not exists public.content_item_custom_values (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  field_definition_id uuid not null references public.custom_field_definitions(id) on delete cascade,
  value_json jsonb not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (content_item_id, field_definition_id)
);

alter table public.content_item_custom_values enable row level security;

drop policy if exists "Users manage own content custom values" on public.content_item_custom_values;
create policy "Users manage own content custom values"
  on public.content_item_custom_values
  for all
  using (
    exists (
      select 1 from public.content_items c
      where c.id = content_item_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.content_items c
      where c.id = content_item_id
        and c.user_id = auth.uid()
    )
  );

create trigger set_timestamp_content_item_custom_values
  before update on public.content_item_custom_values
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- Activity Logs
-- =============================================
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.activity_logs enable row level security;

drop policy if exists "Users manage activity logs for own content" on public.activity_logs;
create policy "Users manage activity logs for own content"
  on public.activity_logs
  for all
  using (
    exists (
      select 1 from public.content_items c
      where c.id = content_item_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.content_items c
      where c.id = content_item_id
        and c.user_id = auth.uid()
    )
  );

-- =============================================
-- AI Prompt Logs
-- =============================================
create table if not exists public.ai_prompt_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  action text not null check (action in ('create_one', 'create_many', 'update_existing')),
  parsed_result jsonb,
  status text not null check (status in ('success', 'failed')),
  error_message text,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.ai_prompt_logs enable row level security;

drop policy if exists "Users manage own ai prompt logs" on public.ai_prompt_logs;
create policy "Users manage own ai prompt logs"
  on public.ai_prompt_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- Performance Indexes
-- =============================================
create index if not exists idx_content_items_user_status on public.content_items(user_id, status);
create index if not exists idx_content_items_user_deadline on public.content_items(user_id, deadline);
create index if not exists idx_content_items_user_updated on public.content_items(user_id, updated_at desc);
create index if not exists idx_content_items_platform on public.content_items(user_id, platform);
create index if not exists idx_content_items_content_type on public.content_items(user_id, content_type);
create index if not exists idx_activity_logs_content_item_created on public.activity_logs(content_item_id, created_at desc);
create index if not exists idx_custom_field_definitions_user on public.custom_field_definitions(user_id, created_at desc);
create index if not exists idx_content_item_custom_values_item on public.content_item_custom_values(content_item_id);
create index if not exists idx_ai_prompt_logs_user_created on public.ai_prompt_logs(user_id, created_at desc);
