import Link from 'next/link';
import DashboardMenuIcon from './DashboardMenuIcon';
import styles from './modern-dashboard-menu.module.css';

const menuItems = [
  {id: 'home', label: 'Beranda', detail: 'Ringkasan', href: '/dashboard'},
  {id: 'rewards', label: 'Tukar poin', detail: 'Daftar hadiah', href: '/dashboard/rewards'},
  {id: 'store', label: 'Beli buku', detail: 'Buku premium', href: '/dashboard/store'},
];

export default function ModernDashboardMenu({active = 'home', bookCount = 0, rewardCount = 0}) {
  return (
    <nav className={styles.menu} aria-label="Navigasi dashboard">
      {menuItems.map((item) => {
        const isActive = item.id === active;
        const counter = item.id === 'home' && bookCount ? bookCount : item.id === 'rewards' && rewardCount ? rewardCount : null;
        return (
          <Link className={`${styles.item} ${isActive ? styles.active : ''}`} data-tour={`menu-${item.id}`} href={item.href} key={item.id}>
            <DashboardMenuIcon className={styles.icon} type={item.id} />
            <span className={styles.copy}><b>{item.label}</b><small>{item.detail}</small></span>
            <i className={styles.trail}>{counter ?? '›'}</i>
          </Link>
        );
      })}
    </nav>
  );
}
