'use client';

import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {gsap} from 'gsap';
import {Draggable} from 'gsap/Draggable';
import {supabase} from '../../lib/supabase';
import {getDashboardUser, logoutFromDashboard} from '../auth';
import styles from './profile-playground.module.css';

const emptyForm = {full_name: '', bio: '', phone: ''};

gsap.registerPlugin(Draggable);

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}).format(new Date(value));
}

export default function ProfilePage() {
  const router = useRouter();
  const pageRef = useRef(null);
  const layoutRef = useRef(null);
  const draggablesRef = useRef([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [stats, setStats] = useState({finished: 0, reading: 0, valid: 0, summaryTotal: 0, points: 0});
  const [summaryHistory, setSummaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [editing, setEditing] = useState(false);
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [availableFields, setAvailableFields] = useState({bio: false, phone: false});

  useEffect(() => {
    async function loadProfile() {
      const currentUser = await getDashboardUser(router);
      if (!currentUser) return;
      setUser(currentUser);

      let {data: profileData, error: profileError} = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!profileData && !profileError) {
        const fallbackName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Pembaca BacaPop';
        const result = await supabase.from('profiles').insert({id: currentUser.id, full_name: fallbackName, email: currentUser.email, role: 'user', status: 'active', points: 0}).select().single();
        profileData = result.data;
        profileError = result.error;
      }

      if (profileError || !profileData) {
        setError(`${profileError?.message || 'Profil belum tersedia.'} Jalankan ulang migrasi Sprint 4 di Supabase.`);
        setLoading(false);
        return;
      }

      if (profileData.status === 'inactive') {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      const [{data: progressRows}, {data: summaryRows}] = await Promise.all([
        supabase.from('reading_progress').select('current_page,is_finished').eq('user_id', currentUser.id),
        supabase.from('summaries').select('*').eq('user_id', currentUser.id).order('submitted_at', {ascending: false}),
      ]);

      const summaryBookIds = [...new Set((summaryRows || []).map((item) => item.book_id).filter(Boolean))];
      let summaryBooks = [];
      if (summaryBookIds.length) {
        const {data: bookRows} = await supabase
          .from('books')
          .select('id,title,author')
          .in('id', summaryBookIds);
        summaryBooks = bookRows || [];
      }
      const summaryBookMap = Object.fromEntries(summaryBooks.map((book) => [book.id, book]));

      const nextForm = {
        full_name: profileData.full_name || '',
        bio: profileData.bio || '',
        phone: profileData.phone || '',
      };
      setProfile(profileData);
      setAvailableFields({
        bio: Object.prototype.hasOwnProperty.call(profileData, 'bio'),
        phone: Object.prototype.hasOwnProperty.call(profileData, 'phone'),
      });
      setForm(nextForm);
      setSummaryHistory((summaryRows || []).map((item) => ({...item, book: summaryBookMap[item.book_id]})));
      setStats({
        finished: (progressRows || []).filter((item) => item.is_finished).length,
        reading: (progressRows || []).filter((item) => !item.is_finished && item.current_page > 0).length,
        valid: (summaryRows || []).filter((item) => item.status === 'valid').length,
        summaryTotal: (summaryRows || []).length,
        points: Number(profileData.points || 0),
      });
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  useEffect(() => {
    if (!editing) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setEditing(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    let modalContext;
    const animationFrame = window.requestAnimationFrame(() => {
      modalContext = gsap.context(() => {
        const timeline = gsap.timeline({defaults: {ease: 'power3.out'}});
        timeline
          .from('[data-motion="modal-backdrop"]', {opacity: 0, duration: .2})
          .from('[data-motion="modal-card"]', {y: 50, scale: .92, rotation: -1.5, opacity: 0, duration: .52}, '-=.08')
          .from('[data-motion="modal-card"] label, [data-motion="modal-card"] .modal-action', {y: 12, opacity: 0, stagger: .055, duration: .28}, '-=.2');
      });
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      window.cancelAnimationFrame(animationFrame);
      modalContext?.revert();
    };
  }, [editing]);

  useEffect(() => {
    if (loading || !profile || !pageRef.current) return undefined;

    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const layoutCards = gsap.utils.toArray('[data-layout-card]');
      const storageKey = `bacapop-profile-layout:v3:${profile.id}`;
      let savedLayout = {};
      try {
        savedLayout = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
      } catch {
        savedLayout = {};
      }

      layoutCards.forEach((card) => {
        const saved = savedLayout[card.dataset.layoutId];
        gsap.set(card, {x: saved?.x || 0, y: saved?.y || 0, rotation: 0, scale: 1});
      });

      if (!reduceMotion) {
        const timeline = gsap.timeline({defaults: {ease: 'power3.out'}});
        timeline
          .from('[data-motion="profile-hero"]', {scale: .94, opacity: 0, duration: .62})
          .from('[data-motion="hero-copy"] > *', {y: 24, opacity: 0, stagger: .09, duration: .42}, '-=.42')
          .from('[data-motion="hero-meta"] > *', {x: 22, rotation: 4, opacity: 0, stagger: .08, duration: .38}, '-=.32')
          .from('[data-motion="stat"]', {scale: .86, opacity: 0, stagger: .075, duration: .48}, '-=.18')
          .from('[data-motion="profile-card"], [data-motion="account-card"], [data-motion="achievement-card"], [data-motion="summary-card"]', {scale: .92, opacity: 0, stagger: .09, duration: .5}, '-=.22')
          .from('[data-motion="achievement-item"]', {y: 16, scale: .94, opacity: 0, stagger: .07, duration: .38, clearProps: 'transform'}, '-=.3')
          .from('[data-motion="level-progress"] > i', {scaleX: 0, transformOrigin: 'left center', duration: .8, ease: 'power2.out'}, '-=.2')
          .from('[data-motion="summary-track"] > div', {y: 9, scale: .7, opacity: 0, stagger: .045, duration: .3}, '-=.15');

        gsap.to('[data-motion="shape-a"]', {x: 26, y: -18, rotation: 16, duration: 5.5, repeat: -1, yoyo: true, ease: 'sine.inOut'});
        gsap.to('[data-motion="shape-b"]', {x: -20, y: 22, rotation: -20, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut'});
        gsap.to('[data-motion="shape-c"]', {x: 16, y: 12, rotation: 360, duration: 16, repeat: -1, ease: 'none'});
        gsap.to('[data-motion="profile-avatar"]', {y: -5, rotation: 1.2, duration: 2.1, repeat: -1, yoyo: true, ease: 'sine.inOut'});
        gsap.to('[data-motion="mission-decor"] b', {rotation: 30, scale: 1.12, duration: 3.2, repeat: -1, yoyo: true, ease: 'sine.inOut'});
        gsap.to('[data-motion="mission-decor"] i:first-child', {y: 10, rotation: 225, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut'});
        gsap.to('[data-motion="mission-decor"] i:nth-child(2)', {x: -9, rotation: -180, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut'});
        gsap.utils.toArray('[data-motion="stat"] > i').forEach((icon, index) => {
          gsap.to(icon, {y: -3, rotation: index % 2 ? 2 : -2, duration: 1.7 + (index * .18), delay: index * .12, repeat: -1, yoyo: true, ease: 'sine.inOut'});
        });
        gsap.utils.toArray(`.${styles.unlocked} > i`).forEach((badge, index) => {
          gsap.to(badge, {rotation: index % 2 ? 4 : -4, scale: 1.04, duration: 1.8 + (index * .2), repeat: -1, yoyo: true, ease: 'sine.inOut'});
        });
      }

      if (layoutRef.current) {
        const saveLayout = () => {
          const nextLayout = {};
          draggablesRef.current.forEach((instance) => {
            nextLayout[instance.target.dataset.layoutId] = {
              x: Math.round(instance.x),
              y: Math.round(instance.y),
            };
          });
          window.localStorage.setItem(storageKey, JSON.stringify(nextLayout));
        };

        draggablesRef.current = Draggable.create(layoutCards, {
          type: 'x,y',
          dragResistance: .02,
          dragClickables: false,
          zIndexBoost: true,
          minimumMovement: 3,
          allowNativeTouchScrolling: false,
          onPress() {
            gsap.killTweensOf(this.target);
            gsap.set(this.target, {opacity: 1, rotation: 0, clipPath: 'none'});
            this.update();
          },
          onDragStart() {
            this.target.dataset.dragging = 'true';
          },
          onDragEnd() {
            delete this.target.dataset.dragging;
            saveLayout();
          },
        });
        draggablesRef.current.forEach((instance) => instance.disable());
      }
    }, pageRef);

    return () => {
      draggablesRef.current.forEach((instance) => instance.kill());
      draggablesRef.current = [];
      context.revert();
    };
  }, [loading, profile?.id]);

  const achievements = useMemo(() => [
    {icon: '01', name: 'Pembaca Pemula', description: 'Selesaikan buku pertamamu.', unlocked: stats.finished >= 1},
    {icon: '05', name: 'Rajin Membaca', description: 'Selesaikan sedikitnya 5 buku.', unlocked: stats.finished >= 5},
    {icon: '✓', name: 'Ringkasan Disetujui', description: 'Dapatkan persetujuan untuk ringkasan pertamamu.', unlocked: stats.valid >= 1},
    {icon: 'P', name: 'Pemburu Poin', description: 'Kumpulkan sedikitnya 500 poin.', unlocked: stats.points >= 500},
  ], [stats]);

  const summaryMonitoring = useMemo(() => ({
    pending: summaryHistory.filter((item) => item.status === 'pending').length,
    valid: summaryHistory.filter((item) => item.status === 'valid').length,
    rejected: summaryHistory.filter((item) => item.status === 'rejected').length,
  }), [summaryHistory]);

  const readerLevel = Math.max(1, Number(profile?.level || 1));
  const nextLevelPoints = readerLevel * 500;
  const currentLevelPoints = (readerLevel - 1) * 500;
  const levelProgress = Math.max(0, Math.min(100, ((stats.points - currentLevelPoints) / Math.max(1, nextLevelPoints - currentLevelPoints)) * 100));

  function updateField(field, value) {
    setForm((current) => ({...current, [field]: value}));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!form.full_name.trim()) return setError('Nama lengkap tidak boleh kosong.');
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
    };
    if (availableFields.bio) payload.bio = form.bio.trim() || null;
    if (availableFields.phone) payload.phone = form.phone.trim() || null;
    const {data, error: saveError} = await supabase.from('profiles').update(payload).eq('id', user.id).select().single();
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setProfile(data);
    setForm({full_name: data.full_name || '', bio: data.bio || '', phone: data.phone || ''});
    setSuccess('Perubahan profil berhasil disimpan.');
    setEditing(false);
  }

  function resetForm() {
    setForm({full_name: profile.full_name || '', bio: profile.bio || '', phone: profile.phone || ''});
    setError('');
    setSuccess('');
    setAvatarBroken(false);
  }

  function resetLayout() {
    if (!profile) return;
    window.localStorage.removeItem(`bacapop-profile-layout:v3:${profile.id}`);
    const instances = draggablesRef.current;
    const cards = instances.map((instance) => instance.target);
    const resetButton = pageRef.current?.querySelector('[data-layout-reset]');
    const syncDraggables = () => instances.forEach((instance) => instance.update());
    gsap.killTweensOf(cards);
    const timeline = gsap.timeline();
    if (resetButton) {
      timeline
        .to(resetButton, {rotation: -4, scale: 1.06, duration: .16, ease: 'power2.out'})
        .to(resetButton, {rotation: 0, scale: 1, duration: .42, ease: 'elastic.out(1, .45)'});
    }
    timeline
      .to(cards, {scale: .94, duration: .13, stagger: .025, ease: 'power2.in'})
      .to(cards, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: .72,
        stagger: {each: .055, from: 'random'},
        ease: 'back.out(1.9)',
        onUpdate: syncDraggables,
        onComplete: syncDraggables,
      });
  }

  function toggleLayoutMode() {
    setLayoutEditing((current) => {
      const next = !current;
      draggablesRef.current.forEach((instance) => next ? instance.enable() : instance.disable());
      return next;
    });
  }

  function openBookStatus(status) {
    if (!layoutEditing) router.push(`/dashboard/my-books?status=${status}`);
  }

  function openBookStatusWithKeyboard(event, status) {
    if (!layoutEditing && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openBookStatus(status);
    }
  }

  if (loading) return <main className={styles.loading}>Menyiapkan profilmu...</main>;
  if (!profile) return <main className={styles.loading}><div><h1>Profil belum tersedia</h1><p>{error}</p><Link href="/dashboard">Kembali ke Beranda</Link></div></main>;

  const initials = (profile.full_name || user?.email || 'BP').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <main className={styles.page} ref={pageRef}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/dashboard">Baca<span>Pop!</span></Link>
        <p>MENU PEMBACA</p>
        <nav>
          <Link href="/dashboard">Beranda</Link>
          <Link href="/dashboard/genres/dongeng">Genre Buku</Link>
          <Link href="/dashboard#koleksi">Semua Buku</Link>
          <Link href="/dashboard/rewards">Tukar Poin</Link>
          <Link href="/dashboard">Buku Saya</Link>
          <a href="#pencapaian">Poin &amp; Pencapaian</a>
          <Link className={styles.active} href="/dashboard/profile">Profil</Link>
        </nav>
        <button className={styles.logout} onClick={() => logoutFromDashboard(router)}>Keluar Akun</button>
      </aside>

      <section className={styles.workspace}>
        <div className={styles.motionScene} aria-hidden="true"><i data-motion="shape-a" /><i data-motion="shape-b" /><i data-motion="shape-c" /></div>
        <div className={styles.layoutToolbar}>
          <div><span>{layoutEditing ? 'ATUR POSISI' : 'TAMPILAN PROFIL'}</span><b>{layoutEditing ? 'Tarik kartu ke posisi yang kamu inginkan' : 'Kartu profil tersusun rapi'}</b><small>{layoutEditing ? 'Tekan Selesai jika sudah pas.' : 'Kamu bisa memindahkan posisi kartu.'}</small></div>
          <div className={styles.layoutActions}><button className={layoutEditing ? styles.finishLayout : ''} type="button" onClick={toggleLayoutMode}>{layoutEditing ? 'Selesai' : 'Atur Posisi'}</button><button type="button" data-layout-reset onClick={resetLayout}>Kembalikan</button></div>
        </div>

        <div className={styles.freeCanvas} data-layout-editing={layoutEditing ? 'true' : 'false'} ref={layoutRef}>
        <header className={`${styles.header} ${styles.draggableCard}`} data-tour="profile-overview" data-motion="profile-hero" data-layout-card data-layout-id="hero">
          <div className={styles.headerCopy} data-motion="hero-copy"><span>AKUN PEMBACA</span><h1>Profil Saya</h1><p>Atur data akun dan lihat kegiatan membacamu.</p></div>
          <div className={styles.headerMeta} data-motion="hero-meta"><b>{profile.points || 0} poin</b><span>Pengguna</span></div>
        </header>

        {error ? <div className={styles.error}>{error}</div> : null}
        {success ? <div className={styles.success}>{success}</div> : null}

        <section className={styles.stats} aria-label="Statistik membaca">
          <article className={styles.draggableCard} role="link" tabIndex={layoutEditing ? -1 : 0} onClick={() => openBookStatus('finished')} onKeyDown={(event) => openBookStatusWithKeyboard(event, 'finished')} data-motion="stat" data-layout-card data-layout-id="stat-finished"><i aria-hidden="true"><img src="/images/profile/book-finished.webp" alt="" /></i><div><span>Buku selesai</span><b>{stats.finished}</b><small>Total bacaan tamat</small></div><em>Lihat →</em></article>
          <article className={styles.draggableCard} role="link" tabIndex={layoutEditing ? -1 : 0} onClick={() => openBookStatus('reading')} onKeyDown={(event) => openBookStatusWithKeyboard(event, 'reading')} data-motion="stat" data-layout-card data-layout-id="stat-reading"><i aria-hidden="true"><img src="/images/profile/book-reading.webp" alt="" /></i><div><span>Sedang dibaca</span><b>{stats.reading}</b><small>Bacaan aktif kamu</small></div><em>Lanjut →</em></article>
          <article className={styles.draggableCard} role="link" tabIndex={layoutEditing ? -1 : 0} onClick={() => openBookStatus('summary')} onKeyDown={(event) => openBookStatusWithKeyboard(event, 'summary')} data-motion="stat" data-layout-card data-layout-id="stat-summary"><i aria-hidden="true"><img src="/images/profile/summary-valid.webp" alt="" /></i><div><span>Riwayat ringkasan</span><b>{stats.summaryTotal}</b><small>{stats.valid} sudah disetujui</small></div><em>Buka →</em></article>
          <article className={styles.draggableCard} role="link" tabIndex={layoutEditing ? -1 : 0} onClick={() => { if (!layoutEditing) document.getElementById('pencapaian')?.scrollIntoView({behavior: 'smooth'}); }} data-motion="stat" data-layout-card data-layout-id="stat-points"><i aria-hidden="true"><img src="/images/profile/points-coin.webp" alt="" /></i><div><span>Total poin</span><b>{stats.points}</b><small>Poin yang terkumpul</small></div><em>Lencana ↓</em></article>
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.leftColumn}>
            <article className={`${styles.profileCard} ${styles.draggableCard}`} data-motion="profile-card" data-layout-card data-layout-id="identity">
              <div className={styles.avatarWrap} data-motion="profile-avatar"><div className={styles.avatar}>{profile.avatar_url && !avatarBroken ? <img src={profile.avatar_url} alt="Avatar profil" onError={() => setAvatarBroken(true)} /> : <span>{initials}</span>}</div><i title="Akun aktif" aria-label="Akun aktif" /></div>
              <span className={styles.role}>PENGGUNA</span>
              <h2>{profile.full_name || 'Pembaca BacaPop'}</h2>
              <p>{profile.email || user?.email}</p>
              {profile.bio ? <blockquote>{profile.bio}</blockquote> : null}
              <div className={styles.profileFacts}><div><span>Status</span><b>{profile.status === 'active' ? 'Aktif' : 'Nonaktif'}</b></div><div><span>Total poin</span><b>{profile.points || 0}</b></div><div><span>Bergabung</span><b>{formatDate(profile.created_at || user?.created_at)}</b></div></div>
              <button className={styles.editTrigger} type="button" onClick={() => { resetForm(); setEditing(true); }}>Edit Profil</button>
            </article>
          </div>

          <div className={styles.rightColumn}>
            <section className={`${styles.achievementCard} ${styles.draggableCard}`} id="pencapaian" data-motion="achievement-card" data-layout-card data-layout-id="achievements">
              <div><span>LENCANA PEMBACA</span><h2>Pencapaian Saya</h2></div>
              <div className={styles.achievementGrid}>{achievements.map((item) => <article className={item.unlocked ? styles.unlocked : styles.locked} data-motion="achievement-item" key={item.name}><i>{item.icon}</i><div><h3>{item.name}</h3><p>{item.description}</p></div><b>{item.unlocked ? 'Terbuka' : 'Terkunci'}</b></article>)}</div>
            </section>

            <section className={`${styles.readerMissionCard} ${styles.draggableCard}`} data-motion="account-card" data-layout-card data-layout-id="reader-mission">
              <div className={styles.missionDecor} data-motion="mission-decor" aria-hidden="true"><i /><i /><b>★</b></div>
              <div className={styles.readerMissionHead}><div><span>MISI PEMBACA</span><h2>Menuju Level {readerLevel + 1}</h2></div><b>LV. {readerLevel}</b></div>
              <div className={styles.levelProgress} data-motion="level-progress"><i style={{width: `${levelProgress}%`}} /></div>
              <div className={styles.levelCaption}><span>{stats.points} poin</span><b>{Math.max(0, nextLevelPoints - stats.points)} poin lagi</b></div>
              <div className={styles.nextMissions}>
                <article><i>{stats.finished ? '✓' : '01'}</i><span><b>Selesaikan buku</b><small>{stats.finished} sudah selesai</small></span></article>
                <article><i>{stats.valid ? '✓' : '02'}</i><span><b>Ringkasan disetujui</b><small>{stats.valid} sudah disetujui</small></span></article>
              </div>
            </section>
          </div>
        </div>

        <section className={`${styles.summaryMonitorCard} ${styles.draggableCard}`} data-tour="profile-summary" data-motion="summary-card" data-layout-card data-layout-id="summary-monitor">
          <header className={styles.summaryMonitorHead}>
            <div><span>HASIL RINGKASAN</span><h2>Status Ringkasan</h2><p>Lihat ringkasanmu sejak dikirim sampai selesai diperiksa admin.</p></div>
            <Link href="/dashboard/my-books?status=summary">Lihat halaman lengkap →</Link>
          </header>

          <div className={styles.summaryOverview} aria-label="Status ringkasan">
            <article data-status="pending"><span>Menunggu</span><b>{summaryMonitoring.pending}</b><small>Sedang diperiksa admin</small></article>
            <article data-status="valid"><span>Disetujui</span><b>{summaryMonitoring.valid}</b><small>Sudah mendapat poin</small></article>
            <article data-status="rejected"><span>Ditolak</span><b>{summaryMonitoring.rejected}</b><small>Perlu diperbaiki</small></article>
          </div>

          {summaryHistory.length ? (
            <div className={styles.summaryTimeline}>
              {summaryHistory.map((item, index) => (
                <article className={styles.summaryHistoryItem} key={item.id}>
                  <div className={styles.summaryHistoryTop}>
                    <div><small>RINGKASAN #{String(summaryHistory.length - index).padStart(2, '0')}</small><h3>{item.book?.title || 'Buku tidak tersedia'}</h3><p>{item.book?.author || 'BacaPop Library'}</p></div>
                    <span className={styles.summaryStatus} data-status={item.status}>{item.status === 'valid' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</span>
                  </div>

                  <div className={styles.trackingRail} data-motion="summary-track" data-status={item.status} aria-label={`Status ${item.status}`}>
                    <div data-state="done"><i>1</i><b>Dikirim</b></div>
                    <div data-state="done"><i>2</i><b>Menunggu</b></div>
                    <div data-state={item.status === 'pending' ? 'current' : item.status}><i>3</i><b>{item.status === 'pending' ? 'Diperiksa' : item.status === 'valid' ? 'Disetujui' : 'Ditolak'}</b></div>
                    <div data-state={item.status === 'valid' ? 'done' : 'waiting'}><i>4</i><b>Poin</b></div>
                  </div>
                  <div className={styles.trackingCurrent} data-status={item.status}>
                    <b>{item.status === 'valid' ? 'Selesai' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</b>
                    <span>{item.status === 'valid' ? `Disetujui admin · +${item.points_awarded || 0} poin` : item.status === 'rejected' ? 'Baca catatan admin lalu perbaiki' : 'Sedang diperiksa admin'}</span>
                  </div>

                  <details className={styles.trackingDetails}>
                    <summary><span>Lihat isi dan catatan ringkasan</span><i>⌄</i></summary>
                    <div className={styles.summaryCopy}><b>{item.title || 'Ringkasan tanpa judul'}</b><p>{item.summary_text}</p></div>
                    {item.admin_note ? <blockquote><b>Catatan admin</b><span>{item.admin_note}</span></blockquote> : null}
                  </details>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.summaryEmpty}><b>Belum ada riwayat ringkasan.</b><p>Selesaikan satu buku dan kirim ringkasan pertamamu.</p><Link href="/dashboard#koleksi">Cari buku</Link></div>
          )}
        </section>
        </div>

        {editing ? (
          <div className={styles.modalBackdrop} role="presentation" data-motion="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false); }}>
            <form className={styles.formCard} onSubmit={saveProfile} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" data-motion="modal-card">
              <button className={styles.modalClose} type="button" aria-label="Tutup form edit profil" onClick={() => setEditing(false)}>×</button>
              <div><span>EDIT PROFIL</span><h2 id="edit-profile-title">Informasi pribadi</h2><p>Email, role, status, dan poin tidak dapat diubah.</p></div>
              {error ? <div className={styles.modalError}>{error}</div> : null}
              <div className={styles.modalFieldsRow}>
                <label>Nama lengkap<input value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} maxLength="100" placeholder="Nama yang tampil di profil" autoFocus /></label>
                {availableFields.phone ? <label>Nomor telepon<input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} maxLength="30" placeholder="Opsional" /></label> : null}
              </div>
              {availableFields.bio ? <label>Bio singkat<textarea value={form.bio} onChange={(event) => updateField('bio', event.target.value)} rows="3" maxLength="300" placeholder="Ceritakan sedikit tentang dirimu..." /><small>{form.bio.length}/300 karakter</small></label> : null}
              <div className={styles.formActions}><button className="modal-action" type="button" onClick={resetForm}>Reset</button><button className={`${styles.saveButton} modal-action`} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button></div>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
