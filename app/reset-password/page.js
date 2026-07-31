'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {supabase} from '../lib/supabase';
import styles from './reset-password.module.css';

export default function ResetPasswordPage() {
  const [status, setStatus] = useState('checking');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let invalidTimer;

    const {data} = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        window.clearTimeout(invalidTimer);
        setStatus('ready');
      }
    });

    supabase.auth.getSession().then(({data: sessionData}) => {
      if (!active) return;
      if (sessionData.session) {
        setStatus('ready');
        return;
      }
      invalidTimer = window.setTimeout(() => {
        if (active) setStatus('invalid');
      }, 1800);
    });

    return () => {
      active = false;
      window.clearTimeout(invalidTimer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event) {
    event.preventDefault();
    setMessage('');

    if (password.length < 8) {
      setMessage('Password baru minimal 8 karakter.');
      return;
    }
    if (password !== confirmation) {
      setMessage('Konfirmasi password belum sama.');
      return;
    }

    setBusy(true);
    try {
      const {error} = await supabase.auth.updateUser({password});
      if (error) throw error;
      setStatus('success');
      setPassword('');
      setConfirmation('');
      await supabase.auth.signOut({scope: 'local'});
    } catch (error) {
      const raw = error?.message || '';
      setMessage(raw.toLowerCase().includes('same password')
        ? 'Gunakan password yang berbeda dari password sebelumnya.'
        : raw || 'Password gagal diperbarui. Minta link reset yang baru.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/"><span>B</span><b>BacaPop!</b></Link>
        <Link href="/login">Kembali ke Login</Link>
      </header>

      <section className={styles.shell}>
        <div className={styles.visual} aria-hidden="true">
          <span>••••</span>
          <strong>PASSWORD</strong>
          <b>BARU!</b>
          <i>✓</i>
        </div>

        <article className={styles.card}>
          <span className={styles.eyebrow}>KEAMANAN AKUN</span>
          {status === 'checking' ? <div className={styles.state}><b>Memeriksa tautan...</b><p>Tunggu sebentar. Kami sedang menyiapkan halaman ini.</p></div> : null}

          {status === 'invalid' ? <div className={styles.state}>
            <h1>Tautan tidak bisa digunakan</h1>
            <p>Link reset sudah kedaluwarsa, pernah digunakan, atau tidak lengkap.</p>
            <Link className={styles.primaryLink} href="/login">Minta link reset baru <b>→</b></Link>
          </div> : null}

          {status === 'success' ? <div className={styles.state}>
            <h1>Password berhasil diubah!</h1>
            <p>Silakan masuk kembali menggunakan password barumu.</p>
            <Link className={styles.primaryLink} href="/login">Masuk ke BacaPop <b>→</b></Link>
          </div> : null}

          {status === 'ready' ? <>
            <h1>Buat password baru</h1>
            <p className={styles.intro}>Gunakan minimal 8 karakter dan hindari password yang pernah dipakai.</p>
            <form onSubmit={updatePassword}>
              <label>Password baru
                <div className={styles.passwordField}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Minimal 8 karakter" />
                  <button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? 'Tutup' : 'Lihat'}</button>
                </div>
              </label>
              <label>Ulangi password baru
                <input type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Ketik password sekali lagi" />
              </label>
              <div className={styles.rules}><span className={password.length >= 8 ? styles.valid : ''}>✓ Minimal 8 karakter</span><span className={confirmation && password === confirmation ? styles.valid : ''}>✓ Kata sandi sama</span></div>
              {message ? <div className={styles.message}>{message}</div> : null}
              <button className={styles.submit} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan Password Baru'} <b>→</b></button>
            </form>
          </> : null}
        </article>
      </section>
    </main>
  );
}
