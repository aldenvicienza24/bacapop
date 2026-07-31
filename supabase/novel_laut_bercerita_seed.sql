-- Genre Romance dan buku Laut Bercerita.
-- Jalankan setelah supabase/sprint2_admin_catalog.sql.

insert into public.genres
  (name, slug, description, theme_name, theme_color, accent_color, icon, is_active)
values
  ('Romance', 'novel', 'Koleksi romance dengan kisah emosional, hubungan antarmanusia, dan perjalanan hati yang membekas.', 'Romance Library', '#F6A8C4', '#C92F68', 'RC', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  theme_name = excluded.theme_name,
  theme_color = excluded.theme_color,
  accent_color = excluded.accent_color,
  icon = excluded.icon,
  is_active = true,
  updated_at = now();

-- Seed aman dijalankan berulang kali dan mempertahankan UUID buku yang sudah ada.
insert into public.books
  (genre_id, title, author, description, cover_url, pdf_url, status)
select
  genres.id,
  'Laut Bercerita',
  'Leila S. Chudori',
  'Kisah romance tentang persahabatan, keluarga, kehilangan, dan perjuangan para aktivis pada masa Orde Baru.',
  '/images/novel/laut-bercerita.webp',
  '/books/novel/laut-bercerita.pdf',
  'active'
from public.genres
where genres.slug = 'novel'
  and not exists (
    select 1 from public.books where lower(title) = lower('Laut Bercerita')
  );

update public.books
set
  genre_id = (select id from public.genres where slug = 'novel' limit 1),
  author = 'Leila S. Chudori',
  description = 'Kisah romance tentang persahabatan, keluarga, kehilangan, dan perjuangan para aktivis pada masa Orde Baru.',
  cover_url = '/images/novel/laut-bercerita.webp',
  pdf_url = '/books/novel/laut-bercerita.pdf',
  status = 'active',
  updated_at = now()
where lower(title) = lower('Laut Bercerita');

with target_book as (
  select id
  from public.books
  where lower(title) = lower('Laut Bercerita')
  order by created_at asc
  limit 1
)
insert into public.book_pages (book_id, page_number, page_title, content)
select
  target_book.id,
  page_number,
  case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
  '/books/novel/laut-bercerita.pdf#page=' || page_number
from target_book
cross join generate_series(1, 394) as page_number
on conflict (book_id, page_number) do update set
  page_title = excluded.page_title,
  content = excluded.content,
  updated_at = now();
