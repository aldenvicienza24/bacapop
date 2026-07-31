-- Fix profiles.role being reset to user by protect_user_profile_update.
-- Run after sprint8_admin_role_provisioning.sql.

create or replace function public.protect_user_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Trusted SQL Editor/security-definer maintenance has no auth user id.
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

-- Recover profiles whose server-controlled app metadata was already promoted.
update public.profiles
set role = 'admin', status = 'active'
from auth.users
where profiles.id = users.id
  and (users.raw_app_meta_data ->> 'role') = 'admin';

notify pgrst, 'reload schema';
