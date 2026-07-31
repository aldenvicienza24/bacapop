-- Tambahkan Perahu Kertas sebagai buku kedua pada genre Romance.
insert into public.books
  (genre_id, title, author, description, cover_url, pdf_url, status)
select
  genres.id,
  'Perahu Kertas',
  'Dee Lestari',
  'Kisah Kugy dan Keenan tentang mimpi, persahabatan, pilihan hidup, dan perasaan yang menemukan jalannya kembali.',
  '/images/novel/perahu-kertas-premium-v2.png',
  '/api/novel/perahu-kertas',
  'active'
from public.genres
where genres.slug = 'novel'
  and not exists (
    select 1 from public.books where lower(title) = lower('Perahu Kertas')
  );

update public.books
set
  genre_id = (select id from public.genres where slug = 'novel' limit 1),
  author = 'Dee Lestari',
  description = 'Kisah Kugy dan Keenan tentang mimpi, persahabatan, pilihan hidup, dan perasaan yang menemukan jalannya kembali.',
  cover_url = '/images/novel/perahu-kertas-premium-v2.png',
  pdf_url = '/api/novel/perahu-kertas',
  status = 'active',
  updated_at = now()
where lower(title) = lower('Perahu Kertas');

with target_book as (
  select id from public.books
  where lower(title) = lower('Perahu Kertas')
  order by created_at asc
  limit 1
)
insert into public.book_pages (book_id, page_number, page_title, content)
select
  target_book.id,
  page_number,
  case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
  '/api/novel/perahu-kertas#page=' || page_number
from target_book
cross join generate_series(1, 456) as page_number
on conflict (book_id, page_number) do update set
  page_title = excluded.page_title,
  content = excluded.content,
  updated_at = now();

update public.reward_catalog
set
  name = 'Buku Premium: Perahu Kertas',
  description = 'Buka Perahu Kertas di rak Romance dan baca tanpa batas.',
  updated_at = now()
where id = 'premium-book';

notify pgrst, 'reload schema';
