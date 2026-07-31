const EVENT_NAME = 'bacapop:user-notification';
const MAX_NOTIFICATIONS = 40;

function storageKey(userId) {
  return `bacapop:notifications:${userId}`;
}

function readStored(userId) {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeStored(userId, items) {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
}

export function getUserNotifications(userId) {
  return readStored(userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function pushUserNotification(userId, notification) {
  if (typeof window === 'undefined' || !userId) return null;
  const current = getUserNotifications(userId);
  const duplicate = notification.event_key
    ? current.find((item) => item.event_key === notification.event_key)
    : null;
  if (duplicate) return duplicate;

  const item = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    type: notification.type || 'info',
    title: notification.title || 'Notifikasi BacaPop',
    message: notification.message || '',
    href: notification.href || '/dashboard',
    event_key: notification.event_key || null,
    created_at: notification.created_at || new Date().toISOString(),
    read: false,
  };
  writeStored(userId, [item, ...current]);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, {detail: item}));
  return item;
}

export function markUserNotificationRead(userId, notificationId) {
  const next = getUserNotifications(userId).map((item) => (
    item.id === notificationId ? {...item, read: true} : item
  ));
  writeStored(userId, next);
  return next;
}

export function markAllUserNotificationsRead(userId) {
  const next = getUserNotifications(userId).map((item) => ({...item, read: true}));
  writeStored(userId, next);
  return next;
}

export function notifySummarySubmitted(userId, summary, bookTitle, href) {
  return pushUserNotification(userId, {
    type: 'submitted',
    title: 'Ringkasan berhasil dikirim',
    message: `Ringkasan ${bookTitle || 'bukumu'} sudah masuk antrean dan menunggu pemeriksaan admin.`,
    href: href || `/dashboard/books/${summary.book_id}`,
    event_key: `summary:${summary.id}:pending:${summary.submitted_at || '1'}`,
    created_at: summary.submitted_at,
  });
}

export function notifyRewardRedeemed(userId, redemption) {
  return pushUserNotification(userId, {
    type: 'reward',
    title: 'Penukaran poin berhasil',
    message: `${redemption.reward_name} berhasil ditukar dengan ${Number(redemption.points_spent || 0).toLocaleString('id-ID')} poin. Kode: ${redemption.redemption_code}.`,
    href: '/dashboard/rewards#riwayat',
    event_key: `redemption:${redemption.id}:success`,
    created_at: redemption.created_at || new Date().toISOString(),
  });
}

export function synchronizeLatestBookNotification(userId, book) {
  if (!book?.id || !book?.title) return getUserNotifications(userId);
  pushUserNotification(userId, {
    type: 'new_book',
    title: 'Buku baru tersedia!',
    message: `${book.title}${book.author ? ` karya ${book.author}` : ''} baru ditambahkan. Yuk mulai membaca!`,
    href: `/dashboard/books/${book.id}`,
    event_key: `book:${book.id}:published`,
    created_at: book.created_at || new Date().toISOString(),
  });
  return getUserNotifications(userId);
}

export function synchronizeSummaryNotifications(userId, summaries = [], bookMap = {}) {
  summaries.forEach((summary) => {
    const bookTitle = bookMap[summary.book_id]?.title || 'buku yang kamu baca';
    const href = `/dashboard/books/${summary.book_id}`;

    if (summary.status === 'valid') {
      pushUserNotification(userId, {
        type: 'approved',
        title: 'Ringkasan disetujui',
        message: `Ringkasan ${bookTitle} disetujui. Kamu mendapatkan +${Number(summary.points_awarded || 0).toLocaleString('id-ID')} poin.`,
        href,
        event_key: `summary:${summary.id}:valid:${summary.validated_at || summary.updated_at || '1'}`,
        created_at: summary.validated_at || summary.updated_at,
      });
      return;
    }

    if (summary.status === 'rejected') {
      pushUserNotification(userId, {
        type: 'rejected',
        title: 'Ringkasan perlu diperbaiki',
        message: summary.admin_note
          ? `${bookTitle} ditolak: ${summary.admin_note}`
          : `Ringkasan ${bookTitle} ditolak admin. Buka detail untuk memperbaikinya.`,
        href,
        event_key: `summary:${summary.id}:rejected:${summary.validated_at || summary.updated_at || '1'}`,
        created_at: summary.validated_at || summary.updated_at,
      });
      return;
    }

    if (summary.status === 'pending') {
      notifySummarySubmitted(userId, summary, bookTitle, href);
    }
  });

  return getUserNotifications(userId);
}

export {EVENT_NAME as USER_NOTIFICATION_EVENT};
