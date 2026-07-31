'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {getPremiumRewardId, isPremiumBook, PREMIUM_HORROR_REWARD_ID} from '../../lib/premiumBooks';
import {getPaidBookKey, isPaidBook} from '../../lib/paidBooks';
import styles from './book-search.module.css';

export function BookSearch({books, open, premiumUnlocked, premiumHorrorUnlocked, paidAccessByBook = {}, onClose}) {
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('all');

  const genres = useMemo(() => {
    const unique = new Map();
    books.forEach((book) => {
      const slug = book.genres?.slug;
      if (slug && !unique.has(slug)) unique.set(slug, {slug, name: book.genres?.name || slug});
    });
    return [...unique.values()];
  }, [books]);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesGenre = activeGenre === 'all' || book.genres?.slug === activeGenre;
      const searchable = `${book.title || ''} ${book.author || ''} ${book.genres?.name || ''}`.toLowerCase();
      return matchesGenre && (!keyword || searchable.includes(keyword));
    }).slice(0, 12);
  }, [activeGenre, books, query]);

  useEffect(() => {
    if (!open) return undefined;
    function closeWithEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, [onClose, open]);

  if (!open) return null;

  function resetSearch() {
    setQuery('');
    setActiveGenre('all');
  }

  return (
    <div className={styles.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.panel} role="dialog" aria-modal="true" aria-label="Cari bacaan">
        <div className={styles.topRail}>
          <div><b>B</b><span>BACAPOP SEARCH ENGINE</span></div>
          <p><i /> LIVE CATALOG <i /></p>
          <button type="button" onClick={onClose} aria-label="Tutup pencarian">×</button>
        </div>

        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span>CARI · PILIH · BACA</span>
            <h2>Cari buku<span>!</span></h2>
            <p>Judul, penulis, atau genre favoritmu.</p>
          </div>

          <label className={styles.searchBox}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ketik judul, penulis, atau genre..." />
            {query ? <button type="button" onClick={() => setQuery('')} aria-label="Hapus pencarian">×</button> : <kbd>ESC</kbd>}
          </label>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filters} aria-label="Filter genre">
            <button data-active={activeGenre === 'all'} type="button" onClick={() => setActiveGenre('all')}>Semua</button>
            {genres.slice(0, 6).map((genre) => (
              <button data-active={activeGenre === genre.slug} type="button" onClick={() => setActiveGenre(genre.slug)} key={genre.slug}>{genre.name}</button>
            ))}
          </div>
          <div className={styles.counter}><b>{String(results.length).padStart(2, '0')}</b><span>BUKU<br />DITEMUKAN</span></div>
        </div>

        <div className={styles.results} aria-live="polite">
          {results.length ? results.map((book, index) => {
            const bookUnlocked = getPremiumRewardId(book) === PREMIUM_HORROR_REWARD_ID ? premiumHorrorUnlocked : premiumUnlocked;
            const locked = isPremiumBook(book) && !bookUnlocked;
            const paidLocked = isPaidBook(book) && !paidAccessByBook[getPaidBookKey(book)]?.unlocked;
            const target = paidLocked ? '/dashboard/store#katalog' : locked ? '/dashboard/rewards#hadiah' : `/dashboard/read/${book.id}`;
            return (
              <Link className={`${styles.card} ${isPremiumBook(book) ? styles.premiumCard : ''} ${isPremiumBook(book) && book.genres?.slug === 'horror' ? styles.premiumHorrorCard : ''} ${isPremiumBook(book) && book.genres?.slug === 'novel' ? styles.premiumRomanceCard : ''}`} href={target} onClick={onClose} style={{'--result-order': index, '--book-color': book.genres?.accent_color || '#74e2bf'}} key={book.id}>
                <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.cover}>
                  {book.cover_url
                    ? <img src={book.cover_url} alt={`Sampul ${book.title}`} />
                    : <b>{book.title?.slice(0, 2).toUpperCase() || 'BP'}</b>}
                </span>
                <span className={styles.info}>
                  <small>{isPaidBook(book) ? `Berbayar Rp1.000 · ${paidLocked ? 'Belum dibeli' : 'Dimiliki'}` : isPremiumBook(book) ? `${book.genres?.slug === 'horror' ? 'Premium Horror' : 'Premium Romance'}${locked ? ' · Terkunci' : ' · Terbuka'}` : book.genres?.name || 'Pilihan BacaPop'}</small>
                  <strong>{book.title}</strong>
                  <em>{book.author || 'Penulis tidak dicantumkan'}</em>
                  <span>{book.page_count ? `${book.page_count} halaman` : 'Siap dibaca'}</span>
                </span>
                <span className={styles.action}>{paidLocked ? 'BELI RP1.000' : locked ? 'TUKAR POIN' : 'BUKA BUKU'} <i aria-hidden="true">→</i></span>
              </Link>
            );
          }) : (
            <div className={styles.empty}>
              <span aria-hidden="true">?</span>
              <div><b>Buku belum ditemukan</b><p>Coba kata lain atau tampilkan kembali semua buku.</p></div>
              <button type="button" onClick={resetSearch}>Reset pencarian</button>
            </div>
          )}
        </div>

        <footer><span>TIP: Cari menggunakan nama penulis untuk hasil lebih spesifik.</span><b>{query.trim() ? `“${query.trim()}”` : 'SEMUA KOLEKSI'}</b></footer>
      </section>
    </div>
  );
}
