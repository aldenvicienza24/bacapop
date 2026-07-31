'use client';

import {useEffect, useMemo, useState} from 'react';
import AdminShell from '../components/AdminShell';
import {supabase} from '../../lib/supabase';
import styles from './admin-users.module.css';

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}).format(new Date(value));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [points, setPoints] = useState(100);
  const [description, setDescription] = useState('Poin tambahan dari admin BacaPop.');
  const [rewardKey, setRewardKey] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');

    const {data, error: profileError} = await supabase
      .from('profiles')
      .select('id,full_name,email,role,status,points,created_at,updated_at')
      .order('created_at', {ascending: false});

    if (profileError) {
      setUsers([]);
      setError(`${profileError.message} Pastikan migrasi Sprint 4 dan Sprint 5 sudah dijalankan serta akun memiliki role admin di Supabase.`);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  const shown = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return users.filter((user) => {
      const searchable = `${user.full_name || ''} ${user.email || ''}`.toLowerCase();
      return (!keyword || searchable.includes(keyword))
        && (status === 'all' || user.status === status);
    });
  }, [query, status, users]);

  const stats = useMemo(() => ({
    total: users.filter((user) => user.role !== 'admin').length,
    active: users.filter((user) => user.role !== 'admin' && user.status === 'active').length,
    points: users.filter((user) => user.role !== 'admin').reduce((total, user) => total + Number(user.points || 0), 0),
  }), [users]);

  function openReward(user) {
    setSelected(user);
    setPoints(100);
    setDescription('Poin tambahan dari admin BacaPop.');
    setRewardKey(globalThis.crypto?.randomUUID?.() || `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`);
    setError('');
    setSuccess('');
  }

  async function awardReward(event) {
    event.preventDefault();
    const pointValue = Number.parseInt(points, 10) || 0;
    if (pointValue < 1 || pointValue > 100000) return setError('Jumlah poin harus antara 1 dan 100000.');
    if (!description.trim()) return setError('Alasan pemberian poin harus diisi.');

    setProcessing(true);
    setError('');
    const {data, error: rewardError} = await supabase.rpc('admin_award_points', {
      p_user_id: selected.id,
      p_points: pointValue,
      p_description: description.trim(),
      p_reward_key: rewardKey,
    });
    setProcessing(false);

    if (rewardError) {
      setError(`${rewardError.message} Pastikan supabase/sprint5_admin_user_rewards.sql sudah dijalankan.`);
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;
    setUsers((current) => current.map((user) => user.id === selected.id
      ? {...user, points: updated?.points ?? Number(user.points || 0) + pointValue}
      : user));
    setSuccess(`${pointValue} poin berhasil diberikan kepada ${selected.full_name || selected.email || 'pengguna'}.`);
    setSelected(null);
  }

  return (
    <AdminShell title="Pengguna & Poin" subtitle="Lihat pengguna BacaPop dan berikan poin tambahan.">
      <section className={styles.stats} aria-label="Statistik pengguna">
        <article><span>Total pengguna</span><strong>{stats.total}</strong><small>Profil non-admin</small></article>
        <article><span>Pengguna aktif</span><strong>{stats.active}</strong><small>Bisa menerima poin</small></article>
        <article><span>Total poin pengguna</span><strong>{stats.points}</strong><small>Akumulasi saat ini</small></article>
      </section>

      {success ? <div className={styles.success}>{success}</div> : null}
      {error && !selected ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.panel}>
        <header className={styles.panelHead}><div><span>SEMUA AKUN</span><h2>Daftar pengguna</h2></div><b>{shown.length} pengguna</b></header>
        <div className={styles.filters}>
          <label><span>Cari pengguna</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama atau email..." /></label>
          <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label>
        </div>

        {loading ? <div className={styles.empty}>Mengambil seluruh pengguna...</div> : !shown.length ? <div className={styles.empty}>Pengguna tidak ditemukan.</div> : (
          <div className={styles.userGrid}>{shown.map((user) => (
            <article className={styles.userCard} key={user.id}>
              <div className={styles.userTop}>
                <span className={styles.avatar}>{(user.full_name || user.email || 'U').slice(0, 1).toUpperCase()}</span>
                <span className={styles.userStatus} data-status={user.status}>{user.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
              </div>
              <h3>{user.full_name || 'Pembaca BacaPop'}</h3>
              <p>{user.email || 'Email tidak tersedia'}</p>
              <dl><div><dt>Total poin</dt><dd>{Number(user.points || 0)}</dd></div><div><dt>Bergabung</dt><dd>{formatDate(user.created_at)}</dd></div></dl>
              {user.role === 'admin' ? <span className={styles.adminTag}>AKUN ADMIN</span> : <button onClick={() => openReward(user)}>Beri Poin</button>}
            </article>
          ))}</div>
        )}
      </section>

      {selected ? <div className={styles.modalBackdrop} onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
        <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="reward-title">
          <header><div><span>POIN PENGGUNA</span><h2 id="reward-title">Berikan poin</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Tutup">×</button></header>
          <div className={styles.recipient}><span>{(selected.full_name || selected.email || 'U').slice(0, 1).toUpperCase()}</span><div><b>{selected.full_name || 'Pembaca BacaPop'}</b><small>{selected.email || '-'}</small><em>Poin saat ini: {Number(selected.points || 0)}</em></div></div>
          <form onSubmit={awardReward}>
            <label><span>Jumlah poin</span><input type="number" min="1" max="100000" value={points} onChange={(event) => setPoints(event.target.value)} /></label>
            <label><span>Alasan pemberian poin</span><textarea rows="4" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contoh: Bonus pembaca aktif minggu ini" /></label>
            {error ? <div className={styles.error}>{error}</div> : null}
            <div className={styles.modalActions}><button type="button" onClick={() => setSelected(null)}>Batal</button><button type="submit" disabled={processing}>{processing ? 'Memberikan poin...' : 'Berikan Poin'}</button></div>
          </form>
        </section>
      </div> : null}
    </AdminShell>
  );
}
