create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user', 'admin'));
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));
alter table public.profiles add column if not exists points integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles alter column email drop not null;
alter table public.profiles alter column full_name drop not null;

create table if not exists public.point_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  summary_id uuid references public.summaries(id) on delete set null,
  activity_type text not null,
  points integer not null check (points > 0),
  description text,
  created_at timestamptz not null default now()
);

create unique index if not exists point_histories_summary_activity_unique
on public.point_histories (summary_id, activity_type)
where summary_id is not null;

create index if not exists point_histories_user_id_idx on public.point_histories (user_id);
create index if not exists point_histories_created_at_idx on public.point_histories (created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    email = coalesce(public.profiles.email, excluded.email);
  return new;
end
$$;

create or replace function public.protect_user_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user_profile();

drop trigger if exists protect_user_profile_update on public.profiles;
create trigger protect_user_profile_update before update on public.profiles
for each row execute function public.protect_user_profile_update();

insert into public.profiles (id, full_name, email)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  email
from auth.users
on conflict (id) do update set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  email = coalesce(public.profiles.email, excluded.email);

alter table public.profiles enable row level security;
alter table public.point_histories enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert
with check (
  auth.uid() = id
  and role = 'user'
  and status = 'active'
  and points = 0
  and email = (auth.jwt() ->> 'email')
);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update
using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select
using (public.is_admin());

drop policy if exists "Users read own point histories" on public.point_histories;
create policy "Users read own point histories" on public.point_histories for select
using (auth.uid() = user_id);

drop policy if exists "Admins read all point histories" on public.point_histories;
create policy "Admins read all point histories" on public.point_histories for select
using (public.is_admin());

drop policy if exists "Admins insert point histories" on public.point_histories;
create policy "Admins insert point histories" on public.point_histories for insert
with check (public.is_admin());

create or replace function public.admin_validate_summary(
  p_summary_id uuid,
  p_decision text,
  p_points integer default 0,
  p_admin_note text default null
)
returns public.summaries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_summary public.summaries;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat memvalidasi ringkasan.';
  end if;

  if p_decision not in ('valid', 'rejected') then
    raise exception 'Keputusan validasi tidak dikenali.';
  end if;

  select * into v_summary
  from public.summaries
  where id = p_summary_id
  for update;

  if not found then
    raise exception 'Ringkasan tidak ditemukan.';
  end if;

  if v_summary.status <> 'pending' then
    raise exception 'Ringkasan ini sudah diproses atau belum dikirim ulang.';
  end if;

  if p_decision = 'valid' then
    if coalesce(p_points, 0) <= 0 then
      raise exception 'Poin harus lebih dari 0.';
    end if;

    update public.summaries set
      status = 'valid',
      points_awarded = p_points,
      admin_note = nullif(trim(p_admin_note), ''),
      validated_by = auth.uid(),
      validated_at = now()
    where id = p_summary_id
    returning * into v_summary;

    insert into public.profiles (id, full_name, email, points)
    select
      users.id,
      coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
      users.email,
      p_points
    from auth.users as users
    where users.id = v_summary.user_id
    on conflict (id) do update set
      points = public.profiles.points + excluded.points;

    insert into public.point_histories
      (user_id, summary_id, activity_type, points, description)
    values
      (v_summary.user_id, v_summary.id, 'summary_validated', p_points, 'Poin dari ringkasan buku yang divalidasi admin.');
  else
    if nullif(trim(p_admin_note), '') is null then
      raise exception 'Catatan alasan penolakan wajib diisi.';
    end if;

    update public.summaries set
      status = 'rejected',
      points_awarded = 0,
      admin_note = trim(p_admin_note),
      validated_by = auth.uid(),
      validated_at = now()
    where id = p_summary_id
    returning * into v_summary;
  end if;

  return v_summary;
end
$$;

revoke all on function public.admin_validate_summary(uuid, text, integer, text) from public;
grant execute on function public.admin_validate_summary(uuid, text, integer, text) to authenticated;

notify pgrst, 'reload schema';
