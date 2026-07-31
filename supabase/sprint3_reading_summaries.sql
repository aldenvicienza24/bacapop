create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  current_page integer not null default 0 check (current_page >= 0),
  progress_percent numeric(5, 2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  is_finished boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  summary_text text not null check (length(trim(summary_text)) >= 100),
  status text not null default 'pending' check (status in ('pending', 'valid', 'rejected')),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  admin_note text,
  validated_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

drop trigger if exists reading_progress_set_updated_at on public.reading_progress;
create trigger reading_progress_set_updated_at before update on public.reading_progress
for each row execute function public.set_updated_at();

drop trigger if exists summaries_set_updated_at on public.summaries;
create trigger summaries_set_updated_at before update on public.summaries
for each row execute function public.set_updated_at();

create or replace function public.protect_user_summary_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if old.user_id <> auth.uid() or old.status <> 'rejected' then
      raise exception 'Ringkasan hanya dapat diperbaiki setelah ditolak admin.';
    end if;

    new.user_id := old.user_id;
    new.book_id := old.book_id;
    new.status := 'pending';
    new.points_awarded := 0;
    new.admin_note := null;
    new.validated_by := null;
    new.validated_at := null;
    new.submitted_at := now();
  end if;

  return new;
end
$$;

drop trigger if exists protect_user_summary_update on public.summaries;
create trigger protect_user_summary_update before update on public.summaries
for each row execute function public.protect_user_summary_update();

alter table public.reading_progress enable row level security;
alter table public.summaries enable row level security;

drop policy if exists "Users read own progress" on public.reading_progress;
create policy "Users read own progress" on public.reading_progress for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own progress" on public.reading_progress;
create policy "Users insert own progress" on public.reading_progress for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own progress" on public.reading_progress;
create policy "Users update own progress" on public.reading_progress for update
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admins read all progress" on public.reading_progress;
create policy "Admins read all progress" on public.reading_progress for select
using (public.is_admin());

drop policy if exists "Users read own summaries" on public.summaries;
create policy "Users read own summaries" on public.summaries for select
using (auth.uid() = user_id);

drop policy if exists "Users submit own summaries" on public.summaries;
create policy "Users submit own summaries" on public.summaries for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
  and points_awarded = 0
  and admin_note is null
  and validated_by is null
  and validated_at is null
  and exists (
    select 1 from public.reading_progress
    where reading_progress.user_id = auth.uid()
      and reading_progress.book_id = summaries.book_id
      and reading_progress.is_finished = true
  )
);

drop policy if exists "Users resubmit rejected summaries" on public.summaries;
create policy "Users resubmit rejected summaries" on public.summaries for update
using (auth.uid() = user_id and status = 'rejected')
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Admins read all summaries" on public.summaries;
create policy "Admins read all summaries" on public.summaries for select
using (public.is_admin());

drop policy if exists "Admins validate summaries" on public.summaries;
create policy "Admins validate summaries" on public.summaries for update
using (public.is_admin()) with check (public.is_admin());

create index if not exists reading_progress_user_id_idx on public.reading_progress (user_id);
create index if not exists reading_progress_book_id_idx on public.reading_progress (book_id);
create index if not exists summaries_user_id_idx on public.summaries (user_id);
create index if not exists summaries_book_id_idx on public.summaries (book_id);
create index if not exists summaries_status_idx on public.summaries (status);
