'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import AdminShell from './components/AdminShell';
import {supabase} from '../lib/supabase';
import {readableTextColor} from '../lib/colorContrast';
import styles from './dashboard.module.css';

const actions = [
  ['+ Tambah Genre', '/admin/genres/new', '#D9FF19'],
  ['+ Tambah Buku', '/admin/books/new', '#FFFFFF'],
  ['✓ Periksa Ringkasan', '/admin/summaries', '#FFCF3B'],
  ['Rp Review Pembayaran', '/admin/purchases', '#FF84B2'],
];

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}).format(new Date(value));
}

export default function AdminPage() {
  const [genres, setGenres] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [counts, setCounts] = useState({books: 0, users: 0, purchases: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    const [genreResult, bookResult, userResult, purchaseResult, summaryResult] = await Promise.all([
      supabase.from('genres').select('id,name,theme_name,theme_color,accent_color,icon,is_active', {count: 'exact'}).eq('is_active', true).order('name'),
      supabase.from('books').select('id', {count: 'exact', head: true}),
      supabase.from('profiles').select('id', {count: 'exact', head: true}).neq('role', 'admin'),
      supabase.from('book_purchases').select('id', {count: 'exact', head: true}),
      supabase.rpc('admin_get_summary_queue'),
    ]);

    const failures = [genreResult, bookResult, userResult].filter((result) => result.error);
    if (failures.length) {
      setError('Sebagian statistik belum dapat dibaca dari Supabase. Periksa policy admin dan migrasi database.');
    }

    setGenres(genreResult.data || []);
    setSummaries(Array.isArray(summaryResult.data) ? summaryResult.data : []);
    setCounts({
      books: bookResult.count || 0,
      users: userResult.count || 0,
      purchases: purchaseResult.count || 0,
    });
    setLoading(false);
  }

  useEffect(() => { loadDashboard(); }, []);

  const summaryStats = useMemo(() => ({
    pending: summaries.filter((item) => item.status === 'pending').length,
    valid: summaries.filter((item) => item.status === 'valid').length,
  }), [summaries]);

  const stats = [
    ['Total Genre', genres.length, 'DG', '#D9FF19'],
    ['Total Buku', counts.books, 'BK', '#FFFFFF'],
    ['Ringkasan Menunggu', summaryStats.pending, '…', '#FFCF3B'],
    ['Ringkasan Disetujui', summaryStats.valid, '✓', '#70E89B'],
    ['Total User', counts.users, 'US', '#A8D5FF'],
    ['Pembayaran QRIS', counts.purchases, 'Rp', '#FF84B2'],
  ];

  const pendingSummaries = summaries.filter((item) => item.status === 'pending').slice(0, 5);

  return (
    <AdminShell title="Beranda Admin" subtitle="Kelola buku, pengguna, pembayaran, dan ringkasan dari satu halaman.">
      {error ? <div className={styles.dashboardError}>{error}</div> : null}

      <section className={styles.stats} aria-label="Statistik BacaPop" aria-busy={loading}>
        {stats.map(([label, value, icon, color]) => (
          <article className={styles.statCard} style={{'--card-color': color}} key={label}>
            <div><span>{label}</span><strong>{loading ? '—' : value}</strong></div>
            <i>{icon}</i>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div><span>MENU CEPAT</span><h2>Kelola BacaPop</h2></div>
          <button className={styles.refreshButton} type="button" onClick={loadDashboard} disabled={loading}>
            {loading ? 'Memuat...' : 'Muat ulang'}
          </button>
        </div>
        <div className={styles.quickActions}>
          {actions.map(([label, href, color]) => (
            <Link href={href} style={{'--action-color': color}} key={label}>{label}<b>→</b></Link>
          ))}
        </div>
      </section>

      <div className={styles.contentGrid}>
        <section className={`${styles.section} ${styles.pendingSection}`}>
          <div className={styles.sectionHeading}>
            <div><span>PERLU DIPERIKSA</span><h2>Ringkasan yang Menunggu</h2></div>
            <span className={styles.countBadge}>{summaryStats.pending} menunggu</span>
          </div>
          {loading ? <div className={styles.loadingPanel}>Memuat ringkasan...</div> : !pendingSummaries.length ? (
            <div className={styles.loadingPanel}>Tidak ada ringkasan yang sedang menunggu.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Nama Pengguna</th><th>Judul Buku</th><th>Tanggal</th><th>Status</th><th>Tindakan</th></tr></thead>
                <tbody>{pendingSummaries.map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.profile?.full_name || item.profile?.email || 'Pembaca BacaPop'}</b></td>
                    <td>{item.books?.title || item.title || '-'}</td>
                    <td>{formatDate(item.submitted_at)}</td>
                    <td><span className={styles.pendingBadge}>Menunggu</span></td>
                    <td><Link className={styles.detailButton} href="/admin/summaries">Periksa</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div><span>TEMA KOLEKSI</span><h2>Genre Aktif</h2></div>
            <Link href="/admin/genres">Lihat semua →</Link>
          </div>
          <div className={styles.genreGrid}>
            {genres.map((genre) => (
              <article className={styles.genreCard} style={{
                '--genre-color': genre.theme_color || '#fff',
                '--genre-accent': genre.accent_color || '#ffe45e',
                '--genre-foreground': readableTextColor(genre.theme_color),
                '--genre-accent-foreground': readableTextColor(genre.accent_color),
              }} key={genre.id}>
                <span className={styles.genreIcon}>{genre.icon || genre.name.slice(0, 2).toUpperCase()}</span>
                <div><h3>{genre.name}</h3><p>{genre.theme_name || 'Tema koleksi'}</p></div>
                <i />
              </article>
            ))}
            {!loading && !genres.length ? <div className={styles.loadingPanel}>Belum ada genre aktif.</div> : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
