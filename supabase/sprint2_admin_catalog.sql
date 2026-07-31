
create extension if not exists pgcrypto;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  theme_name text,
  theme_color text,
  accent_color text,
  icon text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  genre_id uuid references public.genres(id) on delete set null,
  title text not null,
  author text,
  description text,
  cover_url text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.books add column if not exists pdf_url text;
alter table public.books drop column if exists total_pages;
alter table public.books drop column if exists reading_url;
alter table public.books drop column if exists content_text;

create table if not exists public.book_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  page_title text,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (book_id, page_number)
);

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

drop trigger if exists genres_set_updated_at on public.genres;
create trigger genres_set_updated_at before update on public.genres
for each row execute function public.set_updated_at();

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists book_pages_set_updated_at on public.book_pages;
create trigger book_pages_set_updated_at before update on public.book_pages
for each row execute function public.set_updated_at();

alter table public.genres enable row level security;
alter table public.books enable row level security;
alter table public.book_pages enable row level security;

drop policy if exists "Admin manages genres" on public.genres;
create policy "Admin manages genres" on public.genres for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users read active genres" on public.genres;
create policy "Users read active genres" on public.genres for select
using (auth.uid() is not null and is_active = true);

drop policy if exists "Admin manages books" on public.books;
create policy "Admin manages books" on public.books for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users read active books" on public.books;
create policy "Users read active books" on public.books for select
using (auth.uid() is not null and status = 'active');

drop policy if exists "Admin manages book pages" on public.book_pages;
create policy "Admin manages book pages" on public.book_pages for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users read active book pages" on public.book_pages;
create policy "Users read active book pages" on public.book_pages for select
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.books
    where books.id = book_pages.book_id
      and books.status = 'active'
  )
);

create index if not exists books_genre_id_idx on public.books (genre_id);
create index if not exists books_status_idx on public.books (status);
create index if not exists book_pages_book_id_idx on public.book_pages (book_id);
create index if not exists book_pages_book_id_page_number_idx on public.book_pages (book_id, page_number);

insert into public.genres
  (name, slug, description, theme_name, theme_color, accent_color, icon, is_active)
values
  ('Dongeng', 'dongeng', 'Kumpulan cerita dongeng anak yang ringan, imajinatif, dan cocok untuk latihan membaca.', 'Cerita Anak', '#FFE45E', '#8AE8FF', 'Story', true),
  ('Horror', 'horror', 'Kumpulan bacaan misteri yang gelap, menegangkan, dan penuh rahasia.', 'Midnight Mystery', '#1B1026', '#FF4B5C', 'HR', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  theme_name = excluded.theme_name,
  theme_color = excluded.theme_color,
  accent_color = excluded.accent_color,
  icon = excluded.icon,
  is_active = excluded.is_active,
  updated_at = now();

update public.genres
set is_active = false, updated_at = now()
where slug not in ('dongeng', 'horror');

update public.books
set
  genre_id = (select id from public.genres where slug = 'horror' limit 1),
  author = coalesce(author, 'BacaPop Horror Library'),
  description = coalesce(description, 'Bacaan horror misteri tentang rumah gelap, rahasia lama, dan suasana yang bikin penasaran.'),
  cover_url = '/images/horror/rumah-terkutuk.jfif',
  pdf_url = '/books/horror/misteri-rumah-terkutuk.pdf',
  status = 'active',
  updated_at = now()
where lower(title) = lower('Misteri Rumah Terkutuk');

insert into public.books
  (genre_id, title, author, description, cover_url, pdf_url, status)
select
  genres.id,
  'Misteri Rumah Terkutuk',
  'BacaPop Horror Library',
  'Bacaan horror misteri tentang rumah gelap, rahasia lama, dan suasana yang bikin penasaran.',
  '/images/horror/rumah-terkutuk.jfif',
  '/books/horror/misteri-rumah-terkutuk.pdf',
  'active'
from public.genres
where genres.slug = 'horror'
  and not exists (
    select 1 from public.books where lower(title) = lower('Misteri Rumah Terkutuk')
  );
