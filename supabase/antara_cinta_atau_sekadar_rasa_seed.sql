-- Antara Cinta atau Sekadar Rasa: buku Romance, 14 halaman PDF.
-- Jalankan setelah migrasi katalog buku dan reading summaries.

begin;

with romance_genre as (
  select id from public.genres where slug = 'novel' limit 1
)
insert into public.books (
  genre_id, title, author, description, cover_url, pdf_url, status
)
select
  romance_genre.id,
  'Antara Cinta atau Sekadar Rasa',
  'Fitri Lusiana Kurniasari',
  'Cerita romance tentang perasaan yang tumbuh, keraguan hati, dan pencarian makna antara cinta yang sungguh-sungguh atau sekadar rasa.',
  '/images/novel/antara-cinta-atau-sekadar-rasa/cover.webp',
  '/api/novel/antara-cinta-atau-sekadar-rasa',
  'active'
from romance_genre
where not exists (
  select 1 from public.books
  where lower(trim(title)) = 'antara cinta atau sekadar rasa'
);

update public.books set
  genre_id = (select id from public.genres where slug = 'novel' limit 1),
  author = 'Fitri Lusiana Kurniasari',
  description = 'Cerita romance tentang perasaan yang tumbuh, keraguan hati, dan pencarian makna antara cinta yang sungguh-sungguh atau sekadar rasa.',
  cover_url = '/images/novel/antara-cinta-atau-sekadar-rasa/cover.webp',
  pdf_url = '/api/novel/antara-cinta-atau-sekadar-rasa',
  status = 'active',
  updated_at = now()
where lower(trim(title)) = 'antara cinta atau sekadar rasa';

with target as (
  select id from public.books
  where lower(trim(title)) = 'antara cinta atau sekadar rasa'
  order by created_at
  limit 1
)
insert into public.book_pages (book_id, page_number, page_title, content)
select
  target.id,
  page_number,
  case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
  '/api/novel/antara-cinta-atau-sekadar-rasa#page=' || page_number
from target
cross join generate_series(1, 14) as page_number
on conflict (book_id, page_number) do update set
  page_title = excluded.page_title,
  content = excluded.content,
  updated_at = now();

commit;

create unique index if not exists books_antara_cinta_title_unique
on public.books ((lower(trim(title))))
where lower(trim(title)) = 'antara cinta atau sekadar rasa';

notify pgrst, 'reload schema';
