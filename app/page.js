'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';
import { getRoleDashboard, getRoleFromEmail } from './lib/roles';
import styles from './page.module.css';

const features = [
  {
    title: 'Daftar Buku',
    label: 'Temukan buku',
    color: '#45d6b4',
    icon: '⌕',
    desc: 'Cari buku digital berdasarkan jenis cerita yang kamu suka.',
    points: ['Banyak pilihan buku', 'Pilih jenis cerita', 'Simpan buku favorit'],
  },
  {
    title: 'Nyaman Dibaca',
    label: 'Baca online',
    color: '#83b9ff',
    icon: '◫',
    desc: 'Baca langsung di perangkatmu. Posisi halaman akan tersimpan otomatis.',
    points: ['Tampilan nyaman', 'Tandai halaman', 'Posisi tersimpan'],
  },
  {
    title: 'Ringkasan',
    label: 'Catat insight',
    color: '#ff9a4d',
    icon: '✎',
    desc: 'Tulis kembali isi buku dengan bahasamu sendiri dan dapatkan poin.',
    points: ['Formulir ringkasan', 'Diperiksa admin', 'Riwayat tulisan'],
  },
  {
    title: 'Poin & Lencana',
    label: 'Naik level',
    color: '#f5d84d',
    icon: '↗',
    desc: 'Selesaikan buku, kumpulkan poin, dan dapatkan pencapaian baru.',
    points: ['Poin membaca', 'Lencana pencapaian', 'Peringkat pembaca'],
  },
];

export default function Home() {
  const router = useRouter();
  const cursorRef = useRef(null);
  const cursorTimerRef = useRef(null);
  const [mode, setMode] = useState('daftar');
  const [activeBook, setActiveBook] = useState(0);
  const [bookOpen, setBookOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function moveCursor(event) {
      if (!cursorRef.current) return;
      cursorRef.current.style.setProperty('--cursor-x', `${event.clientX}px`);
      cursorRef.current.style.setProperty('--cursor-y', `${event.clientY}px`);
      cursorRef.current.dataset.visible = 'true';
      window.clearTimeout(cursorTimerRef.current);
    }

    function hideCursor() {
      if (cursorRef.current) cursorRef.current.dataset.visible = 'false';
      window.clearTimeout(cursorTimerRef.current);
    }

    window.addEventListener('pointermove', moveCursor, { passive: true });
    document.documentElement.addEventListener('mouseleave', hideCursor);

    return () => {
      window.removeEventListener('pointermove', moveCursor);
      document.documentElement.removeEventListener('mouseleave', hideCursor);
      window.clearTimeout(cursorTimerRef.current);
    };
  }, []);

  function openAuth(nextMode) {
    setMode(nextMode);
    setAuthMessage('');
    setAuthBusy(false);
    setShowAuthPassword(false);
    setAuthOpen(true);
  }

  function updateAuth(event) {
    setAuthForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function showAuthError(error) {
    const rawMessage = error?.message || '';
    const lowerMessage = rawMessage.toLowerCase();
    const message = rawMessage === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke Supabase. Periksa internet lalu coba lagi.'
      : lowerMessage.includes('invalid login credentials')
        ? 'Email atau password salah, akun belum terdaftar, atau akun ini dibuat lewat Google. Coba cek lagi atau daftar dulu.'
        : lowerMessage.includes('email not confirmed')
          ? 'Email belum dikonfirmasi. Cek inbox email kamu dulu.'
          : rawMessage || 'Autentikasi gagal. Silakan coba lagi.';
    setAuthMessage(message);
  }

  async function handleAuth(event) {
    event.preventDefault();
    const name = authForm.name.trim();
    const email = authForm.email.trim().toLowerCase();

    if (!email) {
      setAuthMessage('Email wajib diisi.');
      return;
    }

    if (mode === 'lupa') {
      setAuthBusy(true);
      setAuthMessage('');
      try {
        const {error} = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      setAuthMessage('Jika email terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Periksa kotak masuk dan folder spam.');
      } catch (error) {
        showAuthError(error);
      } finally {
        setAuthBusy(false);
      }
      return;
    }

    if (!authForm.password) {
      setAuthMessage('Email dan kata sandi harus diisi.');
      return;
    }

    if (authForm.password.length < 8) {
      setAuthMessage('Kata sandi harus berisi minimal 8 karakter.');
      return;
    }

    if (mode === 'daftar') {
      if (!name) {
        setAuthMessage('Nama lengkap wajib diisi.');
        return;
      }
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: authForm.password,
          options: {
            data: {
              full_name: name,
              role: getRoleFromEmail(email),
              onboarding_required: true,
              onboarding_completed: false,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        sessionStorage.setItem('bacapop:onboarding:pending', '1');
        setAuthMessage(data.session ? 'Akun berhasil dibuat!' : 'Cek email untuk konfirmasi akunmu.');
        if (!data.session) return;
        if (data.user) router.replace(getRoleDashboard(data.user));
      } catch (error) {
        showAuthError(error);
        return;
      }
    } else {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: authForm.password,
        });
        if (error) throw error;
        setAuthMessage('Berhasil masuk!');
        if (data.user) {
          router.replace(getRoleDashboard(data.user));
        }
      } catch (error) {
        showAuthError(error);
        return;
      }
    }

    setAuthForm({ name: '', email: '', password: '' });
    setTimeout(() => setAuthOpen(false), 700);
  }

  async function loginWithGoogle() {
    try {
      if (mode === 'daftar') sessionStorage.setItem('bacapop:onboarding:pending', '1');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      showAuthError(error);
    }
  }

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      showAuthError(error);
    }
  }

  const currentUser = user;
  const displayName = currentUser?.user_metadata?.full_name
    || currentUser?.user_metadata?.name
    || currentUser?.email
    || 'Pembaca';

  return (
    <main className={styles.page}>
      <div
        ref={cursorRef}
        className={styles.paperCursor}
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32">
          <path d="M2 2 29 13.5 17.5 19 12 30 2 2Z" />
          <path d="M2 2 17.5 19 29 13.5" />
        </svg>
      </div>
      <div className={styles.doodleOne}>✦</div>
      <div className={styles.doodleTwo}>♡</div>
      <div className={styles.doodleThree}>⌁</div>

      <nav className={styles.navbar}>
        <a className={styles.brand} href="#">
          <span className={styles.logo}>B</span>
          <b>BacaPop!</b>
        </a>

        {currentUser ? (
          <div className={styles.authNav}>
            <button onClick={logout}>Keluar</button>
            <button className={styles.loginButton} onClick={() => router.push(getRoleDashboard(currentUser))}>
              Beranda <span>→</span>
            </button>
          </div>
        ) : (
          <div className={styles.authNav}>
            <button onClick={() => openAuth('masuk')}>Masuk</button>
            <button className={styles.loginButton} onClick={() => openAuth('daftar')}>
              Daftar <span>↗</span>
            </button>
          </div>
        )}
      </nav>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <div className={styles.badge}><span>★</span> BACA • RINGKAS • DAPAT POIN</div>
          <h1>
            Baca buku.
            <br />
            <span>Dapat hadiah!</span>
          </h1>
          <p>
            Perpustakaan digital yang bikin kebiasaan membaca terasa seperti
            bermain. Selesaikan buku, kumpulkan XP, dan buka pencapaian baru.
          </p>

          <form
            className={styles.joinForm}
            onSubmit={(event) => {
              event.preventDefault();
              openAuth('daftar');
            }}
          >
            <div>
              <label>Mulai petualanganmu</label>
              <input
                type="email"
                aria-label="Email"
                placeholder="Tulis email kamu..."
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <button>
              Gabung gratis
              <span>→</span>
            </button>
          </form>

          <div className={styles.proof}>
            <div className={styles.avatars}>
              <span>🧑🏽</span><span>👩🏻</span><span>🧑🏻‍🦱</span>
            </div>
            <p><b>2.400+ pembaca</b><br />aktif membaca minggu ini</p>
          </div>
        </div>

        <div className={styles.visual} id="koleksi">
          <div className={styles.stageDecor} aria-hidden="true">
            <span />
            <em>
              <svg viewBox="0 0 48 48">
                <path d="M45 24 5 7l8.8 17L5 41l40-17Z" />
                <path d="M13.8 24H45M13.8 24 5 7" />
              </svg>
            </em>
          </div>
          <div className={styles.burst}>{bookOpen ? 'BACA!' : 'BUKA!'}</div>
          <div className={styles.xpSticker}>+50 XP</div>
          <div className={styles.starSticker}>★</div>

          <div className={styles.bookShadow} />
          <div className={`${styles.book} ${bookOpen ? styles.bookOpen : ''}`}>
            <div
              className={styles.bookCover}
              role="button"
              tabIndex={0}
              onClick={() => setBookOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setBookOpen(true);
              }}
            >
              <div className={styles.coverPattern} />
              <span className={styles.coverEdition}>DIGITAL LIBRARY • 2026</span>
              <div className={styles.coverLogo}>B<span>+</span></div>
              <div className={styles.coverCopy}>
                <small>BACA • PAHAMI • DAPAT POIN</small>
                <h2>BACA<br />POP!</h2>
                <p>Petualangan membaca dimulai dari satu halaman.</p>
              </div>
              <b className={styles.openHint}>BUKA BUKU <span>→</span></b>
            </div>

            <div className={styles.bookPages}>
              <section className={styles.leftPage}>
                <div className={styles.pageHeader}>
                  <button
                    className={styles.backButton}
                    onClick={() => setBookOpen(false)}
                    aria-label="Tutup buku"
                  >
                    ←
                  </button>
                  <span className={styles.pageEyebrow}>KENALI BACAPOP</span>
                </div>
                <h2>Semua kebutuhan membacamu ada di sini.</h2>
                <div className={styles.bookChoices}>
                  {features.map((item, index) => (
                    <button
                      key={item.title}
                      className={activeBook === index ? styles.activeChoice : ''}
                      onClick={() => setActiveBook(index)}
                    >
                      <i style={{ background: item.color }}>{item.icon}</i>
                      <span><b>{item.title}</b><small>{item.label}</small></span>
                      <em>0{index + 1}</em>
                    </button>
                  ))}
                </div>
                <div className={styles.pageNumber}>BacaPop / 01</div>
              </section>

              <section className={styles.rightPage} style={{ '--accent': features[activeBook].color }}>
                <div className={styles.rightPageTop}>
                  <span>FITUR BACAPOP</span>
                  <b>0{activeBook + 1} / 04</b>
                </div>
                <div className={styles.selectedCover}>
                  <span>{features[activeBook].icon}</span>
                  <small>{features[activeBook].label}</small>
                  <h2>{features[activeBook].title}</h2>
                  <p>{features[activeBook].desc}</p>
                </div>
                <div className={styles.featurePoints}>
                  {features[activeBook].points.map((point) => (
                    <span key={point}>✓ {point}</span>
                  ))}
                </div>
                <button className={styles.readButton}>COBA FITUR INI <span>→</span></button>
                <div className={styles.pageNumber}>BacaPop / 02</div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        {[0, 1].map((track) => (
          <div className={styles.footerTrack} key={track} aria-hidden={track === 1}>
            <span>500+ BUKU PILIHAN</span>
            <i>✦</i>
            <span>TULIS RINGKASAN & DAPAT POIN</span>
            <i>✦</i>
            <span>LIHAT PENCAPAIANMU</span>
            <i>✦</i>
            <span>SERTIFIKAT DIGITAL</span>
            <i>✦</i>
          </div>
        ))}
      </footer>

      {authOpen && (
        <div className={styles.modalBackdrop} onMouseDown={() => setAuthOpen(false)}>
          <section
            className={styles.authModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className={styles.closeModal} onClick={() => setAuthOpen(false)} aria-label="Tutup">×</button>
            <span className={styles.modalBadge}>★ GRATIS UNTUK PEMBACA</span>
            <h2 id="auth-title">{mode === 'daftar' ? 'Mulai baca bareng BacaPop!' : mode === 'lupa' ? 'Lupa password?' : 'Selamat datang kembali!'}</h2>
            <p>{mode === 'daftar' ? 'Buat akun dan mulai membaca.' : mode === 'lupa' ? 'Masukkan email akunmu. Kami akan mengirim tautan untuk membuat kata sandi baru.' : 'Masuk untuk melanjutkan bacaanmu.'}</p>

            <form onSubmit={handleAuth}>
              {mode === 'daftar' && (
                <label>
                  Nama lengkap
                  <input name="name" value={authForm.name} onChange={updateAuth} placeholder="Nama kamu" autoComplete="name" />
                </label>
              )}
              <label>
                Email
                <input name="email" type="email" value={authForm.email} onChange={updateAuth} placeholder="nama@email.com" autoComplete="email" />
              </label>
              {mode !== 'lupa' ? <label>
                Password
                <div className={styles.passwordField}>
                  <input
                    name="password"
                    type={showAuthPassword ? 'text' : 'password'}
                    value={authForm.password}
                    onChange={updateAuth}
                    placeholder="Minimal 8 karakter"
                    autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowAuthPassword((visible) => !visible)}
                    aria-label={showAuthPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-pressed={showAuthPassword}
                  >
                    <PasswordEyeIcon hidden={showAuthPassword} />
                  </button>
                </div>
              </label> : null}
              {mode === 'masuk' ? <button type="button" className={styles.forgotPassword} onClick={() => { setMode('lupa'); setAuthMessage(''); setShowAuthPassword(false); }}>Lupa kata sandi?</button> : null}
              {authMessage && <div className={styles.authMessage}>{authMessage}</div>}
              <button className={styles.submitAuth} disabled={authBusy}>
                {authBusy ? 'Mengirim tautan...' : mode === 'daftar' ? 'Buat akun gratis' : mode === 'lupa' ? 'Kirim tautan' : 'Masuk sekarang'} <span>→</span>
              </button>
            </form>

            {mode !== 'lupa' ? <>
              <div className={styles.authDivider}><span>atau lanjut dengan</span></div>
              <button type="button" className={styles.googleAuth} onClick={loginWithGoogle}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
                  <path fill="#34a853" d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
                  <path fill="#fbbc05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.53l3.35-2.61Z" />
                  <path fill="#ea4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
                </svg>
                {mode === 'daftar' ? 'Daftar dengan Google' : 'Masuk dengan Google'}
              </button>
            </> : null}

            <button
              className={styles.switchAuth}
              onClick={() => {
                setMode(mode === 'lupa' ? 'masuk' : mode === 'daftar' ? 'masuk' : 'daftar');
                setAuthMessage('');
                setShowAuthPassword(false);
              }}
            >
              {mode === 'lupa' ? '← Kembali ke halaman masuk' : mode === 'daftar' ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function PasswordEyeIcon({hidden}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.8 12s3.4-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.4 5.5-9.2 5.5S2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.7" />
      {hidden ? <path d="M4.5 4.5 19.5 19.5" /> : null}
    </svg>
  );
}
