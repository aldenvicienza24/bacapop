-- Buku gratis Romance: Cinta dan Cinta Sejati.
-- Aman dijalankan ulang karena buku dicari berdasarkan judul dan halaman di-upsert.

do $$
declare
  v_genre_id uuid;
  v_book_id uuid;
begin
  select id into v_genre_id
  from public.genres
  where slug = 'novel' and is_active = true
  limit 1;

  if v_genre_id is null then
    raise exception 'Genre Romance belum tersedia atau tidak aktif.';
  end if;

  select id into v_book_id
  from public.books
  where lower(title) = 'cinta dan cinta sejati'
  order by created_at
  limit 1;

  if v_book_id is null then
    insert into public.books (
      genre_id, title, author, description, cover_url, pdf_url, status
    ) values (
      v_genre_id,
      'Cinta dan Cinta Sejati',
      'Shadiq Jalal Al-Adzm',
      'Refleksi tentang cinta, cinta sejati, hasrat, dan berbagai makna hubungan manusia yang diterjemahkan oleh Dedy Wahyudin.',
      '/images/novel/cinta-dan-cinta-sejati/cover.jpg',
      '/api/novel/cinta-dan-cinta-sejati',
      'active'
    ) returning id into v_book_id;
  else
    update public.books set
      genre_id = v_genre_id,
      author = 'Shadiq Jalal Al-Adzm',
      description = 'Refleksi tentang cinta, cinta sejati, hasrat, dan berbagai makna hubungan manusia yang diterjemahkan oleh Dedy Wahyudin.',
      cover_url = '/images/novel/cinta-dan-cinta-sejati/cover.jpg',
      pdf_url = '/api/novel/cinta-dan-cinta-sejati',
      status = 'active'
    where id = v_book_id;
  end if;

  insert into public.book_pages (book_id, page_number, page_title, content)
  select
    v_book_id,
    page_number,
    case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
    '/api/novel/cinta-dan-cinta-sejati#page=' || page_number
  from generate_series(1, 155) as page_number
  on conflict (book_id, page_number) do update set
    page_title = excluded.page_title,
    content = excluded.content;
end $$;
