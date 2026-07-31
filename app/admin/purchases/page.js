'use client';

import {useEffect, useMemo, useState} from 'react';
import AdminShell from '../components/AdminShell';
import {supabase} from '../../lib/supabase';
import styles from './purchases.module.css';

const paidBookTitles = {
  'my-sweet-doctor': 'My Sweet Doctor',
  'dongeng-binatang': 'Dongeng Binatang',
  'sehari-satu-dongeng': 'Sehari Satu Dongeng',
  'kunci-hitam': 'Kunci Hitam',
};

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [notes, setNotes] = useState({});
  const [proofUrls, setProofUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadPurchases() {
    setLoading(true);
    setError('');
    const {data, error: purchaseError} = await supabase
      .from('book_purchases')
      .select('id,user_id,book_key,price_rupiah,status,payment_method,transaction_code,payer_name,payment_reference,payer_paid_at,payment_proof_path,purchased_at,reviewed_at,admin_note')
      .order('purchased_at', {ascending: false});

    if (purchaseError) {
      setError(`${purchaseError.message} Jalankan supabase/my_sweet_doctor_paid_seed.sql terlebih dahulu.`);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data || []).map((item) => item.user_id))];
    const {data: profileRows} = userIds.length
      ? await supabase.from('profiles').select('id,full_name,email').in('id', userIds)
      : {data: []};

    const proofEntries = await Promise.all((data || [])
      .filter((item) => item.payment_proof_path)
      .map(async (item) => {
        const {data: signedData} = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(item.payment_proof_path, 60 * 60);
        return [item.id, signedData?.signedUrl || ''];
      }));

    setProfiles(Object.fromEntries((profileRows || []).map((profile) => [profile.id, profile])));
    setProofUrls(Object.fromEntries(proofEntries));
    setPurchases(data || []);
    setLoading(false);
  }

  useEffect(() => { loadPurchases(); }, []);

  const counts = useMemo(() => ({
    pending: purchases.filter((item) => item.status === 'pending').length,
    completed: purchases.filter((item) => item.status === 'completed').length,
    rejected: purchases.filter((item) => item.status === 'cancelled').length,
  }), [purchases]);

  async function review(purchase, approve) {
    if (processingId || purchase.status !== 'pending') return;
    if (approve && !purchase.payment_proof_path) {
      window.alert('Pembayaran ini belum memiliki foto bukti, sehingga belum bisa disetujui.');
      return;
    }
    const action = approve ? 'menyetujui' : 'menolak';
    if (!window.confirm(`Yakin ingin ${action} pembayaran ${purchase.transaction_code}? Pastikan foto, jumlah pembayaran, dan waktunya sudah benar.`)) return;

    setProcessingId(purchase.id);
    setError('');
    setMessage('');
    const {data, error: reviewError} = await supabase.rpc('admin_review_dana_purchase', {
      p_purchase_id: purchase.id,
      p_approve: approve,
      p_admin_note: notes[purchase.id]?.trim() || null,
    });
    setProcessingId('');

    if (reviewError) {
      setError(reviewError.message);
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;
    setPurchases((current) => current.map((item) => item.id === updated.id ? updated : item));
    setMessage(approve
      ? `Pembayaran ${updated.transaction_code} disetujui. Buku sekarang terbuka untuk pembeli.`
      : `Pembayaran ${updated.transaction_code} ditolak dan buku tetap terkunci.`);
  }

  return (
    <AdminShell title="Pembayaran QRIS" subtitle="Periksa foto dan data pembayaran sebelum membuka buku.">
      <section className={styles.stats}>
        <article><span>Menunggu pemeriksaan</span><strong>{counts.pending}</strong></article>
        <article><span>Disetujui</span><strong>{counts.completed}</strong></article>
        <article><span>Ditolak</span><strong>{counts.rejected}</strong></article>
      </section>

      <section className={styles.warning}>
        <b>PERIKSA SECARA MANUAL</b>
        <p>Cocokkan foto bukti, jumlah pembayaran, dan waktu bayar sebelum menyetujui.</p>
      </section>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.panel}>
        <header><div><span>PEMBAYARAN BUKU</span><h2>Daftar pembayaran</h2></div><button type="button" onClick={loadPurchases}>Muat ulang</button></header>
        {loading ? <div className={styles.empty}>Memuat pembayaran...</div> : !purchases.length ? <div className={styles.empty}>Belum ada pembayaran QRIS.</div> : (
          <div className={styles.list}>{purchases.map((purchase) => {
            const profile = profiles[purchase.user_id];
            return (
              <article data-status={purchase.status} key={purchase.id}>
                <div className={styles.transactionHead}>
                  <div><small>KODE PESANAN</small><strong>{purchase.transaction_code}</strong><span>{formatDate(purchase.purchased_at)}</span></div>
                  <em>{purchase.status === 'completed' ? 'DISETUJUI' : purchase.status === 'cancelled' ? 'DITOLAK' : 'MENUNGGU'}</em>
                </div>
                <dl>
                  <div><dt>Buku</dt><dd>{paidBookTitles[purchase.book_key] || purchase.book_key}</dd></div>
                  <div><dt>Jumlah pembayaran</dt><dd>{formatRupiah(purchase.price_rupiah)}</dd></div>
                  <div><dt>Akun BacaPop (otomatis)</dt><dd>{purchase.payer_name || '-'}</dd></div>
                  <div><dt>ID klaim otomatis</dt><dd className={styles.reference}>{purchase.payment_reference || '-'}</dd></div>
                  <div><dt>Waktu bayar</dt><dd>{formatDate(purchase.payer_paid_at)}</dd></div>
                  <div><dt>Akun BacaPop</dt><dd>{profile?.full_name || profile?.email || purchase.user_id}</dd></div>
                </dl>
                <div className={styles.proof}>
                  <div>
                    <small>BUKTI TRANSFER</small>
                    <strong>{purchase.payment_proof_path ? 'Foto sudah diunggah' : 'Tidak ada foto'}</strong>
                  </div>
                  {proofUrls[purchase.id] ? (
                    <a href={proofUrls[purchase.id]} target="_blank" rel="noreferrer">
                      <img src={proofUrls[purchase.id]} alt={`Bukti transfer ${purchase.transaction_code}`} />
                      <span>Lihat ukuran penuh ↗</span>
                    </a>
                  ) : (
                    <p>{purchase.payment_proof_path ? 'Foto tidak dapat dimuat. Coba muat ulang.' : 'Pembayaran lama tanpa foto bukti.'}</p>
                  )}
                </div>
                {purchase.status === 'pending' ? (
                  <div className={styles.review}>
                    <input value={notes[purchase.id] || ''} onChange={(event) => setNotes((current) => ({...current, [purchase.id]: event.target.value}))} placeholder="Catatan admin (opsional)" />
                    <button type="button" disabled={Boolean(processingId)} onClick={() => review(purchase, false)}>Tolak</button>
                    <button type="button" disabled={Boolean(processingId)} onClick={() => review(purchase, true)}>{processingId === purchase.id ? 'Memproses...' : 'Setujui pembayaran'}</button>
                  </div>
                ) : (
                  <p className={styles.reviewed}>Diproses {formatDate(purchase.reviewed_at)}{purchase.admin_note ? ` · ${purchase.admin_note}` : ''}</p>
                )}
              </article>
            );
          })}</div>
        )}
      </section>
    </AdminShell>
  );
}
