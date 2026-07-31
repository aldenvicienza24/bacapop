-- Buku Dongeng gratis: Dongeng Sebelum Tidur 2.
-- Jalankan setelah tabel genres, books, dan book_pages tersedia.

do $$
declare
  v_genre_id uuid;
  v_book_id uuid;
begin
  select id into v_genre_id
  from public.genres
  where slug = 'dongeng' and is_active = true
  limit 1;

  if v_genre_id is null then
    raise exception 'Genre Dongeng belum tersedia atau tidak aktif.';
  end if;

  select id into v_book_id
  from public.books
  where lower(title) = 'dongeng sebelum tidur 2'
  order by created_at
  limit 1;

  if v_book_id is null then
    insert into public.books (
      genre_id, title, author, description, cover_url, pdf_url, status
    ) values (
      v_genre_id,
      'Dongeng Sebelum Tidur 2',
      'Dini W. Tamam',
      'Kumpulan dongeng sebelum tidur dengan kisah anak, hewan, petualangan, dan pesan kebaikan yang cocok dibaca bersama keluarga.',
      '/images/dongeng/dongeng-sebelum-tidur-2/cover.webp',
      '/api/dongeng/dongeng-sebelum-tidur-2',
      'active'
    ) returning id into v_book_id;
  else
    update public.books set
      genre_id = v_genre_id,
      author = 'Dini W. Tamam',
      description = 'Kumpulan dongeng sebelum tidur dengan kisah anak, hewan, petualangan, dan pesan kebaikan yang cocok dibaca bersama keluarga.',
      cover_url = '/images/dongeng/dongeng-sebelum-tidur-2/cover.webp',
      pdf_url = '/api/dongeng/dongeng-sebelum-tidur-2',
      status = 'active'
    where id = v_book_id;
  end if;

  insert into public.book_pages (book_id, page_number, page_title, content)
  select
    v_book_id,
    page_number,
    case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
    '/api/dongeng/dongeng-sebelum-tidur-2#page=' || page_number
  from generate_series(1, 140) as page_number
  on conflict (book_id, page_number) do update set
    page_title = excluded.page_title,
    content = excluded.content;
end $$;

notify pgrst, 'reload schema';
