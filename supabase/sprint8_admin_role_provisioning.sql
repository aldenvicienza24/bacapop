-- Safe, durable admin role provisioning.
-- Run after sprint6_admin_summary_visibility.sql.

create or replace function public.protect_user_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- SQL Editor and trusted security-definer maintenance functions have no
  -- authenticated user id. RLS still blocks anonymous API writes.
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    if old.id <> auth.uid() then
      raise exception 'User hanya dapat mengubah profil miliknya sendiri.';
    end if;

    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.status := old.status;
    new.points := old.points;
    new.created_at := old.created_at;
  end if;
  return new;
end
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := case
    when (new.raw_app_meta_data ->> 'role') = 'admin' then 'admin'
    else 'user'
  end;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    v_role
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    email = coalesce(public.profiles.email, excluded.email),
    -- Never demote an existing admin during a normal auth profile refresh.
    role = case
      when public.profiles.role = 'admin' or excluded.role = 'admin' then 'admin'
      else 'user'
    end;
  return new;
end
$$;

-- This function is intentionally unavailable through the public API.
-- Invoke it only from the Supabase SQL Editor as the postgres owner.
create or replace function public.provision_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users;
begin
  select * into v_user
  from auth.users
  where lower(email) = lower(trim(p_email))
  for update;

  if not found then
    raise exception 'Akun dengan email tersebut tidak ditemukan.';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = v_user.id;

  insert into public.profiles (id, full_name, email, role, status)
  values (
    v_user.id,
    coalesce(v_user.raw_user_meta_data ->> 'full_name', v_user.raw_user_meta_data ->> 'name'),
    v_user.email,
    'admin',
    'active'
  )
  on conflict (id) do update set
    role = 'admin',
    status = 'active',
    email = excluded.email;
end
$$;

revoke all on function public.provision_admin(text) from public;
revoke all on function public.provision_admin(text) from anon;
revoke all on function public.provision_admin(text) from authenticated;

-- Repair profiles for accounts that already have server-controlled admin metadata.
update public.profiles
set role = 'admin', status = 'active'
from auth.users
where profiles.id = users.id
  and (users.raw_app_meta_data ->> 'role') = 'admin';

notify pgrst, 'reload schema';
