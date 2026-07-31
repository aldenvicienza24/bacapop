create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  genre text,
  total_pages integer not null,
  current_page integer not null default 0,
  progress_percent numeric not null default 0,
  status text not null default 'planned' check (status in ('planned', 'reading', 'finished')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint books_total_pages_positive check (total_pages > 0),
  constraint books_current_page_non_negative check (current_page >= 0),
  constraint books_current_page_not_over_total check (current_page <= total_pages),
  constraint books_progress_percent_range check (progress_percent >= 0 and progress_percent <= 100)
);

alter table public.books enable row level security;

drop policy if exists "Users can select own books" on public.books;
create policy "Users can select own books"
on public.books for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own books" on public.books;
create policy "Users can insert own books"
on public.books for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own books" on public.books;
create policy "Users can delete own books"
on public.books for delete
using (auth.uid() = user_id);

create index if not exists books_user_id_created_at_idx
on public.books (user_id, created_at desc);
