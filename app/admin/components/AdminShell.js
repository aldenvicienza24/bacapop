'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getUserRole } from '../../lib/roles';
import { ensureWildlifeComicCatalog } from '../../lib/builtInCatalogSync';
import styles from '../admin.module.css';

const navItems = [
  {href: '/admin', label: 'Beranda Admin', icon: '⌂'},
  {href: '/admin/genres', label: 'Genre', icon: '◇'},
  {href: '/admin/books', label: 'Daftar Buku', icon: '▤'},
  {href: '/admin/purchases', label: 'Pembayaran QRIS', icon: 'Rp'},
  {href: '/admin/summaries', label: 'Periksa Ringkasan', icon: '✓'},
  {href: '/admin/users', label: 'Pengguna & Poin', icon: '◎'},
  {href: '/admin/redemptions', label: 'Penukaran Hadiah', icon: '↔'},
];

export default function AdminShell({children, title, subtitle}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    async function checkAccess() {
      const {data} = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return router.replace('/login');
      if (getUserRole(user) !== 'admin') return router.replace('/dashboard');

      const {data: isDatabaseAdmin, error} = await supabase.rpc('is_admin');
      if (error || !isDatabaseAdmin) return router.replace('/dashboard');
      await ensureWildlifeComicCatalog();
      if (alive) setReady(true);
    }

    checkAccess();
    return () => { alive = false; };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!ready) {
    return <div className={styles.loading}><span>B</span><p>Memeriksa akses admin...</p></div>;
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/admin" aria-label="Beranda admin BacaPop">
          <span>B</span>
          <div><strong>BacaPop!</strong><small>HALAMAN ADMIN</small></div>
        </Link>

        <p className={styles.navLabel}>MENU ADMIN</p>
        <nav className={styles.nav} aria-label="Navigasi admin">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
            return (
              <Link className={active ? styles.active : ''} key={item.href} href={item.href}>
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                <i aria-hidden="true">→</i>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminIdentity}><span>A</span><div><small>Masuk sebagai</small><b>Administrator</b></div></div>
          <button className={styles.logout} onClick={logout}>Keluar <span>↗</span></button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <span className={styles.headerEyebrow}>PENGELOLAAN BACAPOP</span>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className={styles.headerMeta}><span className={styles.liveDot} /><span>ADMIN AKTIF</span></div>
        </header>
        <div className={styles.adminContent}>{children}</div>
      </main>
    </div>
  );
}
