-- Restore admin visibility for every submitted summary.
-- Run after sprint4_admin_summary_validation.sql.

-- App metadata is the primary source. The protected profiles.role column is
-- supported as a fallback for existing admin accounts.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
        and profiles.status = 'active'
    )
$$;

-- Safely synchronize profiles only from server-controlled app metadata.
update public.profiles
set role = 'admin'
from auth.users
where profiles.id = users.id
  and (users.raw_app_meta_data ->> 'role') = 'admin'
  and profiles.role <> 'admin';

alter table public.summaries enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Admins read all summaries" on public.summaries;
create policy "Admins read all summaries" on public.summaries for select
using (public.is_admin());

drop policy if exists "Admins validate summaries" on public.summaries;
create policy "Admins validate summaries" on public.summaries for update
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select
using (public.is_admin());

grant execute on function public.is_admin() to authenticated;

notify pgrst, 'reload schema';
