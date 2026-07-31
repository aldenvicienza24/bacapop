'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminShell from '../components/AdminShell';
import {readableTextColor} from '../../lib/colorContrast';
import { ConfirmButton, EmptyState, Status } from '../components/ui';
import { supabase } from '../../lib/supabase';
import { defaultGenres } from '../../lib/defaultGenres';
import styles from '../admin.module.css';

export default function Genres() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  async function load() {
    const { data, error: loadError } = await supabase
      .from('genres')
      .select('*')
      .order('created_at', { ascending: false });
    if (loadError) setError(loadError.message);
    else setItems(data || []);
  }

  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((genre) => {
      const matchesQuery = !keyword
        || genre.name?.toLowerCase().includes(keyword)
        || genre.slug?.toLowerCase().includes(keyword);
      const matchesStatus = filter === 'all' || String(genre.is_active) === filter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, filter]);

  async function remove(id) {
    const { error: removeError } = await supabase.from('genres').delete().eq('id', id);
    if (removeError) setError(removeError.message);
    else load();
  }

  async function seedDefaultGenres() {
    setError('');
    setSeeding(true);
    const { error: seedError } = await supabase
      .from('genres')
      .upsert(defaultGenres, { onConflict: 'slug' });
    setSeeding(false);
    if (seedError) setError(seedError.message);
    else load();
  }

  return (
    <AdminShell title="Kelola Genre" subtitle="Atur tampilan untuk setiap jenis cerita.">
      <div className={styles.cardActions}>
        <Link className={styles.button} href="/admin/genres/new">+ Tambah Genre</Link>
        <button className={`${styles.button} ${styles.secondary}`} onClick={seedDefaultGenres} disabled={seeding}>
          {seeding ? 'Membuat genre...' : 'Seed Genre Default'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.toolbar}>
        <input className={styles.input} placeholder="Cari nama genre..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className={styles.select} value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Semua status</option><option value="true">Aktif</option><option value="false">Nonaktif</option>
        </select>
      </div>
      {!shown.length ? (
        <EmptyState text={items.length ? 'Tidak ada genre yang cocok dengan pencarian.' : 'Belum ada genre. Tambahkan genre pertama untuk mulai mengelola buku.'} />
      ) : (
        <section className={styles.list}>{shown.map((genre) => (
          <article className={styles.genreCard} style={{ background: genre.theme_color || '#fff', color: readableTextColor(genre.theme_color), borderColor: '#111' }} key={genre.id}>
            <div className={styles.genreTop}><span className={styles.icon}>{genre.icon || '📚'}</span><Status value={genre.is_active ? 'active' : 'inactive'} /></div>
            <h2>{genre.name}</h2><b>/{genre.slug}</b><p>{genre.description || 'Tanpa deskripsi'}</p>
            <small><b>{genre.theme_name || 'Tanpa nama tema'}</b></small>
            <div className={styles.swatches}><i className={styles.swatch} style={{ background: genre.theme_color }} title={genre.theme_color} /><i className={styles.swatch} style={{ background: genre.accent_color }} title={genre.accent_color} /></div>
            <div className={styles.cardActions}><Link className={styles.button} href={`/admin/genres/${genre.id}/edit`}>Edit</Link><ConfirmButton message="Yakin ingin menghapus genre ini?" onConfirm={() => remove(genre.id)} /></div>
          </article>
        ))}</section>
      )}
    </AdminShell>
  );
}
