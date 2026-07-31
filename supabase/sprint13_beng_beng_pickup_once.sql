-- Beng-Beng diambil langsung dengan menunjukkan kode kepada admin.
-- Satu akun hanya boleh memiliki satu penukaran Beng-Beng yang tidak dibatalkan.

update public.reward_catalog
set
  description = 'Ambil langsung saat bertemu admin dengan menunjukkan kode penukaran. Hanya dapat ditukar satu kali per akun.',
  category = 'Ambil langsung',
  fulfillment_type = 'pickup',
  updated_at = now()
where id = 'beng-beng';

create unique index if not exists reward_redemptions_one_beng_beng_per_user
on public.reward_redemptions (user_id, reward_id)
where reward_id = 'beng-beng' and status <> 'cancelled';

create or replace function public.redeem_catalog_reward(
  p_reward_id text,
  p_redemption_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_reward public.reward_catalog;
  v_redemption public.reward_redemptions;
  v_spent integer;
  v_balance integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan masuk untuk menukar poin.';
  end if;
  if p_redemption_key is null then
    raise exception 'Kunci penukaran tidak valid.';
  end if;

  select * into v_redemption
  from public.reward_redemptions
  where redemption_key = p_redemption_key and user_id = auth.uid();
  if found then
    return jsonb_build_object('redemption', to_jsonb(v_redemption), 'balance', 0, 'remaining_stock', null);
  end if;

  if p_reward_id = 'beng-beng' and exists (
    select 1 from public.reward_redemptions
    where user_id = auth.uid()
      and reward_id = 'beng-beng'
      and status <> 'cancelled'
  ) then
    raise exception 'Beng-Beng hanya dapat ditukar satu kali per akun.';
  end if;

  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found or v_profile.status <> 'active' then
    raise exception 'Profil aktif tidak ditemukan.';
  end if;

  select * into v_reward from public.reward_catalog where id = p_reward_id and is_active = true for update;
  if not found then raise exception 'Hadiah tidak tersedia.'; end if;
  if v_reward.stock is not null and v_reward.stock <= 0 then raise exception 'Stok hadiah sudah habis.'; end if;

  select coalesce(sum(points_spent), 0)::integer into v_spent
  from public.reward_redemptions
  where user_id = auth.uid() and status <> 'cancelled';
  v_balance := v_profile.points - v_spent;
  if v_balance < v_reward.cost_points then raise exception 'Poin belum cukup untuk menukar hadiah ini.'; end if;

  if v_reward.stock is not null then
    update public.reward_catalog
    set stock = stock - 1, updated_at = now()
    where id = v_reward.id
    returning * into v_reward;
  end if;

  insert into public.reward_redemptions (
    user_id, reward_id, reward_name, points_spent, status,
    redemption_code, redemption_key, fulfilled_at
  ) values (
    auth.uid(), v_reward.id, v_reward.name, v_reward.cost_points,
    case when v_reward.fulfillment_type = 'digital' then 'completed' else 'processing' end,
    'BP-' || upper(substr(replace(p_redemption_key::text, '-', ''), 1, 8)),
    p_redemption_key,
    case when v_reward.fulfillment_type = 'digital' then now() else null end
  ) returning * into v_redemption;

  return jsonb_build_object(
    'redemption', to_jsonb(v_redemption),
    'balance', v_balance - v_reward.cost_points,
    'remaining_stock', v_reward.stock
  );
end
$$;

create or replace function public.admin_fulfill_beng_beng(
  p_redemption_code text
) returns public.reward_redemptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_redemption public.reward_redemptions;
begin
  if not public.is_admin() then
    raise exception 'Akses admin diperlukan.';
  end if;

  select * into v_redemption
  from public.reward_redemptions
  where upper(redemption_code) = upper(trim(p_redemption_code))
    and reward_id = 'beng-beng'
  for update;

  if not found then raise exception 'Kode penukaran Beng-Beng tidak ditemukan.'; end if;
  if v_redemption.status = 'completed' then raise exception 'Kode ini sudah pernah dipakai.'; end if;
  if v_redemption.status = 'cancelled' then raise exception 'Penukaran ini sudah dibatalkan.'; end if;

  update public.reward_redemptions
  set status = 'completed', fulfilled_at = now()
  where id = v_redemption.id
  returning * into v_redemption;

  return v_redemption;
end
$$;

revoke all on function public.admin_fulfill_beng_beng(text) from public;
grant execute on function public.admin_fulfill_beng_beng(text) to authenticated;
notify pgrst, 'reload schema';
