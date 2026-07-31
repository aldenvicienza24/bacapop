-- Perbaiki buku PDF bawaan yang terduplikasi tanpa membuang progres,
-- ringkasan, histori poin, atau UUID buku utama.
-- Jalankan SELURUH file ini di Supabase SQL Editor.

begin;

-- Pemindahan book_id pada ringkasan adalah operasi pemeliharaan database.
-- Trigger pengguna dinonaktifkan hanya selama transaksi ini.
alter table public.summaries disable trigger protect_user_summary_update;

do $repair$
declare
  v_title text;
  v_canonical_id uuid;
  v_duplicate_id uuid;
  v_duplicate_summary record;
  v_existing_summary_id uuid;
  v_keep_summary_id uuid;
begin
  foreach v_title in array array[
    'perahu kertas',
    'cerita rakyat nusantara 2',
    'dragon ball vol. 1'
  ]
  loop
    -- Pilih UUID utama: utamakan buku yang paling banyak memiliki
    -- ringkasan, progres, dan halaman; jika sama gunakan yang paling lama.
    select books.id
    into v_canonical_id
    from public.books
    where lower(trim(books.title)) = v_title
    order by
      (
        (select count(*) * 1000 from public.summaries where summaries.book_id = books.id)
        + (select count(*) * 100 from public.reading_progress where reading_progress.book_id = books.id)
        + (select count(*) from public.book_pages where book_pages.book_id = books.id)
      ) desc,
      books.created_at asc nulls last,
      books.id
    limit 1;

    if v_canonical_id is null then
      continue;
    end if;

    for v_duplicate_id in
      select books.id
      from public.books
      where lower(trim(books.title)) = v_title
        and books.id <> v_canonical_id
      order by books.created_at asc nulls last, books.id
    loop
      -- Gabungkan progres setiap pengguna ke UUID utama.
      insert into public.reading_progress
        (user_id, book_id, current_page, progress_percent, is_finished, created_at, updated_at)
      select
        reading_progress.user_id,
        v_canonical_id,
        reading_progress.current_page,
        reading_progress.progress_percent,
        reading_progress.is_finished,
        reading_progress.created_at,
        reading_progress.updated_at
      from public.reading_progress
      where reading_progress.book_id = v_duplicate_id
      on conflict (user_id, book_id) do update set
        current_page = greatest(public.reading_progress.current_page, excluded.current_page),
        progress_percent = greatest(public.reading_progress.progress_percent, excluded.progress_percent),
        is_finished = public.reading_progress.is_finished or excluded.is_finished,
        created_at = least(public.reading_progress.created_at, excluded.created_at),
        updated_at = greatest(public.reading_progress.updated_at, excluded.updated_at);

      delete from public.reading_progress
      where reading_progress.book_id = v_duplicate_id;

      -- Pindahkan ringkasan. Jika pengguna punya ringkasan pada kedua UUID,
      -- pertahankan yang terbaik: valid, pending, lalu rejected.
      for v_duplicate_summary in
        select summaries.*
        from public.summaries
        where summaries.book_id = v_duplicate_id
        order by summaries.submitted_at desc
      loop
        v_existing_summary_id := null;
        v_keep_summary_id := null;

        select summaries.id
        into v_existing_summary_id
        from public.summaries
        where summaries.user_id = v_duplicate_summary.user_id
          and summaries.book_id = v_canonical_id
        limit 1;

        if v_existing_summary_id is null then
          update public.summaries
          set book_id = v_canonical_id
          where summaries.id = v_duplicate_summary.id;
        else
          select summaries.id
          into v_keep_summary_id
          from public.summaries
          where summaries.id in (v_existing_summary_id, v_duplicate_summary.id)
          order by
            case summaries.status
              when 'valid' then 1
              when 'pending' then 2
              else 3
            end,
            summaries.points_awarded desc,
            summaries.submitted_at desc,
            summaries.id
          limit 1;

          if v_keep_summary_id = v_duplicate_summary.id then
            delete from public.summaries
            where summaries.id = v_existing_summary_id;

            update public.summaries
            set book_id = v_canonical_id
            where summaries.id = v_duplicate_summary.id;
          else
            delete from public.summaries
            where summaries.id = v_duplicate_summary.id;
          end if;
        end if;
      end loop;

      -- Gabungkan metadata halaman.
      insert into public.book_pages
        (book_id, page_number, page_title, content, created_at, updated_at)
      select
        v_canonical_id,
        book_pages.page_number,
        book_pages.page_title,
        book_pages.content,
        book_pages.created_at,
        book_pages.updated_at
      from public.book_pages
      where book_pages.book_id = v_duplicate_id
      on conflict (book_id, page_number) do update set
        page_title = coalesce(public.book_pages.page_title, excluded.page_title),
        content = case
          when length(excluded.content) > length(public.book_pages.content)
            then excluded.content
          else public.book_pages.content
        end,
        updated_at = greatest(public.book_pages.updated_at, excluded.updated_at);

      delete from public.book_pages
      where book_pages.book_id = v_duplicate_id;

      delete from public.books
      where books.id = v_duplicate_id;
    end loop;
  end loop;
end
$repair$;

alter table public.summaries enable trigger protect_user_summary_update;

-- Cegah kedua buku bawaan terduplikasi lagi.
create unique index if not exists books_builtin_pdf_title_unique
on public.books ((lower(trim(title))))
where lower(trim(title)) in (
  'perahu kertas',
  'cerita rakyat nusantara 2',
  'dragon ball vol. 1'
);

-- Pastikan metadata buku utama menunjuk aset PDF yang benar.
update public.books
set
  genre_id = (select id from public.genres where slug = 'novel' limit 1),
  author = 'Dee Lestari',
  description = 'Kisah Kugy dan Keenan tentang mimpi, persahabatan, pilihan hidup, dan perasaan yang menemukan jalannya kembali.',
  cover_url = '/images/novel/perahu-kertas-premium-v2.png',
  pdf_url = '/api/novel/perahu-kertas',
  status = 'active',
  updated_at = now()
where lower(trim(title)) = 'perahu kertas';

update public.books
set
  genre_id = (select id from public.genres where slug = 'dongeng' limit 1),
  author = 'Cerita Rakyat Nusantara',
  description = 'Kumpulan tujuh cerita rakyat dari berbagai daerah Nusantara, dari Putri Kandita hingga Ki Ageng Pandanaran.',
  cover_url = '/images/dongeng/cerita-rakyat-nusantara-2-cover-v2.png',
  pdf_url = '/api/dongeng/cerita-rakyat-nusantara-2',
  status = 'active',
  updated_at = now()
where lower(trim(title)) = 'cerita rakyat nusantara 2';

update public.books
set
  genre_id = (select id from public.genres where slug = 'komik' limit 1),
  author = 'Akira Toriyama',
  description = 'Awal petualangan Son Goku bersama Bulma untuk mencari tujuh Dragon Ball, dengan aksi, humor, dan dunia fantasi yang ikonik.',
  cover_url = '/images/comic/dragon-ball/cover.webp',
  pdf_url = '/api/comic/dragon-ball-01',
  status = 'active',
  updated_at = now()
where lower(trim(title)) = 'dragon ball vol. 1';

commit;

notify pgrst, 'reload schema';

-- Hasil akhir harus menampilkan maksimal satu baris per judul.
select
  books.id,
  books.title,
  books.author,
  books.status,
  count(distinct reading_progress.id) as jumlah_progress,
  count(distinct summaries.id) as jumlah_ringkasan
from public.books
left join public.reading_progress on reading_progress.book_id = books.id
left join public.summaries on summaries.book_id = books.id
where lower(trim(books.title)) in (
  'perahu kertas',
  'cerita rakyat nusantara 2',
  'dragon ball vol. 1'
)
group by books.id, books.title, books.author, books.status
order by books.title;
