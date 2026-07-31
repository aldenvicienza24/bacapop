-- Daftarkan Misteri Penunggu Pohon Tua sebagai buku Horror di Supabase.
-- Aman dijalankan ulang dan mempertahankan UUID buku yang sudah ada.

insert into public.genres
  (name, slug, description, theme_name, theme_color, accent_color, icon, is_active)
values
  (
    'Horror',
    'horror',
    'Kumpulan bacaan misteri yang gelap, menegangkan, dan penuh rahasia.',
    'Midnight Mystery',
    '#1B1026',
    '#FF4B5C',
    'HR',
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
  genre_id = (select id from public.genres where slug = 'horror' limit 1),
  author = 'Vidyāsenā Production',
  description = 'Seri kumpulan cerpen Buddhis tentang misteri, kehidupan sehari-hari, dan nilai kebijaksanaan yang diterbitkan dalam rangka Waisak 2559 TB.',
  cover_url = '/images/horror/misteri-penunggu-pohon-tua.png',
  pdf_url = '/api/horror/misteri-penunggu-pohon-tua',
  status = 'active',
  updated_at = now()
where lower(trim(title)) = 'misteri penunggu pohon tua';

insert into public.books
  (genre_id, title, author, description, cover_url, pdf_url, status)
select
  genres.id,
  'Misteri Penunggu Pohon Tua',
  'Vidyāsenā Production',
  'Seri kumpulan cerpen Buddhis tentang misteri, kehidupan sehari-hari, dan nilai kebijaksanaan yang diterbitkan dalam rangka Waisak 2559 TB.',
  '/images/horror/misteri-penunggu-pohon-tua.png',
  '/api/horror/misteri-penunggu-pohon-tua',
  'active'
from public.genres
where genres.slug = 'horror'
  and not exists (
    select 1
    from public.books
    where lower(trim(title)) = 'misteri penunggu pohon tua'
  );

create unique index if not exists books_misteri_penunggu_title_unique
on public.books ((lower(trim(title))))
where lower(trim(title)) = 'misteri penunggu pohon tua';

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
where lower(trim(books.title)) = 'misteri penunggu pohon tua';

