import {isPerahuKertas, perahuKertasBook} from './novelContent';
import {ceritaKknBook, isCeritaKkn} from './horrorContent';
import {supabase} from './supabase';

export const PREMIUM_BOOK_REWARD_ID = 'premium-book';
export const PREMIUM_HORROR_REWARD_ID = 'premium-horror-jeritan-tengah-malam';

export function getPremiumRewardId(bookOrId) {
  if (typeof bookOrId === 'string') {
    if (bookOrId === ceritaKknBook.id || bookOrId === PREMIUM_HORROR_REWARD_ID) return PREMIUM_HORROR_REWARD_ID;
    return bookOrId === perahuKertasBook.id || bookOrId === PREMIUM_BOOK_REWARD_ID ? PREMIUM_BOOK_REWARD_ID : null;
  }
  if (isCeritaKkn(bookOrId)) return PREMIUM_HORROR_REWARD_ID;
  if (isPerahuKertas(bookOrId)) return PREMIUM_BOOK_REWARD_ID;
  return bookOrId?.premium_reward_id || null;
}

export function isPremiumBook(bookOrId) {
  return Boolean(getPremiumRewardId(bookOrId));
}

export async function getPremiumBookAccess(userId, bookOrId = perahuKertasBook) {
  if (!userId) return {unlocked: false, error: null};
  const rewardId = getPremiumRewardId(bookOrId);
  if (!rewardId) return {unlocked: true, error: null};

  const {data, error} = await supabase
    .from('reward_redemptions')
    .select('id')
    .eq('user_id', userId)
    .eq('reward_id', rewardId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  return {unlocked: Boolean(data), rewardId, error};
}
