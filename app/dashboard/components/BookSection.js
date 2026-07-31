'use client';

import Link from 'next/link';
import {supabase} from '../../lib/supabase';
import {normalizeGenreLabel} from '../../lib/defaultGenres';
import styles from '../user-dashboard.module.css';

export function BookSection({books, notice, loading, title, subtitle, variant = 'cards'}) {
  const isDashboard = variant === 'dashboard';

  return (
    <section className={`${styles.libraryPanel} ${isDashboard ? styles.dashboardLibrary : ''}`} id="koleksi">
      <div className={styles.libraryTop}>
        <div className={styles.libraryHeadingCopy}>
          <span className={styles.libraryEyebrow}>Koleksi pilihan</span>
          <h2>{title || 'Rekomendasi untukmu'}</h2>
          {subtitle ? <p>{subtitle}</p> : <p>Pilih buku yang menarik perhatianmu dan mulai membaca.</p>}
        </div>
        <div className={styles.libraryCount} aria-label={`${books.length} buku tersedia`}>
          <b>{books.length}</b>
          <span>buku</span>
        </div>
      </div>

      {notice && <div className={styles.message}>{notice}</div>}

      {loading ? (
        <div className={styles.empty}>Memuat koleksi buku...</div>
      ) : books.length ? (
        <div className={isDashboard ? styles.dashboardBookList : styles.libraryGrid}>
          {books.map((book) => (
            isDashboard ? <DashboardBookRow book={book} key={book.id} /> : <LibraryBookCard book={book} key={book.id} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Belum ada buku aktif untuk ditampilkan.</div>
      )}
    </section>
  );
}

function DashboardBookRow({book}) {
  const genre = book.genres || {};

  return (
    <article className={styles.dashboardBookRow} style={{'--book-accent': genre.accent_color || '#a66cff'}}>
      <Link className={styles.dashboardBookCover} href={`/dashboard/read/${book.id}`}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={`Sampul ${book.title}`} />
        ) : (
          <BookCover title={book.title} author={book.author} genre={genre} />
        )}
      </Link>
      <div className={styles.dashboardBookInfo}>
        <Link href={`/dashboard/read/${book.id}`}>{book.title}</Link>
        <span>{book.author || 'Penulis tidak dicantumkan'}</span>
      </div>
      <span className={styles.dashboardBookGenre}>{genre.name || 'Buku'}</span>
      <span className={styles.dashboardBookPages}>{book.page_count ? `${book.page_count} halaman` : 'Siap dibaca'}</span>
      <Link className={styles.dashboardBookAction} href={`/dashboard/read/${book.id}`}>
        Baca <span aria-hidden="true">&rarr;</span>
      </Link>
    </article>
  );
}

function LibraryBookCard({book}) {
  const genre = book.genres || {};

  return (
    <article
      className={styles.libraryBookCard}
      style={{'--book-color': genre.theme_color || '#fff', '--book-accent': genre.accent_color || '#ff7048'}}
    >
      <Link className={styles.libraryCoverLink} href={`/dashboard/read/${book.id}`}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={`Sampul ${book.title}`} />
        ) : (
          <BookCover title={book.title} author={book.author} genre={genre} />
        )}
      </Link>
      <div className={styles.libraryBookCopy}>
        <span className={styles.libraryGenre}>{genre.name || 'Pilihan BacaPop'}</span>
        <Link className={styles.libraryTitle} href={`/dashboard/read/${book.id}`}>
          {book.title}
        </Link>
        <p>{book.author || 'Penulis tidak dicantumkan'}</p>
        <Link className={styles.libraryReadLink} href={`/dashboard/read/${book.id}`} aria-label={`Baca ${book.title}`}>
          Baca sekarang <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function FeaturedBook({book}) {
  const genre = book.genres || {};

  return (
    <article
      className={styles.featuredBook}
      style={{'--book-color': genre.theme_color || '#fff', '--book-accent': genre.accent_color || '#D9FF19'}}
    >
      <div className={styles.featuredCover}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={`Sampul ${book.title}`} />
        ) : (
          <BookCover title={book.title} author={book.author} genre={genre} featured />
        )}
      </div>
      <div className={styles.featuredCopy}>
        <small>{genre.name || 'Rekomendasi utama'}</small>
        <h3>{book.title}</h3>
        <p>{book.description || book.author || 'Buku pilihan dari BacaPop.'}</p>
        <div>
          <b>{book.author || 'Penulis tidak dicantumkan'}</b>
          <span>{book.page_count} halaman</span>
        </div>
        <Link className={styles.readButton} href={`/dashboard/read/${book.id}`}>
          Mulai Baca
        </Link>
      </div>
    </article>
  );
}

function BookCard({book}) {
  const genre = book.genres || {};

  return (
    <article
      className={styles.bookCard}
      style={{'--book-color': genre.theme_color || '#fff', '--book-accent': genre.accent_color || '#D9FF19'}}
    >
      <div className={styles.cover}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={`Sampul ${book.title}`} />
        ) : (
          <BookCover title={book.title} author={book.author} genre={genre} />
        )}
      </div>
      <div className={styles.bookCopy}>
        <small>{genre.name || 'Buku'}</small>
        <h3>{book.title}</h3>
        <p>{book.author || 'Penulis tidak dicantumkan'}</p>
        <span>{book.page_count} halaman</span>
        <Link className={styles.cardReadLink} href={`/dashboard/read/${book.id}`}>
          Baca
        </Link>
      </div>
    </article>
  );
}

function BookCover({title, author, genre, featured = false}) {
  const isDongeng = genre.slug === 'dongeng';
  const isHorror = genre.slug === 'horror';

  return (
    <div className={`${styles.generatedCover} ${featured ? styles.generatedCoverLarge : ''} ${isDongeng ? styles.dongengCover : ''} ${isHorror ? styles.horrorCover : ''}`}>
      <span>{isDongeng ? 'DG' : isHorror ? 'HR' : genre.icon || 'B'}</span>
      <h4>{title}</h4>
      <p>{author || 'BacaPop Library'}</p>
    </div>
  );
}

export async function withPageCounts(books) {
  const seenTitles = new Set();
  const uniqueBooks = books.filter((book) => {
    const key = book.title?.trim().toLowerCase();
    if (!key || seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });
  const ids = uniqueBooks.map((book) => book.id);
  const counts = {};

  if (ids.length) {
    const {data: pages} = await supabase.from('book_pages').select('book_id').in('book_id', ids);
    pages?.forEach((page) => {
      counts[page.book_id] = (counts[page.book_id] || 0) + 1;
    });
  }

  return uniqueBooks.map((book) => ({
    ...book,
    cover_url: ({
      'dragon ball vol. 1': '/images/comic/dragon-ball/cover.webp',
      'dragon ball vol. 2': '/images/comic/dragon-ball-02/cover.webp',
      'dragon ball vol. 3': '/images/comic/dragon-ball-03/cover.webp',
    })[book.title?.trim().toLowerCase()] || book.cover_url,
    genres: normalizeGenreLabel(book.genres),
    page_count: counts[book.id] || 0,
  }));
}
