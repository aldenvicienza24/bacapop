'use client';

import Link from 'next/link';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
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
import {getDashboardUser, logoutFromDashboard} from '../../auth';
import PdfCanvasPage from './PdfCanvasPage';
import styles from '../../user-dashboard.module.css';

const END_OF_BOOK_ACCESS_EMAILS = new Set([
  'trivicienza@gmail.com',
]);

export default function ReaderPage() {
  const {id} = useParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [index, setIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [saveState, setSaveState] = useState('');
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [paidLocked, setPaidLocked] = useState(false);
  const [summaryRulesOpen, setSummaryRulesOpen] = useState(false);
  const [summaryUnlockOpen, setSummaryUnlockOpen] = useState(false);
  const readerBookRef = useRef(null);
  const previousIndexRef = useRef(0);
  const progressReadyRef = useRef(false);

  useEffect(() => {
    async function loadReader() {
      const currentUser = await getDashboardUser(router);
      if (!currentUser) return;
      setUser(currentUser);
      const premiumAccess = await getPremiumBookAccess(currentUser.id);
      const horrorPremiumAccess = await getPremiumBookAccess(currentUser.id, ceritaKknBook);
      const paidBookAccess = await getPaidBookAccess(currentUser.id, String(id));

      async function restoreProgress(targetBook, totalPages) {
        let savedPage = 0;
        if (targetBook.is_demo) {
          const saved = JSON.parse(localStorage.getItem(`bacapop:progress:${targetBook.id}`) || 'null');
          savedPage = saved?.current_page || 0;
        } else {
          const {data, error} = await supabase
            .from('reading_progress')
            .select('current_page')
            .eq('user_id', currentUser.id)
            .eq('book_id', targetBook.id)
            .maybeSingle();
          savedPage = data?.current_page || 0;
          if (error) setSaveState('Penyimpanan posisi bacaan belum aktif.');
        }
        setIndex(Math.max(0, Math.min(totalPages - 1, savedPage ? savedPage - 1 : 0)));
        progressReadyRef.current = true;
      }

      async function openDemoReader(demoBook, demoPages) {
        const {data: databaseBook} = await supabase
          .from('books')
          .select('id,title,author,description,cover_url,pdf_url,genres(name,slug,icon,theme_color,accent_color)')
          .eq('title', demoBook.title)
          .eq('status', 'active')
          .order('created_at', {ascending: true})
          .limit(1)
          .maybeSingle();
        let targetBook = demoBook;

        if (databaseBook) {
          targetBook = isMisteriRumahTerkutuk(databaseBook)
            ? withHorrorContent(databaseBook)
            : isMisteriPenungguPohonTua(databaseBook)
              ? withMisteriPenungguPohonTuaContent(databaseBook)
            : {...demoBook, ...databaseBook, is_demo: false};
          const localProgress = JSON.parse(localStorage.getItem(`bacapop:progress:${demoBook.id}`) || 'null');
          if (localProgress?.current_page) {
            const {error: migrationError} = await supabase
              .from('reading_progress')
              .upsert({user_id: currentUser.id, book_id: databaseBook.id, ...localProgress}, {onConflict: 'user_id,book_id'});
            if (!migrationError) localStorage.removeItem(`bacapop:progress:${demoBook.id}`);
          }
        }

        setBook(targetBook);
        setPages(demoPages);
        await restoreProgress(targetBook, demoPages.length);
      }

      if (id === horrorBook.id) {
        await openDemoReader(horrorBook, horrorPages);
        setLoading(false);
        return;
      }

      if (id === misteriPenungguPohonTuaBook.id) {
        await openDemoReader(misteriPenungguPohonTuaBook, misteriPenungguPohonTuaPages);
        setLoading(false);
        return;
      }

      if (id === ceritaKknBook.id) {
        if (!horrorPremiumAccess.unlocked) {
          setBook(ceritaKknBook);
          setPremiumLocked(true);
          setLoading(false);
          return;
        }
        await openDemoReader(ceritaKknBook, ceritaKknPages);
        setLoading(false);
        return;
      }

      if (id === kunciHitamBook.id) {
        if (!paidBookAccess.unlocked) {
          setBook(kunciHitamBook);
          setPaidLocked(true);
          setLoading(false);
          return;
        }
        await openDemoReader(kunciHitamBook, kunciHitamPages);
        setLoading(false);
        return;
      }

      if (id === kursiKosongBook.id) {
        await openDemoReader(kursiKosongBook, kursiKosongPages);
        setLoading(false);
        return;
      }

      if (id === mercuryComicBook.id) {
        await openDemoReader(mercuryComicBook, mercuryComicPages);
        setLoading(false);
        return;
      }

      if (id === wildlifeComicBook.id) {
        await openDemoReader(wildlifeComicBook, wildlifeComicPages);
        setLoading(false);
        return;
      }

      if (id === dragonBallBook.id) {
        await openDemoReader(dragonBallBook, dragonBallPages);
        setLoading(false);
        return;
      }

      const demoDragonBall = dragonBallBooks.find((item) => item.id === id);
      if (demoDragonBall) {
        const definition = getDragonBallDefinition(demoDragonBall);
        await openDemoReader(definition.book, definition.pages);
        setLoading(false);
        return;
      }

      if (id === lautBerceritaBook.id) {
        await openDemoReader(lautBerceritaBook, novelPages);
        setLoading(false);
        return;
      }

      if (id === perahuKertasBook.id) {
        if (!premiumAccess.unlocked) {
          setBook(perahuKertasBook);
          setPremiumLocked(true);
          setLoading(false);
          return;
        }
        await openDemoReader(perahuKertasBook, perahuKertasPages);
        setLoading(false);
        return;
      }

      if (id === antaraCintaBook.id) {
        await openDemoReader(antaraCintaBook, antaraCintaPages);
        setLoading(false);
        return;
      }

      if (id === cintaSejatiBook.id) {
        await openDemoReader(cintaSejatiBook, cintaSejatiPages);
        setLoading(false);
        return;
      }

      if (id === mySweetDoctorBook.id) {
        if (!paidBookAccess.unlocked) {
          setBook(mySweetDoctorBook);
          setPaidLocked(true);
          setLoading(false);
          return;
        }
        await openDemoReader(mySweetDoctorBook, mySweetDoctorPages);
        setLoading(false);
        return;
      }

      if (id === ceritaRakyatNusantara2Book.id) {
        await openDemoReader(ceritaRakyatNusantara2Book, ceritaRakyatNusantara2Pages);
        setLoading(false);
        return;
      }

      if (id === dongengBinatangBook.id) {
        if (!paidBookAccess.unlocked) {
          setBook(dongengBinatangBook);
          setPaidLocked(true);
          setLoading(false);
          return;
        }
        await openDemoReader(dongengBinatangBook, dongengBinatangPages);
        setLoading(false);
        return;
      }

      if (id === sehariSatuDongengBook.id) {
        if (!paidBookAccess.unlocked) {
          setBook(sehariSatuDongengBook);
          setPaidLocked(true);
          setLoading(false);
          return;
        }
        await openDemoReader(sehariSatuDongengBook, sehariSatuDongengPages);
        setLoading(false);
        return;
      }

      if (id === dongengSebelumTidur2Book.id) {
        await openDemoReader(dongengSebelumTidur2Book, dongengSebelumTidur2Pages);
        setLoading(false);
        return;
      }

      if (String(id).startsWith('demo-')) {
        await openDemoReader(dongengBook, dongengPages);
        setLoading(false);
        return;
      }

      const {data: bookData, error: bookError} = await supabase
        .from('books')
        .select('id,title,author,description,cover_url,pdf_url,genres(name,slug,icon,theme_color,accent_color)')
        .eq('id', id)
        .eq('status', 'active')
        .maybeSingle();

      if (bookError || !bookData) {
        setNotice('Data buku belum siap. Untuk sementara, BacaPop menampilkan buku Horror contoh.');
        setBook(horrorBook);
        setPages(horrorPages);
        setLoading(false);
        return;
      }

      const activePremiumAccess = isCeritaKkn(bookData) ? horrorPremiumAccess : premiumAccess;
      if (isPremiumBook(bookData) && !activePremiumAccess.unlocked) {
        setBook(isCeritaKkn(bookData) ? withCeritaKknContent(bookData) : withPerahuKertasContent(bookData));
        setPremiumLocked(true);
        setLoading(false);
        return;
      }

      const databasePaidAccess = isPaidBook(bookData)
        ? await getPaidBookAccess(currentUser.id, bookData)
        : {unlocked: true};
      if (isPaidBook(bookData) && !databasePaidAccess.unlocked) {
        setBook(isDongengBinatang(bookData)
          ? withDongengBinatangContent(bookData)
          : isSehariSatuDongeng(bookData)
            ? withSehariSatuDongengContent(bookData)
            : isKunciHitam(bookData)
              ? withKunciHitamContent(bookData)
            : withMySweetDoctorContent(bookData));
        setPaidLocked(true);
        setLoading(false);
        return;
      }

      if (isMisteriRumahTerkutuk(bookData)) {
        const horrorContentBook = withHorrorContent(bookData);
        setBook(horrorContentBook);
        setPages(horrorPages);
        await restoreProgress(horrorContentBook, horrorPages.length);
        setLoading(false);
        return;
      }

      if (isMisteriPenungguPohonTua(bookData)) {
        const horrorPdfBook = withMisteriPenungguPohonTuaContent(bookData);
        setBook(horrorPdfBook);
        setPages(misteriPenungguPohonTuaPages);
        await restoreProgress(horrorPdfBook, misteriPenungguPohonTuaPages.length);
        setLoading(false);
        return;
      }

      if (isKunciHitam(bookData)) {
        const paidHorrorBook = withKunciHitamContent(bookData);
        setBook(paidHorrorBook);
        setPages(kunciHitamPages);
        await restoreProgress(paidHorrorBook, kunciHitamPages.length);
        setLoading(false);
        return;
      }

      if (isKursiKosong(bookData)) {
        const freeHorrorBook = withKursiKosongContent(bookData);
        setBook(freeHorrorBook);
        setPages(kursiKosongPages);
        await restoreProgress(freeHorrorBook, kursiKosongPages.length);
        setLoading(false);
        return;
      }

      if (isCeritaKkn(bookData)) {
        const premiumHorrorBook = withCeritaKknContent(bookData);
        setBook(premiumHorrorBook);
        setPages(ceritaKknPages);
        await restoreProgress(premiumHorrorBook, ceritaKknPages.length);
        setLoading(false);
        return;
      }


      if (isMercuryComic(bookData)) {
        const comicBook = withMercuryComic(bookData);
        setBook(comicBook);
        setPages(mercuryComicPages);
        await restoreProgress(comicBook, mercuryComicPages.length);
        setLoading(false);
        return;
      }

      if (isWildlifeComic(bookData)) {
        const comicBook = withWildlifeComic(bookData);
        setBook(comicBook);
        setPages(wildlifeComicPages);
        await restoreProgress(comicBook, wildlifeComicPages.length);
        setLoading(false);
        return;
      }

      if (isDragonBallComic(bookData)) {
        const definition = getDragonBallDefinition(bookData);
        const comicBook = withDragonBallComic(bookData);
        setBook(comicBook);
        setPages(definition.pages);
        await restoreProgress(comicBook, definition.pages.length);
        setLoading(false);
        return;
      }

      if (isLautBercerita(bookData)) {
        const novelBook = withNovelContent(bookData);
        setBook(novelBook);
        setPages(novelPages);
        await restoreProgress(novelBook, novelPages.length);
        setLoading(false);
        return;
      }

      if (isPerahuKertas(bookData)) {
        const premiumBook = withPerahuKertasContent(bookData);
        setBook(premiumBook);
        setPages(perahuKertasPages);
        await restoreProgress(premiumBook, perahuKertasPages.length);
        setLoading(false);
        return;
      }

      if (isAntaraCinta(bookData)) {
        const romanceBook = withAntaraCintaContent(bookData);
        setBook(romanceBook);
        setPages(antaraCintaPages);
        await restoreProgress(romanceBook, antaraCintaPages.length);
        setLoading(false);
        return;
      }

      if (isCintaSejati(bookData)) {
        const romanceBook = withCintaSejatiContent(bookData);
        setBook(romanceBook);
        setPages(cintaSejatiPages);
        await restoreProgress(romanceBook, cintaSejatiPages.length);
        setLoading(false);
        return;
      }

      if (isMySweetDoctor(bookData)) {
        const paidRomanceBook = withMySweetDoctorContent(bookData);
        setBook(paidRomanceBook);
        setPages(mySweetDoctorPages);
        await restoreProgress(paidRomanceBook, mySweetDoctorPages.length);
        setLoading(false);
        return;
      }

      if (isCeritaRakyatNusantara2(bookData)) {
        const dongengPdfBook = withCeritaRakyatNusantara2Content(bookData);
        setBook(dongengPdfBook);
        setPages(ceritaRakyatNusantara2Pages);
        await restoreProgress(dongengPdfBook, ceritaRakyatNusantara2Pages.length);
        setLoading(false);
        return;
      }

      if (isDongengBinatang(bookData)) {
        const paidDongengBook = withDongengBinatangContent(bookData);
        setBook(paidDongengBook);
        setPages(dongengBinatangPages);
        await restoreProgress(paidDongengBook, dongengBinatangPages.length);
        setLoading(false);
        return;
      }

      if (isSehariSatuDongeng(bookData)) {
        const paidDongengBook = withSehariSatuDongengContent(bookData);
        setBook(paidDongengBook);
        setPages(sehariSatuDongengPages);
        await restoreProgress(paidDongengBook, sehariSatuDongengPages.length);
        setLoading(false);
        return;
      }

      if (isDongengSebelumTidur2(bookData)) {
        const freeDongengBook = withDongengSebelumTidur2Content(bookData);
        setBook(freeDongengBook);
        setPages(dongengSebelumTidur2Pages);
        await restoreProgress(freeDongengBook, dongengSebelumTidur2Pages.length);
        setLoading(false);
        return;
      }

      const {data: pageData, error: pageError} = await supabase
        .from('book_pages')
        .select('page_number,page_title,content')
        .eq('book_id', id)
        .order('page_number', {ascending: true});

      if (pageError || !pageData?.length) {
        setNotice('Halaman buku belum tersedia. Untuk sementara, BacaPop menampilkan buku Dongeng contoh.');
        setBook(dongengBook);
        setPages(dongengPages);
        await restoreProgress(dongengBook, dongengPages.length);
      } else {
        setBook(bookData);
        setPages(pageData);
        await restoreProgress(bookData, pageData.length);
      }

      setLoading(false);
    }

    loadReader();
  }, [id, router]);

  const currentPage = pages[index];
  const isHorror = book?.genres?.slug === 'horror' || book?.genre_id === 'horror';
  const isDongeng = book?.genres?.slug === 'dongeng' || book?.genre_id === 'dongeng';
  const isComic = book?.genres?.slug === 'komik' || book?.genre_id === 'komik';
  const isNovel = String(id) === lautBerceritaBook.id
    || String(id) === perahuKertasBook.id
    || String(id) === antaraCintaBook.id
    || String(id) === cintaSejatiBook.id
    || String(id) === mySweetDoctorBook.id
    || isLautBercerita(book)
    || isPerahuKertas(book)
    || isAntaraCinta(book)
    || isCintaSejati(book)
    || isMySweetDoctor(book)
    || book?.genres?.slug === 'novel'
    || book?.genre_id === 'novel';
  const usesNovelPdf = isLautBercerita(book)
    || isPerahuKertas(book)
    || isAntaraCinta(book)
    || isCintaSejati(book)
    || isMySweetDoctor(book);
  const usesDongengPdf = isCeritaRakyatNusantara2(book)
    || isDongengBinatang(book)
    || isSehariSatuDongeng(book)
    || isDongengSebelumTidur2(book);
  const usesHorrorPdf = isMisteriPenungguPohonTua(book)
    || isCeritaKkn(book)
    || isKunciHitam(book)
    || isKursiKosong(book);
  const usesComicPdf = isDragonBallComic(book) || isWildlifeComic(book);
  const usesPdfReader = usesNovelPdf || usesDongengPdf || usesHorrorPdf || usesComicPdf;
  const pdfReaderSource = isLautBercerita(book)
    ? lautBerceritaBook.pdf_url
    : isPerahuKertas(book)
      ? perahuKertasBook.pdf_url
      : isAntaraCinta(book)
        ? antaraCintaBook.pdf_url
        : isCintaSejati(book)
          ? cintaSejatiBook.pdf_url
        : isMySweetDoctor(book)
          ? mySweetDoctorBook.pdf_url
          : book?.pdf_url;
  const usesBookFormatting = isHorror || isDongeng;
  const storedGenreSlug = book?.genres?.slug || (['dongeng', 'horror', 'komik', 'novel'].includes(book?.genre_id) ? book.genre_id : '');
  const readerGenreSlug = isDongeng ? 'dongeng' : isHorror ? 'horror' : isComic ? 'komik' : isNovel ? 'novel' : storedGenreSlug;
  const readerGenreLabel = isDongeng
    ? 'Dongeng'
    : isHorror
      ? 'Horror'
      : isComic
        ? 'Komik'
        : isNovel
          ? 'Romance'
          : book?.genres?.name || 'Semua Buku';
  const summaryGenreDesign = {
    horror: {
      symbol: '☾',
      kicker: 'KISAH SELESAI · CATATAN TERBUKA',
      title: 'Tutup kisah gelap ini.',
      action: 'Tulis kesan horormu',
    },
    novel: {
      symbol: '♥',
      kicker: 'CERITA SELESAI · CATATAN TERBUKA',
      title: 'Abadikan rasa dari cerita.',
      action: 'Tulis kesan ceritamu',
    },
    dongeng: {
      symbol: '✦',
      kicker: 'DONGENG SELESAI · POIN TERBUKA',
      title: 'Bawa pulang pesan ajaibnya.',
      action: 'Tulis pesan dongeng',
    },
    komik: {
      symbol: 'ZAP!',
      kicker: 'TAMAT! · MISI RINGKASAN TERBUKA',
      title: 'Ceritakan aksi favoritmu.',
      action: 'Buka ringkasan!',
    },
  }[readerGenreSlug] || {
    symbol: '✓',
    kicker: 'BUKU SELESAI · POIN TERBUKA',
    title: 'Saatnya ceritakan kembali.',
    action: 'Buka ringkasan',
  };
  const canJumpToEnd = END_OF_BOOK_ACCESS_EMAILS.has(user?.email?.trim().toLowerCase());
  const progress = useMemo(() => (pages.length ? Math.round(((index + 1) / pages.length) * 100) : 0), [index, pages.length]);
  const summaryUnlockVisible = progress === 100 && summaryUnlockOpen && !summaryRulesOpen;

  useEffect(() => {
    if (!summaryUnlockVisible && !summaryRulesOpen) return undefined;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarGap = window.innerWidth - root.clientWidth;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [summaryRulesOpen, summaryUnlockVisible]);

  useEffect(() => {
    if (previousIndexRef.current === index) return;

    previousIndexRef.current = index;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    readerBookRef.current?.scrollIntoView({behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start'});
  }, [index]);

  useEffect(() => {
    if (!progressReadyRef.current || !book || !pages.length || !user) return;
    const timer = window.setTimeout(async () => {
      const currentPageNumber = index + 1;
      const progressPercent = Math.round((currentPageNumber / pages.length) * 10000) / 100;
      const nextProgress = {
        current_page: currentPageNumber,
        progress_percent: progressPercent,
        is_finished: progressPercent >= 100,
      };

      if (book.is_demo) {
        localStorage.setItem(`bacapop:progress:${book.id}`, JSON.stringify(nextProgress));
        setSaveState(progressPercent >= 100 ? 'Buku selesai — ringkasan sudah terbuka.' : 'Posisi bacaan tersimpan otomatis.');
        return;
      }

      const {error} = await supabase
        .from('reading_progress')
        .upsert({user_id: user.id, book_id: book.id, ...nextProgress}, {onConflict: 'user_id,book_id'});
      setSaveState(error ? 'Posisi bacaan belum tersimpan. Coba lagi.' : progressPercent >= 100 ? 'Buku selesai — ringkasan sudah terbuka.' : 'Posisi bacaan tersimpan otomatis.');
    }, 500);

    return () => window.clearTimeout(timer);
  }, [book, index, pages.length, user]);

  function previousPage() {
    setIndex((current) => Math.max(0, current - 1));
  }

  function nextPage() {
    setIndex((current) => Math.min(pages.length - 1, current + 1));
  }

  function jumpToEnd() {
    if (!canJumpToEnd || !pages.length) return;
    setIndex(pages.length - 1);
  }

  const removeBlankPdfPage = useCallback((pageNumber) => {
    setPages((currentPages) => {
      const nextPages = currentPages.filter((page) => page.page_number !== pageNumber);
      if (nextPages.length === currentPages.length) return currentPages;
      setIndex((current) => Math.min(current, Math.max(0, nextPages.length - 1)));
      return nextPages;
    });
  }, []);

  return (
    <main className={`${styles.readerPage} ${isDongeng ? styles.dongengReaderPage : ''} ${isHorror ? styles.horrorReaderPage : ''} ${isComic ? styles.comicReaderPage : ''} ${usesComicPdf ? styles.dragonBallReaderPage : ''} ${isNovel ? styles.novelReaderPage : ''}`}>
      {isDongeng ? (
        <div className={styles.dongengWalkingKancil} aria-hidden="true">
          <span />
        </div>
      ) : null}
      {isDongeng ? (
        <div className={styles.dongengReaderMagic} aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><span /><span />
          <i />
          <b />
        </div>
      ) : null}
      {isHorror ? (
        <div className={styles.horrorReaderAtmosphere} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {isComic ? (
        <div className={styles.comicReaderAtmosphere} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {isNovel ? (
        <div className={styles.novelReaderAtmosphere} aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
          <i>LOVE NOTES</i>
          <b>♥</b>
        </div>
      ) : null}
      <header className={styles.readerTopbar}>
        <Link className={styles.brand} href="/dashboard">
          <span>B</span>BacaPop!
        </Link>
        <nav>
          <Link className={styles.readerGenreBack} href={readerGenreSlug ? `/dashboard/genres/${readerGenreSlug}` : '/dashboard'}>
            <span aria-hidden="true">←</span>
            <b>Kembali ke {readerGenreLabel}</b>
          </Link>
          <Link className={styles.readerCatalogLink} href="/dashboard">Semua Buku</Link>
          <button onClick={() => logoutFromDashboard(router)}>Keluar</button>
        </nav>
      </header>

      {loading ? (
        <section className={styles.readerEmpty}>Membuka buku...</section>
      ) : premiumLocked || paidLocked ? (
        <section className={styles.premiumGate}>
          <div className={styles.premiumGateCover}>
            <img src={book?.cover_url || '/images/novel/perahu-kertas-premium-v2.png'} alt={`Sampul ${book?.title || 'buku premium'}`} />
            <span aria-hidden="true">🔒</span>
          </div>
          <div>
            <span>{paidLocked ? 'BUKU BERBAYAR' : 'BUKU PREMIUM'} · {
              book?.genres?.slug === 'dongeng' || book?.genre_id === 'dongeng'
                ? 'DONGENG'
                : book?.genres?.slug === 'horror' || book?.genre_id === 'horror'
                  ? 'HORROR'
                  : 'ROMANCE'
            }</span>
            <h1>{book?.title}</h1>
            <p>{paidLocked
              ? 'Buku ini dijual seharga Rp1.000. Selesaikan pembayaran untuk mulai membaca.'
              : 'Buku ini masih terkunci. Tukarkan 750 poin dengan Buku Premium di halaman Tukar Poin untuk membacanya tanpa batas.'}</p>
            <Link className={styles.premiumGateAction} href={paidLocked ? '/dashboard/store#katalog' : '/dashboard/rewards#hadiah'}>
              {paidLocked ? 'Beli Rp1.000 & buka buku' : 'Tukar poin & buka buku'} <b>→</b>
            </Link>
            <Link className={styles.premiumGateBack} href={`/dashboard/genres/${isCeritaKkn(book) ? 'horror' : 'novel'}`}>Kembali ke {isCeritaKkn(book) ? 'Horror' : 'Romance'}</Link>
          </div>
        </section>
      ) : (
        <section className={styles.readerShell}>
          <aside className={styles.readerMeta} data-tour="reader-progress">
            <span>{book?.genres?.name || (isNovel ? 'Romance' : 'Dongeng')}</span>
            <h1>{book?.title}</h1>
            <p>{book?.author || 'BacaPop Library'}</p>
            {notice ? <div className={styles.readerNotice}>{notice}</div> : null}
            <div className={styles.readerProgress}>
              <b>{progress}%</b>
              <i style={{width: `${progress}%`}} />
            </div>
            {saveState ? <small className={styles.readerSaveState}>{saveState}</small> : null}
            {canJumpToEnd && index < pages.length - 1 ? (
              <button className={styles.readerEndShortcut} type="button" onClick={jumpToEnd}>
                Langsung ke akhir buku
              </button>
            ) : null}
            {progress === 100 ? (
              <button className={styles.readerSummaryUnlockButton} data-genre={readerGenreSlug} type="button" onClick={() => setSummaryUnlockOpen(true)}>
                <span aria-hidden="true">{summaryGenreDesign.symbol}</span>
                <div><small>{readerGenreLabel.toUpperCase()} SELESAI</small><b>{summaryGenreDesign.action}</b></div>
                <i aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M3 9h8.3V4.2L21 12l-9.7 7.8V15H3Z" />
                  </svg>
                </i>
              </button>
            ) : null}
            <Link className={styles.backLink} href={`/dashboard/books/${book.id}`}>
              Detail dan kemajuan membaca
            </Link>
          </aside>

          <article className={`${styles.readerBook} ${isComic ? styles.comicReaderBook : ''} ${isNovel ? styles.novelReaderBook : ''}`} data-tour="reader-view" ref={readerBookRef}>
            <>
              <div
                className={`${styles.readerPaper} ${usesBookFormatting && !usesPdfReader ? styles.horrorReaderPaper : ''} ${isDongeng && !usesPdfReader ? styles.dongengReaderPaper : ''} ${isComic ? styles.comicReaderPaper : ''} ${usesNovelPdf ? styles.novelReaderPaper : isNovel ? styles.novelTextReaderPaper : ''} ${usesDongengPdf ? styles.dongengPdfReaderPaper : ''} ${usesHorrorPdf ? styles.horrorPdfReaderPaper : ''}`}
                key={usesPdfReader ? 'pdf-reader-paper' : currentPage?.page_number || index}
              >
                {usesPdfReader ? (
                  <figure className={`${styles.novelPdfPage} ${usesDongengPdf ? styles.dongengPdfPage : ''} ${usesHorrorPdf ? styles.horrorPdfPage : ''} ${usesComicPdf ? styles.comicPdfPage : ''}`}>
                    <PdfCanvasPage
                      source={pdfReaderSource}
                      pageNumber={currentPage?.page_number || index + 1}
                      title={book?.title || 'Buku BacaPop'}
                      onBlank={removeBlankPdfPage}
                    />
                    <figcaption>Halaman {index + 1} dari {pages.length}</figcaption>
                  </figure>
                ) : isComic ? (
                  <figure className={styles.comicPageFigure}>
                    <img src={currentPage?.image_url} alt={`${book?.title}, halaman ${index + 1}`} />
                    <figcaption>Halaman {index + 1} dari {pages.length}</figcaption>
                  </figure>
                ) : usesBookFormatting ? (
                  <div className={styles.horrorPageNumber}>{currentPage?.page_number || index + 1}</div>
      ) : (
                  <small>Halaman {index + 1} dari {pages.length}</small>
                )}

                {!isComic && !usesPdfReader && ((isHorror && currentPage?.is_chapter_start) || isDongeng || isPerahuKertas(book)) ? (
                  <header className={styles.horrorStoryHeading}>
                    <h2>{isHorror ? currentPage.chapter_title : currentPage?.page_title}</h2>
                    <p>Oleh: {isHorror ? currentPage.chapter_author : book?.author || 'BacaPop Library'}</p>
                    <span aria-hidden="true">&#9675;&#8413;&#9675;</span>
                  </header>
                ) : !isComic && !usesPdfReader && !usesBookFormatting ? (
                  <h2>{currentPage?.page_title || `Halaman ${index + 1}`}</h2>
                ) : null}

                {!isComic && !usesPdfReader ? <div className={`${styles.readerContent} ${usesBookFormatting ? styles.horrorReaderContent : ''}`}>
                  {currentPage?.content?.split('\n\n').map((paragraph, paragraphIndex) => (
                    paragraph ? <p key={`${index}-${paragraphIndex}`}>{paragraph}</p> : null
                  ))}
                </div> : null}
              </div>

              <div className={styles.readerControls} data-tour="reader-controls">
                <button onClick={previousPage} disabled={index === 0}>
                  Sebelumnya
                </button>
                <span>{usesPdfReader ? index + 1 : currentPage?.page_number || index + 1}</span>
                <button onClick={nextPage} disabled={index === pages.length - 1}>
                  Berikutnya
                </button>
              </div>
            </>
          </article>
        </section>
      )}

      {summaryUnlockVisible && typeof document !== 'undefined' ? createPortal((
        <div className={styles.summaryUnlockBackdrop} role="presentation" onMouseDown={() => setSummaryUnlockOpen(false)}>
          <section className={styles.summaryUnlockDialog} data-genre={readerGenreSlug} role="dialog" aria-modal="true" aria-labelledby="summary-unlock-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className={styles.summaryUnlockClose} type="button" aria-label="Tutup pemberitahuan" onClick={() => setSummaryUnlockOpen(false)}>×</button>
            <div className={styles.summaryUnlockVisual} aria-hidden="true">
              {readerGenreSlug === 'horror' ? (
                <div className={styles.summaryUnlockGhosts}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              ) : readerGenreSlug === 'komik' ? (
                <div className={styles.summaryUnlockComicScene}>
                  <strong>ZAP!</strong>
                  <i />
                  <i />
                  <em>VS</em>
                  <span>POW!</span>
                  <small>WOW!</small>
                  <u />
                </div>
              ) : <span>{summaryGenreDesign.symbol}</span>}
              {readerGenreSlug === 'dongeng' ? (
                <div className={styles.summaryUnlockLeaves}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              ) : null}
              <b>{readerGenreLabel}</b>
            </div>
            <div className={styles.summaryUnlockCopy}>
              <span>{summaryGenreDesign.kicker}</span>
              <h2 id="summary-unlock-title">{summaryGenreDesign.title}</h2>
              <p>Kamu sudah menyelesaikan <b>{book?.title}</b>. Tulis kembali isi buku dengan bahasamu sendiri untuk mendapatkan poin.</p>
              <div>
                <button type="button" onClick={() => { setSummaryUnlockOpen(false); setSummaryRulesOpen(true); }}>
                  Baca aturan dan tulis <span>→</span>
                </button>
                <button type="button" onClick={() => setSummaryUnlockOpen(false)}>Nanti saja</button>
              </div>
            </div>
          </section>
        </div>
      ), document.body) : null}

      {summaryRulesOpen && typeof document !== 'undefined' ? createPortal((
        <div className={styles.readerRulesBackdrop} role="presentation" onMouseDown={() => setSummaryRulesOpen(false)}>
          <section className={styles.readerRulesDialog} data-genre={readerGenreSlug} role="dialog" aria-modal="true" aria-labelledby="reader-rules-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className={styles.readerRulesClose} type="button" aria-label="Tutup aturan" onClick={() => setSummaryRulesOpen(false)}>×</button>
            <header>
              <span>SEBELUM MENULIS</span>
              <h2 id="reader-rules-title">Aturan ringkasan</h2>
              <p>Baca aturan berikut agar ringkasanmu bisa diperiksa dan mendapat poin.</p>
            </header>
            <ol>
              <li><b>01</b><div><strong>Selesaikan buku 100%</strong><p>Ringkasan baru dapat dikirim setelah seluruh halaman selesai dibaca.</p></div></li>
              <li><b>02</b><div><strong>Gunakan bahasa sendiri</strong><p>Jangan menyalin sinopsis atau tulisan milik orang lain.</p></div></li>
              <li><b>03</b><div><strong>Minimal 100 karakter</strong><p>Tulis tokoh, kejadian penting, dan pesan yang kamu pahami.</p></div></li>
              <li><b>04</b><div><strong>Tunggu pemeriksaan admin</strong><p>Poin diberikan setelah admin menyetujui ringkasanmu.</p></div></li>
              <li><b>05</b><div><strong>Dapat diperbaiki</strong><p>Jika ditolak, baca catatan admin lalu kirim versi perbaikannya.</p></div></li>
            </ol>
            <footer>
              {progress === 100 ? (
                <Link href={`/dashboard/books/${book.id}#ringkasan`}>Saya mengerti, tulis ringkasan →</Link>
              ) : (
                <button type="button" onClick={() => setSummaryRulesOpen(false)}>Saya mengerti</button>
              )}
              <small>{progress === 100 ? 'Ringkasanmu sudah terbuka.' : `Selesaikan bacaan terlebih dahulu · Sudah dibaca ${progress}%`}</small>
            </footer>
          </section>
        </div>
      ), document.body) : null}
    </main>
  );
}
