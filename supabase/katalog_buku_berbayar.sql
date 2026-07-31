-- Katalog buku berbayar BacaPop.
-- Jalankan setelah my_sweet_doctor_paid_seed.sql dan tabel buku Sprint 3 tersedia.

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
  where lower(title) = 'dongeng binatang'
  order by created_at
  limit 1;

  if v_book_id is null then
    insert into public.books (
      genre_id, title, author, description, cover_url, pdf_url, status
    ) values (
      v_genre_id,
      'Dongeng Binatang',
      'Anita Bahar, SS.',
      'Kumpulan 25 cerita binatang inspiratif dari seluruh dunia yang menghadirkan petualangan, persahabatan, kecerdikan, dan pesan moral.',
      '/images/dongeng/dongeng-binatang/cover.webp',
      '/api/dongeng/dongeng-binatang',
      'active'
    ) returning id into v_book_id;
  else
    update public.books set
      genre_id = v_genre_id,
      author = 'Anita Bahar, SS.',
      description = 'Kumpulan 25 cerita binatang inspiratif dari seluruh dunia yang menghadirkan petualangan, persahabatan, kecerdikan, dan pesan moral.',
      cover_url = '/images/dongeng/dongeng-binatang/cover.webp',
      pdf_url = '/api/dongeng/dongeng-binatang',
      status = 'active'
    where id = v_book_id;
  end if;

  insert into public.book_pages (book_id, page_number, page_title, content)
  select
    v_book_id,
    page_number,
    case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
    '/api/dongeng/dongeng-binatang#page=' || page_number
  from generate_series(1, 59) as page_number
  on conflict (book_id, page_number) do update set
    page_title = excluded.page_title,
    content = excluded.content;
end $$;

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
  where lower(title) = 'sehari satu dongeng'
  order by created_at
  limit 1;

  if v_book_id is null then
    insert into public.books (
      genre_id, title, author, description, cover_url, pdf_url, status
    ) values (
      v_genre_id,
      'Sehari Satu Dongeng',
      'Lisma Laurel, dkk.',
      'Kumpulan 30 dongeng Profil Pelajar Pancasila yang menghadirkan cerita penuh imajinasi, keberagaman, keberanian, gotong royong, dan pesan karakter.',
      '/images/dongeng/sehari-satu-dongeng/cover.webp',
      '/api/dongeng/sehari-satu-dongeng',
      'active'
    ) returning id into v_book_id;
  else
    update public.books set
      genre_id = v_genre_id,
      author = 'Lisma Laurel, dkk.',
      description = 'Kumpulan 30 dongeng Profil Pelajar Pancasila yang menghadirkan cerita penuh imajinasi, keberagaman, keberanian, gotong royong, dan pesan karakter.',
      cover_url = '/images/dongeng/sehari-satu-dongeng/cover.webp',
      pdf_url = '/api/dongeng/sehari-satu-dongeng',
      status = 'active'
    where id = v_book_id;
  end if;

  insert into public.book_pages (book_id, page_number, page_title, content)
  select
    v_book_id,
    page_number,
    case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
    '/api/dongeng/sehari-satu-dongeng#page=' || page_number
  from generate_series(1, 119) as page_number
  on conflict (book_id, page_number) do update set
    page_title = excluded.page_title,
    content = excluded.content;
end $$;

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
  where lower(title) = 'kunci hitam'
  order by created_at
  limit 1;

  if v_book_id is null then
    insert into public.books (
      genre_id, title, author, description, cover_url, pdf_url, status
    ) values (
      v_genre_id,
      'Kunci Hitam',
      'Olvidado Shakur',
      'Novel seram tentang rahasia gelap, teror pembunuhan, dan sebuah kunci yang menyeret para tokohnya menuju kejadian mengerikan.',
      '/images/horror/kunci-hitam/cover.webp',
      '/api/horror/kunci-hitam',
      'active'
    ) returning id into v_book_id;
  else
    update public.books set
      genre_id = v_genre_id,
      author = 'Olvidado Shakur',
      description = 'Novel seram tentang rahasia gelap, teror pembunuhan, dan sebuah kunci yang menyeret para tokohnya menuju kejadian mengerikan.',
      cover_url = '/images/horror/kunci-hitam/cover.webp',
      pdf_url = '/api/horror/kunci-hitam',
      status = 'active'
    where id = v_book_id;
  end if;

  insert into public.book_pages (book_id, page_number, page_title, content)
  select
    v_book_id,
    page_number,
    case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
    '/api/horror/kunci-hitam#page=' || page_number
  from generate_series(1, 61) as page_number
  on conflict (book_id, page_number) do update set
    page_title = excluded.page_title,
    content = excluded.content;
end $$;

create or replace function public.submit_dana_purchase(
  p_book_key text,
  p_payer_name text,
  p_payment_reference text,
  p_payer_paid_at timestamptz,
  p_payment_proof_path text,
  p_purchase_key uuid
) returns public.book_purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.book_purchases;
  v_price integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan masuk untuk membeli buku.';
  end if;

  v_price := case p_book_key
    when 'my-sweet-doctor' then 1000
    when 'dongeng-binatang' then 1000
    when 'sehari-satu-dongeng' then 1000
    when 'kunci-hitam' then 1000
    else null
  end;

  if v_price is null then
    raise exception 'Buku tidak tersedia pada katalog pembayaran QRIS.';
  end if;
  if p_purchase_key is null then
    raise exception 'Kunci transaksi tidak valid.';
  end if;
  if length(trim(coalesce(p_payer_name, ''))) < 3 then
    raise exception 'Nama akun pembeli tidak valid.';
  end if;
  if length(trim(coalesce(p_payment_reference, ''))) < 4 then
    raise exception 'Nomor klaim transaksi tidak valid.';
  end if;
  if p_payer_paid_at is null or p_payer_paid_at > now() + interval '10 minutes' then
    raise exception 'Waktu pembayaran tidak valid.';
  end if;
  if length(trim(coalesce(p_payment_proof_path, ''))) < 10
     or position(auth.uid()::text || '/' in p_payment_proof_path) <> 1 then
    raise exception 'Path bukti transfer tidak valid.';
  end if;

  select * into v_purchase
  from public.book_purchases
  where user_id = auth.uid() and book_key = p_book_key;

  if found and v_purchase.status = 'completed' then
    return v_purchase;
  end if;

  insert into public.book_purchases (
    user_id, book_key, price_rupiah, status, payment_method,
    transaction_code, purchase_key, payer_name, payment_reference,
    payer_paid_at, payment_proof_path, reviewed_by, reviewed_at, admin_note, purchased_at
  ) values (
    auth.uid(), p_book_key, v_price, 'pending', 'dana_profile_qr',
    'BP-QRIS-' || upper(substr(replace(p_purchase_key::text, '-', ''), 1, 10)),
    p_purchase_key, trim(p_payer_name), trim(p_payment_reference),
    p_payer_paid_at, trim(p_payment_proof_path), null, null, null, now()
  )
  on conflict (user_id, book_key) do update set
    price_rupiah = excluded.price_rupiah,
    status = 'pending',
    payment_method = excluded.payment_method,
    transaction_code = excluded.transaction_code,
    purchase_key = excluded.purchase_key,
    payer_name = excluded.payer_name,
    payment_reference = excluded.payment_reference,
    payer_paid_at = excluded.payer_paid_at,
    payment_proof_path = excluded.payment_proof_path,
    reviewed_by = null,
    reviewed_at = null,
    admin_note = null,
    purchased_at = now()
  returning * into v_purchase;

  return v_purchase;
end $$;

revoke all on function public.submit_dana_purchase(text, text, text, timestamptz, text, uuid) from public;
grant execute on function public.submit_dana_purchase(text, text, text, timestamptz, text, uuid) to authenticated;

notify pgrst, 'reload schema';
