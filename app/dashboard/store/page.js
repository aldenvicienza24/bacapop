'use client';

import Link from 'next/link';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {getPaidBookAccess, paidCatalogBooks, submitDanaBookPurchase} from '../../lib/paidBooks';
import {getDashboardUser, logoutFromDashboard} from '../auth';
import styles from './store.layout.module.css';

const formatRupiah = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value);

export default function BookStorePage() {
  const router = useRouter();
  const pageRef = useRef(null);
  const [user, setUser] = useState(null);
  const [accessByBook, setAccessByBook] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutBook, setCheckoutBook] = useState(paidCatalogBooks[0]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    const openCheckoutForTour = () => {
      setCheckoutError('');
      setCheckoutBook((current) => current || paidCatalogBooks[0]);
      setCheckoutOpen(true);
    };
    window.addEventListener('bacapop:onboarding:open-checkout', openCheckoutForTour);
    return () => window.removeEventListener('bacapop:onboarding:open-checkout', openCheckoutForTour);
  }, []);

  useLayoutEffect(() => {
    let cleanup = () => {};

    async function setupMotion() {
      const {default: gsap} = await import('gsap');
      if (!pageRef.current) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const context = gsap.context(() => {
        if (!reduceMotion) {
          const timeline = gsap.timeline({defaults: {ease: 'power3.out'}});
          timeline
            .from(`.${styles.topbar}`, {y: -10, duration: .26})
            .from(`.${styles.hero} > div`, {y: 12, stagger: .035, duration: .28}, '-=.21')
            .from(`.${styles.catalog} > header, .${styles.product}`, {y: 12, stagger: .035, duration: .28}, '-=.22');

          gsap.to(`.${styles.heroPrice}`, {
            y: -7,
            rotate: 1.2,
            duration: 2.2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
        }
      }, pageRef);

      const cards = [...pageRef.current.querySelectorAll(`.${styles.product}`)];
      const listeners = cards.map((card) => {
        const move = (event) => {
          if (reduceMotion) return;
          const bounds = card.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - .5;
          const y = (event.clientY - bounds.top) / bounds.height - .5;
          gsap.to(card, {
            rotateY: x * 8,
            rotateX: y * -7,
            y: -6,
            transformPerspective: 800,
            duration: .35,
            ease: 'power2.out',
          });
          gsap.to(card.querySelector(`.${styles.cover} img`), {
            x: x * 5,
            y: y * 5,
            scale: 1.025,
            duration: .35,
          });
        };
        const leave = () => {
          gsap.to(card, {rotateX: 0, rotateY: 0, y: 0, duration: .5, ease: 'power3.out'});
          gsap.to(card.querySelector(`.${styles.cover} img`), {x: 0, y: 0, scale: 1, duration: .5});
        };
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        return () => {
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
        };
      });

      cleanup = () => {
        listeners.forEach((remove) => remove());
        context.revert();
      };
    }

    setupMotion();
    return () => cleanup();
  }, []);

  useEffect(() => {
    async function loadStore() {
      const currentUser = await getDashboardUser(router);
      if (!currentUser) return;
      setUser(currentUser);
      const accessRows = await Promise.all(paidCatalogBooks.map(async (book) => [
        book.store_key,
        await getPaidBookAccess(currentUser.id, book),
      ]));
      const nextAccess = Object.fromEntries(accessRows);
      setAccessByBook(nextAccess);
      const pendingAccess = accessRows.find(([, access]) => access.purchase?.status === 'pending');
      if (pendingAccess) {
        const access = pendingAccess[1];
        setMessage('Pembayaran sudah dikirim dan sedang diperiksa admin.');
        setTransactionCode(access.purchase.transaction_code || '');
      }
    }
    loadStore();
  }, [router]);

  useEffect(() => {
    if (!paymentProof) {
      setProofPreview('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(paymentProof);
    setProofPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [paymentProof]);

  async function confirmPurchase(event) {
    event.preventDefault();
    if (!user || processing) return;
    if (!paymentProof) {
      setCheckoutError('Pilih foto bukti transfer terlebih dahulu.');
      return;
    }
    setProcessing(true);
    setMessage('');
    setCheckoutError('');
    try {
      const result = await submitDanaBookPurchase({
        userId: user.id,
        book: checkoutBook,
        payerName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pembaca BacaPop',
        paymentProof,
      });
      setAccessByBook((current) => ({
        ...current,
        [checkoutBook.store_key]: {
          unlocked: result?.status === 'completed',
          purchase: result,
          error: null,
        },
      }));
      setCheckoutOpen(false);
      setPaymentProof(null);
      setTransactionCode(result?.transaction_code || '');
      setMessage('Bukti pembayaran sudah dikirim dan sedang diperiksa admin. Buku akan terbuka setelah disetujui.');
    } catch (error) {
      const nextMessage = error.message || 'Pembelian contoh belum berhasil.';
      setMessage(nextMessage);
      setCheckoutError(nextMessage);
    } finally {
      setProcessing(false);
    }
  }

  const hasUnlockedBook = Object.values(accessByBook).some((access) => access?.unlocked);
  const hasPendingPurchase = Object.values(accessByBook).some((access) => access?.purchase?.status === 'pending');

  return (
    <main className={styles.page} ref={pageRef}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard"><span>B</span>BacaPop!</Link>
        <nav>
          <button type="button" onClick={() => logoutFromDashboard(router)}>Keluar ↗</button>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.cartParade} aria-hidden="true">
          {Array.from({length: 5}, (_, index) => (
            <span
              style={{
                '--cart-size': `${[56, 64, 58, 68, 54][index]}px`,
                '--cart-top': `${[18, 146, 88, 38, 164][index]}px`,
                '--cart-opacity': [0.18, 0.22, 0.16, 0.2, 0.15][index],
                '--cart-duration': `${[32, 38, 35, 40, 36][index]}s`,
                '--cart-delay': `${[-4, -19, -28, -11, -33][index]}s`,
              }}
              key={index}
            >
              <svg viewBox="0 0 132 96">
                <g className={styles.cartSpeedLines}>
                  <path d="M3 39h16M8 50h12" />
                </g>
                <g className={styles.cartCargo}>
                  <rect className={styles.packageOne} x="48" y="9" width="21" height="27" rx="3" />
                  <path d="M54 15h9M54 21h9" />
                  <rect className={styles.packageTwo} x="72" y="3" width="23" height="33" rx="3" />
                  <path d="M78 10h11M78 17h11" />
                  <rect className={styles.packageThree} x="98" y="13" width="17" height="23" rx="3" />
                  <path d="M103 19h7M103 25h7" />
                </g>
                <path className={styles.basketFill} d="M32 34h88l-13 38H44Z" />
                <path className={styles.cartAccent} d="M38 43h76l-4 12H41Z" />
                <g className={styles.cartOutline}>
                  <path d="M5 17h18l8 17 12 42h67" />
                  <path d="M32 34h88l-13 38H44Z" />
                  <path d="M52 40l4 27M76 38v30M100 40l-5 27" />
                </g>
                <g className={styles.cartBadge}>
                  <circle cx="78" cy="53" r="10" />
                  <path d="m78 46 2.1 4.4 4.9.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.9-.7Z" />
                </g>
                <g className={styles.cartWheel}>
                  <circle className={styles.wheelTire} cx="53" cy="86" r="8" />
                  <circle className={styles.wheelHub} cx="53" cy="86" r="3" />
                  <path d="M53 80v12M47 86h12" />
                </g>
                <g className={styles.cartWheel}>
                  <circle className={styles.wheelTire} cx="101" cy="86" r="8" />
                  <circle className={styles.wheelHub} cx="101" cy="86" r="3" />
                  <path d="M101 80v12M95 86h12" />
                </g>
              </svg>
            </span>
          ))}
        </div>
        <div className={styles.heroCopy}>
          <span>TOKO BUKU DIGITAL</span>
          <h1>Temukan cerita,<br className={styles.heroBreak} /> miliki selamanya.</h1>
          <p>Beli sekali, lalu baca kapan saja dari akunmu.</p>
          <a href="#katalog">Lihat buku <span>↓</span></a>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <span className={styles.artSpark}>✦</span>
          <span className={styles.artCoin}>Rp</span>
          <svg viewBox="0 0 260 170">
            <path className={styles.bookShadow} d="M29 51c37-9 70-2 101 22 31-24 64-31 101-22v91c-38-9-71-2-101 20-30-22-63-29-101-20Z" />
            <path className={styles.bookLeft} d="M23 38c40-8 76 1 107 29v86c-32-23-68-31-107-20Z" />
            <path className={styles.bookRight} d="M237 38c-40-8-76 1-107 29v86c32-23 68-31 107-20Z" />
            <path className={styles.bookSpine} d="M130 67v86" />
            <path className={styles.pageLine} d="M43 61c25-1 47 5 68 18M43 78c25-1 47 5 68 18M43 95c25-1 47 5 68 18M217 61c-25-1-47 5-68 18M217 78c-25-1-47 5-68 18M217 95c-25-1-47 5-68 18" />
          </svg>
          <span className={styles.artHeart}>♥</span>
        </div>
        <div className={styles.heroPrice}>
          <small>MULAI DARI</small>
          <b>{formatRupiah(Math.min(...paidCatalogBooks.map((book) => book.price_rupiah)))}</b>
          <span>Bayar dengan QRIS</span>
        </div>
      </section>

      <section className={styles.catalog} id="katalog" data-tour="store-catalog">
        <header>
          <div><span>BUKU PREMIUM BERBAYAR</span><h2>Pilih Buku Premium</h2></div>
          <p>{paidCatalogBooks.length} buku tersedia</p>
        </header>

        {message ? (
          <div className={styles.notice}>
            <b>{hasUnlockedBook ? '✓ Buku sudah menjadi milikmu' : hasPendingPurchase ? '⏳ Sedang diperiksa' : 'Informasi'}</b>
            <span>{message}</span>
            {transactionCode ? <small>Kode transaksi: {transactionCode}</small> : null}
          </div>
        ) : null}

        <div className={styles.catalogBody}>
          <div className={styles.productGrid}>
            {paidCatalogBooks.map((book) => {
              const access = accessByBook[book.store_key];
              const unlocked = access?.unlocked;
              const pending = access?.purchase?.status === 'pending';
              const genreLabel = book.genres?.name || 'Buku';
              return (
                <article className={`${styles.product} ${unlocked ? styles.owned : ''}`} key={book.store_key}>
                  <div className={styles.cover}>
                    <img src={book.cover_url} alt={`Sampul ${book.title}`} />
                    <span>{unlocked ? 'SUDAH DIMILIKI' : pending ? 'SEDANG DIPERIKSA' : `PREMIUM ${genreLabel.toUpperCase()}`}</span>
                  </div>
                  <div className={styles.productCopy}>
                    <p>{genreLabel.toUpperCase()} · {book.page_count} HALAMAN</p>
                    <h3>{book.title}</h3>
                    <b>{book.author}</b>
                    <span>{book.description}</span>
                    <div className={styles.buyRow}>
                      <div><small>Harga buku</small><strong>{formatRupiah(book.price_rupiah)}</strong></div>
                      {unlocked ? (
                        <Link data-tour="store-buy" href={`/dashboard/read/${book.id}`}>Baca <span>→</span></Link>
                      ) : pending ? (
                        <button type="button" data-tour="store-buy" disabled>Diproses</button>
                      ) : (
                        <button
                          type="button"
                          data-tour="store-buy"
                          onClick={() => {
                            setCheckoutBook(book);
                            setPaymentProof(null);
                            setCheckoutError('');
                            setCheckoutOpen(true);
                          }}
                        >
                          Beli <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className={styles.shopGuide}>
            <span>CARA BELANJA</span>
            <h3>Tiga langkah untuk mulai membaca.</h3>
            <ol>
              <li><b>01</b><span>Pilih buku premium</span></li>
              <li><b>02</b><span>Scan dan bayar QRIS</span></li>
              <li><b>03</b><span>Baca setelah disetujui admin</span></li>
            </ol>
          </aside>
        </div>
      </section>

      {checkoutOpen ? (
        <div className={styles.checkoutBackdrop} role="presentation" onMouseDown={() => !processing && setCheckoutOpen(false)}>
          <section className={`${styles.checkout} ${styles.checkoutMinimal}`} data-tour="store-checkout" role="dialog" aria-modal="true" aria-label="Pembayaran QRIS" onMouseDown={(event) => event.stopPropagation()}>
            <button className={styles.close} type="button" aria-label="Tutup checkout" onClick={() => setCheckoutOpen(false)}>×</button>
            <form className={styles.minimalPaymentForm} onSubmit={confirmPurchase}>
              <a className={styles.qrisOnly} data-tour="store-qris" href="/images/payments/bacapop-qris-code.png" target="_blank" rel="noreferrer" aria-label="Perbesar QRIS BacaPop">
                <img src="/images/payments/bacapop-qris-code.png" alt="QRIS BacaPop untuk pembayaran buku" />
              </a>
              <label className={styles.proofUpload} data-tour="proof-upload">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    setCheckoutError('');
                    setPaymentProof(event.target.files?.[0] || null);
                  }}
                />
                {proofPreview ? (
                  <span className={styles.proofPreview}>
                    <img src={proofPreview} alt="Pratinjau bukti transfer" />
                    <b>Ganti bukti transfer</b>
                  </span>
                ) : (
                  <span className={styles.proofEmpty}>
                    <b>＋ Upload bukti transfer</b>
                    <small>JPG, PNG, atau WebP · Maksimal 5 MB</small>
                  </span>
                )}
              </label>
              {checkoutError ? <p className={styles.checkoutError}>{checkoutError}</p> : null}
              <button className={styles.confirm} data-tour="payment-confirm" disabled={processing || !paymentProof}>
                {processing ? 'Mengunggah bukti...' : 'Kirim Bukti & Konfirmasi'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
