-- Buku gratis Komik: Mereka Juga Bertasbih.
-- Aman dijalankan ulang karena buku dicari berdasarkan judul dan halaman di-upsert.

do $$
declare
  v_genre_id uuid;
  v_book_id uuid;
begin
  select id into v_genre_id
  from public.genres
  where slug = 'komik' and is_active = true
  limit 1;

  if v_genre_id is null then
    raise exception 'Genre Komik belum tersedia atau tidak aktif.';
  end if;

  select id into v_book_id
  from public.books
  where lower(title) = 'mereka juga bertasbih'
  order by created_at
  limit 1;

  if v_book_id is null then
    insert into public.books (
      genre_id, title, author, description, cover_url, pdf_url, status
    ) values (
      v_genre_id,
      'Mereka Juga Bertasbih',
      'Yesi Maryam dkk.',
      'Komik edukatif tentang kepedulian terhadap satwa liar, ancaman perdagangan ilegal, dan pentingnya menjaga kehidupan di alam.',
      '/images/comic/perdagangan-satwa-liar/page-001.webp',
      '/api/comic/perdagangan-satwa-liar',
      'active'
    ) returning id into v_book_id;
  else
    update public.books set
      genre_id = v_genre_id,
      author = 'Yesi Maryam dkk.',
      description = 'Komik edukatif tentang kepedulian terhadap satwa liar, ancaman perdagangan ilegal, dan pentingnya menjaga kehidupan di alam.',
      cover_url = '/images/comic/perdagangan-satwa-liar/page-001.webp',
      pdf_url = '/api/comic/perdagangan-satwa-liar',
      status = 'active'
    where id = v_book_id;
  end if;

  insert into public.book_pages (book_id, page_number, page_title, content)
  select
    v_book_id,
    page_number,
    case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
    '/api/comic/perdagangan-satwa-liar#page=' || page_number
  from generate_series(1, 24) as page_number
  on conflict (book_id, page_number) do update set
    page_title = excluded.page_title,
    content = excluded.content;
end $$;
