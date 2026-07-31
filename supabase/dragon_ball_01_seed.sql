-- Dragon Ball Vol. 1: katalog komik, 86 halaman PDF, ringkasan, dan reward admin.
-- Jalankan setelah:
--   1. sprint2_admin_catalog.sql
--   2. sprint3_reading_summaries.sql
--   3. sprint4_admin_summary_validation.sql
--   4. sprint7_admin_summary_queue_rpc.sql

begin;

insert into public.genres
  (name, slug, description, theme_name, theme_color, accent_color, icon, is_active)
values
  (
    'Komik',
    'komik',
    'Koleksi cerita bergambar, aksi, humor, edukasi, dan petualangan yang seru dibaca panel demi panel.',
    'Manga & Cerita Bergambar',
    '#F58220',
    '#FFD629',
    'KM',
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  theme_name = excluded.theme_name,
  theme_color = excluded.theme_color,
  accent_color = excluded.accent_color,
  icon = excluded.icon,
  is_active = true,
  updated_at = now();

insert into public.books
  (genre_id, title, author, description, cover_url, pdf_url, status)
select
  genres.id,
  'Dragon Ball Vol. 1',
  'Akira Toriyama',
  'Awal petualangan Son Goku bersama Bulma untuk mencari tujuh Dragon Ball, dengan aksi, humor, dan dunia fantasi yang ikonik.',
  '/images/comic/dragon-ball/cover.webp',
  '/api/comic/dragon-ball-01',
  'active'
from public.genres
where genres.slug = 'komik'
  and not exists (
    select 1
    from public.books
    where lower(trim(title)) in ('dragon ball vol. 1', 'dragon ball 01')
  );

-- Pertahankan UUID bila seed dijalankan ulang agar progress, ringkasan, dan reward
-- yang sudah terkait dengan buku ini tidak terputus.
update public.books
set
  genre_id = (select id from public.genres where slug = 'komik' limit 1),
  title = 'Dragon Ball Vol. 1',
  author = 'Akira Toriyama',
  description = 'Awal petualangan Son Goku bersama Bulma untuk mencari tujuh Dragon Ball, dengan aksi, humor, dan dunia fantasi yang ikonik.',
  cover_url = '/images/comic/dragon-ball/cover.webp',
  pdf_url = '/api/comic/dragon-ball-01',
  status = 'active',
  updated_at = now()
where lower(trim(title)) in ('dragon ball vol. 1', 'dragon ball 01');

with target_book as (
  select id
  from public.books
  where lower(trim(title)) = 'dragon ball vol. 1'
  order by created_at asc
  limit 1
)
insert into public.book_pages (book_id, page_number, page_title, content)
select
  target_book.id,
  page_number,
  case
    when page_number = 1 then 'Sampul dan Jaket Buku'
    else 'Halaman ' || page_number
  end,
  '/api/comic/dragon-ball-01#page=' || page_number
from target_book
cross join generate_series(1, 86) as page_number
on conflict (book_id, page_number) do update set
  page_title = excluded.page_title,
  content = excluded.content,
  updated_at = now();

commit;

-- Setelah pembaca mencapai halaman 86, reading_progress.is_finished menjadi true.
-- Ringkasan kemudian masuk ke admin_get_summary_queue() dan poin hanya diberikan
-- melalui admin_validate_summary(..., 'valid', jumlah_poin, catatan_admin).
select
  books.id,
  books.title,
  books.author,
  books.pdf_url,
  books.status,
  genres.slug as genre,
  count(book_pages.id) as total_pages
from public.books
join public.genres on genres.id = books.genre_id
left join public.book_pages on book_pages.book_id = books.id
where lower(trim(books.title)) = 'dragon ball vol. 1'
group by books.id, genres.slug;
