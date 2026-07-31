'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {defaultGenres, mergeWithDefaultGenres, normalizeGenreLabel} from '../../../lib/defaultGenres';
import {getDemoBooks} from '../../../lib/demoBooks';
import {ensureDongengBooks} from '../../../lib/dongengContent';
import {
  ceritaKknBook,
  ensureHorrorBook,
  isKunciHitam,
  withHorrorContent,
  withKunciHitamContent,
} from '../../../lib/horrorContent';
import {ensureComicBooks, mercuryComicPages} from '../../../lib/comicContent';
import {ensureRomanceBooks, mySweetDoctorBook} from '../../../lib/novelContent';
import {getPaidBookAccess, getPaidBookKey, isPaidBook, paidCatalogBooks} from '../../../lib/paidBooks';
import {getPremiumBookAccess, isPremiumBook} from '../../../lib/premiumBooks';
import {supabase} from '../../../lib/supabase';
import {getDashboardUser, logoutFromDashboard} from '../../auth';
import {BookSection, withPageCounts} from '../../components/BookSection';
import dongeng from './dongeng.module.css';
import horror from './horror.module.css';
import novel from './novel.module.css';
import unified from './unified-genre.module.css';
import comic from './comic.module.css';
import ComicFightAnimation from './ComicFightAnimation';
import HorrorFogCanvas from './HorrorFogCanvas';
import DongengStoryCanvas from './DongengStoryCanvas';
import DongengMagicPortal from './DongengMagicPortal';
import RomanceBeachAnimation from './RomanceBeachAnimation';
import styles from '../../user-dashboard.module.css';

function uniqueBooksByTitle(books) {
  const seen = new Set();
  return books.filter((book) => {
    const key = book.title?.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function GenreBooksPage() {
  const {slug} = useParams();
  const router = useRouter();
  const [genre, setGenre] = useState(null);
  const [genres, setGenres] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [premiumUnlocked, setPremiumUnlocked] = useState(false);
  const [premiumHorrorUnlocked, setPremiumHorrorUnlocked] = useState(false);
  const [paidRomanceUnlocked, setPaidRomanceUnlocked] = useState(false);
  const [paidAccessByBook, setPaidAccessByBook] = useState({});

  useEffect(() => {
    async function loadGenrePage() {
      const currentUser = await getDashboardUser(router);
      if (!currentUser) return;
      const premiumAccess = await getPremiumBookAccess(currentUser.id);
      const premiumHorrorAccess = await getPremiumBookAccess(currentUser.id, ceritaKknBook);
      const paidAccessEntries = await Promise.all(paidCatalogBooks.map(async (book) => [
        book.store_key,
        await getPaidBookAccess(currentUser.id, book),
      ]));
      const nextPaidAccess = Object.fromEntries(paidAccessEntries);
      setPremiumUnlocked(premiumAccess.unlocked);
      setPremiumHorrorUnlocked(premiumHorrorAccess.unlocked);
      setPaidAccessByBook(nextPaidAccess);
      setPaidRomanceUnlocked(Boolean(nextPaidAccess[mySweetDoctorBook.store_key]?.unlocked));

      const {data: genreData, error: genreError} = await supabase
        .from('genres')
        .select('id,name,slug,description,icon,theme_name,theme_color,accent_color')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      const selectedGenre = normalizeGenreLabel(genreData || defaultGenres.find((item) => item.slug === slug));

      if (genreError) setNotice('Data buku belum siap. Untuk sementara, BacaPop menampilkan buku contoh.');
      if (!selectedGenre) {
        setNotice('Genre tidak ditemukan.');
        setLoading(false);
        return;
      }

      const {data: allGenres} = await supabase
        .from('genres')
        .select('id,name,slug,icon,theme_color,accent_color')
        .eq('is_active', true)
        .order('name');

      setGenre(selectedGenre);
      setGenres(allGenres?.length ? mergeWithDefaultGenres(allGenres) : defaultGenres);

      if (!genreData?.id) {
        setBooks(getDemoBooks(slug));
        setLoading(false);
        return;
      }

      const {data: bookData, error: bookError} = await supabase
        .from('books')
        .select('id,title,author,cover_url,description,genre_id,genres(id,name,slug,icon,theme_name,theme_color,accent_color)')
        .eq('status', 'active')
        .eq('genre_id', genreData.id)
        .order('created_at', {ascending: false});

      if (bookError) {
        setNotice('Data buku belum siap. Untuk sementara, BacaPop menampilkan buku contoh.');
        setBooks(getDemoBooks(slug));
      } else {
        const catalogBooks = await withPageCounts(uniqueBooksByTitle(bookData || []));
        if (catalogBooks.length) {
          setBooks(slug === 'horror'
            ? ensureHorrorBook(catalogBooks)
            : slug === 'novel'
              ? ensureRomanceBooks(catalogBooks)
              : slug === 'dongeng'
                ? ensureDongengBooks(catalogBooks)
                : slug === 'komik'
                  ? ensureComicBooks(catalogBooks)
                  : catalogBooks);
        } else {
          setNotice('Belum ada buku dari admin. Untuk sementara, BacaPop menampilkan buku contoh.');
          setBooks(getDemoBooks(slug));
        }
      }

      setLoading(false);
    }

    loadGenrePage();
  }, [router, slug]);

  const isDongeng = slug === 'dongeng';
  const isHorror = slug === 'horror';
  const isComic = slug === 'komik';
  const isNovel = slug === 'novel';

  if (isDongeng) {
    return (
      <DongengGenreView books={books} genre={genre} genres={genres} loading={loading} notice={notice} paidAccessByBook={paidAccessByBook} router={router} slug={slug} />
    );
  }

  if (isHorror) {
    return (
      <HorrorGenreView books={books} genre={genre} genres={genres} loading={loading} notice={notice} paidAccessByBook={paidAccessByBook} premiumHorrorUnlocked={premiumHorrorUnlocked} router={router} slug={slug} />
    );
  }

  if (isNovel) {
    return (
      <NovelGenreView books={books} genre={genre} genres={genres} loading={loading} notice={notice} premiumUnlocked={premiumUnlocked} paidRomanceUnlocked={paidRomanceUnlocked} router={router} slug={slug} />
    );
  }

  if (isComic) {
    return (
      <UnifiedGenreView books={books} genre={genre} genres={genres} loading={loading} notice={notice} router={router} slug={slug} />
    );
  }

  return (
    <main className={`${styles.page} ${isDongeng ? styles.dongengPage : ''} ${isNovel ? styles.novelGenrePage : ''}`}>
      <div className={styles.wrap}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/dashboard">
            <span>B</span>BacaPop!
          </Link>
          <nav>
            <Link href="/dashboard">Beranda</Link>
            <a href="#koleksi">Koleksi</a>
            <button onClick={() => logoutFromDashboard(router)}>Keluar</button>
          </nav>
        </header>

        <section className={styles.catalogLayout}>
          <aside className={styles.filterPanel}>
            <div>
              <span className={styles.eyebrow}>FILTER GENRE</span>
              <h2>Pilih genre</h2>
            </div>
            <nav className={styles.genreFilter} aria-label="Filter genre buku">
              {genres.map((item) => (
                <Link
                  href={`/dashboard/genres/${item.slug}`}
                  className={`${styles.genreFilterItem} ${item.slug === slug ? styles.activeFilter : ''}`}
                  style={{'--genre-color': item.theme_color || '#fff', '--genre-accent': item.accent_color || '#D9FF19'}}
                  key={item.slug}
                >
                  <span>{item.slug === 'dongeng' ? 'DG' : item.icon || item.name.slice(0, 2).toUpperCase()}</span>
                  <b>{item.slug === 'novel' ? 'Romance' : item.name}</b>
                </Link>
              ))}
            </nav>
          </aside>

          <div className={styles.catalogMain}>
            <section
              className={`${styles.shelfHeader} ${styles.genreHero} ${isDongeng ? styles.dongengHero : ''} ${isNovel ? styles.novelGenreHero : ''}`}
              style={{'--genre-color': genre?.theme_color || '#fff', '--genre-accent': genre?.accent_color || '#D9FF19'}}
            >
              <div>
                <Link className={styles.backLink} href="/dashboard">
                  Kembali
                </Link>
                <span>{genre?.theme_name || 'Genre BacaPop'}</span>
                <h1>{genre?.name || 'Genre'}</h1>
                <p>{genre?.description || 'Semua buku aktif dari genre pilihanmu akan tampil di halaman ini.'}</p>
                {isDongeng ? (
                  <div className={styles.dongengTags} aria-label="Tema dongeng">
                    <b>Cerita Rakyat</b>
                    <b>Cerita Anak</b>
                    <b>Pesan Moral</b>
                  </div>
                ) : null}
                {isNovel ? (
                  <div className={styles.novelTags} aria-label="Nuansa Laut Bercerita">
                    <b>Ingatan</b><b>Keluarga</b><b>Perjuangan</b>
                  </div>
                ) : null}
              </div>
              <div className={styles.headerCount}>
                <b>{books.length}</b>
                <span>buku</span>
              </div>
              {isDongeng ? (
                <div className={styles.dongengScene} aria-hidden="true">
                  <div className={styles.storyBook}>
                    <i />
                    <strong>Dongeng</strong>
                  </div>
                  <div className={styles.forestLayer} />
                  <div className={styles.littleHero} />
                  <div className={styles.folkBird} />
                </div>
              ) : null}
              {isNovel ? (
                <div className={styles.novelOceanScene} aria-hidden="true">
                  <span /><span /><span />
                  <i /><i />
                  <b />
                </div>
              ) : null}
            </section>

            <BookSection
              books={books}
              notice={notice}
              loading={loading}
              title={genre ? `Rekomendasi ${genre.name}` : 'Rekomendasi Buku'}
              subtitle={genre ? `Semua buku aktif pada genre ${genre.name}.` : ''}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ComicGenreView({books, genre, genres, loading, notice, router, slug}) {
  const featuredBook = books[0];
  const previewPages = mercuryComicPages.slice(1, 5);

  return (
    <main className={comic.page}>
      <div className={comic.wrap}>
        <header className={comic.topbar}>
          <Link className={comic.brand} href="/dashboard"><span>B</span><b>BacaPop!</b></Link>
          <nav>
            <Link href="/dashboard">Beranda</Link>
            <a href="#koleksi">Koleksi</a>
            <button onClick={() => logoutFromDashboard(router)}>Keluar</button>
          </nav>
        </header>

        <nav className={comic.genreRail} aria-label="Pilih genre buku">
          <span>KOLEKSI BUKU</span>
          {genres.map((item) => (
            <Link className={item.slug === slug ? comic.activeGenre : ''} href={`/dashboard/genres/${item.slug}`} key={item.slug}>
              <i>{item.slug === 'komik' ? 'KM' : item.slug === 'horror' ? 'HR' : item.slug === 'dongeng' ? 'DG' : item.icon || item.name.slice(0, 2).toUpperCase()}</i>
              {item.name}
            </Link>
          ))}
        </nav>

        <section className={comic.hero}>
          <div className={comic.heroCopy}>
            <div className={comic.issue}><span>EDISI</span><b>01</b></div>
            <p className={comic.kicker}>CERITA BERGAMBAR · EDUKASI · PETUALANGAN</p>
            <h1>KO<span>MIK</span></h1>
            <p className={comic.description}>{genre?.description || 'Cerita bergambar yang seru, ekspresif, dan mudah dipahami dalam setiap panel.'}</p>
            <div className={comic.heroActions}>
              {featuredBook ? <Link href={`/dashboard/read/${featuredBook.id}`}>Mulai Membaca <b>→</b></Link> : <span>Komik segera hadir</span>}
              <a href="#panel-preview">Lihat Panel</a>
            </div>
            <div className={comic.heroFacts}>
              <div><b>{books.length}</b><span>Komik aktif</span></div>
              <div><b>{featuredBook?.page_count || mercuryComicPages.length}</b><span>Halaman</span></div>
              <div><b>100%</b><span>Baca online</span></div>
            </div>
          </div>

          <div className={comic.coverStage} aria-label="Komik pilihan">
            <span className={comic.burst}>BARU!</span>
            <div className={comic.coverFrame}>
              <img src={featuredBook?.cover_url || mercuryComicPages[0].image_url} alt={`Sampul ${featuredBook?.title || 'Air Raksa'}`} />
            </div>
            <div className={comic.speech}>Baca, lihat, dan temukan pesannya!</div>
          </div>
        </section>

        <section className={comic.collection} id="koleksi">
          <header className={comic.sectionHead}>
            <div><p>FEATURED STORY</p><h2>Komik pilihan minggu ini</h2></div>
            <span>{books.length} judul</span>
          </header>
          {notice ? <div className={comic.notice}>{notice}</div> : null}
          {loading ? <div className={comic.empty}>Menyusun panel komik...</div> : books.length ? (
            <div className={comic.bookList}>{books.map((book, index) => (
              <article className={comic.bookCard} key={book.id}>
                <div className={comic.bookCover}><img src={book.cover_url || mercuryComicPages[0].image_url} alt={`Sampul ${book.title}`} /><span>#{String(index + 1).padStart(2, '0')}</span></div>
                <div className={comic.bookCopy}>
                  <p>KOMIK EDUKASI</p>
                  <h3>{book.title}</h3>
                  <span>Oleh {book.author || 'BacaPop Library'}</span>
                  <p>{book.description || 'Cerita visual pilihan yang bisa dibaca langsung di BacaPop.'}</p>
                  <div><b>{book.page_count || mercuryComicPages.length} halaman</b><Link href={`/dashboard/read/${book.id}`}>Buka Komik <span>→</span></Link></div>
                </div>
              </article>
            ))}</div>
          ) : <div className={comic.empty}>Belum ada komik aktif untuk ditampilkan.</div>}
        </section>

        <section className={comic.preview} id="panel-preview">
          <header className={comic.sectionHead}><div><p>INTIP CERITA</p><h2>Beberapa panel di dalamnya</h2></div><span>Swipe panel</span></header>
          <div className={comic.panelStrip}>{previewPages.map((page, index) => (
            <Link href={`/dashboard/read/${featuredBook?.id || 'demo-komik-air-raksa'}`} className={comic.previewPanel} key={page.page_number}>
              <img src={page.image_url} alt={`Preview halaman ${page.page_number}`} />
              <span>0{index + 1}</span>
            </Link>
          ))}</div>
        </section>
      </div>
    </main>
  );
}

function UnifiedGenreView({books, genre, genres, loading, notice, router, slug}) {
  const isHorror = slug === 'horror';
  const isComic = slug === 'komik';
  const theme = isHorror
    ? {
        kicker: 'Misteri · Rumah Tua · Rahasia Gelap',
        title: genre?.name || 'Horror',
        fallback: 'Kumpulan bacaan misteri yang gelap, menegangkan, dan penuh rahasia.',
        tags: ['Rumah Tua', 'Misteri', 'Menegangkan'],
        highlights: [
          ['01', 'Rumah Terkutuk', 'Nuansa rumah tua, lampu redup, dan rahasia yang belum selesai.'],
          ['02', 'Suasana Gelap', 'Malam, kabut tipis, dan rasa tegang yang tumbuh perlahan.'],
          ['03', 'Baca Online', 'Cerita dibuka langsung sebagai halaman bacaan digital BacaPop.'],
        ],
        catalogLabel: 'Koleksi Horror',
        catalogTitle: 'Misteri Pilihan',
        loadingText: 'Memuat koleksi horror...',
        emptyText: 'Belum ada buku horror aktif untuk ditampilkan.',
      }
    : isComic
      ? {
        kicker: 'Panel Cerita · Ilustrasi · Edukasi',
        title: genre?.name || 'Komik',
        fallback: 'Baca cerita bergambar yang seru, ekspresif, dan mudah dipahami dalam setiap panel.',
        tags: ['Cerita Bergambar', 'Komik Edukasi', 'Mudah Dipahami'],
        highlights: [
          ['BAM!', 'Panel Ekspresif', 'Cerita bergerak melalui ilustrasi, dialog, dan ekspresi karakter yang hidup.'],
          ['WOW!', 'Belajar Visual', 'Informasi penting lebih mudah dipahami lewat cerita bergambar.'],
          ['ZAP!', 'Baca Langsung', 'Buka setiap halaman komik langsung di BacaPop.'],
        ],
        catalogLabel: 'Koleksi Komik',
        catalogTitle: 'Komik Pilihan',
        loadingText: 'Memuat panel komik...',
        emptyText: 'Belum ada komik aktif untuk ditampilkan.',
      }
      : {
        kicker: 'Cerita Anak · Pesan Moral',
        title: genre?.name || 'Dongeng',
        fallback: 'Kumpulan cerita dongeng anak yang ringan, imajinatif, dan cocok untuk latihan membaca.',
        tags: ['Cerita Rakyat', 'Cerita Anak', 'Pesan Moral'],
        highlights: [
          ['01', 'Tokoh Cerita', 'Kancil, putri, raksasa, dan sahabat hutan yang dekat dengan dunia anak.'],
          ['02', 'Hutan Ajaib', 'Suasana petualangan hangat dan imajinatif seperti buku cerita.'],
          ['03', 'Pesan Moral', 'Cerita ringan dengan nilai keberanian, kebaikan, dan kejujuran.'],
        ],
        catalogLabel: 'Koleksi Dongeng',
        catalogTitle: 'Rekomendasi Dongeng',
        loadingText: 'Memuat koleksi dongeng...',
        emptyText: 'Belum ada buku dongeng aktif untuk ditampilkan.',
      };
  return (
    <main className={`${unified.page} ${isHorror ? unified.horrorTheme : isComic ? unified.comicTheme : unified.dongengTheme}`}>
      <div className={unified.atmosphere} aria-hidden="true"><span /><span /><span /><span /></div>
      <div className={unified.wrap}>
        <header className={unified.topbar}>
          <Link className={unified.brand} href="/dashboard"><span>B</span><b>BacaPop!</b></Link>
          {isComic ? (
            <>
              <div className={unified.comicHeaderDecor} aria-hidden="true">
                <i className={unified.comicBurstLeft} />
                <i className={unified.comicBurstRight} />
                <span className={unified.comicSparkOne} />
                <span className={unified.comicSparkTwo} />
                <span className={unified.comicSparkThree} />
                <span className={unified.comicSparkFour} />
                <b className={unified.comicSfxLeft}>ZAP!</b>
                <b className={unified.comicSfxRight}>WHAM!</b>
              </div>
              <div className={unified.pixelFight} aria-hidden="true">
                <ComicFightAnimation className={unified.fightCanvas} />
              </div>
            </>
          ) : null}
          <nav><Link href="/dashboard">Beranda</Link><a href="#koleksi">Semua Buku</a><button onClick={() => logoutFromDashboard(router)}>Keluar</button></nav>
        </header>

        <section className={unified.layout}>
          <aside className={unified.sidebar}>
            <p>Jenis Cerita</p><h2>Pilih genre</h2>
            <nav aria-label="Filter genre buku">{genres.map((item) => (
              <Link href={`/dashboard/genres/${item.slug}`} className={item.slug === slug ? unified.activeGenre : unified.genreItem} key={item.slug}>
                <span>{item.slug === 'dongeng' ? 'DG' : item.slug === 'horror' ? 'HR' : item.icon || item.name.slice(0, 2).toUpperCase()}</span><b>{item.name}</b>
              </Link>
            ))}</nav>
          </aside>

          <div className={unified.main}>
            <section className={unified.hero} data-tour="genre-hero">
              {isComic ? <div className={unified.comicHeroStars} aria-hidden="true">{Array.from({length: 18}, (_, index) => <span key={index} />)}</div> : null}
              <div className={unified.heroCopy}>
                <Link className={unified.backLink} href="/dashboard">Kembali</Link>
                <p className={unified.kicker}>{theme.kicker}</p>
                <h1>{theme.title}</h1>
                <p className={unified.description}>{genre?.description || theme.fallback}</p>
                <div className={unified.heroMeta}>
                  <div className={unified.tags}>{theme.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <div className={unified.countCard}><b>{books.length}</b><span>buku tersedia</span></div>
                </div>
              </div>
              <div className={unified.visual} aria-hidden="true">
              {isHorror ? <><img src="/images/horror/graveyard-moon.jfif" alt="" /><div className={unified.ghost}><i /><i /></div><strong>Malam Penuh Misteri</strong></> : isComic ? <><img src={books[0]?.cover_url || '/images/comic/dragon-ball/cover.webp'} alt="" /><div className={unified.comicBurst}>WOW!</div><strong>Aksi &amp; Petualangan</strong></> : <><img src="/images/dongeng/forest.png" alt="" /><div className={unified.kancil} /><strong>Hutan Ajaib Kancil</strong></>}
              </div>
            </section>

            {isComic ? (
              <div className={unified.comicTicker} aria-label="Nuansa cerita komik">
                <div className={unified.comicTickerTrack}>
                  <div className={unified.comicTickerGroup}>
                    <span>BAM!</span><i>★</i><span>PANEL AKSI</span><i>⚡</i><span>WOW!</span><i>★</i><span>BACA KOMIK</span><i>⚡</i>
                  </div>
                  <div className={unified.comicTickerGroup} aria-hidden="true">
                    <span>BAM!</span><i>★</i><span>PANEL AKSI</span><i>⚡</i><span>WOW!</span><i>★</i><span>BACA KOMIK</span><i>⚡</i>
                  </div>
                </div>
              </div>
            ) : null}

            <section className={unified.highlights} aria-label={`Nuansa ${theme.title}`}>{theme.highlights.map(([number, title, copy]) => (
              <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
            ))}</section>

            <section className={unified.collection} id="koleksi" data-tour="genre-collection">
              <div className={unified.sectionHead}><div><p>{theme.catalogLabel}</p><h2>{theme.catalogTitle}</h2></div><span>{books.length} buku</span></div>
              {notice ? <div className={unified.notice}>{notice}</div> : null}
              {loading ? <div className={unified.empty}>{theme.loadingText}</div> : books.length ? (
                <div
                  className={unified.bookGrid}
                  style={isComic ? { "--comic-book-count": Math.max(books.length, 1) } : undefined}
                >{books.map((originalBook) => {
                  const book = isHorror ? withHorrorContent(originalBook) : originalBook;
                  return <article className={unified.bookCard} key={book.id}>
                    <div className={unified.cover}><img src={book.cover_url || (isHorror ? '/images/horror/rumah-terkutuk.jfif' : isComic ? '/images/comic/merkuri/page-001.webp' : '/images/dongeng/kumpulan-cerita-dongeng-anak-2.png')} alt={`Sampul ${book.title}`} /><span>{isHorror ? 'HORROR' : isComic ? 'KOMIK' : 'DONGENG'}</span></div>
                    <div className={unified.cardCopy}><p>{isHorror ? 'Cerita Horror' : isComic ? 'Cerita Bergambar' : 'Cerita Dongeng'}</p><h3>{book.title}</h3><span>{book.author || 'BacaPop Library'}</span><Link href={`/dashboard/read/${book.id}`}>Baca Sekarang <b>→</b></Link></div>
                  </article>;
                })}</div>
              ) : <div className={unified.empty}>{theme.emptyText}</div>}

            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

const HORROR_GHOSTS = [
  {left: '3%', top: '42%', size: '76px', duration: '11s', delay: '0s', opacity: 0.68},
  {left: '13%', top: '72%', size: '48px', duration: '14s', delay: '-6s', opacity: 0.34},
  {left: '31%', top: '17%', size: '42px', duration: '13s', delay: '-3s', opacity: 0.3},
  {left: '55%', top: '77%', size: '55px', duration: '15s', delay: '-9s', opacity: 0.36},
  {left: '72%', top: '31%', size: '50px', duration: '12s', delay: '-5s', opacity: 0.4},
  {left: '86%', top: '66%', size: '68px', duration: '16s', delay: '-11s', opacity: 0.48},
  {left: '93%', top: '15%', size: '38px', duration: '13s', delay: '-8s', opacity: 0.27},
];

function HorrorGenreView({books, genre, genres, loading, notice, paidAccessByBook, premiumHorrorUnlocked, router, slug}) {
  return (
    <main className={horror.page}>
      <div className={horror.fog} aria-hidden="true">
        <span />
        <span />
        <span />
        <div className={horror.ghostField}>
          {HORROR_GHOSTS.map((ghost) => (
            <svg
              className={horror.fogGhost}
              viewBox="0 0 76 102"
              focusable="false"
              style={{
                '--ghost-left': ghost.left,
                '--ghost-top': ghost.top,
                '--ghost-size': ghost.size,
                '--ghost-duration': ghost.duration,
                '--ghost-delay': ghost.delay,
                '--ghost-opacity': ghost.opacity,
              }}
              key={`${ghost.left}-${ghost.top}`}
            >
              <path
                d="M8 88V38C8 18 21 6 38 6s30 12 30 32v50L58 98 49 87 38 99 27 87 18 98Z"
                fill="#d8cae5"
                fillOpacity=".48"
                stroke="#fff"
                strokeOpacity=".28"
              />
              <path d="M15 39C15 22 25 13 38 13s23 9 23 26" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="5" />
              <ellipse cx="29" cy="45" rx="4" ry="6" fill="#160a1d" />
              <ellipse cx="51" cy="45" rx="4" ry="6" fill="#160a1d" />
            </svg>
          ))}
        </div>
        <span />
      </div>

      <div className={horror.wrap}>
        <header className={horror.topbar}>
          <Link className={horror.brand} href="/dashboard">
            <span>B</span>
            <b>BacaPop!</b>
          </Link>
          <div className={horror.headerHaunt} aria-hidden="true">
            <i className={horror.headerMoon} />
            <HorrorFogCanvas className={horror.headerFogCanvas} />
            <i className={horror.headerLightning} />
            <span className={`${horror.headerGrave} ${horror.graveOne}`}><b>RIP</b></span>
            <span className={`${horror.headerGrave} ${horror.graveTwo}`}><b>RIP</b></span>
            <span className={horror.graveCross} />
            <span className={`${horror.headerEyes} ${horror.headerEyesOne}`} />
            <span className={`${horror.headerEyes} ${horror.headerEyesTwo}`} />
            <span className={horror.headerHand} />
            <span className={`${horror.headerBat} ${horror.headerBatOne}`} />
            <span className={`${horror.headerBat} ${horror.headerBatTwo}`} />
            <span className={`${horror.headerGhost} ${horror.headerGhostOne}`} />
            <span className={`${horror.headerGhost} ${horror.headerGhostTwo}`} />
            <span className={`${horror.headerGhost} ${horror.headerGhostThree}`} />
            <span className={`${horror.headerGhost} ${horror.headerGhostFour}`} />
            <span className={`${horror.headerGhost} ${horror.headerGhostFive}`} />
            <span className={`${horror.headerGhost} ${horror.headerGhostSix}`} />
          </div>
          <nav>
            <Link href="/dashboard">Beranda</Link>
            <a href="#koleksi">Koleksi</a>
            <button onClick={() => logoutFromDashboard(router)}>Keluar</button>
          </nav>
        </header>

        <section className={horror.layout}>
          <aside className={horror.sidebar}>
            <p>Genre Buku</p>
            <h2>Pilih genre</h2>
            <nav aria-label="Filter genre buku">
              {genres.map((item) => (
                <Link
                  href={`/dashboard/genres/${item.slug}`}
                  className={item.slug === slug ? horror.activeGenre : horror.genreItem}
                  key={item.slug}
                >
                  <span>{item.slug === 'horror' ? 'HR' : item.icon || item.name.slice(0, 2).toUpperCase()}</span>
                  <b>{item.name}</b>
                </Link>
              ))}
            </nav>
          </aside>

          <div className={horror.main}>
            <section className={horror.hero}>
              <div className={horror.heroCopy}>
                <Link className={horror.backLink} href="/dashboard">
                  Kembali
                </Link>
                <p className={horror.kicker}>Misteri - Rumah Tua - Rahasia Gelap</p>
                <h1>{genre?.name || 'Horror'}</h1>
                <p>
                  {genre?.description || 'Kumpulan bacaan misteri yang gelap, menegangkan, dan penuh rahasia.'}
                </p>
                <div className={horror.tags}>
                  <span>Haunted House</span><span>Misteri</span><span>Tegang</span>
                </div>
              </div>

              <div className={horror.hauntedCard} aria-hidden="true">
                <img src="/images/horror/haunted-mansion-feature-v2.png" alt="" />
                <div className={horror.hauntedEffects}>
                  <i /><i /><i />
                  <span /><span /><span />
                </div>
                <div className={horror.heroPosterText}>
                  <span>Midnight Horror</span>
                  <b>Misteri Rumah Terkutuk</b>
                </div>
              </div>
            </section>

            <div className={horror.horrorTicker} aria-label="Nuansa cerita horror">
              <div className={horror.horrorTickerTrack}>
                <div className={horror.horrorTickerGroup}>
                  <span>MIDNIGHT FILES</span><i>✦</i><span>HAUNTED HOUSE</span><i>☾</i><span>DARK SECRETS</span><i>✦</i><span>DON&apos;T LOOK BACK</span><i>☾</i>
                </div>
                <div className={horror.horrorTickerGroup} aria-hidden="true">
                  <span>MIDNIGHT FILES</span><i>✦</i><span>HAUNTED HOUSE</span><i>☾</i><span>DARK SECRETS</span><i>✦</i><span>DON&apos;T LOOK BACK</span><i>☾</i>
                </div>
              </div>
            </div>

            <section className={horror.moodGrid} aria-label="Tema horror">
              <article>
                <b>01</b>
                <h3>Rumah Terkutuk</h3>
                <p>Nuansa rumah tua, lampu redup, dan rahasia yang belum selesai.</p>
              </article>
              <article>
                <b>02</b>
                <h3>Suasana Gelap</h3>
                <p>Palet hitam, ungu malam, merah darah, dan kabut tipis.</p>
              </article>
              <article>
                <b>03</b>
                <h3>Baca Online</h3>
                <p>Cerita dibuka sebagai halaman bacaan langsung di BacaPop.</p>
              </article>
            </section>

            <section className={horror.collection} id="koleksi">
              <div className={horror.sectionHead}>
                <div>
                  <p>Koleksi Horror</p>
                  <h2>Misteri Pilihan</h2>
                </div>
                <span>{books.length} buku</span>
              </div>

              {notice ? <div className={horror.notice}>{notice}</div> : null}

              {loading ? (
                <div className={horror.empty}>Memuat buku Horror...</div>
              ) : books.length ? (
                <div className={horror.bookGrid}>
                  {books.map((book) => (
                    <HorrorBookCard book={book} paidAccessByBook={paidAccessByBook} premiumHorrorUnlocked={premiumHorrorUnlocked} key={book.id} />
                  ))}
                </div>
              ) : (
                <div className={horror.empty}>Belum ada buku horror aktif untuk ditampilkan.</div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function HorrorBookCard({book, paidAccessByBook, premiumHorrorUnlocked}) {
  const horrorBook = isKunciHitam(book) ? withKunciHitamContent(book) : withHorrorContent(book);
  const premium = isPremiumBook(horrorBook);
  const paid = isPaidBook(horrorBook);
  const premiumStyled = premium || paid;
  const locked = premium && !premiumHorrorUnlocked;
  const paidLocked = paid && !paidAccessByBook[getPaidBookKey(horrorBook)]?.unlocked;
  const target = paidLocked
    ? '/dashboard/store#katalog'
    : locked
      ? '/dashboard/rewards#hadiah'
      : `/dashboard/read/${horrorBook.id}`;

  return (
    <article className={`${horror.bookCard} ${premiumStyled ? horror.premiumBookCard : ''}`}>
      <div className={`${horror.cover} ${premiumStyled ? horror.premiumCover : ''}`}>
        <img src={horrorBook.cover_url || '/images/horror/rumah-terkutuk.jfif'} alt={`Sampul ${horrorBook.title}`} />
        <div className={horror.posterOverlay} />
        <span>{paid ? 'PREMIUM HORROR · RP1.000' : premium ? 'HORROR PREMIUM' : 'HORROR'}</span>
        <h3>{horrorBook.title}</h3>
        <p>{horrorBook.author || 'BacaPop Horror Library'}</p>
      </div>
      <div className={horror.cardCopy}>
        <p>{paid ? 'Premium Horror · Rp1.000' : premium ? 'Horror Premium · 750 Poin' : 'Cerita Horror'}</p>
        <h3>{horrorBook.title}</h3>
        <span>{horrorBook.description || 'Cerita misteri pilihan dari koleksi Horror.'}</span>
        <div className={horror.cardActions}>
          <Link href={target}>{paidLocked ? 'Beli Rp1.000' : locked ? 'Tukar 750 Poin' : premiumStyled ? 'Baca Premium' : 'Buka Buku'}</Link>
        </div>
      </div>
    </article>
  );
}

function NovelGenreView({books, genre, genres, loading, notice, premiumUnlocked, paidRomanceUnlocked, router, slug}) {
  const featuredBook = books[0];

  return (
    <main className={novel.page}>
      <div className={novel.romanceBackdrop} aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>

      <div className={novel.wrap}>
        <header className={novel.topbar}>
          <Link className={novel.brand} href="/dashboard">
            <span>B</span>
            <b>BacaPop!</b>
          </Link>
          <div className={novel.beachScene} aria-hidden="true">
            <span className={novel.sunsetHaze} />
            <span className={novel.horizonGlow} />
            <div className={novel.sunsetClouds}>
              <i /><i /><i />
            </div>
            <div className={novel.sunsetBirds}>
              <i /><i /><i />
            </div>
            <div className={novel.sea}>
              <i /><i /><i /><i />
              <span className={novel.sailboat} />
            </div>
            <span className={novel.shore} />
            <RomanceBeachAnimation className={novel.romanceAnimationCanvas} />
          </div>
          <nav>
            <Link href="/dashboard">Beranda</Link>
            <a href="#koleksi">Koleksi</a>
            <button onClick={() => logoutFromDashboard(router)}>Keluar</button>
          </nav>
        </header>

        <section className={novel.layout}>
          <aside className={novel.sidebar}>
            <p>Genre Buku</p>
            <h2>Pilih genre</h2>
            <nav aria-label="Filter genre buku">
              {genres.map((item) => (
                <Link
                  href={`/dashboard/genres/${item.slug}`}
                  className={item.slug === slug ? novel.activeGenre : novel.genreItem}
                  key={item.slug}
                >
                  <span>{item.slug === 'novel' ? 'RC' : item.icon || item.name.slice(0, 2).toUpperCase()}</span>
                  <b>{item.slug === 'novel' ? 'Romance' : item.name}</b>
                </Link>
              ))}
            </nav>
          </aside>

          <div className={novel.main}>
            <section className={novel.hero}>
              <div className={novel.romanceHeroOrnaments} aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i /><i />
              </div>
              <div className={novel.heroCopy}>
                <Link className={novel.backLink} href="/dashboard">Kembali</Link>
                <p className={novel.kicker}>Perasaan · Kenangan · Perjalanan Hati</p>
                <h1>{genre?.name || 'Romance'}</h1>
                <p>{genre?.description || 'Koleksi romance dengan kisah emosional, hubungan antarmanusia, dan perjalanan hati yang membekas.'}</p>
                <div className={novel.tags}>
                  <span>Romance</span><span>Emosional</span><span>Kisah Hati</span>
                </div>
                <div className={novel.romanceSignature} aria-hidden="true">
                  <span>♥</span><b>Setiap hati punya cerita</b>
                </div>
              </div>

              <div className={novel.bookStage}>
                <div className={novel.bookGlow} aria-hidden="true" />
                <div className={novel.loveLetter} aria-hidden="true"><span>Untukmu</span><i /></div>
                <div className={novel.romancePolaroid} aria-hidden="true"><span>sunset memories</span></div>
                <img src={featuredBook?.cover_url || '/images/novel/laut-bercerita.webp'} alt={`Sampul ${featuredBook?.title || 'Laut Bercerita'}`} />
                <div className={novel.heroPosterText}>
                  <span>Romance Library</span>
                  <b>{featuredBook?.title || 'Kisah yang Membekas'}</b>
                </div>
              </div>
            </section>

            <div className={novel.loveTicker} aria-label="Nuansa cerita romance">
              <div className={novel.loveTickerTrack}>
                <div className={novel.loveTickerGroup}>
                  <span>LOVE NOTES</span><i>♥</i><span>FIRST MEET</span><i>✦</i><span>SUNSET DATE</span><i>♥</i><span>HEARTFELT STORIES</span><i>✦</i>
                </div>
                <div className={novel.loveTickerGroup} aria-hidden="true">
                  <span>LOVE NOTES</span><i>♥</i><span>FIRST MEET</span><i>✦</i><span>SUNSET DATE</span><i>♥</i><span>HEARTFELT STORIES</span><i>✦</i>
                </div>
              </div>
            </div>

            <section className={novel.moodGrid} aria-label="Tema romance">
              <article><b>01</b><h3>Kisah Membekas</h3><p>Cerita panjang tentang rasa, manusia, dan kenangan yang tinggal setelah halaman berakhir.</p></article>
              <article><b>02</b><h3>Nuansa Romance</h3><p>Palet blush, burgundy, bunga, dan sentuhan hangat seperti surat cinta.</p></article>
              <article><b>03</b><h3>Baca Langsung</h3><p>Buku Romance bisa langsung dibaca di BacaPop tanpa mengunduh PDF.</p></article>
            </section>

            <section className={novel.collection} id="koleksi">
              <div className={novel.sectionHead}>
                <div><p>Koleksi Romance</p><h2>Kisah Pilihan</h2></div>
                <span>{books.length} buku</span>
              </div>
              {notice ? <div className={novel.notice}>{notice}</div> : null}
              {loading ? (
                <div className={novel.empty}>Memuat buku Romance...</div>
              ) : books.length ? (
                <div className={novel.bookGrid}>{books.map((book) => <NovelBookCard book={book} premiumUnlocked={premiumUnlocked} paidRomanceUnlocked={paidRomanceUnlocked} key={book.id} />)}</div>
              ) : (
                <div className={novel.empty}>Belum ada romance aktif untuk ditampilkan.</div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function NovelBookCard({book, premiumUnlocked, paidRomanceUnlocked}) {
  const premium = isPremiumBook(book);
  const paid = isPaidBook(book);
  const locked = premium && !premiumUnlocked;
  const paidLocked = paid && !paidRomanceUnlocked;
  const protectedBook = premium || paid;

  return (
    <article className={`${novel.bookCard} ${protectedBook ? novel.premiumBorderCard : ''} ${paid ? novel.paidBookCard : ''}`}>
      <div className={novel.cover}>
        <img src={book.cover_url || '/images/novel/laut-bercerita.webp'} alt={`Sampul ${book.title}`} />
        <span>{paid
          ? paidLocked ? 'BERBAYAR · RP1.000' : 'SUDAH DIMILIKI'
          : locked ? 'PREMIUM ROMANCE · TERKUNCI' : premium ? 'PREMIUM ROMANCE · TERBUKA' : 'ROMANCE'}</span>
        {locked || paidLocked ? <div className={novel.premiumLockBadge} aria-hidden="true">🔒</div> : null}
      </div>
      <div className={novel.cardCopy}>
        <p>{paid ? 'Premium Berbayar' : premium ? 'Buku Premium Romance' : 'Cerita Romance'}</p>
        <h3>{book.title}</h3>
        <b>{book.author || 'BacaPop Romance Library'}</b>
        <span>{book.description || 'Romance pilihan untuk menemani waktu membaca.'}</span>
        <div className={novel.cardActions}>
          <Link href={paidLocked ? '/dashboard/store#katalog' : locked ? '/dashboard/rewards#hadiah' : `/dashboard/read/${book.id}`}>
            {paidLocked ? 'Beli Rp1.000' : locked ? 'Tukar 750 Poin' : 'Buka Buku'} <span>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function DongengGenreView({books, genre, genres, loading, notice, paidAccessByBook, router, slug}) {
  return (
    <main className={dongeng.page}>
      <div className={dongeng.backgroundOrnaments} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={dongeng.leafFall} aria-hidden="true">
        {Array.from({length: 12}, (_, index) => <i key={index} />)}
      </div>

      <div className={dongeng.wrap}>
        <header className={dongeng.topbar}>
          <Link className={dongeng.brand} href="/dashboard">
            <span>B</span>
            <b>BacaPop!</b>
          </Link>
          <div className={dongeng.headerStory} aria-hidden="true">
            <DongengStoryCanvas className={dongeng.headerStoryCanvas} />
            <span className={dongeng.headerStoryTitle}>ISTANA DAUN</span>
            <span className={dongeng.headerStoryPalace}><b /><i /><em /></span>
            <i className={dongeng.headerStoryMoon} />
            <i className={`${dongeng.headerStoryCloud} ${dongeng.headerStoryCloudOne}`} />
            <i className={`${dongeng.headerStoryCloud} ${dongeng.headerStoryCloudTwo}`} />
            <span className={dongeng.headerStoryGround} />
            <i className={`${dongeng.headerStoryComet} ${dongeng.headerStoryCometOne}`} />
            <i className={`${dongeng.headerStoryComet} ${dongeng.headerStoryCometTwo}`} />
            <i className={`${dongeng.headerStoryButterfly} ${dongeng.headerStoryButterflyOne}`} />
            <i className={`${dongeng.headerStoryButterfly} ${dongeng.headerStoryButterflyTwo}`} />
          </div>
          <nav>
            <Link href="/dashboard">Beranda</Link>
            <a href="#koleksi">Koleksi</a>
            <button onClick={() => logoutFromDashboard(router)}>Keluar</button>
          </nav>
        </header>

        <section className={dongeng.layout}>
          <aside className={dongeng.sidebar}>
            <p>Genre Buku</p>
            <h2>Pilih genre</h2>
            <nav aria-label="Filter genre buku">
              {genres.map((item) => (
                <Link
                  href={`/dashboard/genres/${item.slug}`}
                  className={item.slug === slug ? dongeng.activeGenre : dongeng.genreItem}
                  key={item.slug}
                >
                  <span>{item.slug === 'dongeng' ? 'DG' : item.icon || item.name.slice(0, 2).toUpperCase()}</span>
                  <b>{item.name}</b>
                </Link>
              ))}
            </nav>
          </aside>

          <div className={dongeng.main}>
            <section className={dongeng.hero} data-tour="genre-hero">
              <div className={dongeng.heroCopy}>
                <Link className={dongeng.backLink} href="/dashboard">
                  Kembali
                </Link>
                <p className={dongeng.kicker}>Cerita dari Istana Daun</p>
                <h1>Dongeng</h1>
                <p className={dongeng.description}>
                  {genre?.description || 'Kumpulan cerita dongeng anak yang ringan, imajinatif, dan cocok untuk latihan membaca.'}
                </p>
                <div className={dongeng.heroActions}>
                  <a href="#koleksi">Jelajahi Koleksi <span aria-hidden="true">&rarr;</span></a>
                  {books[0] ? <Link href={`/dashboard/read/${books[0].id}`}>Mulai Membaca</Link> : null}
                </div>
                <div className={dongeng.heroMeta}>
                  <div className={dongeng.tags}>
                    <span>Cerita Rakyat</span>
                    <span>Cerita Anak</span>
                    <span>Pesan Moral</span>
                  </div>
                  <div className={dongeng.countCard}>
                    <b>{books.length}</b>
                    <span>buku tersedia</span>
                  </div>
                </div>
              </div>

              <div className={dongeng.coverStage} aria-hidden="true">
                <div className={dongeng.forestFrame}>
                  <div className={dongeng.forestHeader}>
                    <span>Kerajaan Hijau</span>
                    <b>Istana Daun</b>
                  </div>
                  <img className={dongeng.forestArt} src="/images/dongeng/kingdom-v3/leaf-palace-landscape-v2.png" alt="" />
                  <DongengMagicPortal className={dongeng.magicPortalCanvas} />
                  <div className={dongeng.magicDots}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className={dongeng.forestCaption}>
                    <strong>Masuki Istana Daun</strong>
                    <span>Daun, cahaya, dan kisah yang hidup</span>
                  </div>
                </div>
              </div>
            </section>

            <div className={dongeng.fairyTicker} aria-label="Nuansa cerita dongeng">
              <div>
                <span>ONCE UPON A TIME</span><i>✦</i><span>HUTAN AJAIB</span><i>☾</i><span>PETUALANGAN KANCIL</span><i>❦</i><span>PESAN MORAL</span><i>✦</i>
                <span>ONCE UPON A TIME</span><i>✦</i><span>HUTAN AJAIB</span><i>☾</i><span>PETUALANGAN KANCIL</span><i>❦</i><span>PESAN MORAL</span><i>✦</i>
              </div>
            </div>

            <section className={dongeng.fairyHighlights} aria-label="Nuansa dongeng">
              <article>
                <span>01</span>
                <h3>Tokoh Cerita</h3>
                <p>Kancil, putri, raksasa, dan sahabat hutan yang dekat dengan dunia anak.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Hutan Ajaib</h3>
                <p>Suasana petualangan yang hangat, imajinatif, dan terasa seperti buku cerita.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Pesan Moral</h3>
                <p>Cerita ringan dengan nilai keberanian, kebaikan, dan kejujuran.</p>
              </article>
            </section>

            <section className={dongeng.collection} id="koleksi" data-tour="genre-collection">
              <div className={dongeng.sectionHead}>
                <div>
                  <p>Koleksi BacaPop</p>
                  <h2>Rekomendasi Dongeng</h2>
                </div>
                <span>{books.length} buku</span>
              </div>

              {notice ? <div className={dongeng.notice}>{notice}</div> : null}

              {loading ? (
                <div className={dongeng.empty}>Memuat koleksi dongeng...</div>
              ) : books.length ? (
                <div className={dongeng.bookGrid}>
                  {books.map((book) => (
                    <DongengBookCard book={book} paidAccessByBook={paidAccessByBook} key={book.id} />
                  ))}
                </div>
              ) : (
                <div className={dongeng.empty}>Belum ada buku dongeng aktif untuk ditampilkan.</div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function DongengBookCard({book, paidAccessByBook}) {
  const paid = isPaidBook(book);
  const paidLocked = paid && !paidAccessByBook[getPaidBookKey(book)]?.unlocked;
  return (
    <article className={`${dongeng.bookCard} ${paid ? dongeng.premiumFairytaleCard : ''}`} data-unlocked={paid && !paidLocked}>
      <DongengBookCover book={book} />
      <div className={dongeng.cardCopy}>
        {paid ? (
          <div className={dongeng.premiumFairytaleBadge}>
            <i aria-hidden="true">❦</i>
            <span><small>KOLEKSI KERAJAAN</small><b>PREMIUM DONGENG</b></span>
            <i aria-hidden="true">❦</i>
          </div>
        ) : <p>Dongeng</p>}
        <h3>{book.title}</h3>
        <span>{book.author || 'BacaPop Library'}</span>
        <Link href={paidLocked ? '/dashboard/store#katalog' : `/dashboard/read/${book.id}`}>
          {paidLocked ? 'Beli Rp1.000' : 'Baca'}
        </Link>
      </div>
    </article>
  );
}

function DongengBookCover({book, large = false}) {
  const coverUrl = book.cover_url || '/images/dongeng/kumpulan-cerita-dongeng-anak-2.png';

  return (
    <div className={large ? dongeng.realCoverLarge : dongeng.realCover}>
      <img src={coverUrl} alt={`Sampul ${book.title}`} />
    </div>
  );
}
