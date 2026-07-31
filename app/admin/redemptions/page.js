'use client';

import {useEffect, useMemo, useState} from 'react';
import AdminShell from '../components/AdminShell';
import {supabase} from '../../lib/supabase';
import styles from './redemptions.module.css';

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
}

export default function AdminRedemptionsPage() {
  const [redemptions, setRedemptions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadRedemptions() {
    setLoading(true);
    const {data, error: redemptionError} = await supabase
      .from('reward_redemptions')
      .select('id,user_id,reward_id,reward_name,points_spent,status,redemption_code,created_at,fulfilled_at')
      .eq('reward_id', 'beng-beng')
      .order('created_at', {ascending: false});

    if (redemptionError) {
      setError(`${redemptionError.message} Jalankan migrasi Sprint 13 terlebih dahulu.`);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data || []).map((item) => item.user_id))];
    const {data: profileRows} = userIds.length
      ? await supabase.from('profiles').select('id,full_name,email').in('id', userIds)
      : {data: []};
    setProfiles(Object.fromEntries((profileRows || []).map((profile) => [profile.id, profile])));
    setRedemptions(data || []);
    setLoading(false);
  }

  useEffect(() => { loadRedemptions(); }, []);

  const counts = useMemo(() => ({
    waiting: redemptions.filter((item) => item.status === 'processing').length,
    completed: redemptions.filter((item) => item.status === 'completed').length,
  }), [redemptions]);

  async function fulfill(event) {
    event.preventDefault();
    if (!code.trim() || processing) return;
    setProcessing(true);
    setError('');
    setMessage('');
    const {data, error: fulfillError} = await supabase.rpc('admin_fulfill_beng_beng', {
      p_redemption_code: code.trim(),
    });
    setProcessing(false);

    if (fulfillError) {
      setError(fulfillError.message);
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;
    setRedemptions((current) => current.map((item) => item.id === updated.id ? updated : item));
    setMessage(`Kode ${updated.redemption_code} benar. Beng-Beng sudah diserahkan dan kode tidak bisa dipakai lagi.`);
    setCode('');
  }

  return (
    <AdminShell title="Penukaran Hadiah" subtitle="Periksa kode pengguna sebelum menyerahkan hadiah.">
      <section className={styles.stats}>
        <article><span>Menunggu diambil</span><strong>{counts.waiting}</strong></article>
        <article><span>Sudah diserahkan</span><strong>{counts.completed}</strong></article>
      </section>

      <section className={styles.validator}>
        <div><span>PERIKSA KODE</span><h2>Masukkan kode pengguna</h2><p>Pastikan kode sama. Tekan tombol hanya setelah Beng-Beng diserahkan.</p></div>
        <form onSubmit={fulfill}>
          <label htmlFor="redemption-code">Kode penukaran</label>
          <div><input id="redemption-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="BP-XXXXXXXX" autoComplete="off"/><button disabled={processing || !code.trim()}>{processing ? 'Memeriksa...' : 'Serahkan Beng-Beng'}</button></div>
        </form>
      </section>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.panel}>
        <header><div><span>RIWAYAT BENG-BENG</span><h2>Daftar penukaran</h2></div><button onClick={loadRedemptions}>Muat ulang</button></header>
        {loading ? <div className={styles.empty}>Mengambil data penukaran...</div> : !redemptions.length ? <div className={styles.empty}>Belum ada penukaran Beng-Beng.</div> : (
          <div className={styles.list}>{redemptions.map((item) => {
            const profile = profiles[item.user_id];
            return <article key={item.id}>
              <div><small>PENGGUNA</small><b>{profile?.full_name || 'Pembaca BacaPop'}</b><span>{profile?.email || item.user_id}</span></div>
              <div><small>KODE</small><strong>{item.redemption_code}</strong><span>{formatDate(item.created_at)}</span></div>
              <em data-status={item.status}>{item.status === 'completed' ? 'SUDAH DISERAHKAN' : item.status === 'cancelled' ? 'DIBATALKAN' : 'MENUNGGU DIAMBIL'}</em>
            </article>;
          })}</div>
        )}
      </section>
    </AdminShell>
  );
}
