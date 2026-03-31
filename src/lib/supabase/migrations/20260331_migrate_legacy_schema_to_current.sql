-- Migration for legacy schema (manual SQL you ran earlier) -> current app schema
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- =====================================================
-- profiles: add preference columns used by i18n/theme
-- =====================================================
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
    select 1 from pg_constraint where conname = 'profiles_preferred_language_allowed'
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
    select 1 from pg_constraint where conname = 'profiles_preferred_theme_allowed'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_theme_allowed
      check (preferred_theme in ('light', 'dark', 'system'));
  end if;
end;
$$;

-- =====================================================
-- custom_field_definitions: add key column used by app
-- =====================================================
alter table public.custom_field_definitions
  add column if not exists key text;

-- Backfill key from name for existing rows
with base as (
  select
    id,
    user_id,
    lower(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9]+', '_', 'g')) as raw_key
  from public.custom_field_definitions
)
update public.custom_field_definitions d
set key = case
  when b.raw_key = '' then 'field_' || replace(d.id::text, '-', '_')
  else left(b.raw_key, 50) || '_' || substring(replace(d.id::text, '-', '_') from 1 for 8)
end
from base b
where d.id = b.id
  and (d.key is null or d.key = '');

alter table public.custom_field_definitions
  alter column key set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'custom_field_definitions_user_id_key_key'
  ) then
    alter table public.custom_field_definitions
      add constraint custom_field_definitions_user_id_key_key unique (user_id, key);
  end if;
end;
$$;

-- =====================================================
-- custom_field_options: normalized options table
-- =====================================================
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
      select 1
      from public.custom_field_definitions d
      where d.id = field_definition_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.custom_field_definitions d
      where d.id = field_definition_id
        and d.user_id = auth.uid()
    )
  );

-- Optional migration from legacy jsonb options -> rows
insert into public.custom_field_options (field_definition_id, value, label, order_index)
select
  d.id,
  opt.value,
  opt.value,
  opt.ord - 1
from public.custom_field_definitions d
cross join lateral jsonb_array_elements_text(coalesce(d.options, '[]'::jsonb)) with ordinality as opt(value, ord)
where d.options is not null
  and not exists (
    select 1 from public.custom_field_options o where o.field_definition_id = d.id
  );

-- =====================================================
-- content_item_custom_values: table used by app for custom values sync
-- =====================================================
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
      select 1
      from public.content_items c
      where c.id = content_item_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.content_items c
      where c.id = content_item_id
        and c.user_id = auth.uid()
    )
  );

-- =====================================================
-- ai_prompt_logs: required by AI import logging
-- =====================================================
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

-- =====================================================
-- tighten content_items defaults and enums
-- =====================================================
alter table public.content_items
  alter column references_links set default '[]'::jsonb,
  alter column tags set default '[]'::jsonb,
  alter column custom_fields_data set default '{}'::jsonb;

update public.content_items set references_links = '[]'::jsonb where references_links is null;
update public.content_items set tags = '[]'::jsonb where tags is null;
update public.content_items set custom_fields_data = '{}'::jsonb where custom_fields_data is null;

alter table public.content_items
  alter column references_links set not null,
  alter column tags set not null,
  alter column custom_fields_data set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'content_items_status_allowed'
  ) then
    alter table public.content_items
      add constraint content_items_status_allowed
      check (status in ('Backlog','To Do','On Going','Review','Revision','Done','Cancelled'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'content_items_priority_allowed'
  ) then
    alter table public.content_items
      add constraint content_items_priority_allowed
      check (priority in ('Low','Medium','High','Urgent'));
  end if;
end;
$$;

-- =====================================================
-- add missing trigger(s) and indexes
-- =====================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_timestamp_content_item_custom_values on public.content_item_custom_values;
create trigger set_timestamp_content_item_custom_values
  before update on public.content_item_custom_values
  for each row execute procedure public.handle_updated_at();

create index if not exists idx_content_items_user_status on public.content_items(user_id, status);
create index if not exists idx_content_items_user_deadline on public.content_items(user_id, deadline);
create index if not exists idx_content_items_user_updated on public.content_items(user_id, updated_at desc);
create index if not exists idx_content_items_platform on public.content_items(user_id, platform);
create index if not exists idx_content_items_content_type on public.content_items(user_id, content_type);
create index if not exists idx_activity_logs_content_item_created on public.activity_logs(content_item_id, created_at desc);
create index if not exists idx_custom_field_definitions_user on public.custom_field_definitions(user_id, created_at desc);
create index if not exists idx_content_item_custom_values_item on public.content_item_custom_values(content_item_id);
create index if not exists idx_ai_prompt_logs_user_created on public.ai_prompt_logs(user_id, created_at desc);
