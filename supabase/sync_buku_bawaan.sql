-- Sinkronisasi buku PDF bawaan BacaPop ke katalog Supabase.
-- Jalankan seluruh file ini satu kali di Supabase SQL Editor.
-- Aman dijalankan ulang karena UUID buku lama dipertahankan dan judul tidak digandakan.

insert into public.genres
  (name, slug, description, theme_name, theme_color, accent_color, icon, is_active)
values
  (
    'Romance',
    'novel',
    'Koleksi romance dengan kisah emosional, hubungan antarmanusia, dan perjalanan hati yang membekas.',
    'Romance Library',
    '#F6A8C4',
    '#C92F68',
    'RC',
    true
  ),
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
  genre_id = (select id from public.genres where slug = 'novel' limit 1),
  author = 'Dee Lestari',
  description = 'Kisah Kugy dan Keenan tentang mimpi, persahabatan, pilihan hidup, dan perasaan yang menemukan jalannya kembali.',
  cover_url = '/images/novel/perahu-kertas-premium-v2.png',
  pdf_url = '/api/novel/perahu-kertas',
  status = 'active',
  updated_at = now()
where lower(title) = lower('Perahu Kertas');

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
    select 1 from public.books where lower(title) = lower('Cerita Rakyat Nusantara 2')
  );

create unique index if not exists books_builtin_pdf_title_unique
on public.books ((lower(trim(title))))
where lower(trim(title)) in (
  'perahu kertas',
  'cerita rakyat nusantara 2'
);

notify pgrst, 'reload schema';

select
  books.id,
  books.title,
  books.author,
  books.pdf_url,
  books.status,
  genres.slug as genre
from public.books
left join public.genres on genres.id = books.genre_id
where lower(books.title) in (
  lower('Perahu Kertas'),
  lower('Cerita Rakyat Nusantara 2')
)
order by books.title;
