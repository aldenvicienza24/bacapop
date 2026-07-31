'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import AdminShell from '../components/AdminShell';
import {readableTextColor} from '../../lib/colorContrast';
import {ConfirmButton, EmptyState, Status} from '../components/ui';
import {supabase} from '../../lib/supabase';
import styles from '../admin.module.css';
import shelf from './filter.module.css';

let dragonBallCleanupPromise = null;

function uniqueBooksByTitle(books) {
  const seen = new Set();
  return books.filter((book) => {
    const key = book.title?.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Books() {
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncing, setSyncing] = useState(false);
  const shelfRef = useRef(null);

  async function load() {
    const {data, error: booksError} = await supabase
      .from('books')
      .select('*,genres(id,name,icon,theme_name,theme_color,accent_color)')
      .order('created_at', {ascending: false});

    if (booksError) {
      setError(booksError.message);
      return;
    }

    const books = uniqueBooksByTitle(data || []);
    const ids = books.map((book) => book.id);
    const counts = {};

    if (ids.length) {
      const {data: pages, error: pagesError} = await supabase
        .from('book_pages')
        .select('book_id')
        .in('book_id', ids);

      if (pagesError) {
        setError(pagesError.message);
        return;
      }

      pages?.forEach((page) => {
        counts[page.book_id] = (counts[page.book_id] || 0) + 1;
      });
    }

    setItems(books.map((book) => ({
      ...book,
      page_count: counts[book.id]
        || (book.title?.toLowerCase() === 'perahu kertas'
          ? 456
          : book.title?.toLowerCase() === 'cerita rakyat nusantara 2'
            ? 31
            : book.title?.toLowerCase() === 'misteri penunggu pohon tua'
              ? 136
              : book.title?.toLowerCase() === 'dragon ball vol. 1'
                ? 86
                : book.title?.toLowerCase() === 'dragon ball vol. 2'
                  ? 92
                  : book.title?.toLowerCase() === 'dragon ball vol. 3'
                    ? 93
                    : book.title?.toLowerCase() === 'jeritan tengah malam'
                      ? 73
                    : book.title?.toLowerCase() === 'kunci hitam'
                      ? 61
                    : book.title?.toLowerCase() === 'kursi kosong'
                      ? 97
                    : book.title?.toLowerCase() === 'antara cinta atau sekadar rasa'
                      ? 14
                    : book.title?.toLowerCase() === 'cinta dan cinta sejati'
                      ? 155
                    : book.title?.toLowerCase() === 'mereka juga bertasbih'
                      ? 24
                    : book.title?.toLowerCase() === 'my sweet doctor'
                      ? 441
            : 0),
    })));
  }

  useEffect(() => {
    async function cleanupAndLoad() {
      if (!dragonBallCleanupPromise) {
        dragonBallCleanupPromise = cleanupDragonBallDuplicates().finally(() => {
          dragonBallCleanupPromise = null;
        });
      }
      await dragonBallCleanupPromise;
      await load();
    }
    cleanupAndLoad();
    supabase
      .from('genres')
      .select('id,name,icon,theme_color')
      .eq('is_active', true)
      .order('name')
      .then(({data}) => setGenres(data || []));
  }, []);

  async function cleanupDragonBallDuplicates() {
    await ensureNewDragonBallVolumes();
    await ensureWildlifeComicBook();
    await ensurePremiumHorrorBook();
    await ensureKunciHitamBook();
    await ensureKursiKosongBook();
    await ensureRomanceShortBook();
    await ensureCintaSejatiBook();
    await ensurePaidRomanceBook();
    const {data: matches, error: findError} = await supabase
      .from('books')
      .select('id,created_at')
      .ilike('title', 'Dragon Ball Vol. 1')
      .order('created_at', {ascending: true});
    if (findError || !matches?.length) return;

    await supabase
      .from('books')
      .update({cover_url: '/images/comic/dragon-ball/cover.webp'})
      .in('id', matches.map((book) => book.id));
    if (matches.length < 2) return;

    const duplicateIds = matches.slice(1).map((book) => book.id);
    const [progressResult, summaryResult] = await Promise.all([
      supabase.from('reading_progress').select('book_id').in('book_id', duplicateIds),
      supabase.from('summaries').select('book_id').in('book_id', duplicateIds),
    ]);
    if (progressResult.error || summaryResult.error) return;

    const referenced = new Set([
      ...(progressResult.data || []).map((row) => row.book_id),
      ...(summaryResult.data || []).map((row) => row.book_id),
    ]);
    const safeToDelete = duplicateIds.filter((id) => !referenced.has(id));
    if (safeToDelete.length) await supabase.from('books').delete().in('id', safeToDelete);
  }

  async function ensureNewDragonBallVolumes() {
    const {data: comicGenre} = await supabase
      .from('genres')
      .select('id')
      .eq('slug', 'komik')
      .eq('is_active', true)
      .maybeSingle();
    if (!comicGenre?.id) return;

    const volumes = [
      {
        title: 'Dragon Ball Vol. 2',
        author: 'Akira Toriyama',
        description: 'Petualangan Goku dan kawan-kawan berlanjut dengan ancaman baru, aksi yang lebih seru, dan humor khas Dragon Ball.',
        cover_url: '/images/comic/dragon-ball-02/cover.webp',
        pdf_url: '/api/comic/dragon-ball-02',
        pages: 92,
      },
      {
        title: 'Dragon Ball Vol. 3',
        author: 'Akira Toriyama',
        description: 'Goku memasuki petualangan dan pertarungan berikutnya, bertemu lawan tangguh, serta terus mengasah kemampuannya.',
        cover_url: '/images/comic/dragon-ball-03/cover.webp',
        pdf_url: '/api/comic/dragon-ball-03',
        pages: 93,
      },
    ];

    for (const volume of volumes) {
      const {data: existing} = await supabase
        .from('books')
        .select('id')
        .ilike('title', volume.title)
        .order('created_at', {ascending: true})
        .limit(1)
        .maybeSingle();
      const {pages, ...metadata} = volume;
      const payload = {...metadata, genre_id: comicGenre.id, status: 'active'};
      const result = existing?.id
        ? await supabase.from('books').update(payload).eq('id', existing.id).select('id').single()
        : await supabase.from('books').insert(payload).select('id').single();
      if (!result.data?.id) continue;

      const pageRows = Array.from({length: pages}, (_, index) => ({
        book_id: result.data.id,
        page_number: index + 1,
        page_title: index === 0 ? 'Sampul dan Jaket Buku' : `Halaman ${index + 1}`,
        content: `${metadata.pdf_url}#page=${index + 1}`,
      }));
      await supabase.from('book_pages').upsert(pageRows, {onConflict: 'book_id,page_number'});
    }
  }

  async function ensureWildlifeComicBook() {
    const {data: comicGenre, error: genreError} = await supabase
      .from('genres')
      .select('id')
      .eq('slug', 'komik')
      .eq('is_active', true)
      .maybeSingle();
    if (genreError || !comicGenre?.id) return;

    const metadata = {
      title: 'Mereka Juga Bertasbih',
      author: 'Yesi Maryam dkk.',
      description: 'Komik edukatif tentang kepedulian terhadap satwa liar, ancaman perdagangan ilegal, dan pentingnya menjaga kehidupan di alam.',
      cover_url: '/images/comic/perdagangan-satwa-liar/page-001.webp',
      pdf_url: '/api/comic/perdagangan-satwa-liar',
      genre_id: comicGenre.id,
      status: 'active',
    };
    const {data: existing, error: findError} = await supabase
      .from('books')
      .select('id')
      .ilike('title', metadata.title)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle();
    if (findError) return;

    const result = existing?.id
      ? await supabase.from('books').update(metadata).eq('id', existing.id).select('id').single()
      : await supabase.from('books').insert(metadata).select('id').single();
    if (!result.data?.id) return;

    const pageRows = Array.from({length: 24}, (_, index) => ({
      book_id: result.data.id,
      page_number: index + 1,
      page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
      content: `${metadata.pdf_url}#page=${index + 1}`,
    }));
    await supabase.from('book_pages').upsert(pageRows, {onConflict: 'book_id,page_number'});
  }

  async function ensurePremiumHorrorBook() {
    const {data: horrorGenre} = await supabase
      .from('genres')
      .select('id')
      .eq('slug', 'horror')
      .eq('is_active', true)
      .maybeSingle();
    if (!horrorGenre?.id) return;

    const metadata = {
      title: 'Jeritan Tengah Malam',
      author: 'Kelompok 2',
      description: 'Antologi cerpen horor bertema KKN, teror malam, dan kejadian misterius yang menguji keberanian para tokohnya.',
      cover_url: '/images/horror/cerita-kkn/cover-premium-v2.png',
      pdf_url: '/api/horror/cerita-kkn-kelompok-2',
      genre_id: horrorGenre.id,
      status: 'active',
    };
    const {data: existing} = await supabase
      .from('books')
      .select('id')
      .ilike('title', metadata.title)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle();
    const result = existing?.id
      ? await supabase.from('books').update(metadata).eq('id', existing.id).select('id').single()
      : await supabase.from('books').insert(metadata).select('id').single();
    if (!result.data?.id) return;

    const pageRows = Array.from({length: 73}, (_, index) => ({
      book_id: result.data.id,
      page_number: index + 1,
      page_title: index === 0 ? 'Sampul dan Judul Buku' : `Halaman ${index + 1}`,
      content: `${metadata.pdf_url}#page=${index + 1}`,
    }));
    await supabase.from('book_pages').upsert(pageRows, {onConflict: 'book_id,page_number'});
  }

  async function ensureKunciHitamBook() {
    const {data: horrorGenre, error: genreError} = await supabase
      .from('genres')
      .select('id')
      .eq('slug', 'horror')
      .eq('is_active', true)
      .maybeSingle();
    if (genreError || !horrorGenre?.id) return;

    const metadata = {
      title: 'Kunci Hitam',
      author: 'Olvidado Shakur',
      description: 'Novel seram tentang sebuah kunci hitam yang membuka rangkaian rahasia, teror, dan kejadian ganjil yang sulit dihentikan.',
      cover_url: '/images/horror/kunci-hitam/cover.webp',
      pdf_url: '/api/horror/kunci-hitam',
      genre_id: horrorGenre.id,
      status: 'active',
    };
    const {data: existing, error: findError} = await supabase
      .from('books')
      .select('id')
      .ilike('title', metadata.title)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle();
    if (findError) return;

    const result = existing?.id
      ? await supabase.from('books').update(metadata).eq('id', existing.id).select('id').single()
      : await supabase.from('books').insert(metadata).select('id').single();
    if (!result.data?.id) return;

    const pageRows = Array.from({length: 61}, (_, index) => ({
      book_id: result.data.id,
      page_number: index + 1,
      page_title: index === 0 ? 'Sampul dan Judul Buku' : `Halaman ${index + 1}`,
      content: `${metadata.pdf_url}#page=${index + 1}`,
    }));
    await supabase.from('book_pages').upsert(pageRows, {onConflict: 'book_id,page_number'});
  }

  async function ensureKursiKosongBook() {
    const {data: horrorGenre, error: genreError} = await supabase
      .from('genres')
      .select('id')
      .eq('slug', 'horror')
      .eq('is_active', true)
      .maybeSingle();
    if (genreError || !horrorGenre?.id) return;

    const metadata = {
      title: 'Kursi Kosong',
      author: 'Sandya Lustika dkk.',
      description: 'Antologi cerpen horor tentang teror, kejadian ganjil, dan rahasia mencekam yang hadir dari balik keheningan.',
      cover_url: '/images/horror/kursi-kosong/cover.jpg',
      pdf_url: '/api/horror/kursi-kosong',
      genre_id: horrorGenre.id,
      status: 'active',
    };
    const {data: existing, error: findError} = await supabase
      .from('books')
      .select('id')
      .ilike('title', metadata.title)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle();
    if (findError) return;

    const result = existing?.id
      ? await supabase.from('books').update(metadata).eq('id', existing.id).select('id').single()
      : await supabase.from('books').insert(metadata).select('id').single();
    if (!result.data?.id) return;

    const pageRows = Array.from({length: 97}, (_, index) => ({
      book_id: result.data.id,
      page_number: index + 1,
      page_title: index === 0 ? 'Sampul dan Judul Buku' : `Halaman ${index + 1}`,
      content: `${metadata.pdf_url}#page=${index + 1}`,
    }));
    await supabase.from('book_pages').upsert(pageRows, {onConflict: 'book_id,page_number'});
  }

  async function ensureRomanceShortBook() {
    const {data: romanceGenre} = await supabase
      .from('genres')
      .select('id')
      .eq('slug', 'novel')
      .eq('is_active', true)
      .maybeSingle();
    if (!romanceGenre?.id) return;

    const metadata = {
      title: 'Antara Cinta atau Sekadar Rasa',
      author: 'Fitri Lusiana Kurniasari',
      description: 'Cerita romance tentang perasaan yang tumbuh, keraguan hati, dan pencarian makna antara cinta yang sungguh-sungguh atau sekadar rasa.',
      cover_url: '/images/novel/antara-cinta-atau-sekadar-rasa/cover.webp',
      pdf_url: '/api/novel/antara-cinta-atau-sekadar-rasa',
      genre_id: romanceGenre.id,
      status: 'active',
    };
    const {data: existing} = await supabase
      .from('books')
      .select('id')
      .ilike('title', metadata.title)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle();
    const result = existing?.id
      ? await supabase.from('books').update(metadata).eq('id', existing.id).select('id').single()
      : await supabase.from('books').insert(metadata).select('id').single();
    if (!result.data?.id) return;

    const pageRows = Array.from({length: 14}, (_, index) => ({
      book_id: result.data.id,
      page_number: index + 1,
      page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
      content: `${metadata.pdf_url}#page=${index + 1}`,
    }));
    await supabase.from('book_pages').upsert(pageRows, {onConflict: 'book_id,page_number'});
  }

  async function ensureCintaSejatiBook() {
    const {data: romanceGenre, error: genreError} = await supabase
      .from('genres')
      .select('id')
      .eq('slug', 'novel')
      .eq('is_active', true)
      .maybeSingle();
    if (genreError || !romanceGenre?.id) return;

    const metadata = {
      title: 'Cinta dan Cinta Sejati',
      author: 'Shadiq Jalal Al-Adzm',
      description: 'Refleksi tentang cinta, cinta sejati, hasrat, dan berbagai makna hubungan manusia yang diterjemahkan oleh Dedy Wahyudin.',
      cover_url: '/images/novel/cinta-dan-cinta-sejati/cover.jpg',
      pdf_url: '/api/novel/cinta-dan-cinta-sejati',
      genre_id: romanceGenre.id,
      status: 'active',
    };
    const {data: existing, error: findError} = await supabase
      .from('books')
      .select('id')
      .ilike('title', metadata.title)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle();
    if (findError) return;

    const result = existing?.id
      ? await supabase.from('books').update(metadata).eq('id', existing.id).select('id').single()
      : await supabase.from('books').insert(metadata).select('id').single();
    if (!result.data?.id) return;

    const pageRows = Array.from({length: 155}, (_, index) => ({
      book_id: result.data.id,
      page_number: index + 1,
      page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
      content: `${metadata.pdf_url}#page=${index + 1}`,
    }));
    await supabase.from('book_pages').upsert(pageRows, {onConflict: 'book_id,page_number'});
  }

  async function ensurePaidRomanceBook() {
    const {data: romanceGenre} = await supabase
      .from('genres')
      .select('id')
      .eq('slug', 'novel')
      .eq('is_active', true)
      .maybeSingle();
    if (!romanceGenre?.id) return;

    const metadata = {
      title: 'My Sweet Doctor',
      author: 'Azhara Natasya',
      description: 'Novel romance tentang pertemuan, perhatian, dan perjalanan perasaan yang tumbuh di antara dunia medis dan kehidupan pribadi.',
      cover_url: '/images/novel/my-sweet-doctor/cover.webp',
      pdf_url: '/api/novel/my-sweet-doctor',
      genre_id: romanceGenre.id,
      status: 'active',
    };
    const {data: existing} = await supabase
      .from('books')
      .select('id')
      .ilike('title', metadata.title)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle();
    const result = existing?.id
      ? await supabase.from('books').update(metadata).eq('id', existing.id).select('id').single()
      : await supabase.from('books').insert(metadata).select('id').single();
    if (!result.data?.id) return;

    const pageRows = Array.from({length: 441}, (_, index) => ({
      book_id: result.data.id,
      page_number: index + 1,
      page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
      content: `${metadata.pdf_url}#page=${index + 1}`,
    }));
    await supabase.from('book_pages').upsert(pageRows, {onConflict: 'book_id,page_number'});
  }

  const shown = useMemo(
    () =>
      items.filter(
        (book) =>
          `${book.title} ${book.author || ''}`.toLowerCase().includes(query.toLowerCase()) &&
          (genre === 'all' || book.genre_id === genre) &&
          (status === 'all' || book.status === status),
      ),
    [items, query, genre, status],
  );

  const scroll = (direction) => shelfRef.current?.scrollBy({left: direction * 620, behavior: 'smooth'});

  async function remove(id) {
    const {error: removeError} = await supabase.from('books').delete().eq('id', id);
    if (removeError) {
      setError(removeError.message);
      return;
    }

    load();
  }

  async function syncBuiltInBooks(quiet = false) {
    setError('');
    if (!quiet) setSuccess('');
    setSyncing(true);

    const {data: catalogGenres, error: genreError} = await supabase
      .from('genres')
      .select('id,slug')
      .in('slug', ['dongeng', 'novel', 'horror', 'komik'])
      .eq('is_active', true)
      .limit(4);

    const genreIds = Object.fromEntries((catalogGenres || []).map((item) => [item.slug, item.id]));
    if (genreError || !genreIds.dongeng || !genreIds.novel || !genreIds.horror || !genreIds.komik) {
      setError(genreError?.message || 'Genre Dongeng, Romance, Horror, dan Komik harus tersedia serta aktif.');
      setSyncing(false);
      await load();
      return;
    }

    const builtInBooks = [
      {
        genre_id: genreIds.novel,
        title: 'Perahu Kertas',
        author: 'Dee Lestari',
        description: 'Kisah Kugy dan Keenan tentang mimpi, persahabatan, pilihan hidup, dan perasaan yang menemukan jalannya kembali.',
        cover_url: '/images/novel/perahu-kertas-premium-v2.png',
        pdf_url: '/api/novel/perahu-kertas',
        status: 'active',
      },
      {
        genre_id: genreIds.novel,
        title: 'Antara Cinta atau Sekadar Rasa',
        author: 'Fitri Lusiana Kurniasari',
        description: 'Cerita romance tentang perasaan yang tumbuh, keraguan hati, dan pencarian makna antara cinta yang sungguh-sungguh atau sekadar rasa.',
        cover_url: '/images/novel/antara-cinta-atau-sekadar-rasa/cover.webp',
        pdf_url: '/api/novel/antara-cinta-atau-sekadar-rasa',
        status: 'active',
        page_count: 14,
      },
      {
        genre_id: genreIds.novel,
        title: 'Cinta dan Cinta Sejati',
        author: 'Shadiq Jalal Al-Adzm',
        description: 'Refleksi tentang cinta, cinta sejati, hasrat, dan berbagai makna hubungan manusia yang diterjemahkan oleh Dedy Wahyudin.',
        cover_url: '/images/novel/cinta-dan-cinta-sejati/cover.jpg',
        pdf_url: '/api/novel/cinta-dan-cinta-sejati',
        status: 'active',
        page_count: 155,
      },
      {
        genre_id: genreIds.novel,
        title: 'My Sweet Doctor',
        author: 'Azhara Natasya',
        description: 'Novel romance tentang pertemuan, perhatian, dan perjalanan perasaan yang tumbuh di antara dunia medis dan kehidupan pribadi.',
        cover_url: '/images/novel/my-sweet-doctor/cover.webp',
        pdf_url: '/api/novel/my-sweet-doctor',
        status: 'active',
        page_count: 441,
      },
      {
        genre_id: genreIds.dongeng,
        title: 'Cerita Rakyat Nusantara 2',
        author: 'Cerita Rakyat Nusantara',
        description: 'Kumpulan tujuh cerita rakyat dari berbagai daerah Nusantara, dari Putri Kandita hingga Ki Ageng Pandanaran.',
        cover_url: '/images/dongeng/cerita-rakyat-nusantara-2-cover-v2.png',
        pdf_url: '/api/dongeng/cerita-rakyat-nusantara-2',
        status: 'active',
      },
      {
        genre_id: genreIds.horror,
        title: 'Misteri Penunggu Pohon Tua',
        author: 'Vidyāsenā Production',
        description: 'Seri kumpulan cerpen Buddhis tentang misteri, kehidupan sehari-hari, dan nilai kebijaksanaan yang diterbitkan dalam rangka Waisak 2559 TB.',
        cover_url: '/images/horror/misteri-penunggu-pohon-tua.png',
        pdf_url: '/api/horror/misteri-penunggu-pohon-tua',
        status: 'active',
      },
      {
        genre_id: genreIds.horror,
        title: 'Jeritan Tengah Malam',
        author: 'Kelompok 2',
        description: 'Antologi cerpen horor bertema KKN, teror malam, dan kejadian misterius yang menguji keberanian para tokohnya.',
        cover_url: '/images/horror/cerita-kkn/cover-premium-v2.png',
        pdf_url: '/api/horror/cerita-kkn-kelompok-2',
        status: 'active',
        page_count: 73,
      },
      {
        genre_id: genreIds.horror,
        title: 'Kunci Hitam',
        author: 'Olvidado Shakur',
        description: 'Novel seram tentang sebuah kunci hitam yang membuka rangkaian rahasia, teror, dan kejadian ganjil yang sulit dihentikan.',
        cover_url: '/images/horror/kunci-hitam/cover.webp',
        pdf_url: '/api/horror/kunci-hitam',
        status: 'active',
        page_count: 61,
      },
      {
        genre_id: genreIds.horror,
        title: 'Kursi Kosong',
        author: 'Sandya Lustika dkk.',
        description: 'Antologi cerpen horor tentang teror, kejadian ganjil, dan rahasia mencekam yang hadir dari balik keheningan.',
        cover_url: '/images/horror/kursi-kosong/cover.jpg',
        pdf_url: '/api/horror/kursi-kosong',
        status: 'active',
        page_count: 97,
      },
      {
        genre_id: genreIds.komik,
        title: 'Mereka Juga Bertasbih',
        author: 'Yesi Maryam dkk.',
        description: 'Komik edukatif tentang kepedulian terhadap satwa liar, ancaman perdagangan ilegal, dan pentingnya menjaga kehidupan di alam.',
        cover_url: '/images/comic/perdagangan-satwa-liar/page-001.webp',
        pdf_url: '/api/comic/perdagangan-satwa-liar',
        status: 'active',
        page_count: 24,
      },
      {
        genre_id: genreIds.komik,
        title: 'Dragon Ball Vol. 1',
        author: 'Akira Toriyama',
        description: 'Awal petualangan Son Goku bersama Bulma untuk mencari tujuh Dragon Ball, dengan aksi, humor, dan dunia fantasi yang ikonik.',
        cover_url: '/images/comic/dragon-ball/cover.webp',
        pdf_url: '/api/comic/dragon-ball-01',
        status: 'active',
        page_count: 86,
      },
      {
        genre_id: genreIds.komik,
        title: 'Dragon Ball Vol. 2',
        author: 'Akira Toriyama',
        description: 'Petualangan Goku dan kawan-kawan berlanjut dengan ancaman baru, aksi yang lebih seru, dan humor khas Dragon Ball.',
        cover_url: '/images/comic/dragon-ball-02/cover.webp',
        pdf_url: '/api/comic/dragon-ball-02',
        status: 'active',
        page_count: 92,
      },
      {
        genre_id: genreIds.komik,
        title: 'Dragon Ball Vol. 3',
        author: 'Akira Toriyama',
        description: 'Goku memasuki petualangan dan pertarungan berikutnya, bertemu lawan tangguh, serta terus mengasah kemampuannya.',
        cover_url: '/images/comic/dragon-ball-03/cover.webp',
        pdf_url: '/api/comic/dragon-ball-03',
        status: 'active',
        page_count: 93,
      },
    ];

    let syncError = null;
    const pdfBookRecords = [];
    for (const payload of builtInBooks) {
      const {page_count: pageCount, ...bookPayload} = payload;
      const {data: existingBooks, error: findError} = await supabase
        .from('books')
        .select('id')
        .ilike('title', payload.title)
        .limit(1);

      if (findError) {
        syncError = findError;
        break;
      }

      const request = existingBooks?.[0]?.id
        ? supabase.from('books').update(bookPayload).eq('id', existingBooks[0].id).select('id').single()
        : supabase.from('books').insert(bookPayload).select('id').single();
      const {data: savedBook, error: writeError} = await request;
      if (writeError) {
        syncError = writeError;
        break;
      }
      if (pageCount) {
        pdfBookRecords.push({
          id: savedBook.id,
          pages: pageCount,
          endpoint: payload.pdf_url,
        });
      }
    }

    if (!syncError) {
      for (const record of pdfBookRecords) {
        const pageRows = Array.from({length: record.pages}, (_, index) => ({
          book_id: record.id,
          page_number: index + 1,
          page_title: index === 0 ? 'Sampul dan Jaket Buku' : `Halaman ${index + 1}`,
          content: `${record.endpoint}#page=${index + 1}`,
        }));
        const {error: pagesError} = await supabase
          .from('book_pages')
          .upsert(pageRows, {onConflict: 'book_id,page_number'});
        if (pagesError) {
          syncError = pagesError;
          break;
        }
      }
    }

    if (syncError) {
      setError(syncError.message);
    } else if (!quiet) {
      setSuccess('Semua buku bawaan sudah aktif. Kemajuan membaca, ringkasan, pemeriksaan admin, pemberitahuan, dan poin sudah terhubung.');
    }
    await load();
    setSyncing(false);
  }

  return (
    <AdminShell title="Kelola Buku" subtitle="Tambah, ubah, atau hapus buku untuk pembaca.">
      <div className={styles.actions}>
        <Link className={styles.button} href="/admin/books/new">
          + Tambah Buku
        </Link>
        <button className={styles.button} type="button" onClick={() => syncBuiltInBooks(false)} disabled={syncing}>
          {syncing ? 'Memperbarui...' : 'Perbarui Buku Bawaan'}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <div className={shelf.intro}>
        <h2>Koleksi Buku</h2>
        <p>Pilih jenis cerita untuk menemukan buku yang ingin dikelola.</p>
      </div>

      <section className={shelf.genreFilter} aria-label="Filter berdasarkan genre">
        <button
          type="button"
          className={`${shelf.genreFilterButton} ${genre === 'all' ? shelf.genreFilterActive : ''}`}
          onClick={() => setGenre('all')}
        >
          Semua Genre
        </button>
        {genres.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`${shelf.genreFilterButton} ${genre === item.id ? shelf.genreFilterActive : ''}`}
            style={{background: item.theme_color || '#fff', color: readableTextColor(item.theme_color)}}
            onClick={() => setGenre(item.id)}
          >
            <span>{item.icon || 'B'}</span>
            {item.name}
          </button>
        ))}
      </section>

      <div className={styles.toolbar}>
        <input
          className={styles.input}
          placeholder="Cari judul atau penulis..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <p className={shelf.filterSummary}>
        Menampilkan <b>{shown.length}</b> dari {items.length} buku
      </p>

      {!shown.length ? (
        <EmptyState
          text={
            items.length
              ? 'Tidak ada buku yang cocok dengan pencarian atau filter.'
              : 'Belum ada buku. Tambahkan buku pertama ke BacaPop.'
          }
        />
      ) : (
        <div className={shelf.shelfWrap}>
          <button className={`${shelf.arrow} ${shelf.left}`} onClick={() => scroll(-1)} aria-label="Buku sebelumnya">
            &lsaquo;
          </button>
          <section className={shelf.shelf} ref={shelfRef}>
            {shown.map((book) => {
              const itemGenre = book.genres || {};

              return (
                <article className={shelf.book} key={book.id}>
                  <div className={shelf.coverWrap}>
                    <span className={shelf.newBadge}>
                      {itemGenre.icon} {itemGenre.name || 'BARU'}
                    </span>
                    {book.cover_url ? (
                      <img className={`${shelf.cover} ${book.title?.trim().toLowerCase().startsWith('dragon ball vol.') ? styles.containBookCover : ''}`} src={book.cover_url} alt={`Sampul ${book.title}`} />
                    ) : (
                      <div className={shelf.placeholder} style={{background: itemGenre.theme_color || '#fff', color: readableTextColor(itemGenre.theme_color)}}>
                        {itemGenre.icon || 'B'}
                      </div>
                    )}
                  </div>

                  <h2>{book.title}</h2>
                  <div className={shelf.meta}>
                    <b>{book.author || 'Penulis tidak dicantumkan'}</b>
                    <br />
                    <small>
                      {book.page_count} halaman &middot; <Status value={book.status} />
                    </small>
                  </div>

                  <div className={shelf.actions}>
                    <Link className={styles.button} href={`/admin/books/${book.id}`}>
                      Detail
                    </Link>
                    <Link className={styles.button} href={`/admin/books/${book.id}/edit`}>
                      Edit
                    </Link>
                    <Link className={styles.button} href={`/admin/books/${book.id}/pages`}>
                      Kelola Halaman
                    </Link>
                    <ConfirmButton message="Yakin ingin menghapus buku ini?" onConfirm={() => remove(book.id)} />
                  </div>
                </article>
              );
            })}
          </section>
          <button className={`${shelf.arrow} ${shelf.right}`} onClick={() => scroll(1)} aria-label="Buku berikutnya">
            &rsaquo;
          </button>
        </div>
      )}
    </AdminShell>
  );
}
