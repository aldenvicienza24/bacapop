-- Satu akun hanya perlu menukar Buku Premium sekali.
-- Reader dan endpoint PDF menganggap redemption selesai ini sebagai hak akses.
create unique index if not exists reward_redemptions_one_premium_per_user
on public.reward_redemptions (user_id, reward_id)
where reward_id = 'premium-book' and status <> 'cancelled';

notify pgrst, 'reload schema';
