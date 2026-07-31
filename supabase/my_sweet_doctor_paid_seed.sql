-- My Sweet Doctor: buku Romance berbayar dengan checkout contoh Rp1.000.
-- Jalankan setelah tabel genres, books, dan book_pages tersedia.

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
    raise exception 'Genre Romance/novel belum tersedia atau tidak aktif.';
  end if;

  select id into v_book_id
  from public.books
  where lower(title) = 'my sweet doctor'
  order by created_at
  limit 1;

  if v_book_id is null then
    insert into public.books (
      genre_id, title, author, description, cover_url, pdf_url, status
    ) values (
      v_genre_id,
      'My Sweet Doctor',
      'Azhara Natasya',
      'Novel romance tentang pertemuan, perhatian, dan perjalanan perasaan yang tumbuh di antara dunia medis dan kehidupan pribadi.',
      '/images/novel/my-sweet-doctor/cover.webp',
      '/api/novel/my-sweet-doctor',
      'active'
    ) returning id into v_book_id;
  else
    update public.books set
      genre_id = v_genre_id,
      author = 'Azhara Natasya',
      description = 'Novel romance tentang pertemuan, perhatian, dan perjalanan perasaan yang tumbuh di antara dunia medis dan kehidupan pribadi.',
      cover_url = '/images/novel/my-sweet-doctor/cover.webp',
      pdf_url = '/api/novel/my-sweet-doctor',
      status = 'active'
    where id = v_book_id;
  end if;

  insert into public.book_pages (book_id, page_number, page_title, content)
  select
    v_book_id,
    page_number,
    case when page_number = 1 then 'Sampul' else 'Halaman ' || page_number end,
    '/api/novel/my-sweet-doctor#page=' || page_number
  from generate_series(1, 441) as page_number
  on conflict (book_id, page_number) do update set
    page_title = excluded.page_title,
    content = excluded.content;
end $$;

create table if not exists public.book_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_key text not null,
  price_rupiah integer not null check (price_rupiah > 0),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled', 'refunded')),
  payment_method text not null default 'dana_profile_qr',
  transaction_code text not null unique,
  purchase_key uuid not null unique,
  payer_name text,
  payment_reference text,
  payer_paid_at timestamptz,
  payment_proof_path text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  purchased_at timestamptz not null default now(),
  unique (user_id, book_key)
);

alter table public.book_purchases
  add column if not exists payer_name text,
  add column if not exists payment_reference text,
  add column if not exists payer_paid_at timestamptz,
  add column if not exists payment_proof_path text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists admin_note text;

alter table public.book_purchases alter column status set default 'pending';
alter table public.book_purchases alter column payment_method set default 'dana_profile_qr';

-- Transaksi demo lama tidak boleh membuka buku pada alur pembayaran sungguhan.
update public.book_purchases
set status = 'cancelled',
    admin_note = 'Transaksi simulasi lama dibatalkan saat migrasi QRIS manual.'
where payment_method = 'demo';

create index if not exists book_purchases_user_created_idx
on public.book_purchases (user_id, purchased_at desc);

create unique index if not exists book_purchases_payment_reference_unique
on public.book_purchases (payment_reference)
where payment_reference is not null;

alter table public.book_purchases enable row level security;

drop policy if exists "Users read own book purchases" on public.book_purchases;
create policy "Users read own book purchases"
on public.book_purchases for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins read all book purchases" on public.book_purchases;
create policy "Admins read all book purchases"
on public.book_purchases for select to authenticated
using (public.is_admin());

-- Bukti transfer disimpan secara privat. Pengguna hanya mengakses foldernya,
-- sedangkan admin dapat membuat signed URL untuk proses validasi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own payment proofs" on storage.objects;
create policy "Users upload own payment proofs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users read own payment proofs" on storage.objects;
create policy "Users read own payment proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "Users delete own payment proofs" on storage.objects;
create policy "Users delete own payment proofs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop function if exists public.purchase_demo_book(text, uuid);

drop function if exists public.submit_qris_purchase(text, text, text, timestamptz, uuid);
drop function if exists public.submit_dana_purchase(text, text, text, timestamptz, uuid);

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
begin
  if auth.uid() is null then
    raise exception 'Silakan masuk untuk membeli buku.';
  end if;
  if p_book_key <> 'my-sweet-doctor' then
    raise exception 'Buku tidak tersedia pada katalog pembayaran DANA.';
  end if;
  if p_purchase_key is null then
    raise exception 'Kunci transaksi tidak valid.';
  end if;
  if length(trim(coalesce(p_payer_name, ''))) < 3 then
    raise exception 'Nama pemilik akun pembayaran wajib diisi.';
  end if;
  if length(trim(coalesce(p_payment_reference, ''))) < 4 then
    raise exception 'Nomor referensi transaksi DANA wajib diisi.';
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
    auth.uid(), p_book_key, 1000, 'pending', 'dana_profile_qr',
    'BP-DANA-' || upper(substr(replace(p_purchase_key::text, '-', ''), 1, 10)),
    p_purchase_key, trim(p_payer_name), trim(p_payment_reference),
    p_payer_paid_at, trim(p_payment_proof_path), null, null, null, now()
  )
  on conflict (user_id, book_key) do update set
    status = 'pending',
    payment_method = 'dana_profile_qr',
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

drop function if exists public.admin_review_qris_purchase(uuid, boolean, text);

create or replace function public.admin_review_dana_purchase(
  p_purchase_id uuid,
  p_approve boolean,
  p_admin_note text default null
) returns public.book_purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.book_purchases;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Hanya admin yang dapat memvalidasi pembayaran.';
  end if;

  update public.book_purchases
  set status = case when p_approve then 'completed' else 'cancelled' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where id = p_purchase_id
    and status = 'pending'
  returning * into v_purchase;

  if not found then
    raise exception 'Transaksi pending tidak ditemukan atau sudah diproses.';
  end if;

  return v_purchase;
end $$;

revoke all on function public.admin_review_dana_purchase(uuid, boolean, text) from public;
grant execute on function public.admin_review_dana_purchase(uuid, boolean, text) to authenticated;
notify pgrst, 'reload schema';
