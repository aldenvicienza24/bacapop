'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../lib/supabase';
import {notifyRewardRedeemed} from '../../lib/userNotifications';
import {getDashboardUser} from '../auth';
import DashboardMenuIcon from '../components/DashboardMenuIcon';
import ModernDashboardMenu from '../components/ModernDashboardMenu';
import mainStyles from '../main-dashboard.module.css';
import styles from './rewards.module.css';

const fallbackRewards = [
  {id: 'premium-book', name: 'Buku Premium: Perahu Kertas', description: 'Buka Perahu Kertas di koleksi Romance dan baca kapan saja.', category: 'Bacaan digital', cost_points: 750, stock: null, fulfillment_type: 'digital'},
  {id: 'premium-horror-jeritan-tengah-malam', name: 'Buku Premium: Jeritan Tengah Malam', description: 'Buka Jeritan Tengah Malam di koleksi Horror dan baca kapan saja.', category: 'Bacaan digital', cost_points: 750, stock: null, fulfillment_type: 'digital'},
  {id: 'beng-beng', name: 'Beng-Beng', description: 'Ambil langsung saat bertemu admin dengan menunjukkan kode penukaran. Hanya dapat ditukar satu kali per akun.', category: 'Ambil langsung', cost_points: 350, stock: 50, fulfillment_type: 'pickup'},
];

function rewardCover(rewardId) {
  return rewardId === 'premium-horror-jeritan-tengah-malam'
    ? '/images/horror/cerita-kkn/cover-premium-v2.png'
    : '/images/novel/perahu-kertas-premium-v2.png';
}

export default function RewardsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rewards, setRewards] = useState(fallbackRewards);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [catalogReady, setCatalogReady] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCatalog() {
      const currentUser = await getDashboardUser(router);
      if (!currentUser) return;
      setUser(currentUser);
      const [profileResult, rewardResult, historyResult] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,points,status').eq('id', currentUser.id).single(),
        supabase.from('reward_catalog').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('reward_redemptions').select('id,reward_id,reward_name,points_spent,status,redemption_code,created_at').eq('user_id', currentUser.id).order('created_at', {ascending: false}),
      ]);
      if (profileResult.error || !profileResult.data) setError(profileResult.error?.message || 'Profil poin belum tersedia.');
      else setProfile(profileResult.data);
      if (rewardResult.error || historyResult.error) {
        setCatalogReady(false);
        setNotice('Daftar hadiah contoh sedang ditampilkan. Penukaran poin belum bisa digunakan.');
      } else {
        if (rewardResult.data?.length) {
          const availableIds = new Set(rewardResult.data.map((reward) => reward.id));
          setRewards([...rewardResult.data, ...fallbackRewards.filter((reward) => !availableIds.has(reward.id))]);
        }
        setHistory(historyResult.data || []);
      }
      setLoading(false);
    }
    loadCatalog();
  }, [router]);

  const spentPoints = useMemo(() => history.reduce((total, item) => item.status === 'cancelled' ? total : total + Number(item.points_spent || 0), 0), [history]);
  const balance = Math.max(0, Number(profile?.points || 0) - spentPoints);
  const premiumUnlocked = history.some((item) => item.reward_id === 'premium-book' && item.status === 'completed')
    || history.some((item) => item.reward_name?.includes('Perahu Kertas') && item.status === 'completed');
  const premiumHorrorUnlocked = history.some((item) => item.reward_id === 'premium-horror-jeritan-tengah-malam' && item.status === 'completed');
  const bengBengRedemption = history.find((item) => item.reward_id === 'beng-beng' && item.status !== 'cancelled');
  const firstName = (profile?.full_name || user?.email?.split('@')[0] || 'Pembaca').split(' ')[0];

  async function redeemReward() {
    if (!selected || processing) return;
    setProcessing(true); setError(''); setNotice('');
    const {data, error: redeemError} = await supabase.rpc('redeem_catalog_reward', {p_reward_id: selected.id, p_redemption_key: globalThis.crypto?.randomUUID?.()});
    setProcessing(false);
    if (redeemError) return setError(redeemError.message);
    const redemption = data?.redemption || data;
    setHistory((current) => [redemption, ...current.filter((item) => item.id !== redemption.id)]);
    if (Number.isFinite(data?.remaining_stock)) setRewards((current) => current.map((item) => item.id === selected.id ? {...item, stock: data.remaining_stock} : item));
    setSelected(null);
    notifyRewardRedeemed(user.id, redemption);
    setNotice(redemption.reward_id === 'beng-beng'
      ? `Beng-Beng berhasil dipesan. Tunjukkan kode ${redemption.redemption_code} kepada admin saat bertemu. Kode hanya berlaku satu kali.`
      : `Berhasil! ${redemption.reward_name} sudah ditukar. Simpan kode ${redemption.redemption_code}.`);
  }

  if (loading) return <main className={styles.loading}><span /><b>Menyiapkan hadiah</b><small>Memuat poin dan hadiah untukmu...</small></main>;

  return <main className={`${mainStyles.dashboardPage} ${styles.page}`}>
    <aside className={mainStyles.dashboardSidebar}>
      <div className={mainStyles.sidebarBrandBlock}>
        <Link className={mainStyles.dashboardBrand} href="/">BacaPop<span>!</span></Link>
        <small>PERPUSTAKAAN DIGITAL</small>
      </div>
      <div className={mainStyles.sidebarGroup}>
        <span className={mainStyles.sidebarLabel}>Menu utama</span>
        <ModernDashboardMenu active="rewards" rewardCount={rewards.length} />
      </div>
      <div className={mainStyles.sidebarGroup}>
        <span className={mainStyles.sidebarLabel}>Ruang pembaca</span>
        <nav className={mainStyles.sidebarNav}>
          <Link href="/dashboard/profile"><DashboardMenuIcon className={mainStyles.sidebarIcon} type="profile" /><span>Profil saya<small>Poin &amp; pencapaian</small></span><i>→</i></Link>
        </nav>
      </div>
      <Link className={mainStyles.sidebarAccount} href="/dashboard/profile"><span>{firstName[0]?.toUpperCase()}</span><div><small>KARTU ANGGOTA</small><b>{profile?.full_name || firstName}</b><em>{balance.toLocaleString('id-ID')} poin tersedia</em></div><i>↗</i></Link>
    </aside>

    <section className={mainStyles.dashboardWorkspace}>
      <header className={mainStyles.dashboardTopbar}>
        <div><span>Perpustakaan Digital BacaPop</span><h1>Tukar Poin</h1></div>
        <div className={mainStyles.dashboardActions}>
          <Link className={mainStyles.profileButton} href="/dashboard/profile"><span className={mainStyles.profileAvatar}>{firstName[0]?.toUpperCase()}<i /></span><span className={mainStyles.profileButtonCopy}><small>RUANG PEMBACA</small><b>Profil Saya</b></span><i className={mainStyles.profileArrow}>↗</i></Link>
        </div>
      </header>
      <div className={styles.content}>
        <section className={styles.balanceHero} data-tour="reward-balance">
          <div className={styles.balanceCopy}>
            <span className={styles.heroEyebrow}>HADIAH UNTUK PEMBACA</span>
            <h2>Tukar poinmu<br/>dengan hadiah.</h2>
            <p>Kumpulkan poin dari membaca dan menulis ringkasan, lalu pilih hadiah favoritmu.</p>
            <div className={styles.balanceAmount}><small>SALDO TERSEDIA</small><strong>{balance.toLocaleString('id-ID')} <i>POIN</i></strong></div>
            <div className={styles.levelRow}><small>Pembaca Aktif</small><small>{Math.min(balance, 1000).toLocaleString('id-ID')} / 1.000 poin</small></div>
            <div className={styles.progress}><i style={{width: `${Math.min(100, balance / 10)}%`}} /></div>
          </div>
          <div className={styles.readerArt}>
            <img src="/images/rewards/reward-hero-neobrutal-v1.png" alt="Kolase buku, koin poin, kupon hadiah, dan camilan"/>
            <b>READ · EARN · REPEAT</b>
            <div className={styles.heroMiniStats}><span><b>{rewards.length}</b> hadiah</span><span><b>{history.length}</b> ditukar</span></div>
          </div>
        </section>
        {notice ? <div className={styles.notice}>{notice}</div> : null}{error ? <div className={styles.error}>{error}</div> : null}
        {premiumUnlocked || premiumHorrorUnlocked ? (
          <section className={styles.activePremium}>
            <header>
              <div><span>KOLEKSI PREMIUM AKTIF</span><b>Buku yang sudah kamu miliki</b></div>
              <strong>{Number(premiumUnlocked) + Number(premiumHorrorUnlocked)}</strong>
            </header>
            <div className={styles.activePremiumList}>
              {premiumUnlocked ? (
                <article data-genre="romance">
                  <img src="/images/novel/perahu-kertas-premium-v2.png" alt="Sampul Perahu Kertas"/>
                  <div><small>PREMIUM ROMANCE</small><b>Perahu Kertas</b><span>Siap dibaca di koleksi Romance</span></div>
                  <Link href="/dashboard/genres/novel#koleksi" aria-label="Buka Perahu Kertas">Buka <span>→</span></Link>
                </article>
              ) : null}
              {premiumHorrorUnlocked ? (
                <article data-genre="horror">
                  <img src="/images/horror/cerita-kkn/cover-premium-v2.png" alt="Sampul Jeritan Tengah Malam"/>
                  <div><small>PREMIUM HORROR</small><b>Jeritan Tengah Malam</b><span>Siap dibaca di koleksi Horror</span></div>
                  <Link href="/dashboard/genres/horror#koleksi" aria-label="Buka Jeritan Tengah Malam">Buka <span>→</span></Link>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className={styles.dashboardGrid}>
        <section className={styles.catalog} id="hadiah" data-tour="reward-catalog">
          <div className={styles.sectionHead}><div><span>DAFTAR HADIAH</span><h2>Pilih hadiah favoritmu</h2></div></div>
          <div className={styles.rewardGrid}>{rewards.map((reward, index) => {
            const affordable = balance >= Number(reward.cost_points);
            const available = reward.stock === null || Number(reward.stock) > 0;
            const isSnack = reward.id === 'beng-beng';
            const alreadyUnlocked = (reward.id === 'premium-book' && premiumUnlocked)
              || (reward.id === 'premium-horror-jeritan-tengah-malam' && premiumHorrorUnlocked)
              || (isSnack && Boolean(bengBengRedemption));
            return <article className={styles.rewardCard} data-type={isSnack ? 'snack' : 'book'} data-premium-genre={reward.id === 'premium-horror-jeritan-tengah-malam' ? 'horror' : reward.id === 'premium-book' ? 'romance' : undefined} data-state={alreadyUnlocked ? 'unlocked' : affordable ? 'ready' : 'locked'} key={reward.id}>
              <div className={`${styles.rewardVisual} ${isSnack ? styles.snackVisual : styles.bookVisual}`}>
                <span className={styles.itemNo}>0{index + 1}</span>
                <span className={styles.rewardStatus}>{alreadyUnlocked ? 'SUDAH DIMILIKI' : available ? 'TERSEDIA' : 'STOK HABIS'}</span>
                {isSnack ? <div className={styles.snackProduct}><span aria-hidden="true"/><img src="/images/rewards/beng-beng-maxx-cutout.png" alt="Beng-Beng Maxx kemasan asli"/></div> : <div className={styles.bookCover}><img src={rewardCover(reward.id)} alt={`Sampul ${reward.name}`}/><span>{reward.id === 'premium-horror-jeritan-tengah-malam' ? 'PREMIUM HORROR' : 'PREMIUM ROMANCE'}</span></div>}
              </div>
              <div className={styles.rewardInfo}>
                <span>{reward.category}</span>
                <h3>{reward.name}</h3>
                <p>{isSnack && bengBengRedemption
                  ? bengBengRedemption.status === 'completed'
                    ? 'Beng-Beng sudah diserahkan. Hadiah ini hanya dapat ditukar satu kali.'
                    : `Tunjukkan kode ${bengBengRedemption.redemption_code} kepada admin saat bertemu. Kode hanya dapat dipakai satu kali.`
                  : alreadyUnlocked ? `Buku sudah terbuka. Kamu bisa membacanya di koleksi ${reward.id === 'premium-book' ? 'Romance' : 'Horror'}.` : reward.description}</p>
                {!alreadyUnlocked && !affordable ? <small className={styles.pointHint}>Tambah {(Number(reward.cost_points) - balance).toLocaleString('id-ID')} poin lagi untuk menukar</small> : null}
                <div className={styles.rewardFooter}><strong>{alreadyUnlocked ? isSnack ? '1×' : 'AKTIF' : Number(reward.cost_points).toLocaleString('id-ID')} <i>{alreadyUnlocked ? '' : 'POIN'}</i></strong>{!alreadyUnlocked ? <small className={styles.stockInfo}>{reward.stock === null ? 'Bisa digunakan selamanya' : `${Number(reward.stock)} tersisa`}</small> : null}<button disabled={!available || !catalogReady || alreadyUnlocked} onClick={() => setSelected(reward)}>{alreadyUnlocked ? isSnack ? bengBengRedemption.status === 'completed' ? 'SUDAH DIAMBIL' : 'MENUNGGU DIAMBIL' : 'SUDAH TERBUKA' : !available ? 'HABIS' : affordable ? 'TUKAR SEKARANG' : 'POIN BELUM CUKUP'}</button></div>
              </div>
            </article>;
          })}</div>
        </section>

        </div>
      </div>
    </section>

    {selected ? <div className={styles.modalBackdrop} onMouseDown={event => {if (event.target === event.currentTarget && !processing) setSelected(null);}}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="redeem-title"><span className={styles.modalTape}/><h2 id="redeem-title">KONFIRMASI!</h2><div className={styles.confirmBody}><div className={styles.confirmProduct}>{selected.id === 'beng-beng' ? <img className={styles.modalSnackImage} src="/images/rewards/beng-beng-maxx-cutout.png" alt="Beng-Beng Maxx kemasan asli"/> : <img src={rewardCover(selected.id)} alt={selected.name}/>}<span>{selected.name}</span></div><div className={styles.receipt}><h3>RINCIAN</h3><div><span>SALDO AWAL</span><b>{balance.toLocaleString('id-ID')} PT</b></div><div><span>POTONGAN</span><b className={styles.minus}>-{Number(selected.cost_points).toLocaleString('id-ID')} PT</b></div><div className={styles.receiptTotal}><span>SISA POIN</span><b>{Math.max(0, balance - Number(selected.cost_points)).toLocaleString('id-ID')} PT</b></div></div></div>{selected.id === 'beng-beng' ? <div className={styles.pickupNotice}>Ambil langsung saat bertemu admin. Setelah konfirmasi, tunjukkan kode penukaran kepada admin. Setiap akun hanya dapat menukar Beng-Beng satu kali.</div> : null}{balance < Number(selected.cost_points) ? <div className={styles.modalWarning}>Poinmu belum cukup untuk hadiah ini.</div> : null}<button className={styles.confirmButton} disabled={processing || balance < Number(selected.cost_points)} onClick={redeemReward}>{processing ? 'MEMPROSES...' : 'KONFIRMASI TUKAR'}</button><button className={styles.cancelButton} disabled={processing} onClick={() => setSelected(null)}>BATAL</button></section></div> : null}
  </main>;
}
