'use client';

import {useEffect, useMemo, useState} from 'react';
import AdminShell from '../components/AdminShell';
import {supabase} from '../../lib/supabase';
import {readableTextColor} from '../../lib/colorContrast';
import styles from './admin-summaries.module.css';

const statusLabels = {pending: 'Menunggu', valid: 'Disetujui', rejected: 'Ditolak'};

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(value));
}

export default function AdminSummariesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [genre, setGenre] = useState('all');
  const [selected, setSelected] = useState(null);
  const [points, setPoints] = useState(100);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadSummaries() {
    setLoading(true);
    setError('');
    const {data: databaseAdmin, error: roleError} = await supabase.rpc('is_admin');
    if (roleError || !databaseAdmin) {
      setError('Akun ini belum dikenali sebagai admin oleh database Supabase. Jalankan migrasi Sprint 6 dan pastikan app_metadata.role atau profiles.role akun ini bernilai admin.');
      setItems([]);
      setLoading(false);
      return;
    }
    const {data, error: summaryError} = await supabase.rpc('admin_get_summary_queue');

    if (summaryError) {
      setError(`${summaryError.message} Jalankan supabase/sprint7_admin_summary_queue_rpc.sql agar antrean admin dapat membaca seluruh ringkasan.`);
      setLoading(false);
      return;
    }

    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadSummaries(); }, []);

  const genres = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const itemGenre = item.books?.genres;
      if (itemGenre?.id) map.set(itemGenre.id, itemGenre);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const stats = useMemo(() => ({
    pending: items.filter((item) => item.status === 'pending').length,
    valid: items.filter((item) => item.status === 'valid').length,
    rejected: items.filter((item) => item.status === 'rejected').length,
    points: items.reduce((total, item) => total + (item.status === 'valid' ? Number(item.points_awarded || 0) : 0), 0),
  }), [items]);

  const shown = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      const searchable = `${item.profile?.full_name || ''} ${item.profile?.email || ''} ${item.books?.title || ''} ${item.title || ''}`.toLowerCase();
      return (!keyword || searchable.includes(keyword))
        && (status === 'all' || item.status === status)
        && (genre === 'all' || item.books?.genres?.id === genre);
    });
  }, [genre, items, query, status]);

  function openDetail(item) {
    setSelected(item);
    setPoints(item.status === 'pending' ? 100 : item.points_awarded || 0);
    setNote(item.admin_note || '');
    setError('');
    setSuccess('');
  }

  async function validate(decision) {
    setError('');
    setSuccess('');
    const pointValue = Number.parseInt(points, 10) || 0;
    if (decision === 'valid' && pointValue <= 0) return setError('Jumlah poin harus lebih dari 0.');
    if (decision === 'rejected' && !note.trim()) return setError('Catatan alasan penolakan wajib diisi.');

    setProcessing(true);
    const {error: validationError} = await supabase.rpc('admin_validate_summary', {
      p_summary_id: selected.id,
      p_decision: decision,
      p_points: decision === 'valid' ? pointValue : 0,
      p_admin_note: note.trim() || null,
    });
    setProcessing(false);

    if (validationError) {
      setError(validationError.message);
      return;
    }

    setSuccess(decision === 'valid' ? `Ringkasan disetujui dan ${pointValue} poin berhasil diberikan.` : 'Ringkasan ditolak dan alasan sudah disimpan.');
    await loadSummaries();
    setSelected(null);
  }

  return (
    <AdminShell title="Periksa Ringkasan" subtitle="Baca ringkasan pengguna, lalu setujui atau tolak.">
      <section className={styles.stats} aria-label="Statistik ringkasan">
        <article className={styles.stat} data-color="yellow"><span>Menunggu</span><strong>{stats.pending}</strong><i>Belum diperiksa</i></article>
        <article className={styles.stat} data-color="lime"><span>Disetujui</span><strong>{stats.valid}</strong><i>Sudah selesai</i></article>
        <article className={styles.stat} data-color="pink"><span>Ditolak</span><strong>{stats.rejected}</strong><i>Perlu diperbaiki pengguna</i></article>
        <article className={styles.stat} data-color="blue"><span>Poin yang Diberikan</span><strong>{stats.points}</strong><i>Dari ringkasan yang disetujui</i></article>
      </section>

      {success ? <div className={styles.success}>{success}</div> : null}
      {error && !selected ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}><div><span>DAFTAR RINGKASAN</span><h2>Ringkasan pembaca</h2></div><div className={styles.panelTools}><button type="button" onClick={loadSummaries} disabled={loading}>{loading ? 'Memuat...' : 'Muat ulang'}</button><b>{shown.length} ringkasan</b></div></div>
        <div className={styles.filters}>
          <label className={styles.search}><span>Cari</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama pengguna, buku, atau judul..." /></label>
          <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Semua</option><option value="pending">Menunggu</option><option value="valid">Disetujui</option><option value="rejected">Ditolak</option></select></label>
          <label><span>Genre</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">Semua Genre</option>{genres.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        </div>

        {loading ? <div className={styles.empty}>Memuat ringkasan...</div> : !shown.length ? <div className={styles.empty}><strong>Belum ada ringkasan yang perlu diperiksa.</strong><p>Ubah pilihan pencarian atau tunggu pengguna mengirim ringkasan.</p></div> : (
          <div className={styles.list}>{shown.map((item) => (
            <article className={styles.summaryCard} key={item.id}>
              <div className={styles.cardTop}>
                <span className={styles.genreBadge} style={{background: item.books?.genres?.theme_color || '#a8d5ff', color: readableTextColor(item.books?.genres?.theme_color)}}>{item.books?.genres?.name || 'Tanpa genre'}</span>
                <span className={styles.status} data-status={item.status}>{statusLabels[item.status]}</span>
              </div>
              <div className={styles.userLine}><span>{(item.profile?.full_name || item.profile?.email || 'U').slice(0, 1).toUpperCase()}</span><div><b>{item.profile?.full_name || 'Pembaca BacaPop'}</b><small>{item.profile?.email || 'Email tidak tersedia'}</small></div></div>
              <p className={styles.bookLabel}>BUKU</p><h3>{item.books?.title || 'Buku tidak tersedia'}</h3><small>{item.books?.author || 'Penulis tidak dicantumkan'}</small>
              <div className={styles.preview}><b>{item.title}</b><p>{item.summary_text}</p></div>
              <div className={styles.cardFoot}><span>{formatDate(item.submitted_at)}</span><b>{item.points_awarded || 0} poin</b></div>
              <div className={styles.actions}><button className={styles.detailButton} onClick={() => openDetail(item)}>Lihat Detail</button>{item.status === 'pending' ? <button className={styles.validateButton} onClick={() => openDetail(item)}>Periksa</button> : null}</div>
            </article>
          ))}</div>
        )}
      </section>

      {selected ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="summary-detail-title">
            <header className={styles.modalHead}><div><span>PERIKSA RINGKASAN</span><h2 id="summary-detail-title">{selected.title}</h2></div><button onClick={() => setSelected(null)} aria-label="Tutup detail">×</button></header>
            <div className={styles.detailGrid}>
              <div className={styles.detailMeta}>
                <div><span>Nama pengguna</span><b>{selected.profile?.full_name || 'Pembaca BacaPop'}</b></div>
                <div><span>Email</span><b>{selected.profile?.email || '-'}</b></div>
                <div><span>Buku</span><b>{selected.books?.title || '-'}</b></div>
                <div><span>Penulis</span><b>{selected.books?.author || '-'}</b></div>
                <div><span>Genre</span><b>{selected.books?.genres?.name || '-'}</b></div>
                <div><span>Tanggal dikirim</span><b>{formatDate(selected.submitted_at)}</b></div>
                <div><span>Status</span><span className={styles.status} data-status={selected.status}>{statusLabels[selected.status]}</span></div>
                <div><span>Poin</span><b>{selected.points_awarded || 0}</b></div>
              </div>
              <article className={styles.fullSummary}><span>ISI RINGKASAN</span><h3>{selected.title}</h3><p>{selected.summary_text}</p></article>
            </div>

            {selected.status === 'pending' ? <div className={styles.validationForm}>
              <label><span>Jumlah poin</span><input type="number" min="1" value={points} onChange={(event) => setPoints(event.target.value)} /></label>
              <label><span>Catatan admin</span><textarea rows="4" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Wajib diisi jika ringkasan ditolak..." /></label>
              {error ? <div className={styles.error}>{error}</div> : null}
              <div className={styles.modalActions}><button className={styles.backButton} onClick={() => setSelected(null)}>Kembali</button><button className={styles.rejectButton} disabled={processing} onClick={() => validate('rejected')}>Tolak Ringkasan</button><button className={styles.approveButton} disabled={processing} onClick={() => validate('valid')}>{processing ? 'Memproses...' : 'Setujui dan Beri Poin'}</button></div>
            </div> : <div className={styles.processed}><strong>{selected.status === 'valid' ? 'Ringkasan sudah disetujui.' : 'Ringkasan ditolak.'}</strong>{selected.admin_note ? <p><b>Catatan admin:</b> {selected.admin_note}</p> : null}<button className={styles.backButton} onClick={() => setSelected(null)}>Kembali</button></div>}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
