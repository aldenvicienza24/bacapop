'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {
  ceritaRakyatNusantara2Book,
  ceritaRakyatNusantara2Pages,
  dongengBinatangBook,
  dongengBinatangPages,
  dongengBook,
  dongengPages,
  dongengSebelumTidur2Book,
  dongengSebelumTidur2Pages,
  isCeritaRakyatNusantara2,
  isDongengBinatang,
  isDongengSebelumTidur2,
  isSehariSatuDongeng,
  sehariSatuDongengBook,
  sehariSatuDongengPages,
  withCeritaRakyatNusantara2Content,
  withDongengBinatangContent,
  withDongengSebelumTidur2Content,
  withSehariSatuDongengContent,
} from '../../../lib/dongengContent';
import {
  ceritaKknBook,
  ceritaKknPages,
  horrorBook,
  horrorPages,
  isCeritaKkn,
  isKunciHitam,
  isKursiKosong,
  isMisteriPenungguPohonTua,
  isMisteriRumahTerkutuk,
  kunciHitamBook,
  kunciHitamPages,
  kursiKosongBook,
  kursiKosongPages,
  misteriPenungguPohonTuaBook,
  misteriPenungguPohonTuaPages,
  withCeritaKknContent,
  withHorrorContent,
  withKunciHitamContent,
  withKursiKosongContent,
  withMisteriPenungguPohonTuaContent
} from '../../../lib/horrorContent';
import {
  dragonBallBook,
  dragonBallBooks,
  dragonBallPages,
  getDragonBallDefinition,
  isDragonBallComic,
  isMercuryComic,
  isWildlifeComic,
  mercuryComicBook,
  mercuryComicPages,
  wildlifeComicBook,
  wildlifeComicPages,
  withDragonBallComic,
  withMercuryComic,
  withWildlifeComic
} from '../../../lib/comicContent';
import {
  antaraCintaBook,
  antaraCintaPages,
  cintaSejatiBook,
  cintaSejatiPages,
  isAntaraCinta,
  isCintaSejati,
  isLautBercerita,
  isMySweetDoctor,
  isPerahuKertas,
  lautBerceritaBook,
  mySweetDoctorBook,
  mySweetDoctorPages,
  novelPages,
  perahuKertasBook,
  perahuKertasPages,
  withAntaraCintaContent,
  withCintaSejatiContent,
  withMySweetDoctorContent,
  withNovelContent,
  withPerahuKertasContent,
} from '../../../lib/novelContent';
import {getPaidBookAccess, isPaidBook} from '../../../lib/paidBooks';
import {getPremiumBookAccess, isPremiumBook} from '../../../lib/premiumBooks';
import {supabase} from '../../../lib/supabase';
import {notifySummarySubmitted} from '../../../lib/userNotifications';
import {getDashboardUser, logoutFromDashboard} from '../../auth';
import styles from './book-detail.module.css';

const emptyProgress = {current_page: 0, progress_percent: 0, is_finished: false};

function getDemoBook(id) {
  if (id === dongengBook.id) return {book: dongengBook, totalPages: dongengPages.length};
  if (id === ceritaRakyatNusantara2Book.id) {
    return {book: ceritaRakyatNusantara2Book, totalPages: ceritaRakyatNusantara2Pages.length};
  }
  if (id === dongengBinatangBook.id) {
    return {book: dongengBinatangBook, totalPages: dongengBinatangPages.length};
  }
  if (id === sehariSatuDongengBook.id) {
    return {book: sehariSatuDongengBook, totalPages: sehariSatuDongengPages.length};
  }
  if (id === dongengSebelumTidur2Book.id) {
    return {book: dongengSebelumTidur2Book, totalPages: dongengSebelumTidur2Pages.length};
  }
  if (id === horrorBook.id) return {book: horrorBook, totalPages: horrorPages.length};
  if (id === misteriPenungguPohonTuaBook.id) {
    return {book: misteriPenungguPohonTuaBook, totalPages: misteriPenungguPohonTuaPages.length};
  }
  if (id === ceritaKknBook.id) return {book: ceritaKknBook, totalPages: ceritaKknPages.length};
  if (id === kunciHitamBook.id) return {book: kunciHitamBook, totalPages: kunciHitamPages.length};
  if (id === kursiKosongBook.id) return {book: kursiKosongBook, totalPages: kursiKosongPages.length};
  if (id === mercuryComicBook.id) return {book: mercuryComicBook, totalPages: mercuryComicPages.length};
  if (id === wildlifeComicBook.id) return {book: wildlifeComicBook, totalPages: wildlifeComicPages.length};
  if (id === dragonBallBook.id) return {book: dragonBallBook, totalPages: dragonBallPages.length};
  const dragonBallDemo = dragonBallBooks.find((book) => book.id === id);
  if (dragonBallDemo) {
    const definition = getDragonBallDefinition(dragonBallDemo);
    return {book: definition.book, totalPages: definition.pages.length};
  }
  if (id === lautBerceritaBook.id) return {book: lautBerceritaBook, totalPages: novelPages.length};
  if (id === perahuKertasBook.id) return {book: perahuKertasBook, totalPages: perahuKertasPages.length};
  if (id === antaraCintaBook.id) return {book: antaraCintaBook, totalPages: antaraCintaPages.length};
  if (id === cintaSejatiBook.id) return {book: cintaSejatiBook, totalPages: cintaSejatiPages.length};
  if (id === mySweetDoctorBook.id) return {book: mySweetDoctorBook, totalPages: mySweetDoctorPages.length};
  return null;
}

function localKey(type, bookId) {
  return `bacapop:${type}:${bookId}`;
}

function resolveDatabaseBook(databaseBook, fallbackBook = {}) {
  if (isMisteriRumahTerkutuk(databaseBook)) return withHorrorContent(databaseBook);
  if (isMisteriPenungguPohonTua(databaseBook)) return withMisteriPenungguPohonTuaContent(databaseBook);
  if (isCeritaKkn(databaseBook)) return withCeritaKknContent(databaseBook);
  if (isKunciHitam(databaseBook)) return withKunciHitamContent(databaseBook);
  if (isKursiKosong(databaseBook)) return withKursiKosongContent(databaseBook);
  if (isMercuryComic(databaseBook)) return withMercuryComic({...databaseBook, is_demo: false});
  if (isWildlifeComic(databaseBook)) return withWildlifeComic({...databaseBook, is_demo: false});
  if (isDragonBallComic(databaseBook)) return withDragonBallComic({...databaseBook, is_demo: false});
  if (isLautBercerita(databaseBook)) return withNovelContent({...databaseBook, is_demo: false});
  if (isPerahuKertas(databaseBook)) return withPerahuKertasContent({...databaseBook, is_demo: false});
  if (isAntaraCinta(databaseBook)) return withAntaraCintaContent({...databaseBook, is_demo: false});
  if (isCintaSejati(databaseBook)) return withCintaSejatiContent({...databaseBook, is_demo: false});
  if (isMySweetDoctor(databaseBook)) return withMySweetDoctorContent({...databaseBook, is_demo: false});
  if (isCeritaRakyatNusantara2(databaseBook)) {
    return withCeritaRakyatNusantara2Content({...databaseBook, is_demo: false});
  }
  if (isDongengBinatang(databaseBook)) {
    return withDongengBinatangContent({...databaseBook, is_demo: false});
  }
  if (isSehariSatuDongeng(databaseBook)) {
    return withSehariSatuDongengContent({...databaseBook, is_demo: false});
  }
  if (isDongengSebelumTidur2(databaseBook)) {
    return withDongengSebelumTidur2Content({...databaseBook, is_demo: false});
  }
  return {...fallbackBook, ...databaseBook, is_demo: false};
}

export default function BookDetailPage() {
  const {id} = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [book, setBook] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [progress, setProgress] = useState(emptyProgress);
  const [draftPage, setDraftPage] = useState(0);
  const [summary, setSummary] = useState(null);
  const [title, setTitle] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [paidLocked, setPaidLocked] = useState(false);
  const [summaryRulesOpen, setSummaryRulesOpen] = useState(false);
  const [summaryRulesAccepted, setSummaryRulesAccepted] = useState(false);

  useEffect(() => {
    if (!summaryRulesOpen) return undefined;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarGap = window.innerWidth - root.clientWidth;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSummaryRulesOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [summaryRulesOpen]);

  useEffect(() => {
    if (!summary?.is_local || !book || !user) return undefined;

    const retryWhenVisible = () => {
      if (document.visibilityState === 'visible') syncLocalSummary();
    };
    window.addEventListener('focus', retryWhenVisible);
    document.addEventListener('visibilitychange', retryWhenVisible);

    return () => {
      window.removeEventListener('focus', retryWhenVisible);
      document.removeEventListener('visibilitychange', retryWhenVisible);
    };
  }, [book, summary?.is_local, user]);

  useEffect(() => {
    async function loadDetail() {
      const currentUser = await getDashboardUser(router);
      if (!currentUser) return;
      setUser(currentUser);
      const premiumAccess = await getPremiumBookAccess(currentUser.id);
      const horrorPremiumAccess = await getPremiumBookAccess(currentUser.id, ceritaKknBook);
      const paidBookAccess = await getPaidBookAccess(currentUser.id, String(id));

      const demo = getDemoBook(id);
      if (demo) {
        if (isPaidBook(demo.book) && !paidBookAccess.unlocked) {
          setBook(demo.book);
          setTotalPages(demo.totalPages);
          setPaidLocked(true);
          setLoading(false);
          return;
        }
        const demoPremiumAccess = isCeritaKkn(demo.book) ? horrorPremiumAccess : premiumAccess;
        if (isPremiumBook(demo.book) && !demoPremiumAccess.unlocked) {
          setBook(demo.book);
          setTotalPages(demo.totalPages);
          setPremiumLocked(true);
          setLoading(false);
          return;
        }
        const localProgress = JSON.parse(localStorage.getItem(localKey('progress', id)) || 'null') || emptyProgress;
        const savedLocalSummary = JSON.parse(localStorage.getItem(localKey('summary', id)) || 'null');
        const localSummary = savedLocalSummary ? {...savedLocalSummary, is_local: true} : null;
        const {data: databaseBook} = await supabase
          .from('books')
          .select('id,title,author,description,cover_url,pdf_url,status,genres(name,slug,theme_color,accent_color)')
          .eq('title', demo.book.title)
          .eq('status', 'active')
          .order('created_at', {ascending: true})
          .limit(1)
          .maybeSingle();

        if (databaseBook) {
          const resolvedBook = resolveDatabaseBook(databaseBook, demo.book);
          let {data: savedProgress} = await supabase
            .from('reading_progress')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('book_id', databaseBook.id)
            .maybeSingle();

          if (localProgress.current_page > (savedProgress?.current_page || 0)) {
            const {data: migratedProgress} = await supabase
              .from('reading_progress')
              .upsert({user_id: currentUser.id, book_id: databaseBook.id, ...localProgress}, {onConflict: 'user_id,book_id'})
              .select()
              .single();
            if (migratedProgress) {
              savedProgress = migratedProgress;
              localStorage.removeItem(localKey('progress', id));
            }
          }

          let {data: savedSummary} = await supabase
            .from('summaries')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('book_id', databaseBook.id)
            .maybeSingle();

          if (!savedSummary && localSummary) {
            if (!savedProgress?.is_finished) {
              const completedProgress = {
                current_page: Math.max(
                  Number(savedProgress?.current_page || 0),
                  Number(localProgress.current_page || 0),
                  demo.totalPages,
                ),
                progress_percent: 100,
                is_finished: true,
              };
              const {data: syncedProgress, error: syncProgressError} = await supabase
                .from('reading_progress')
                .upsert(
                  {user_id: currentUser.id, book_id: databaseBook.id, ...completedProgress},
                  {onConflict: 'user_id,book_id'},
                )
                .select()
                .single();

              if (syncedProgress) savedProgress = syncedProgress;
              if (syncProgressError) {
                setNotice('Kemajuan membaca belum tersimpan secara online. Coba muat ulang halaman.');
              }
            }

            if (savedProgress?.is_finished) {
            const {data: migratedSummary, error: migrationError} = await supabase
              .from('summaries')
              .insert({
                user_id: currentUser.id,
                book_id: databaseBook.id,
                title: localSummary.title,
                summary_text: localSummary.summary_text,
                status: 'pending',
                points_awarded: 0,
                submitted_at: localSummary.submitted_at || new Date().toISOString(),
              })
              .select()
              .single();
            if (migratedSummary) {
              savedSummary = migratedSummary;
              localStorage.removeItem(localKey('summary', id));
              localStorage.removeItem(localKey('progress', id));
              notifySummarySubmitted(currentUser.id, migratedSummary, resolvedBook.title, `/dashboard/books/${databaseBook.id}`);
              setNotice('Ringkasan lokal berhasil dipindahkan ke Supabase dan sekarang dapat dilihat admin.');
            } else if (migrationError) {
              setNotice(`Ringkasan lokal belum dapat dipindahkan: ${migrationError.message}`);
            }
            }
          } else if (savedSummary && localSummary) {
            localStorage.removeItem(localKey('summary', id));
          }

          setBook(resolvedBook);
          setTotalPages(demo.totalPages);
          setProgress(savedProgress || localProgress);
          setDraftPage(savedProgress?.current_page || localProgress.current_page || 0);
          setSummary(savedSummary || null);
          setLoading(false);
          return;
        }

        setBook(demo.book);
        setTotalPages(demo.totalPages);
        setProgress(localProgress);
        setDraftPage(localProgress.current_page || 0);
        setSummary(localSummary);
        setNotice('');
        setLoading(false);
        return;
      }

      const {data: bookData, error: bookError} = await supabase
        .from('books')
        .select('id,title,author,description,cover_url,pdf_url,status,genres(name,slug,theme_color,accent_color)')
        .eq('id', id)
        .eq('status', 'active')
        .maybeSingle();

      if (bookError || !bookData) {
        setError('Buku tidak ditemukan atau belum bisa dibuka.');
        setLoading(false);
        return;
      }

      const normalizedBook = isMisteriRumahTerkutuk(bookData)
        ? withHorrorContent(bookData)
        : isMisteriPenungguPohonTua(bookData)
          ? withMisteriPenungguPohonTuaContent({...bookData, is_demo: false})
        : isCeritaKkn(bookData)
          ? withCeritaKknContent({...bookData, is_demo: false})
        : isKunciHitam(bookData)
          ? withKunciHitamContent({...bookData, is_demo: false})
        : isKursiKosong(bookData)
          ? withKursiKosongContent({...bookData, is_demo: false})
        : isMercuryComic(bookData)
          ? withMercuryComic({...bookData, is_demo: false})
        : isWildlifeComic(bookData)
          ? withWildlifeComic({...bookData, is_demo: false})
          : isDragonBallComic(bookData)
            ? withDragonBallComic({...bookData, is_demo: false})
          : isLautBercerita(bookData)
            ? withNovelContent({...bookData, is_demo: false})
            : isPerahuKertas(bookData)
              ? withPerahuKertasContent({...bookData, is_demo: false})
              : isAntaraCinta(bookData)
                ? withAntaraCintaContent({...bookData, is_demo: false})
              : isCintaSejati(bookData)
                ? withCintaSejatiContent({...bookData, is_demo: false})
              : isMySweetDoctor(bookData)
                ? withMySweetDoctorContent({...bookData, is_demo: false})
              : isCeritaRakyatNusantara2(bookData)
                ? withCeritaRakyatNusantara2Content({...bookData, is_demo: false})
              : isDongengBinatang(bookData)
                ? withDongengBinatangContent({...bookData, is_demo: false})
              : isSehariSatuDongeng(bookData)
                ? withSehariSatuDongengContent({...bookData, is_demo: false})
              : isDongengSebelumTidur2(bookData)
                ? withDongengSebelumTidur2Content({...bookData, is_demo: false})
            : bookData;
      const activePremiumAccess = isCeritaKkn(bookData) ? horrorPremiumAccess : premiumAccess;
      if (isPremiumBook(bookData) && !activePremiumAccess.unlocked) {
        setBook(normalizedBook);
        setTotalPages(perahuKertasPages.length);
        setPremiumLocked(true);
        setLoading(false);
        return;
      }
      const databasePaidAccess = isPaidBook(bookData)
        ? await getPaidBookAccess(currentUser.id, bookData)
        : {unlocked: true};
      if (isPaidBook(bookData) && !databasePaidAccess.unlocked) {
        setBook(normalizedBook);
        setTotalPages(isDongengBinatang(bookData)
          ? dongengBinatangPages.length
          : isSehariSatuDongeng(bookData)
            ? sehariSatuDongengPages.length
          : isKunciHitam(bookData)
            ? kunciHitamPages.length
            : mySweetDoctorPages.length);
        setPaidLocked(true);
        setLoading(false);
        return;
      }
      const fallbackTotal = isMisteriRumahTerkutuk(bookData)
        ? horrorPages.length
        : isMisteriPenungguPohonTua(bookData)
          ? misteriPenungguPohonTuaPages.length
        : isCeritaKkn(bookData)
          ? ceritaKknPages.length
        : isKunciHitam(bookData)
          ? kunciHitamPages.length
        : isKursiKosong(bookData)
          ? kursiKosongPages.length
        : isMercuryComic(bookData)
          ? mercuryComicPages.length
        : isWildlifeComic(bookData)
          ? wildlifeComicPages.length
          : isDragonBallComic(bookData)
            ? getDragonBallDefinition(bookData).pages.length
          : isLautBercerita(bookData)
            ? novelPages.length
          : isPerahuKertas(bookData)
            ? perahuKertasPages.length
            : isAntaraCinta(bookData)
              ? antaraCintaPages.length
            : isCintaSejati(bookData)
              ? cintaSejatiPages.length
            : isMySweetDoctor(bookData)
              ? mySweetDoctorPages.length
            : isCeritaRakyatNusantara2(bookData)
              ? ceritaRakyatNusantara2Pages.length
            : isDongengBinatang(bookData)
              ? dongengBinatangPages.length
            : isSehariSatuDongeng(bookData)
              ? sehariSatuDongengPages.length
            : isDongengSebelumTidur2(bookData)
              ? dongengSebelumTidur2Pages.length
            : 0;
      const {count} = await supabase
        .from('book_pages')
        .select('id', {count: 'exact', head: true})
        .eq('book_id', id);

      const localProgress = JSON.parse(localStorage.getItem(localKey('progress', id)) || 'null');
      const localSummary = JSON.parse(localStorage.getItem(localKey('summary', id)) || 'null');
      const [progressResult, summaryResult] = await Promise.all([
        supabase.from('reading_progress').select('*').eq('user_id', currentUser.id).eq('book_id', id).maybeSingle(),
        supabase.from('summaries').select('*').eq('user_id', currentUser.id).eq('book_id', id).maybeSingle(),
      ]);

      let progressData = progressResult.data;
      let summaryData = summaryResult.data;
      const progressError = progressResult.error;
      const summaryError = summaryResult.error;

      if (localProgress && localProgress.current_page > (progressData?.current_page || 0)) {
        const {data: migratedProgress, error: migrationProgressError} = await supabase
          .from('reading_progress')
          .upsert({user_id: currentUser.id, book_id: id, ...localProgress}, {onConflict: 'user_id,book_id'})
          .select()
          .single();
        if (migratedProgress) {
          progressData = migratedProgress;
          localStorage.removeItem(localKey('progress', id));
        } else if (migrationProgressError) {
          setNotice('Kemajuan membaca baru tersimpan di perangkat ini.');
        }
      }

      if (!summaryData && localSummary && (progressData?.is_finished || localProgress?.is_finished)) {
        const {data: migratedSummary, error: migrationSummaryError} = await supabase
          .from('summaries')
          .insert({
            user_id: currentUser.id,
            book_id: id,
            title: localSummary.title,
            summary_text: localSummary.summary_text,
            status: 'pending',
            points_awarded: 0,
            submitted_at: localSummary.submitted_at || new Date().toISOString(),
          })
          .select()
          .single();
        if (migratedSummary) {
          summaryData = migratedSummary;
          localStorage.removeItem(localKey('summary', id));
          notifySummarySubmitted(currentUser.id, migratedSummary, normalizedBook.title, `/dashboard/books/${id}`);
          setNotice('Ringkasan lokal berhasil dipindahkan ke Supabase dan sekarang dapat dilihat admin.');
        } else if (migrationSummaryError) {
          setNotice(`Ringkasan lokal belum dapat dipindahkan: ${migrationSummaryError.message}`);
        }
      }

      setBook(normalizedBook);
      setTotalPages(count || fallbackTotal);
      setProgress(progressData || emptyProgress);
      setDraftPage(progressData?.current_page || 0);
      setSummary(summaryData || null);

      if (progressError || summaryError) {
        setNotice('Penyimpanan online belum siap. Coba lagi beberapa saat lagi.');
      }
      setLoading(false);
    }

    loadDetail();
  }, [id, router]);

  const percent = useMemo(() => {
    if (!totalPages) return 0;
    return Math.min(100, Math.round((Number(draftPage || 0) / totalPages) * 100));
  }, [draftPage, totalPages]);
  const finished = progress.is_finished || Number(progress.progress_percent) >= 100;
  const charsLeft = Math.max(0, 100 - summaryText.trim().length);

  async function saveProgress(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const safePage = Math.max(0, Math.min(totalPages, Number.parseInt(draftPage, 10) || 0));
    const progressPercent = totalPages ? Math.round((safePage / totalPages) * 10000) / 100 : 0;
    const nextProgress = {current_page: safePage, progress_percent: progressPercent, is_finished: progressPercent >= 100};
    setSaving(true);

    if (book.is_demo) {
      localStorage.setItem(localKey('progress', book.id), JSON.stringify(nextProgress));
      setProgress(nextProgress);
      setDraftPage(safePage);
      setNotice('Halaman terakhir berhasil disimpan.');
      setSaving(false);
      return;
    }

    const {data, error: saveError} = await supabase
      .from('reading_progress')
      .upsert({user_id: user.id, book_id: book.id, ...nextProgress}, {onConflict: 'user_id,book_id'})
      .select()
      .single();

    if (saveError) setError(saveError.message);
    else {
      setProgress(data);
      setDraftPage(data.current_page);
      setNotice(data.is_finished ? 'Buku selesai. Kamu sekarang bisa menulis ringkasan!' : 'Halaman terakhir berhasil disimpan.');
    }
    setSaving(false);
  }

  async function submitSummary(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!summaryRulesAccepted) {
      setSummaryRulesOpen(true);
      return setError('Baca dan setujui aturan ringkasan sebelum mengirim.');
    }
    if (!title.trim()) return setError('Judul ringkasan wajib diisi.');
    if (summaryText.trim().length < 100) return setError(`Ringkasan masih kurang ${charsLeft} karakter.`);
    setSaving(true);

    const payload = {
      user_id: user.id,
      book_id: book.id,
      title: title.trim(),
      summary_text: summaryText.trim(),
      status: 'pending',
      points_awarded: 0,
      submitted_at: new Date().toISOString(),
    };

    if (book.is_demo) {
      const {data: databaseBook} = await supabase
        .from('books')
        .select('id,title,author,description,cover_url,pdf_url,status,genres(name,slug,theme_color,accent_color)')
        .eq('title', book.title)
        .eq('status', 'active')
        .order('created_at', {ascending: true})
        .limit(1)
        .maybeSingle();

      if (databaseBook?.id) {
        const completedProgress = {
          current_page: totalPages,
          progress_percent: 100,
          is_finished: true,
        };
        const {data: databaseProgress, error: progressError} = await supabase
          .from('reading_progress')
          .upsert(
            {user_id: user.id, book_id: databaseBook.id, ...completedProgress},
            {onConflict: 'user_id,book_id'},
          )
          .select()
          .single();

        if (progressError || !databaseProgress) {
          setError('Status selesai belum berhasil disimpan. Coba lagi.');
          setSaving(false);
          return;
        }

        const databasePayload = {...payload, book_id: databaseBook.id};
        let {data: databaseSummary, error: databaseSummaryError} = await supabase
          .from('summaries')
          .insert(databasePayload)
          .select()
          .single();

        if (databaseSummaryError) {
          const {data: existingSummary} = await supabase
            .from('summaries')
            .select('*')
            .eq('user_id', user.id)
            .eq('book_id', databaseBook.id)
            .maybeSingle();
          if (existingSummary) {
            databaseSummary = existingSummary;
            databaseSummaryError = null;
          }
        }

        if (databaseSummaryError || !databaseSummary) {
          setError('Ringkasan belum berhasil dikirim ke admin. Coba lagi.');
          setSaving(false);
          return;
        }

        localStorage.removeItem(localKey('summary', book.id));
        localStorage.removeItem(localKey('progress', book.id));
        setBook(resolveDatabaseBook(databaseBook, book));
        setProgress(databaseProgress);
        setDraftPage(databaseProgress.current_page);
        setSummary(databaseSummary);
        setEditing(false);
        notifySummarySubmitted(user.id, databaseSummary, databaseBook.title, `/dashboard/books/${databaseBook.id}`);
        setNotice('Ringkasan berhasil dikirim dan akan diperiksa admin.');
        setSaving(false);
        return;
      }

      const localPayload = {...payload, is_local: true};
      localStorage.setItem(localKey('summary', book.id), JSON.stringify(localPayload));
      setSummary(localPayload);
      setEditing(false);
      setNotice('Data buku sedang diperbarui. Ringkasanmu tersimpan sementara di perangkat ini.');
      setSaving(false);
      return;
    }

    const request = summary?.status === 'rejected'
      ? supabase.from('summaries').update({title: payload.title, summary_text: payload.summary_text, status: 'pending'}).eq('id', summary.id).select().single()
      : supabase.from('summaries').insert(payload).select().single();
    const {data, error: submitError} = await request;

    if (submitError) setError(submitError.message);
    else {
      setSummary(data);
      setEditing(false);
      notifySummarySubmitted(user.id, data, book.title, `/dashboard/books/${book.id}`);
      setNotice('Ringkasan berhasil dikirim dan sedang menunggu pemeriksaan admin.');
    }
    setSaving(false);
  }

  async function syncLocalSummary() {
    if (!summary?.is_local) return;
    setSaving(true);
    setError('');
    setNotice('');

    const {data: databaseBook, error: databaseBookError} = await supabase
      .from('books')
      .select('id,title,author,description,cover_url,pdf_url,status,genres(name,slug,theme_color,accent_color)')
      .eq('title', book.title)
      .eq('status', 'active')
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle();

    if (databaseBookError || !databaseBook) {
      setNotice('Ringkasanmu tetap aman di perangkat dan tidak perlu ditulis ulang.');
      setError(
        databaseBookError?.message
          || `${book.title} belum siap untuk mengirim ringkasan. Minta admin memperbarui data buku, lalu coba lagi.`,
      );
      setSaving(false);
      return;
    }

    const completedProgress = {
      current_page: totalPages,
      progress_percent: 100,
      is_finished: true,
    };
    const {data: databaseProgress, error: progressSyncError} = await supabase
      .from('reading_progress')
      .upsert(
        {user_id: user.id, book_id: databaseBook.id, ...completedProgress},
        {onConflict: 'user_id,book_id'},
      )
      .select()
      .single();

    if (progressSyncError) {
      setError('Kemajuan membaca belum berhasil disimpan. Coba lagi.');
      setSaving(false);
      return;
    }

    const summaryPayload = {
      user_id: user.id,
      book_id: databaseBook.id,
      title: summary.title,
      summary_text: summary.summary_text,
      status: 'pending',
      points_awarded: 0,
      submitted_at: summary.submitted_at || new Date().toISOString(),
    };
    let {data: databaseSummary, error: summarySyncError} = await supabase
      .from('summaries')
      .insert(summaryPayload)
      .select()
      .single();

    if (summarySyncError) {
      const {data: existingSummary} = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', databaseBook.id)
        .maybeSingle();
      if (existingSummary) {
        databaseSummary = existingSummary;
        summarySyncError = null;
      }
    }

    if (summarySyncError || !databaseSummary) {
      setError(`Ringkasan gagal dikirim ke Supabase: ${summarySyncError?.message || 'respons database kosong'}`);
      setSaving(false);
      return;
    }

    localStorage.removeItem(localKey('summary', id));
    localStorage.removeItem(localKey('progress', id));
    localStorage.removeItem(localKey('summary', book.id));
    localStorage.removeItem(localKey('progress', book.id));
    setBook(resolveDatabaseBook(databaseBook, book));
    setProgress(databaseProgress);
    setDraftPage(databaseProgress.current_page);
    setSummary(databaseSummary);
    notifySummarySubmitted(user.id, databaseSummary, databaseBook.title, `/dashboard/books/${databaseBook.id}`);
    setNotice('Ringkasan berhasil dikirim dan sekarang bisa diperiksa admin.');
    setSaving(false);
  }

  function startRevision() {
    setTitle(summary.title);
    setSummaryText(summary.summary_text);
    setEditing(true);
  }

  if (loading) return <main className={styles.page}><div className={styles.loading}>Menyiapkan detail buku...</div></main>;

  if (!book) {
    return <main className={styles.page}><div className={styles.loading}><h1>Buku tidak tersedia</h1><p>{error}</p><Link href="/dashboard">Kembali ke semua buku</Link></div></main>;
  }

  if (premiumLocked || paidLocked) {
    return <main className={styles.page} style={{'--genre-color': book.genres?.theme_color || '#f6c1cc', '--genre-accent': book.genres?.accent_color || '#b23a5b'}}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard"><span>B</span>BacaPop!</Link>
        <nav><Link href={`/dashboard/genres/${isCeritaKkn(book) ? 'horror' : 'novel'}`}>Kembali ke {isCeritaKkn(book) ? 'Horror' : 'Romance'}</Link><button onClick={() => logoutFromDashboard(router)}>Keluar</button></nav>
      </header>
      <section className={styles.premiumGate}>
        <div className={styles.premiumGateCover}><img src={book.cover_url || '/images/novel/perahu-kertas-premium-v2.png'} alt={`Sampul ${book.title}`} /><span aria-hidden="true">🔒</span></div>
        <div>
          <span>{paidLocked ? 'BUKU BERBAYAR' : 'BUKU PREMIUM'} · {
            book?.genres?.slug === 'dongeng' || book?.genre_id === 'dongeng'
              ? 'DONGENG'
              : book?.genres?.slug === 'horror' || book?.genre_id === 'horror'
                ? 'HORROR'
                : 'ROMANCE'
          }</span>
          <h1>{book.title}</h1>
          <p>{paidLocked
            ? 'Kamu belum membeli buku ini. Beli seharga Rp1.000 untuk mulai membaca.'
            : 'Buku ini masih terkunci. Tukarkan 750 poin untuk membukanya.'}</p>
          <Link href={paidLocked ? '/dashboard/store#katalog' : '/dashboard/rewards#hadiah'}>
            {paidLocked ? 'Beli Rp1.000 & buka buku' : 'Tukar poin & buka buku'} <b>→</b>
          </Link>
        </div>
      </section>
    </main>;
  }

  const showForm = finished && (!summary || (summary.status === 'rejected' && editing));
  const detailTheme = isDragonBallComic(book)
    ? {'--genre-color': '#F58220', '--genre-accent': '#173F8F'}
    : {'--genre-color': book.genres?.theme_color || '#ffdf5d', '--genre-accent': book.genres?.accent_color || '#8ee7ef'};
  const statusLabel = summary?.is_local
    ? 'Belum dikirim'
    : summary?.status === 'valid'
    ? 'Disetujui'
    : summary?.status === 'rejected'
      ? 'Perlu diperbaiki'
      : summary?.status === 'pending'
        ? 'Sedang diperiksa'
        : finished ? 'Siap ditulis' : 'Belum tersedia';
  const statusText = summary?.is_local
    ? 'Ringkasan baru tersimpan di perangkat dan belum dikirim ke admin.'
    : summary?.status === 'valid'
    ? 'Ringkasan sudah disetujui dan poin telah diberikan.'
    : summary?.status === 'rejected'
      ? 'Baca catatan admin, lalu kirim versi perbaikannya.'
      : summary?.status === 'pending'
        ? 'Ringkasan sudah dikirim dan sedang diperiksa admin.'
        : finished
          ? 'Bacaan selesai. Sekarang tuliskan pemahamanmu tentang buku ini.'
          : `Selesaikan ${Math.max(0, totalPages - Number(draftPage || 0))} halaman lagi untuk membuka ringkasan.`;

  return (
    <main
      className={styles.page}
      style={detailTheme}
    >
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard"><span>B</span>BacaPop!</Link>
        <nav aria-label="Menu halaman buku"><Link href="/dashboard">Kembali ke semua buku</Link><button onClick={() => logoutFromDashboard(router)}>Keluar</button></nav>
      </header>

      <div className={styles.wrap}>
        <nav className={styles.breadcrumb} aria-label="Posisi halaman"><Link href="/dashboard">Semua buku</Link><span>/</span><b>Detail dan ringkasan</b></nav>
        <section className={styles.bookHero}>
          <div className={styles.cover}>{book.cover_url ? <img src={book.cover_url} alt={`Sampul ${book.title}`} /> : <span>{book.title}</span>}</div>
          <div className={styles.bookCopy}>
            <div className={styles.heroBadges}><span className={styles.genre}>{book.genres?.name || 'Buku'}</span><span className={styles.heroStatus}>{finished ? 'Sudah selesai' : `${percent}% dibaca`}</span></div>
            <h1>{book.title}</h1>
            <p className={styles.author}>{book.author || 'BacaPop Library'}</p>
            <p className={styles.description}>{book.description}</p>
            <div className={styles.heroActions}>
              <Link className={styles.readButton} href={`/dashboard/read/${book.id}`}><span aria-hidden="true">{finished ? '↻' : '▶'}</span>{finished ? 'Baca lagi' : 'Lanjut membaca'}</Link>
              <a className={styles.summaryShortcut} href="#ringkasan">Lihat ringkasan <span aria-hidden="true">↓</span></a>
            </div>
          </div>
          <div className={styles.heroProgress} aria-label={`Kemajuan membaca ${percent}%`}><span>SUDAH DIBACA</span><b>{percent}%</b><small>{draftPage || 0} / {totalPages} halaman</small></div>
        </section>

        {notice ? <div className={styles.notice}>{notice}</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.workflowHead}>
          <div><span>RINGKASAN BUKU</span><h2>Ceritakan kembali isi buku</h2><p>Selesaikan tiga langkah untuk mendapatkan poin.</p></div>
          <ol aria-label="Tahapan ringkasan">
            <li data-state={finished ? 'done' : 'current'}><b>{finished ? '✓' : '1'}</b><span><small>Langkah 1</small>Selesaikan bacaan</span></li>
            <li data-state={summary ? 'done' : finished ? 'current' : 'next'}><b>{summary ? '✓' : '2'}</b><span><small>Langkah 2</small>Tulis ringkasan</span></li>
            <li data-state={summary ? 'current' : 'next'}><b>3</b><span><small>Langkah 3</small>Tunggu pemeriksaan</span></li>
          </ol>
        </section>

        <section className={styles.grid}>
          <form className={`${styles.card} ${styles.progressCard}`} data-tour="book-progress" data-finished={finished} onSubmit={saveProgress}>
            <div className={styles.cardHead}><div><span>LANGKAH 1 · KEMAJUAN MEMBACA</span><h2>Simpan halaman terakhir</h2><p>Masukkan halaman terakhir agar nanti kamu bisa melanjutkan dari sana.</p></div><b>{percent}%</b></div>
            <div className={styles.progressTrack}><i style={{width: `${percent}%`}} /></div>
            <div className={styles.stats}>
              <div><span>Terakhir dibaca</span><b>{draftPage || 0}</b><small>halaman</small></div>
              <div><span>Total buku</span><b>{totalPages}</b><small>halaman</small></div>
              <div><span>Status</span><b>{finished ? 'Selesai' : 'Berjalan'}</b><small>{finished ? '100% tuntas' : 'lanjutkan'}</small></div>
            </div>
            <div className={styles.progressEditor}>
              <label className={styles.field}>Halaman terakhir dibaca
                <span className={styles.inputWithSuffix}><input type="number" min="0" max={totalPages} value={draftPage} onChange={(event) => setDraftPage(event.target.value)} /><i>dari {totalPages}</i></span>
              </label>
              <button className={styles.primaryButton} disabled={saving || !totalPages}>{saving ? 'Menyimpan...' : 'Simpan halaman'}</button>
            </div>
          </form>

          <section className={`${styles.card} ${styles.summaryCard}`} id="ringkasan" data-tour="book-summary" data-ready={finished}>
            <div className={styles.cardHead}>
              <div><span>LANGKAH 2 · RINGKASAN</span><h2>Tulis yang kamu pahami</h2><p>{statusText}</p></div>
              <b className={styles.statusBadge} data-status={summary?.is_local ? 'local' : summary?.status || (finished ? 'ready' : 'locked')}>
                {statusLabel}
              </b>
            </div>

            <aside className={styles.summaryTerms} aria-label="Informasi dan aturan ringkasan">
              <header>
                <span aria-hidden="true">i</span>
                <div><b>Sebelum menulis ringkasan</b><small>Baca aturan agar ringkasanmu mudah diperiksa.</small></div>
                <button type="button" data-accepted={summaryRulesAccepted} onClick={() => setSummaryRulesOpen(true)}>
                  {summaryRulesAccepted ? 'Sudah dibaca ✓' : 'Baca aturan'}
                </button>
              </header>
              <ul>
                <li><div><b>01</b><i aria-hidden="true">✓</i></div><span><strong>Selesaikan buku</strong>Ringkasan terbuka setelah buku selesai dibaca.</span></li>
                <li><div><b>02</b><i aria-hidden="true">✎</i></div><span><strong>Tulis dengan bahasamu</strong>Minimal 100 karakter, sesuai isi buku, dan tidak menyalin.</span></li>
                <li><div><b>03</b><i aria-hidden="true">↻</i></div><span><strong>Satu ringkasan per buku</strong>Jika ditolak, perbaiki tulisan sesuai catatan admin.</span></li>
                <li><div><b>04</b><i aria-hidden="true">★</i></div><span><strong>Poin setelah disetujui</strong>Admin akan memeriksa tulisanmu, lalu memberikan poin.</span></li>
              </ul>
            </aside>

            {!finished ? <div className={styles.locked}><span aria-hidden="true">🔒</span><div><strong>Ringkasan masih terkunci</strong><p>Selesaikan <b>{Math.max(0, totalPages - Number(draftPage || 0))} halaman lagi</b> untuk membukanya.</p></div><Link href={`/dashboard/read/${book.id}`}>Lanjut membaca</Link></div> : null}

            {showForm ? <form className={styles.summaryForm} onSubmit={submitSummary}>
              <div className={styles.writingGuide}><b>Agar ringkasanmu mudah dipahami, ceritakan:</b><div><span>01 · Tokoh utama</span><span>02 · Kejadian penting</span><span>03 · Pesan cerita</span></div></div>
              <label className={styles.field}>Judul ringkasan<span className={styles.fieldHint}>Buat singkat dan menggambarkan isi tulisanmu.</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="120" placeholder="Contoh: Pelajaran dari cerita ini" /></label>
              <label className={styles.field}>Isi ringkasan<span className={styles.fieldHint}>Gunakan bahasamu sendiri, minimal 100 karakter.</span><textarea value={summaryText} onChange={(event) => setSummaryText(event.target.value)} rows="8" placeholder="Ceritakan kembali isi buku dan pelajaran yang kamu dapatkan..." /></label>
              <div className={styles.characterProgress} aria-label={`${Math.min(100, summaryText.trim().length)} dari 100 karakter minimum`}><i style={{width: `${Math.min(100, summaryText.trim().length)}%`}} /></div>
              <div className={styles.formFoot}><small data-ready={charsLeft === 0}>{charsLeft ? `Kurang ${charsLeft} karakter lagi` : 'Panjang tulisan sudah cukup'} · {summaryText.trim().length}/100+</small><button className={styles.primaryButton} disabled={saving || charsLeft > 0}>{saving ? 'Mengirim...' : summary?.status === 'rejected' ? 'Kirim perbaikan' : 'Kirim ringkasan'}</button></div>
            </form> : null}

            {finished && summary && !editing ? <div className={styles.summaryResult}>
              <div className={styles.resultLabel}><span>RINGKASANMU</span><b>{summary.is_local ? 'Tersimpan lokal' : summary.status === 'valid' ? `+${summary.points_awarded || 0} poin` : 'Tersimpan'}</b></div>
              <h3>{summary.title}</h3><p>{summary.summary_text}</p>
              <div className={styles.summaryMeta}><span>{summary.submitted_at ? `Dikirim ${new Date(summary.submitted_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}` : 'Ringkasan tersimpan'}</span><b>{summary.summary_text?.length || 0} karakter</b></div>
              {summary.is_local ? <p className={styles.helper}><b>Belum dikirim</b> Kirim ringkasan ini agar admin bisa memeriksanya dan memberikan poin.<button className={styles.primaryButton} type="button" onClick={syncLocalSummary} disabled={saving}>{saving ? 'Mengirim...' : 'Kirim ke admin'}</button></p> : null}
              {!summary.is_local && summary.status === 'pending' ? <p className={styles.helper}><b>Sedang diperiksa</b> Admin sedang memeriksa ringkasanmu. Kamu tidak perlu mengirim lagi.</p> : null}
              {summary.status === 'valid' ? <p className={styles.helper}><b>Ringkasan disetujui</b> Kerja bagus! Poin sudah ditambahkan ke akunmu.</p> : null}
              {summary.admin_note ? <div className={styles.adminNote}><b>Catatan admin</b><p>{summary.admin_note}</p></div> : null}
              {summary.status === 'rejected' ? <button className={styles.primaryButton} onClick={startRevision}>Perbaiki ringkasan</button> : null}
            </div> : null}
          </section>
        </section>

        {summaryRulesOpen ? (
          <div className={styles.rulesBackdrop} role="presentation" onMouseDown={() => setSummaryRulesOpen(false)}>
            <section className={styles.rulesDialog} role="dialog" aria-modal="true" aria-labelledby="summary-rules-title" onMouseDown={(event) => event.stopPropagation()}>
              <button className={styles.rulesClose} type="button" aria-label="Tutup aturan" onClick={() => setSummaryRulesOpen(false)}>×</button>
              <header>
                <span>ATURAN RINGKASAN</span>
                <h2 id="summary-rules-title">Baca dulu sebelum mengirim</h2>
                <p>Aturan ini membantu admin memeriksa ringkasan dan memberikan poin dengan tepat.</p>
              </header>
              <ol>
                <li><b>01</b><div><strong>Selesaikan bacaan</strong><p>Ringkasan terbuka setelah semua halaman selesai dibaca.</p></div></li>
                <li><b>02</b><div><strong>Gunakan tulisan sendiri</strong><p>Tulis pemahamanmu dengan bahasa sendiri. Hindari menyalin sinopsis atau tulisan orang lain.</p></div></li>
                <li><b>03</b><div><strong>Perhatikan panjang tulisan</strong><p>Judul maksimal 120 karakter dan isi ringkasan minimal 100 karakter.</p></div></li>
                <li><b>04</b><div><strong>Tunggu pemeriksaan admin</strong><p>Jika statusnya Menunggu, ringkasan sedang diperiksa. Jangan mengirim ulang.</p></div></li>
                <li><b>05</b><div><strong>Perbaiki jika ditolak</strong><p>Gunakan catatan admin sebagai panduan, lalu kirim kembali versi yang sudah diperbaiki.</p></div></li>
                <li><b>06</b><div><strong>Poin setelah disetujui</strong><p>Poin diberikan setelah admin menyetujui ringkasanmu.</p></div></li>
              </ol>
              <footer>
                <small>Dengan melanjutkan, kamu menyatakan sudah membaca aturan di atas.</small>
                <button type="button" onClick={() => { setSummaryRulesAccepted(true); setSummaryRulesOpen(false); setError(''); }}>
                  Saya sudah membaca dan mengerti
                </button>
              </footer>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
