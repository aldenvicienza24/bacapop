'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../lib/supabase';
import {defaultGenres, mergeWithDefaultGenres} from '../lib/defaultGenres';
import {getDemoBooks} from '../lib/demoBooks';
import {ensureDongengBooks} from '../lib/dongengContent';
import {ceritaKknBook, ensureHorrorBook} from '../lib/horrorContent';
import {ensureRomanceBooks} from '../lib/novelContent';
import {getPaidBookAccess, paidCatalogBooks} from '../lib/paidBooks';
import {getPremiumBookAccess} from '../lib/premiumBooks';
import {getDashboardUser} from './auth';
import {withPageCounts} from './components/BookSection';
import {BookSearch} from './components/BookSearch';
import {DashboardBookSection} from './components/DashboardBookSection';
import ModernDashboardMenu from './components/ModernDashboardMenu';
import styles from './main-dashboard.module.css';
import header from './dashboard-header.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [premiumUnlocked, setPremiumUnlocked] = useState(false);
  const [premiumHorrorUnlocked, setPremiumHorrorUnlocked] = useState(false);
  const [paidAccessByBook, setPaidAccessByBook] = useState({});
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      const currentUser = await getDashboardUser(router);
      if (!currentUser) return;

      setUser(currentUser);
      const [premiumAccess, premiumHorrorAccess, paidAccessEntries] = await Promise.all([
        getPremiumBookAccess(currentUser.id),
        getPremiumBookAccess(currentUser.id, ceritaKknBook),
        Promise.all(paidCatalogBooks.map(async (book) => [
          book.store_key,
          await getPaidBookAccess(currentUser.id, book),
        ])),
      ]);
      setPremiumUnlocked(premiumAccess.unlocked);
      setPremiumHorrorUnlocked(premiumHorrorAccess.unlocked);
      setPaidAccessByBook(Object.fromEntries(paidAccessEntries));

      const [bookResult, genreResult] = await Promise.all([
        supabase
          .from('books')
          .select('id,title,author,cover_url,description,genre_id,genres(id,name,slug,icon,theme_name,theme_color,accent_color)')
          .eq('status', 'active')
          .order('created_at', {ascending: false})
          .limit(24),
        supabase
          .from('genres')
          .select('id,name,slug,description,icon,theme_name,theme_color,accent_color')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (bookResult.error) {
        setNotice('Koleksi utama belum dapat dimuat. Untuk sementara, berikut buku pilihan BacaPop.');
        setBooks(getDemoBooks());
      } else {
        const catalogBooks = await withPageCounts(bookResult.data || []);
        if (catalogBooks.length) {
          setBooks(ensureRomanceBooks(ensureDongengBooks(ensureHorrorBook(catalogBooks))));
        } else {
          setNotice('Belum ada buku baru dari pengelola. Untuk sementara, berikut buku pilihan BacaPop.');
          setBooks(getDemoBooks());
        }
      }

      if (!genreResult.error) setGenres(mergeWithDefaultGenres(genreResult.data || []));
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  const genreOptions = genres.length ? genres : defaultGenres;
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pembaca';
  const firstName = name.split(' ')[0];
  const featuredBook = books[0];

  return (
    <main className={styles.dashboardPage}>
      <aside className={styles.dashboardSidebar}>
        <div className={styles.sidebarBrandBlock}>
          <Link className={styles.dashboardBrand} href="/">BacaPop<span>!</span></Link>
          <small>PERPUSTAKAAN DIGITAL</small>
        </div>

        <div className={styles.sidebarGroup}>
          <span className={styles.sidebarLabel}>Menu utama</span>
          <ModernDashboardMenu active="home" bookCount={books.length} />
        </div>

        <div className={`${styles.sidebarGroup} ${styles.sidebarGenres}`}>
          <span className={styles.sidebarLabel}>Jelajahi genre</span>
          <nav className={styles.sidebarNav} data-tour="genres" aria-label="Daftar genre">
            {genreOptions.slice(0, 6).map((genre, index) => (
              <Link href={`/dashboard/genres/${genre.slug}`} data-genre={genre.slug} key={genre.slug}>
                <span className={styles.genreDot} style={{'--genre-accent': genre.accent_color || '#a66cff'}}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{genre.name}</span>
                <span className={styles.genreMiniArt} aria-hidden="true"><i /><i /><i /></span>
                <i aria-hidden="true">↗</i>
              </Link>
            ))}
          </nav>
        </div>

        <Link className={styles.sidebarAccount} data-tour="profile" href="/dashboard/profile" aria-label="Buka profil saya">
          <span>{firstName.slice(0, 1).toUpperCase()}</span>
          <div><small>KARTU ANGGOTA</small><b>{name}</b><em>Pembaca aktif</em></div>
          <i aria-hidden="true">↗</i>
        </Link>
      </aside>

      <section className={styles.dashboardWorkspace}>
        <header className={`${styles.dashboardTopbar} ${header.topbar}`} data-tour="welcome">
          <Link className={`${styles.topbarBrand} ${header.brand}`} href="/dashboard" aria-label="BacaPop, kembali ke beranda">
            <span>B</span>
            <b>BacaPop!</b>
          </Link>
          <button className={`${styles.browseButton} ${header.search}`} data-tour="search" type="button" aria-label="Cari bacaan" onClick={() => setSearchOpen(true)}><span aria-hidden="true">⌕</span>Cari Bacaan</button>
          <div className={`${styles.dashboardActions} ${header.actions}`}>
            <div className={styles.utilitySlot} data-dashboard-utility-slot />
            <Link className={styles.profileButton} data-tour="profile" href="/dashboard/profile">
              <span className={styles.profileAvatar}>{firstName.slice(0, 1).toUpperCase()}<i aria-hidden="true" /></span>
              <span className={styles.profileButtonCopy}><small>RUANG PEMBACA</small><b>Profil Saya</b></span>
              <i className={styles.profileArrow} aria-hidden="true">↗</i>
            </Link>
          </div>
        </header>

        <div className={styles.dashboardBody}>
          <section className={styles.dashboardIntro}>
            <div>
              <span>Selamat datang, {firstName}</span>
              <h2>PERPUSTAKAAN<br />PRIBADIMU.</h2>
              <p>Pilih buku, mulai membaca, dan lanjutkan dari halaman terakhir.</p>
            </div>
            <div className={styles.dashboardIntroVisual}>
              <div className={styles.dashboardIntroArt} aria-hidden="true">
                <span>BUKU</span>
                <b>BACA!</b>
                <i>{books.length}</i>
              </div>
              <a className={styles.dashboardIntroCta} href="#koleksi">
                Lihat koleksi <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </section>

          <section className={styles.dashboardStats} data-tour="stats" aria-label="Informasi singkat buku">
            <article style={{'--stat-accent': '#3d5cff'}}>
              <span>Jumlah buku</span><div><b>{books.length}</b><small>buku siap dibaca</small></div>
            </article>
            <article style={{'--stat-accent': '#45d6b4'}}>
              <span>Jenis cerita</span><div><b>{genreOptions.length}</b><small>pilihan cerita</small></div>
            </article>
            <article style={{'--stat-accent': '#ff814a'}}>
              <span>Buku terbaru</span><div><b>{featuredBook ? '01' : '00'}</b><small>{featuredBook?.title || 'Belum tersedia'}</small></div>
            </article>
          </section>

          <div className={styles.dashboardContent}>
            <aside className={styles.dashboardAside} id="genre">
              <div className={styles.asideHeading}><span>Pilih cerita</span><h2>Jelajahi genre</h2></div>
              <div className={styles.dashboardGenreList} data-tour="genre-list">
                {genreOptions.slice(0, 5).map((genre, index) => (
                  <Link href={`/dashboard/genres/${genre.slug}`} data-genre={genre.slug} style={{'--genre-accent': genre.accent_color || '#a66cff'}} key={genre.slug}>
                    <b>{String(index + 1).padStart(2, '0')}</b><span>{genre.name}</span><i aria-hidden="true">&rarr;</i>
                  </Link>
                ))}
              </div>
              <div className={styles.dashboardTip}><span>TIPS</span><p>Baca 10 menit setiap hari.</p></div>
            </aside>

        <DashboardBookSection books={books} notice={notice} loading={loading} premiumUnlocked={premiumUnlocked} premiumHorrorUnlocked={premiumHorrorUnlocked} paidAccessByBook={paidAccessByBook} />
          </div>
        </div>
      </section>

      <BookSearch books={books} open={searchOpen} premiumUnlocked={premiumUnlocked} premiumHorrorUnlocked={premiumHorrorUnlocked} paidAccessByBook={paidAccessByBook} onClose={() => setSearchOpen(false)} />
    </main>
  );
}
