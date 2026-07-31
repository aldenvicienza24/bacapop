'use client';

import Link from 'next/link';
import {getPremiumRewardId, isPremiumBook, PREMIUM_HORROR_REWARD_ID} from '../../lib/premiumBooks';
import {getPaidBookKey, isPaidBook} from '../../lib/paidBooks';
import styles from '../main-dashboard.module.css';

export function DashboardBookSection({books, notice, loading, premiumUnlocked = false, premiumHorrorUnlocked = false, paidAccessByBook = {}}) {
  const visibleBooks = books.slice(0, 12);

  return (
    <section className={styles.bookShelf} id="koleksi" data-tour="collection">
      <header className={styles.bookShelfHeader}>
        <div>
          <span>Semua buku</span>
          <h2>Koleksi perpustakaan</h2>
          <p>Semua bacaan tersusun rapi dan siap dibuka.</p>
        </div>
        <b>{String(visibleBooks.length).padStart(2, '0')}</b>
      </header>

      {notice && <div className={styles.shelfNotice}>{notice}</div>}

      {loading ? (
        <div className={styles.shelfEmpty}>Memuat rekomendasi buku...</div>
      ) : visibleBooks.length ? (
        <div className={styles.bookList} aria-label="Daftar koleksi buku">
          {visibleBooks.map((book, index) => (
            <DashboardBookCard book={book} index={index} premiumUnlocked={premiumUnlocked} premiumHorrorUnlocked={premiumHorrorUnlocked} paidAccessByBook={paidAccessByBook} key={book.id} />
          ))}
        </div>
      ) : (
        <div className={styles.shelfEmpty}>Belum ada buku aktif untuk ditampilkan.</div>
      )}
    </section>
  );
}

function DashboardBookCard({book, index, premiumUnlocked, premiumHorrorUnlocked, paidAccessByBook}) {
  const genre = book.genres || {};
  const shortTitle = book.title?.slice(0, 2).toUpperCase() || 'BP';
  const fallbackCover = genre.slug === 'horror'
    ? '/images/horror/rumah-terkutuk.jfif'
    : genre.slug === 'dongeng'
      ? '/images/dongeng/kumpulan-cerita-dongeng-anak-2.png'
      : '';
  const coverUrl = book.cover_url || fallbackCover;
  const bookUnlocked = getPremiumRewardId(book) === PREMIUM_HORROR_REWARD_ID ? premiumHorrorUnlocked : premiumUnlocked;
  const locked = isPremiumBook(book) && !bookUnlocked;
  const paidLocked = isPaidBook(book) && !paidAccessByBook[getPaidBookKey(book)]?.unlocked;
  const target = paidLocked ? '/dashboard/store#katalog' : locked ? '/dashboard/rewards#hadiah' : `/dashboard/read/${book.id}`;

  return (
    <article data-tour={index === 0 ? 'book-card' : undefined} className={`${styles.bookRow} ${isPremiumBook(book) || isPaidBook(book) ? styles.premiumBookCard : ''} ${(isPremiumBook(book) || isPaidBook(book)) && genre.slug === 'horror' ? styles.premiumHorrorBook : ''} ${(isPremiumBook(book) || isPaidBook(book)) && genre.slug === 'novel' ? styles.premiumRomanceBook : ''} ${locked || paidLocked ? styles.premiumBookLocked : ''}`} style={{'--book-accent': genre.accent_color || '#caff4a'}}>
      <div className={styles.bookCoverWrap}>
        <span className={styles.bookNumber}>{String(index + 1).padStart(2, '0')}</span>
        <Link className={`${styles.bookThumb} ${genre.slug === 'komik' ? styles.comicBookThumb : ''} ${isPremiumBook(book) || isPaidBook(book) ? styles.premiumPortraitThumb : ''}`} href={target}>
          {coverUrl ? (
            <img src={coverUrl} alt={`Sampul ${book.title}`} />
          ) : (
            <span>{shortTitle}</span>
          )}
          {locked || paidLocked ? <b className={styles.bookLock} aria-hidden="true">🔒</b> : null}
        </Link>
      </div>
      <div className={styles.bookInfo}>
        <Link href={target}>{book.title}</Link>
        <span>{book.author || 'Penulis tidak dicantumkan'}</span>
      </div>
      <div className={styles.bookMeta}>
        <span className={styles.bookGenre}>{isPaidBook(book) ? `Berbayar Rp1.000 · ${paidLocked ? 'Belum dibeli' : 'Dimiliki'}` : isPremiumBook(book) ? `${genre.slug === 'horror' ? 'Premium Horror' : 'Premium Romance'}${locked ? ' · Terkunci' : ' · Terbuka'}` : genre.name || 'Pilihan'}</span>
        <span className={styles.bookPages}>{book.page_count ? `${book.page_count} hlm` : 'Siap dibaca'}</span>
      </div>
      <Link className={styles.bookAction} href={target} aria-label={paidLocked ? `Beli ${book.title}` : locked ? `Tukar poin untuk membuka ${book.title}` : `Baca ${book.title}`}>
        {paidLocked ? 'Beli Rp1.000' : locked ? 'Tukar poin' : 'Mulai baca'} <span aria-hidden="true">&rarr;</span>
      </Link>
    </article>
  );
}
