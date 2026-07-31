'use client';

import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import FirstTimeOnboarding from './FirstTimeOnboarding';
import UserNotificationCenter from './UserNotificationCenter';
import styles from '../dashboard-layout.module.css';

export default function DashboardUtilities() {
  const pathname = usePathname();
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    setSlot(document.querySelector('[data-dashboard-utility-slot]'));
  }, [pathname]);

  const controls = (
    <div className={styles.utilityActions}>
      <FirstTimeOnboarding />
      <UserNotificationCenter />
    </div>
  );

  if (slot) return createPortal(controls, slot);
  if (pathname === '/dashboard') return null;
  return <div className={styles.hiddenUtilityHost}>{controls}</div>;
}
