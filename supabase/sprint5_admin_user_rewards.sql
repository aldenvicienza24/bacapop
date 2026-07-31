-- Admin user rewards.
-- Run after sprint4_admin_summary_validation.sql.

alter table public.point_histories
add column if not exists reward_key uuid;

create unique index if not exists point_histories_reward_key_unique
on public.point_histories (reward_key)
where reward_key is not null;

-- Keep profiles complete so the admin user list includes accounts created
-- before the profile trigger was installed.
insert into public.profiles (id, full_name, email)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  email
from auth.users
on conflict (id) do update set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  email = coalesce(public.profiles.email, excluded.email);

create or replace function public.admin_award_points(
  p_user_id uuid,
  p_points integer,
  p_description text,
  p_reward_key uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat memberikan reward.';
  end if;

  if p_user_id is null then
    raise exception 'Pengguna wajib dipilih.';
  end if;

  if coalesce(p_points, 0) <= 0 or p_points > 100000 then
    raise exception 'Poin reward harus antara 1 dan 100000.';
  end if;

  if nullif(trim(p_description), '') is null then
    raise exception 'Alasan pemberian reward wajib diisi.';
  end if;

  if p_reward_key is null then
    raise exception 'Kunci reward tidak valid.';
  end if;

  insert into public.profiles (id, full_name, email)
  select
    users.id,
    coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
    users.email
  from auth.users as users
  where users.id = p_user_id
  on conflict (id) do nothing;

  if not found then
    if not exists (select 1 from public.profiles where id = p_user_id) then
      raise exception 'Pengguna tidak ditemukan.';
    end if;
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  -- Reusing the same key returns the existing result without adding points twice.
  if exists (
    select 1
    from public.point_histories
    where reward_key = p_reward_key
      and user_id = p_user_id
  ) then
    return v_profile;
  end if;

  update public.profiles
  set points = points + p_points
  where id = p_user_id
  returning * into v_profile;

  insert into public.point_histories
    (user_id, summary_id, activity_type, points, description, reward_key)
  values
    (p_user_id, null, 'admin_reward', p_points, trim(p_description), p_reward_key);

  return v_profile;
end
$$;

revoke all on function public.admin_award_points(uuid, integer, text, uuid) from public;
grant execute on function public.admin_award_points(uuid, integer, text, uuid) to authenticated;

notify pgrst, 'reload schema';
