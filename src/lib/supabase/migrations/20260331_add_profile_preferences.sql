-- Add language/theme preference columns for existing projects.
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
