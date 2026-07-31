-- Daftarkan Cerita Rakyat Nusantara 2 sebagai buku katalog Supabase.
-- Aman dijalankan ulang: buku dengan judul yang sama akan diperbarui, bukan digandakan.
-- Jalankan setelah supabase/sprint2_admin_catalog.sql.

insert into public.genres
  (name, slug, description, theme_name, theme_color, accent_color, icon, is_active)
values
  (
    'Dongeng',
    'dongeng',
    'Kumpulan cerita dongeng anak yang ringan, imajinatif, dan cocok untuk latihan membaca.',
    'Cerita Anak',
    '#FFE45E',
    '#8AE8FF',
    'Story',
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

update public.books
set
  genre_id = (select id from public.genres where slug = 'dongeng' limit 1),
  author = 'Cerita Rakyat Nusantara',
  description = 'Kumpulan tujuh cerita rakyat dari berbagai daerah Nusantara, dari Putri Kandita hingga Ki Ageng Pandanaran.',
  cover_url = '/images/dongeng/cerita-rakyat-nusantara-2-cover-v2.png',
  pdf_url = '/api/dongeng/cerita-rakyat-nusantara-2',
  status = 'active',
  updated_at = now()
where lower(title) = lower('Cerita Rakyat Nusantara 2');

insert into public.books
  (genre_id, title, author, description, cover_url, pdf_url, status)
select
  genres.id,
  'Cerita Rakyat Nusantara 2',
  'Cerita Rakyat Nusantara',
  'Kumpulan tujuh cerita rakyat dari berbagai daerah Nusantara, dari Putri Kandita hingga Ki Ageng Pandanaran.',
  '/images/dongeng/cerita-rakyat-nusantara-2-cover-v2.png',
  '/api/dongeng/cerita-rakyat-nusantara-2',
  'active'
from public.genres
where genres.slug = 'dongeng'
  and not exists (
    select 1
    from public.books
    where lower(title) = lower('Cerita Rakyat Nusantara 2')
  );

