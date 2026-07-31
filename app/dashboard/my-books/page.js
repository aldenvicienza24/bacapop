'use client';

import Link from 'next/link';
import {Suspense, useEffect, useMemo, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {supabase} from '../../lib/supabase';
import {getDashboardUser} from '../auth';
import styles from './my-books.module.css';

const tabs = [
  {key: 'reading', label: 'Sedang Dibaca'},
  {key: 'finished', label: 'Buku Selesai'},
  {key: 'summary', label: 'Riwayat Ringkasan'},
];

function formatSummaryDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}).format(new Date(value));
}

export default function MyBooksPage() {
  return <Suspense fallback={<main className={styles.page}><div className={styles.empty}>Menyiapkan buku kamu...</div></main>}><MyBooksContent /></Suspense>;
}

function MyBooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = tabs.some((tab) => tab.key === searchParams.get('status')) ? searchParams.get('status') : 'reading';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      setNotice('');
      const user = await getDashboardUser(router);
      if (!user) return;

      const table = active === 'summary' ? 'summaries' : 'reading_progress';
      let query = supabase.from(table).select('*').eq('user_id', user.id);
      if (active === 'summary') query = query.order('submitted_at', {ascending: false});
      if (active === 'finished') query = query.eq('is_finished', true).order('updated_at', {ascending: false});
      if (active === 'reading') query = query.eq('is_finished', false).gt('current_page', 0).order('updated_at', {ascending: false});

      const {data: rows, error} = await query;
      if (error) {
        setNotice('Data bacaan belum dapat dimuat. Pastikan migrasi Sprint 3 sudah dijalankan.');
        setItems([]);
        setLoading(false);
        return;
      }

      const ids = [...new Set((rows || []).map((row) => row.book_id))];
      if (!ids.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      const {data: books, error: booksError} = await supabase
        .from('books')
        .select('id,title,author,cover_url,description,genres(name,slug,accent_color)')
        .in('id', ids);
      if (booksError) setNotice('Detail buku belum dapat dimuat.');
      const bookMap = Object.fromEntries((books || []).map((book) => [book.id, book]));
      setItems((rows || []).map((row) => ({...row, book: bookMap[row.book_id]})).filter((item) => item.book));
      setLoading(false);
    }
    loadItems();
  }, [active, router]);

  const title = useMemo(() => tabs.find((tab) => tab.key === active)?.label || 'Buku Saya', [active]);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}><Link href="/dashboard">Baca<span>Pop!</span></Link><nav><Link href="/dashboard">Beranda</Link><Link href="/dashboard/profile">Profil</Link></nav></header>
      <section className={styles.hero}>
        <div><span>BUKU SAYA</span><h1>{title}</h1><p>{active === 'summary' ? 'Lihat semua ringkasan, hasil pemeriksaan admin, dan poin yang didapat.' : 'Pilih buku untuk melanjutkan membaca.'}</p></div>
        <b>{items.length}<small>{active === 'summary' ? 'ringkasan' : 'buku'}</small></b>
      </section>
      <nav className={styles.tabs} aria-label="Filter buku saya">{tabs.map((tab) => <Link className={active === tab.key ? styles.activeTab : ''} href={`/dashboard/my-books?status=${tab.key}`} key={tab.key}>{tab.label}</Link>)}</nav>
      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {loading ? <div className={styles.empty}>Memuat buku kamu...</div> : items.length ? (
        <section className={styles.grid}>{items.map((item) => {
          const book = item.book;
          const progress = Number(item.progress_percent || 0);
          return <article
            className={`${styles.card} ${active === 'summary' ? styles.summaryCard : ''}`}
            key={item.id}
            style={{'--book-accent': book.genres?.accent_color || '#415cff'}}
          >
            <div className={styles.cover}>{book.cover_url ? <img src={book.cover_url} alt={`Sampul ${book.title}`} /> : <span>{book.title.slice(0, 2).toUpperCase()}</span>}<i>{book.genres?.name || 'Buku'}</i></div>
            <div className={styles.copy}><small>{book.author || 'BacaPop Library'}</small><h2>{book.title}</h2>
              {active === 'reading' ? <><div className={styles.progress}><i style={{width: `${progress}%`}} /></div><p>{Math.round(progress)}% selesai · halaman {item.current_page}</p></> : null}
              {active === 'finished' ? <p>Buku sudah selesai dibaca. Ringkasan siap ditulis atau dilihat.</p> : null}
              {active === 'summary' ? <div className={styles.summaryHistory}>
                <span className={styles.summaryStatus} data-status={item.status}>{item.status === 'valid' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</span>
                <h3>{item.title || 'Ringkasan tanpa judul'}</h3>
                <p>{item.summary_text}</p>
                <details><summary>Lihat ringkasan lengkap</summary><p>{item.summary_text}</p></details>
                <dl>
                  <div><dt>Dikirim</dt><dd>{formatSummaryDate(item.submitted_at)}</dd></div>
                  {item.validated_at ? <div><dt>Diperiksa</dt><dd>{formatSummaryDate(item.validated_at)}</dd></div> : null}
                  <div><dt>Poin</dt><dd>+{item.points_awarded || 0} poin</dd></div>
                </dl>
                {item.admin_note ? <blockquote><b>Catatan admin</b>{item.admin_note}</blockquote> : null}
              </div> : null}
              <Link href={active === 'reading' ? `/dashboard/read/${book.id}` : `/dashboard/books/${book.id}`}>{active === 'reading' ? 'Lanjut Membaca' : 'Lihat Detail'} <b>→</b></Link>
            </div>
          </article>;
        })}</section>
      ) : <div className={styles.empty}><b>Belum ada {title.toLowerCase()}</b><p>Mulai membaca dan kemajuanmu akan muncul di sini.</p><Link href="/dashboard#koleksi">Cari Buku</Link></div>}
    </main>
  );
}
