import {isMySweetDoctor, mySweetDoctorBook} from './novelContent';
import {
  dongengBinatangBook,
  isDongengBinatang,
  isSehariSatuDongeng,
  sehariSatuDongengBook,
} from './dongengContent';
import {isKunciHitam, kunciHitamBook} from './horrorContent';
import {supabase} from './supabase';

export const DANA_PROFILE_QR_PAYMENT_METHOD = 'Transfer DANA';
export const paidCatalogBooks = [mySweetDoctorBook, dongengBinatangBook, sehariSatuDongengBook, kunciHitamBook];

export function getPaidBookDefinition(bookOrId) {
  if (typeof bookOrId === 'string') {
    return paidCatalogBooks.find((book) => book.id === bookOrId || book.store_key === bookOrId) || null;
  }
  if (isMySweetDoctor(bookOrId)) return mySweetDoctorBook;
  if (isDongengBinatang(bookOrId)) return dongengBinatangBook;
  if (isSehariSatuDongeng(bookOrId)) return sehariSatuDongengBook;
  if (isKunciHitam(bookOrId)) return kunciHitamBook;
  return bookOrId?.is_paid && bookOrId?.store_key ? bookOrId : null;
}

export function isPaidBook(bookOrId) {
  return Boolean(getPaidBookDefinition(bookOrId));
}

export function getPaidBookKey(bookOrId) {
  return getPaidBookDefinition(bookOrId)?.store_key || null;
}

export async function getPaidBookAccess(userId, bookOrId = mySweetDoctorBook) {
  const bookKey = getPaidBookKey(bookOrId);
  if (!userId || !bookKey) return {unlocked: !bookKey, purchase: null, error: null};

  const {data, error} = await supabase
    .from('book_purchases')
    .select('id,book_key,price_rupiah,status,payment_method,transaction_code,payment_reference,payer_name,payer_paid_at,payment_proof_path,purchased_at,reviewed_at,admin_note')
    .eq('user_id', userId)
    .eq('book_key', bookKey)
    .limit(1)
    .maybeSingle();

  return {
    unlocked: data?.status === 'completed',
    purchase: data || null,
    error,
  };
}

export async function submitDanaBookPurchase({
  userId,
  book = mySweetDoctorBook,
  payerName,
  paymentProof,
}) {
  const bookKey = getPaidBookKey(book);
  if (!userId || !bookKey) throw new Error('Buku atau akun pembeli tidak valid.');
  if (!paymentProof) throw new Error('Pilih foto bukti transfer terlebih dahulu.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(paymentProof.type)) {
    throw new Error('Bukti transfer harus berupa JPG, PNG, atau WebP.');
  }
  if (paymentProof.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran bukti transfer maksimal 5 MB.');
  }

  const automaticPayerName = payerName?.trim() || 'Pembaca BacaPop';
  const claimReference = `CLAIM-${window.crypto.randomUUID().slice(0, 12).toUpperCase()}`;
  const purchaseKey = window.crypto.randomUUID();
  const extension = paymentProof.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const proofPath = `${userId}/${bookKey}/${purchaseKey}.${extension}`;

  const {error: uploadError} = await supabase.storage
    .from('payment-proofs')
    .upload(proofPath, paymentProof, {
      cacheControl: '3600',
      contentType: paymentProof.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`${uploadError.message} Pastikan bucket payment-proofs sudah dibuat melalui migrasi Supabase.`);
  }

  const {data, error} = await supabase.rpc('submit_dana_purchase', {
    p_book_key: bookKey,
    p_payer_name: automaticPayerName,
    p_payment_reference: claimReference,
    p_payer_paid_at: new Date().toISOString(),
    p_payment_proof_path: proofPath,
    p_purchase_key: purchaseKey,
  });

  if (error) {
    await supabase.storage.from('payment-proofs').remove([proofPath]);
    throw new Error(`${error.message} Pastikan migrasi katalog_buku_berbayar.sql sudah dijalankan di Supabase.`);
  }

  return Array.isArray(data) ? data[0] : data;
}
