-- Jeritan Tengah Malam: buku Horror premium 750 poin.
-- Jalankan setelah migrasi katalog buku dan Sprint 10 reward catalog.

begin;

with horror_genre as (
  select id from public.genres where slug = 'horror' limit 1
)
insert into public.books (
  genre_id, title, author, description, cover_url, pdf_url, status
)
select
  horror_genre.id,
  'Jeritan Tengah Malam',
  'Kelompok 2',
  'Antologi cerpen horor bertema KKN, teror malam, dan kejadian misterius yang menguji keberanian para tokohnya.',
  '/images/horror/cerita-kkn/cover-premium-v2.png',
  '/api/horror/cerita-kkn-kelompok-2',
  'active'
from horror_genre
where not exists (
  select 1 from public.books
  where lower(trim(title)) = 'jeritan tengah malam'
);

update public.books set
  genre_id = (select id from public.genres where slug = 'horror' limit 1),
  author = 'Kelompok 2',
  description = 'Antologi cerpen horor bertema KKN, teror malam, dan kejadian misterius yang menguji keberanian para tokohnya.',
  cover_url = '/images/horror/cerita-kkn/cover-premium-v2.png',
  pdf_url = '/api/horror/cerita-kkn-kelompok-2',
  status = 'active',
  updated_at = now()
where lower(trim(title)) = 'jeritan tengah malam';

with target as (
  select id from public.books
  where lower(trim(title)) = 'jeritan tengah malam'
  order by created_at
  limit 1
)
insert into public.book_pages (book_id, page_number, page_title, content)
select
  target.id,
  page_number,
  case when page_number = 1 then 'Sampul dan Judul Buku' else 'Halaman ' || page_number end,
  '/api/horror/cerita-kkn-kelompok-2#page=' || page_number
from target
cross join generate_series(1, 73) as page_number
on conflict (book_id, page_number) do update set
  page_title = excluded.page_title,
  content = excluded.content,
  updated_at = now();

insert into public.reward_catalog (
  id, name, description, category, cost_points, stock,
  fulfillment_type, is_active, sort_order
) values (
  'premium-horror-jeritan-tengah-malam',
  'Buku Premium: Jeritan Tengah Malam',
  'Buka antologi cerpen Jeritan Tengah Malam di rak Horror dan baca tanpa batas.',
  'Bacaan digital',
  750,
  null,
  'digital',
  true,
  2
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  cost_points = excluded.cost_points,
  stock = excluded.stock,
  fulfillment_type = excluded.fulfillment_type,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.reward_catalog
set sort_order = 3, updated_at = now()
where id = 'beng-beng' and sort_order < 3;

commit;

create unique index if not exists books_jeritan_tengah_malam_title_unique
on public.books ((lower(trim(title))))
where lower(trim(title)) = 'jeritan tengah malam';

create unique index if not exists reward_redemptions_one_jeritan_tengah_malam_per_user
on public.reward_redemptions (user_id, reward_id)
where reward_id = 'premium-horror-jeritan-tengah-malam'
  and status <> 'cancelled';

notify pgrst, 'reload schema';
