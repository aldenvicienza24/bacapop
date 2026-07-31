-- Dragon Ball Vol. 2 dan 3: katalog, halaman PDF, ringkasan, dan reward admin.
-- Jalankan setelah migrasi katalog, ringkasan, dan validasi admin.

begin;

with comic_genre as (
  select id from public.genres where slug = 'komik' limit 1
),
catalog(title, author, description, cover_url, pdf_url) as (
  values
    (
      'Dragon Ball Vol. 2',
      'Akira Toriyama',
      'Petualangan Goku dan kawan-kawan berlanjut dengan ancaman baru, aksi yang lebih seru, dan humor khas Dragon Ball.',
      '/images/comic/dragon-ball-02/cover.webp',
      '/api/comic/dragon-ball-02'
    ),
    (
      'Dragon Ball Vol. 3',
      'Akira Toriyama',
      'Goku memasuki petualangan dan pertarungan berikutnya, bertemu lawan tangguh, serta terus mengasah kemampuannya.',
      '/images/comic/dragon-ball-03/cover.webp',
      '/api/comic/dragon-ball-03'
    )
)
insert into public.books (genre_id, title, author, description, cover_url, pdf_url, status)
select comic_genre.id, catalog.title, catalog.author, catalog.description, catalog.cover_url, catalog.pdf_url, 'active'
from catalog cross join comic_genre
where not exists (
  select 1 from public.books where lower(trim(books.title)) = lower(trim(catalog.title))
);

update public.books set
  genre_id = (select id from public.genres where slug = 'komik' limit 1),
  author = 'Akira Toriyama',
  cover_url = '/images/comic/dragon-ball-02/cover.webp',
  pdf_url = '/api/comic/dragon-ball-02',
  status = 'active',
  updated_at = now()
where lower(trim(title)) = 'dragon ball vol. 2';

update public.books set
  genre_id = (select id from public.genres where slug = 'komik' limit 1),
  author = 'Akira Toriyama',
  cover_url = '/images/comic/dragon-ball-03/cover.webp',
  pdf_url = '/api/comic/dragon-ball-03',
  status = 'active',
  updated_at = now()
where lower(trim(title)) = 'dragon ball vol. 3';

with targets as (
  select id, lower(trim(title)) as title_key
  from public.books
  where lower(trim(title)) in ('dragon ball vol. 2', 'dragon ball vol. 3')
),
pages as (
  select targets.id as book_id, targets.title_key, page_number
  from targets
  cross join lateral generate_series(
    1,
    case when targets.title_key = 'dragon ball vol. 2' then 92 else 93 end
  ) as page_number
)
insert into public.book_pages (book_id, page_number, page_title, content)
select
  book_id,
  page_number,
  case when page_number = 1 then 'Sampul dan Jaket Buku' else 'Halaman ' || page_number end,
  case
    when title_key = 'dragon ball vol. 2' then '/api/comic/dragon-ball-02#page=' || page_number
    else '/api/comic/dragon-ball-03#page=' || page_number
  end
from pages
on conflict (book_id, page_number) do update set
  page_title = excluded.page_title,
  content = excluded.content,
  updated_at = now();

commit;

create unique index if not exists books_dragon_ball_volume_title_unique
on public.books ((lower(trim(title))))
where lower(trim(title)) in (
  'dragon ball vol. 2',
  'dragon ball vol. 3'
);

notify pgrst, 'reload schema';
