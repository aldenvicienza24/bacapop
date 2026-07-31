'use client';

import Link from 'next/link';
import styles from './dashboard.module.css';

export default function DashboardTopbar({ onLogout }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}><span className={styles.logo}>B</span> BacaPop</div>
      <nav className={styles.nav}>
        <Link href="/dashboard">Beranda</Link>
        <Link href="/dashboard/books">Buku Saya</Link>
        <button className={styles.ghostButton} onClick={onLogout}>Keluar</button>
      </nav>
    </header>
  );
}
