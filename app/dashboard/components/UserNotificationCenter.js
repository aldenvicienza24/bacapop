'use client';

import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {supabase} from '../../lib/supabase';
import {
  getUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  synchronizeLatestBookNotification,
  synchronizeSummaryNotifications,
  USER_NOTIFICATION_EVENT
} from '../../lib/userNotifications';
import styles from './user-notification-center.module.css';

function timeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat('id-ID', {hour: '2-digit', minute: '2-digit'}).format(date);
  }
  return new Intl.DateTimeFormat('id-ID', {day: 'numeric', month: 'short'}).format(date);
}

function NotificationGlyph({type}) {
  if (type === 'approved') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
  }
  if (type === 'rejected') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 17h.01" /><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /></svg>;
  }
  if (type === 'reward') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M7 6.5h7.5a3 3 0 0 1 0 6H9.5a3 3 0 0 0 0 6H17" /></svg>;
  }
  if (type === 'new_book') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /><path d="M17 8h-2M16 7v2" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v13H7l-3 3V4Z" /><path d="m8 10 2.5 2.5L16 7" /></svg>;
}

function typeLabel(type) {
  if (type === 'approved') return 'DISETUJUI';
  if (type === 'rejected') return 'DITOLAK';
  if (type === 'reward') return 'POIN';
  if (type === 'new_book') return 'BUKU BARU';
  return 'TERKIRIM';
}

export default function UserNotificationCenter() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastClosing, setToastClosing] = useState(false);
  const [useMobilePortal, setUseMobilePortal] = useState(false);
  const centerRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimerRef = useRef(null);
  const toastCloseTimerRef = useRef(null);

  useEffect(() => {
    let active = true;
    let intervalId;

    async function sync() {
      const {data: {session}} = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!active || !currentUserId) return;
      setUserId(currentUserId);
      setItems(getUserNotifications(currentUserId));

      const {data: summaries} = await supabase
        .from('summaries')
        .select('id,book_id,status,points_awarded,admin_note,submitted_at,validated_at,updated_at')
        .eq('user_id', currentUserId)
        .order('updated_at', {ascending: false});
      const bookIds = [...new Set((summaries || []).map((item) => item.book_id).filter(Boolean))];
      let bookMap = {};
      if (bookIds.length) {
        const {data: books} = await supabase.from('books').select('id,title').in('id', bookIds);
        bookMap = Object.fromEntries((books || []).map((book) => [book.id, book]));
      }
      synchronizeSummaryNotifications(currentUserId, summaries || [], bookMap);

      const {data: latestBooks} = await supabase
        .from('books')
        .select('id,title,author,created_at')
        .eq('status', 'active')
        .order('created_at', {ascending: false})
        .limit(1);
      setItems(synchronizeLatestBookNotification(currentUserId, latestBooks?.[0]));
    }

    function handleNotification(event) {
      const item = event.detail;
      window.clearTimeout(toastCloseTimerRef.current);
      setItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, 40));
      setToastClosing(false);
      setToast(item);
    }

    function handleFocus() {
      sync();
    }

    window.addEventListener(USER_NOTIFICATION_EVENT, handleNotification);
    window.addEventListener('focus', handleFocus);
    sync();
    intervalId = window.setInterval(sync, 20000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.clearTimeout(closeTimerRef.current);
      window.clearTimeout(toastCloseTimerRef.current);
      window.removeEventListener(USER_NOTIFICATION_EVENT, handleNotification);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 620px)');
    const updatePortal = () => setUseMobilePortal(media.matches);
    updatePortal();
    media.addEventListener('change', updatePortal);
    return () => media.removeEventListener('change', updatePortal);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutsideClick(event) {
      const insideButton = centerRef.current?.contains(event.target);
      const insidePanel = panelRef.current?.contains(event.target);
      if (!insideButton && !insidePanel) closeCenter();
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, closing]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(closeToast, 5200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const unread = useMemo(() => items.filter((item) => !item.read).length, [items]);

  function closeCenter() {
    if (!open || closing) return;
    setClosing(true);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 300);
  }

  function openCenter() {
    if (open) {
      closeCenter();
      return;
    }
    setClosing(false);
    setOpen(true);
  }

  function closeToast() {
    if (!toast || toastClosing) return;
    setToastClosing(true);
    window.clearTimeout(toastCloseTimerRef.current);
    toastCloseTimerRef.current = window.setTimeout(() => {
      setToast(null);
      setToastClosing(false);
    }, 260);
  }

  function readNotification(id) {
    setItems(markUserNotificationRead(userId, id));
    closeCenter();
  }

  function readAll() {
    setItems(markAllUserNotificationsRead(userId));
  }

  function renderNotificationLayer(content) {
    if (!content) return null;
    if (!useMobilePortal || typeof document === 'undefined') return content;
    return createPortal(
      <div className={styles.mobilePortal} onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeCenter();
      }}>
        {content}
      </div>,
      document.body
    );
  }

  if (!userId) return null;

  return (
    <div className={styles.center} ref={centerRef}>
      <button className={styles.bell} data-tour="notifications" data-unread={unread > 0} type="button" onClick={openCenter} aria-label={`Pemberitahuan, ${unread} belum dibaca`} aria-expanded={open}>
        <span>NOTIFIKASI</span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unread ? <b>{unread > 9 ? '9+' : unread}</b> : null}
      </button>

      {renderNotificationLayer(open ? <section ref={panelRef} className={styles.panel} data-closing={closing} aria-label="Daftar pemberitahuan">
        <div className={styles.ticker} aria-hidden="true">
          <div>
            <span>BACA</span><i>✦</i><span>TULIS</span><i>✦</i><span>DAPAT POIN</span><i>✦</i>
            <span>BACA</span><i>✦</i><span>TULIS</span><i>✦</i><span>DAPAT POIN</span><i>✦</i>
          </div>
        </div>
        <header>
          <div>
            <span>PEMBERITAHUAN</span>
            <h2>NOTIFIKASI<span>!</span></h2>
            <p>{unread ? 'Ada pemberitahuan baru untukmu.' : 'Semua pemberitahuan sudah dibaca.'}</p>
          </div>
          <aside><b>{String(unread).padStart(2, '0')}</b><small>BELUM<br />DIBACA</small></aside>
        </header>
        <div className={styles.tools}>
          <span>PEMBARUAN TERBARU</span>
          {unread ? <button type="button" onClick={readAll}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            Baca semua
          </button> : <b>AMAN ✓</b>}
        </div>
        <div className={styles.list}>
          {items.length ? items.map((item, index) => (
            <Link className={styles.item} style={{'--item-order': Math.min(index, 8)}} data-type={item.type} data-read={item.read} href={item.href || '/dashboard'} key={item.id} onClick={() => readNotification(item.id)}>
              <i><NotificationGlyph type={item.type} /></i>
              <span><strong>{typeLabel(item.type)}</strong><b>{item.title}</b><small>{item.message}</small></span>
              <time>{timeLabel(item.created_at)}</time>
            </Link>
          )) : <div className={styles.empty}><b>Belum ada notifikasi baru</b><p>Pemberitahuan tentang ringkasan, poin, dan buku baru akan muncul di sini.</p></div>}
        </div>
        <footer aria-hidden="true"><span>BCP–POP</span><i /><b>KEEP READING</b></footer>
      </section> : null)}

      {toast ? <div className={styles.toast} data-type={toast.type} data-closing={toastClosing} role="status" aria-live="polite">
        <Link className={styles.toastBody} href={toast.href || '/dashboard'} onClick={() => {readNotification(toast.id); setToast(null);}}>
          <i><NotificationGlyph type={toast.type} /></i>
          <span><strong>{typeLabel(toast.type)}</strong><b>{toast.title}</b><small>{toast.message}</small></span>
        </Link>
        <button type="button" aria-label="Tutup pemberitahuan" onClick={closeToast}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <em aria-hidden="true" />
      </div> : null}
    </div>
  );
}
