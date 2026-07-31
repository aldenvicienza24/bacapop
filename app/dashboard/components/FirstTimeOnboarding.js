'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname, useRouter} from 'next/navigation';
import {getDemoBooks} from '../../lib/demoBooks';
import {supabase} from '../../lib/supabase';
import styles from './first-time-onboarding.module.css';

const ONBOARDING_TEST_EMAIL = 'bialmaa06@gmail.com';
const ACTIVE_KEY = 'bacapop:onboarding:active';
const STEP_KEY = 'bacapop:onboarding:step';
const TOUR_BOOK_ID = getDemoBooks('dongeng')[0]?.id;

function route(path) {
  return path?.replace(':bookId', TOUR_BOOK_ID || '');
}

function findVisibleTarget(selector) {
  if (!selector || typeof document === 'undefined') return null;

  return [...document.querySelectorAll(selector)].find((element) => {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    return rect.width > 2
      && rect.height > 2
      && computed.display !== 'none'
      && computed.visibility !== 'hidden';
  }) || null;
}

const steps = [
  {
    path: '/dashboard',
    target: '[data-tour="welcome"]',
    eyebrow: 'SELAMAT DATANG DI BACAPOP',
    title: 'Ini halaman utamamu',
    description: 'Di sini kamu bisa melihat semua buku, jenis cerita, dan kegiatan membacamu.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="menu-home"]',
    eyebrow: 'MENU UTAMA',
    title: 'Beranda',
    description: 'Tekan tombol ini kapan saja untuk kembali ke halaman utama.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="genres"], [data-tour="genre-list"]',
    eyebrow: 'PILIH JENIS CERITA',
    title: 'Pilih cerita yang kamu suka',
    description: 'Kamu bisa memilih Dongeng, Horror, Komik, atau Romance.',
  },
  {
    path: '/dashboard/genres/dongeng',
    target: '[data-tour="genre-hero"]',
    eyebrow: 'HALAMAN DONGENG',
    title: 'Sekarang kamu berada di koleksi Dongeng',
    description: 'Bagian ini menunjukkan tema Dongeng dan jumlah buku yang tersedia.',
  },
  {
    path: '/dashboard/genres/dongeng',
    target: '[data-tour="genre-collection"]',
    eyebrow: 'DAFTAR BUKU',
    title: 'Pilih buku yang ingin dibaca',
    description: 'Lihat informasi bukunya, lalu tekan “Baca Sekarang”.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="search"]',
    eyebrow: 'CARI BUKU',
    title: 'Cari judul atau penulis',
    description: 'Ketik judul atau nama penulis. Kamu juga bisa melihat apakah buku gratis, memakai poin, atau harus dibeli.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="notifications"]',
    eyebrow: 'PEMBERITAHUAN',
    title: 'Periksa notifikasi lewat tombol lonceng',
    description: 'Di sini kamu menerima pemberitahuan tentang buku baru, hasil ringkasan, poin, dan pembayaran.',
    items: ['Buku baru sudah tersedia', 'Ringkasan disetujui dan poin masuk', 'Ringkasan atau pembayaran perlu diperbaiki'],
  },
  {
    path: '/dashboard',
    target: '[data-tour="stats"]',
    eyebrow: 'INFORMASI SINGKAT',
    title: 'Lihat jumlah buku dengan cepat',
    description: 'Bagian ini menampilkan jumlah buku, jenis cerita, dan buku terbaru.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="genre-list"]',
    eyebrow: 'PILIH JENIS CERITA',
    title: 'Buka jenis cerita dengan cepat',
    description: 'Tekan nama jenis cerita untuk melihat semua bukunya.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="collection"]',
    eyebrow: 'SEMUA BUKU',
    title: 'Lihat semua buku yang tersedia',
    description: 'Semua buku ditampilkan bersama dengan sampul, penulis, jumlah halaman, dan cara membukanya.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="book-card"]',
    eyebrow: 'KARTU BUKU',
    title: 'Pilih cara membuka buku',
    description: 'Tekan “Mulai baca” untuk membaca, “Tukar poin” untuk memakai poin, atau “Beli” untuk membayar dengan QRIS.',
  },
  {
    path: '/dashboard/read/:bookId',
    target: '[data-tour="reader-view"]',
    eyebrow: 'HALAMAN BACA',
    title: 'Buku terbuka di sini',
    description: 'Isi buku bisa berupa teks, gambar komik, atau PDF.',
  },
  {
    path: '/dashboard/read/:bookId',
    target: '[data-tour="reader-controls"]',
    eyebrow: 'PINDAH HALAMAN',
    title: 'Pindah halaman dari sini',
    description: 'Gunakan “Sebelumnya” dan “Berikutnya”. Nomor di tengah menunjukkan posisi halamanmu saat ini.',
  },
  {
    path: '/dashboard/read/:bookId',
    target: '[data-tour="reader-progress"]',
    eyebrow: 'TERSIMPAN OTOMATIS',
    title: 'Posisi bacaanmu tersimpan',
    description: 'Persentase bertambah saat kamu membaca. Setelah 100%, kamu bisa menulis ringkasan.',
  },
  {
    path: '/dashboard/books/:bookId',
    target: '[data-tour="book-progress"]',
    eyebrow: 'DETAIL BUKU',
    title: 'Lihat kemajuan membaca',
    description: 'Di sini kamu bisa melihat halaman terakhir, jumlah halaman, dan menyimpan posisi bacaan.',
  },
  {
    path: '/dashboard/books/:bookId',
    target: '[data-tour="book-summary"]',
    eyebrow: 'RINGKASAN BUKU',
    title: 'Tulis ringkasan setelah selesai membaca',
    description: 'Baca aturannya, tulis judul singkat, lalu ceritakan isi buku dengan bahasamu sendiri.',
    items: ['Menunggu: sedang diperiksa admin', 'Disetujui: kamu mendapat poin', 'Ditolak: perbaiki sesuai catatan admin'],
  },
  {
    path: '/dashboard',
    target: '[data-tour="profile"]',
    eyebrow: 'PROFIL',
    title: 'Buka profilmu',
    description: 'Lihat data akun, kegiatan membaca, pencapaian, poin, dan riwayat ringkasan.',
  },
  {
    path: '/dashboard/profile',
    target: '[data-tour="profile-overview"]',
    eyebrow: 'HALAMAN PROFIL',
    title: 'Atur data akunmu',
    description: 'Lihat poin, ubah profil, dan periksa informasi akunmu.',
  },
  {
    path: '/dashboard/profile',
    target: '[data-tour="profile-summary"]',
    eyebrow: 'HASIL RINGKASAN',
    title: 'Lihat hasil dari admin',
    description: 'Ringkasan akan berstatus Menunggu, Disetujui, atau Ditolak. Jika ditolak, baca catatan admin lalu perbaiki.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="menu-rewards"]',
    eyebrow: 'MENU TUKAR POIN',
    title: 'Buka halaman tukar poin',
    description: 'Poin dari ringkasan yang disetujui bisa ditukar dengan buku premium atau hadiah.',
  },
  {
    path: '/dashboard/rewards',
    target: '[data-tour="reward-balance"]',
    eyebrow: 'POINMU',
    title: 'Lihat jumlah poin',
    description: 'Jumlah poin yang bisa dipakai terlihat di bagian atas halaman.',
  },
  {
    path: '/dashboard/rewards',
    target: '[data-tour="reward-catalog"]',
    eyebrow: 'DAFTAR HADIAH',
    title: 'Pilih hadiah yang kamu inginkan',
    description: 'Lihat jumlah poin yang dibutuhkan, lalu tekan tombol tukar. Buku premium langsung terbuka setelah berhasil.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="menu-store"]',
    eyebrow: 'MENU BELI BUKU',
    title: 'Buka toko buku',
    description: 'Beli buku dengan QRIS. Buku yang sudah dibeli akan tersimpan di akunmu.',
  },
  {
    path: '/dashboard/store',
    target: '[data-tour="store-catalog"]',
    action: 'close-checkout',
    eyebrow: 'BUKU BERBAYAR',
    title: 'Lihat buku dan harganya',
    description: 'Periksa judul, penulis, jumlah halaman, dan harga sebelum membeli.',
  },
  {
    path: '/dashboard/store',
    target: '[data-tour="store-buy"]',
    action: 'close-checkout',
    eyebrow: 'BELI BUKU',
    title: 'Tekan Beli untuk melihat QRIS',
    description: 'Jika buku sudah dibeli, tombol berubah menjadi “Baca”. Jika pembayaran sedang diperiksa, tombol berubah menjadi “Diproses”.',
  },
  {
    path: '/dashboard/store',
    target: '[data-tour="store-qris"]',
    action: 'open-checkout',
    eyebrow: 'SCAN QRIS',
    title: 'Scan lalu bayar sesuai harga',
    description: 'Gunakan aplikasi yang mendukung QRIS. Bayar dengan jumlah yang sama seperti harga buku.',
  },
  {
    path: '/dashboard/store',
    target: '[data-tour="proof-upload"]',
    action: 'open-checkout',
    eyebrow: 'BUKTI PEMBAYARAN',
    title: 'Kirim foto bukti pembayaran',
    description: 'Pilih foto JPG, PNG, atau WebP dengan ukuran paling besar 5 MB. Admin akan memeriksa foto ini.',
  },
  {
    path: '/dashboard/store',
    target: '[data-tour="payment-confirm"]',
    action: 'open-checkout',
    eyebrow: 'KIRIM PEMBAYARAN',
    title: 'Kirim setelah foto dipilih',
    description: 'Pembayaran akan menunggu pemeriksaan admin. Setelah disetujui, buku bisa langsung dibaca.',
  },
  {
    path: '/dashboard',
    target: '[data-tour="logout"]',
    eyebrow: 'KEAMANAN AKUN',
    title: 'Keluar dari akun',
    description: 'Gunakan tombol ini jika memakai perangkat bersama. Data bacaan, ringkasan, poin, dan pembayaranmu tetap tersimpan.',
  },
  {
    path: '/dashboard',
    target: null,
    eyebrow: 'PANDUAN SELESAI',
    title: 'Kamu siap menggunakan BacaPop',
    description: 'Pilih buku, baca sampai selesai, tulis ringkasan, tunggu pemeriksaan admin, lalu gunakan poin atau beli buku dengan QRIS.',
  },
];

function getStorageKey(userId) {
  return `bacapop:onboarding:complete:${userId}`;
}

function getSavedStep() {
  const value = Number(sessionStorage.getItem(STEP_KEY));
  return Number.isInteger(value) && value >= 0 && value < steps.length ? value : 0;
}

export default function FirstTimeOnboarding() {
  const router = useRouter();
  const pathname = usePathname();
  const bootstrapped = useRef(false);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [targetUnavailable, setTargetUnavailable] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const step = steps[stepIndex];
  const isTestAccount = user?.email?.trim().toLowerCase() === ONBOARDING_TEST_EMAIL;

  /*
   * Dashboard dan halaman genre memakai susunan navbar yang berbeda.
   * Saat berpindah halaman, tombol Panduan dapat dipasang ulang. Pulihkan
   * tur langsung dari sessionStorage agar perpindahan tidak menunggu proses
   * autentikasi Supabase dan langkah tetap berlanjut di halaman tujuan.
   */
  useEffect(() => {
    if (sessionStorage.getItem(ACTIVE_KEY) !== '1') return;

    setStepIndex(getSavedStep());
    setTargetRect(null);
    setTargetUnavailable(false);
    setTransitioning(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({data}) => {
      if (!active) return;
      setUser(data.session?.user || null);
      setReady(true);
    });
    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user || null);
      setReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const updateTarget = useCallback(() => {
    if (!open || !step?.target) {
      setTargetRect(null);
      return false;
    }

    const target = findVisibleTarget(step.target);
    if (!target) {
      setTargetRect(null);
      return false;
    }

    const rect = target.getBoundingClientRect();
    const padding = 7;
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const top = Math.max(7, rect.top - padding);
    const left = Math.max(7, rect.left - padding);
    setTargetRect({
      top,
      left,
      width: Math.max(24, Math.min(viewportWidth - left - 7, rect.width + padding * 2)),
      height: Math.max(24, Math.min(viewportHeight - top - 7, rect.height + padding * 2)),
      bottom: Math.min(viewportHeight - 7, rect.bottom + padding),
    });
    return true;
  }, [open, step]);

  const moveTo = useCallback((nextIndex) => {
    const safeIndex = Math.max(0, Math.min(steps.length - 1, nextIndex));
    const nextPath = route(steps[safeIndex].path);
    const changesRoute = Boolean(nextPath && nextPath !== pathname);
    sessionStorage.setItem(ACTIVE_KEY, '1');
    sessionStorage.setItem(STEP_KEY, String(safeIndex));
    setTargetRect(null);
    setTargetUnavailable(false);
    setTransitioning(changesRoute);
    setStepIndex(safeIndex);
  }, [pathname]);

  useEffect(() => {
    if (!ready || !user?.id || bootstrapped.current) return;
    bootstrapped.current = true;

    const metadata = user.user_metadata || {};
    const completed = !isTestAccount && (
      localStorage.getItem(getStorageKey(user.id)) === '1'
      || metadata.onboarding_completed === true
    );
    const activeTour = sessionStorage.getItem(ACTIVE_KEY) === '1';
    const pending = activeTour
      || sessionStorage.getItem('bacapop:onboarding:pending') === '1'
      || metadata.onboarding_required === true
      || isTestAccount;

    if (!completed && pending) {
      const savedStep = activeTour ? getSavedStep() : 0;
      const timer = window.setTimeout(() => {
        sessionStorage.setItem(ACTIVE_KEY, '1');
        sessionStorage.setItem(STEP_KEY, String(savedStep));
        setStepIndex(savedStep);
        setOpen(true);
      }, 180);
      return () => window.clearTimeout(timer);
    }
  }, [isTestAccount, ready, user]);

  useEffect(() => {
    if (!open) return undefined;

    const expectedPath = route(step.path);
    if (expectedPath && pathname !== expectedPath) {
      setTargetRect(null);
      setTransitioning(true);
      const navigationTimer = window.setTimeout(() => router.replace(expectedPath), 70);
      return () => window.clearTimeout(navigationTimer);
    }

    let attempts = 0;
    let interval;
    const revealTimer = window.setTimeout(() => setTransitioning(false), 220);
    const prepareAndLocate = () => {
      attempts += 1;

      if (step.action === 'close-checkout') {
        document.querySelector('[data-tour="store-checkout"] [aria-label="Tutup checkout"]')?.click();
      }
      if (step.action === 'open-checkout' && !findVisibleTarget(step.target)) {
        window.dispatchEvent(new Event('bacapop:onboarding:open-checkout'));
      }

      const target = findVisibleTarget(step.target);
      if (target) {
        setTargetUnavailable(false);
        const mobileViewport = (window.visualViewport?.width || window.innerWidth) <= 640;
        target.scrollIntoView({
          behavior: attempts === 1 ? 'smooth' : 'auto',
          block: mobileViewport ? 'start' : 'center',
          inline: 'center',
        });
        window.setTimeout(updateTarget, attempts === 1 ? 140 : 40);
        if (interval) window.clearInterval(interval);
      } else if (step.target && attempts >= 40) {
        setTargetUnavailable(true);
        setTransitioning(false);
        if (interval) window.clearInterval(interval);
      } else if (!step.target) {
        updateTarget();
        if (interval) window.clearInterval(interval);
      }
    };

    const startTimer = window.setTimeout(prepareAndLocate, 60);
    interval = window.setInterval(prepareAndLocate, 150);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    window.visualViewport?.addEventListener('resize', updateTarget);
    window.visualViewport?.addEventListener('scroll', updateTarget);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
      window.visualViewport?.removeEventListener('resize', updateTarget);
      window.visualViewport?.removeEventListener('scroll', updateTarget);
    };
  }, [open, pathname, router, step, updateTarget]);

  const finish = useCallback(async () => {
    setOpen(false);
    setStepIndex(0);
    setTargetRect(null);
    setTargetUnavailable(false);
    setTransitioning(false);
    sessionStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(STEP_KEY);
    sessionStorage.removeItem('bacapop:onboarding:pending');

    if (isTestAccount) return;
    if (user?.id) localStorage.setItem(getStorageKey(user.id), '1');

    await supabase.auth.updateUser({
      data: {
        onboarding_required: false,
        onboarding_completed: true,
      },
    });
  }, [isTestAccount, user]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKey(event) {
      if (event.key === 'Escape') finish();
      if (event.key === 'ArrowRight') {
        if (stepIndex === steps.length - 1) finish();
        else moveTo(stepIndex + 1);
      }
      if (event.key === 'ArrowLeft') moveTo(stepIndex - 1);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [finish, moveTo, open, stepIndex]);

  const panelLayout = useMemo(() => {
    if (!targetRect || typeof window === 'undefined') {
      return {style: {}, placement: 'center'};
    }

    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const mobileViewport = viewportWidth <= 640;
    const edge = mobileViewport ? 10 : 12;
    const gap = mobileViewport ? 12 : 15;
    const panelWidth = Math.min(mobileViewport ? 420 : 380, viewportWidth - edge * 2);
    const estimatedHeight = step.items?.length
      ? (mobileViewport ? 300 : 325)
      : (mobileViewport ? 220 : 245);
    const left = Math.max(edge, Math.min(
      viewportWidth - panelWidth - edge,
      targetRect.left + targetRect.width / 2 - panelWidth / 2,
    ));
    const spaceBelow = viewportHeight - targetRect.bottom - edge;
    const spaceAbove = targetRect.top - edge;
    const placeBelow = spaceBelow >= Math.min(estimatedHeight, viewportHeight * 0.4)
      || spaceBelow >= spaceAbove;
    const placement = placeBelow ? 'below' : 'above';
    let top = placeBelow
      ? targetRect.bottom + gap
      : targetRect.top - estimatedHeight - gap;
    top = Math.max(edge, Math.min(viewportHeight - estimatedHeight - edge, top));
    const pointerX = Math.max(
      24,
      Math.min(panelWidth - 24, targetRect.left + targetRect.width / 2 - left),
    );

    return {
      placement,
      style: {
        left,
        top,
        width: panelWidth,
        maxHeight: Math.min(estimatedHeight + 50, Math.max(190, viewportHeight - top - edge)),
        '--guide-pointer-x': `${pointerX}px`,
      },
    };
  }, [step, targetRect]);

  function startTour() {
    sessionStorage.setItem(ACTIVE_KEY, '1');
    sessionStorage.setItem(STEP_KEY, '0');
    setTransitioning(pathname !== '/dashboard');
    setTargetUnavailable(false);
    setStepIndex(0);
    setOpen(true);
  }

  if (!open) {
    return (
      <button className={styles.helpButton} type="button" onClick={startTour} aria-label="Buka panduan fitur BacaPop">
        <span>?</span>
        <b>Panduan</b>
      </button>
    );
  }

  /*
   * DashboardUtilities menempatkan tombol Panduan di dalam navbar.
   * Overlay tidak boleh ikut berada di sana karena transform/layout navbar
   * akan menggeser koordinat fixed element dari target yang sebenarnya.
   */
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  if (transitioning) {
    return createPortal((
      <div className={styles.tourLayer} role="status" aria-live="polite" aria-label="Membuka halaman panduan berikutnya">
        <div className={`${styles.scrim} ${styles.scrimFull}`} />
        <section className={styles.routePanel}>
          <div className={styles.routeIcon} aria-hidden="true"><i /><i /><i /></div>
          <span>MENUJU FITUR BERIKUTNYA</span>
          <h2>{step.title}</h2>
          <p>Menyiapkan halaman dan posisi fitur…</p>
          <div className={styles.routeProgress}><i /></div>
        </section>
      </div>
    ), portalTarget);
  }

  if (step.target && !targetRect && !targetUnavailable) {
    return createPortal((
      <div className={styles.tourLayer} role="status" aria-live="polite" aria-label={`Menemukan fitur ${step.title}`}>
        <div className={`${styles.scrim} ${styles.scrimFull}`} />
        <section className={styles.routePanel}>
          <div className={`${styles.routeIcon} ${styles.locatingIcon}`} aria-hidden="true"><i /><i /><i /></div>
          <span>MENEMUKAN FITUR YANG DISOROT</span>
          <h2>{step.title}</h2>
          <p>Panduan akan muncul tepat di dekat tombol atau bagian ini.</p>
          <div className={styles.routeProgress}><i /></div>
        </section>
      </div>
    ), portalTarget);
  }

  return createPortal((
    <div className={styles.tourLayer} role="dialog" aria-modal="true" aria-label="Panduan fitur BacaPop">
      <div className={`${styles.scrim} ${targetRect ? styles.scrimWithSpotlight : styles.scrimFull}`} />
      {targetRect ? (
        <div
          className={styles.spotlight}
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      ) : null}

      <section
        className={`${styles.tourPanel} ${targetRect ? '' : styles.centerPanel}`}
        style={panelLayout.style}
        data-placement={targetRect ? panelLayout.placement : 'center'}
        key={`${pathname}-${stepIndex}`}
      >
        <div className={styles.panelTop}>
          <span>{step.eyebrow}</span>
          <button type="button" onClick={finish}>Lewati tur</button>
        </div>
        <div className={styles.progress} aria-label={`Langkah ${stepIndex + 1} dari ${steps.length}`}>
          <i style={{width: `${((stepIndex + 1) / steps.length) * 100}%`}} />
        </div>
        <small>LANGKAH {String(stepIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</small>
        <h2>{step.title}</h2>
        <p>{step.description}</p>
        {step.items?.length ? (
          <ul className={styles.stepItems}>
            {step.items.map((item) => <li key={item}><i aria-hidden="true">✓</i><span>{item}</span></li>)}
          </ul>
        ) : null}
        <div className={styles.panelActions}>
          <button type="button" disabled={stepIndex === 0} onClick={() => moveTo(stepIndex - 1)}>
            ← Sebelumnya
          </button>
          <button type="button" onClick={() => {
            if (stepIndex === steps.length - 1) finish();
            else moveTo(stepIndex + 1);
          }}>
            {stepIndex === steps.length - 1 ? 'Selesai, mulai membaca ✓' : 'Lanjut →'}
          </button>
        </div>
      </section>
    </div>
  ), portalTarget);
}
