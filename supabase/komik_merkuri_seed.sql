-- Genre Komik dan buku bergambar Air Raksa.
-- Jalankan setelah sprint2_admin_catalog.sql.

insert into public.genres
  (name, slug, description, theme_name, theme_color, accent_color, icon, is_active)
values
  ('Komik', 'komik', 'Koleksi cerita bergambar edukatif dan petualangan yang seru untuk dibaca halaman demi halaman.', 'Cerita Bergambar', '#62C6C8', '#F4D84A', 'KM', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  theme_name = excluded.theme_name,
  theme_color = excluded.theme_color,
  accent_color = excluded.accent_color,
  icon = excluded.icon,
  is_active = true,
  updated_at = now();

-- Jangan hapus buku yang sudah ada: reading_progress dan summaries mereferensikan
-- UUID buku ini. Seed dapat dijalankan berkali-kali tanpa mengganti UUID.
insert into public.books
  (genre_id, title, author, description, cover_url, pdf_url, status)
select
  genres.id,
  'Air Raksa: Si Jahat Perusak Tubuh dan Alam',
  'PlanetGOLD Indonesia',
  'Komik edukatif tentang bahaya air raksa atau merkuri bagi kesehatan tubuh dan lingkungan.',
  '/images/comic/merkuri/page-001.webp',
  '/books/komik-merkuri.pdf',
  'active'
from public.genres
where genres.slug = 'komik'
  and not exists (
    select 1
    from public.books
    where lower(title) = lower('Air Raksa: Si Jahat Perusak Tubuh dan Alam')
  );

update public.books
set
  genre_id = (select id from public.genres where slug = 'komik' limit 1),
  author = 'PlanetGOLD Indonesia',
  description = 'Komik edukatif tentang bahaya air raksa atau merkuri bagi kesehatan tubuh dan lingkungan.',
  cover_url = '/images/comic/merkuri/page-001.webp',
  pdf_url = '/books/komik-merkuri.pdf',
  status = 'active',
  updated_at = now()
where lower(title) = lower('Air Raksa: Si Jahat Perusak Tubuh dan Alam');

with target_book as (
  select id
  from public.books
  where lower(title) = lower('Air Raksa: Si Jahat Perusak Tubuh dan Alam')
  order by created_at asc
  limit 1
)
insert into public.book_pages (book_id, page_number, page_title, content)
select
  target_book.id,
  page_number,
  case
    when page_number = 1 then 'Sampul'
    when page_number = 2 then 'Pengenalan Tokoh'
    else 'Halaman Komik ' || (page_number - 2)
  end,
  '/images/comic/merkuri/page-' || lpad(page_number::text, 3, '0') || '.webp'
from target_book
cross join generate_series(1, 12) as page_number
on conflict (book_id, page_number) do update set
  page_title = excluded.page_title,
  content = excluded.content,
  updated_at = now();
