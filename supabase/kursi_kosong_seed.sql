-- Buku gratis Horror: Kursi Kosong.
-- Aman dijalankan ulang karena buku dicari berdasarkan judul dan halaman di-upsert.

do $$
declare
  v_genre_id uuid;
  v_book_id uuid;
begin
  select id into v_genre_id
  from public.genres
  where slug = 'horror' and is_active = true
  limit 1;

  if v_genre_id is null then
    raise exception 'Genre Horror belum tersedia atau tidak aktif.';
  end if;

  select id into v_book_id
  from public.books
  where lower(title) = 'kursi kosong'
  order by created_at
  limit 1;

  if v_book_id is null then
    insert into public.books (
      genre_id, title, author, description, cover_url, pdf_url, status
    ) values (
      v_genre_id,
      'Kursi Kosong',
      'Sandya Lustika dkk.',
      'Antologi cerpen horor tentang teror, kejadian ganjil, dan rahasia mencekam yang hadir dari balik keheningan.',
      '/images/horror/kursi-kosong/cover.jpg',
      '/api/horror/kursi-kosong',
      'active'
    ) returning id into v_book_id;
  else
    update public.books set
      genre_id = v_genre_id,
      author = 'Sandya Lustika dkk.',
      description = 'Antologi cerpen horor tentang teror, kejadian ganjil, dan rahasia mencekam yang hadir dari balik keheningan.',
      cover_url = '/images/horror/kursi-kosong/cover.jpg',
      pdf_url = '/api/horror/kursi-kosong',
      status = 'active'
    where id = v_book_id;
  end if;

  insert into public.book_pages (book_id, page_number, page_title, content)
  select
    v_book_id,
    page_number,
    case when page_number = 1 then 'Sampul dan Judul Buku' else 'Halaman ' || page_number end,
    '/api/horror/kursi-kosong#page=' || page_number
  from generate_series(1, 97) as page_number
  on conflict (book_id, page_number) do update set
    page_title = excluded.page_title,
    content = excluded.content;
end $$;
