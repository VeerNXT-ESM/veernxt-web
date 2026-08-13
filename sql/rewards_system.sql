-- Rewards Center — Phase 3 of the Learning Center deep dive.
-- Run this once in the Supabase SQL editor, AFTER sql/points_system.sql
-- has already been applied (redeem_reward() debits points_balance, which
-- that script creates).

create extension if not exists pgcrypto;

-- ── Catalog ──────────────────────────────────────────────────────────────
create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  description text,
  category text,                 -- 'apparel' for now, future-proofs non-apparel rewards
  points_cost integer not null,
  image_url text,
  requires_size boolean not null default false,
  available_sizes text[],
  stock_quantity integer,        -- null = unmanaged/unlimited
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table rewards enable row level security;
drop policy if exists "Anyone can view active rewards" on rewards;
create policy "Anyone can view active rewards"
  on rewards for select
  using (is_active = true);
-- No client insert/update/delete policy — catalog is managed via the
-- Supabase dashboard directly (low change frequency, matches this repo's
-- ad-hoc-schema convention) until it needs a dedicated admin editor.

insert into rewards (sku, name, description, category, points_cost, requires_size, available_sizes, stock_quantity, is_active, sort_order)
values
  ('VEER-TSHIRT-01', 'VeerNXT T-Shirt', 'Premium cotton T-shirt with the VeerNXT crest. Placeholder copy/price — edit in the Supabase dashboard before launch.', 'apparel', 2000, true, array['S','M','L','XL','XXL'], null, true, 1),
  ('VEER-CAP-01', 'VeerNXT Cap', 'Adjustable cap with embroidered VeerNXT logo. Placeholder copy/price — edit in the Supabase dashboard before launch.', 'apparel', 1000, false, null, null, true, 2)
on conflict (sku) do nothing;

-- ── Redemptions ──────────────────────────────────────────────────────────
create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  reward_id uuid not null references rewards(id),
  points_spent integer not null,
  status text not null default 'pending', -- pending -> approved -> shipped -> delivered | cancelled
  size text,
  shipping_name text not null,
  shipping_phone text not null,
  shipping_address_line1 text not null,
  shipping_address_line2 text,
  shipping_city text not null,
  shipping_state text not null,
  shipping_pincode text not null,
  admin_notes text,
  tracking_number text,
  courier_name text,
  requested_at timestamptz default now(),
  approved_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  updated_at timestamptz default now()
);
create index if not exists reward_redemptions_user_id_idx on reward_redemptions(user_id);
create index if not exists reward_redemptions_status_idx on reward_redemptions(status);

alter table reward_redemptions enable row level security;
drop policy if exists "Users can view their own redemptions" on reward_redemptions;
create policy "Users can view their own redemptions"
  on reward_redemptions for select
  using (auth.uid() = user_id);
-- No client insert/update policy — all writes go through the
-- SECURITY DEFINER RPCs below, called only from server-side code.

-- ── redeem_reward() ─────────────────────────────────────────────────────
-- Atomic spend + stock lock + insert, all in one transaction. `for update`
-- on the rewards row serialises concurrent redemptions of limited stock;
-- the conditional balance UPDATE makes the spend itself race-proof.
create or replace function redeem_reward(
  p_user_id uuid,
  p_reward_id uuid,
  p_size text,
  p_shipping jsonb
) returns table(redemption_id uuid, new_balance integer)
language plpgsql security definer as $$
declare
  v_cost integer;
  v_active boolean;
  v_stock integer;
  v_balance integer;
  v_redemption_id uuid;
begin
  select points_cost, is_active, stock_quantity into v_cost, v_active, v_stock
    from rewards where id = p_reward_id for update;

  if not found then
    raise exception 'REWARD_NOT_FOUND';
  end if;
  if not v_active then
    raise exception 'REWARD_INACTIVE';
  end if;
  if v_stock is not null and v_stock <= 0 then
    raise exception 'OUT_OF_STOCK';
  end if;

  update user_profiles set points_balance = points_balance - v_cost
    where id = p_user_id and points_balance >= v_cost
    returning points_balance into v_balance;
  if not found then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  if v_stock is not null then
    update rewards set stock_quantity = stock_quantity - 1 where id = p_reward_id;
  end if;

  insert into reward_redemptions(
    user_id, reward_id, points_spent, size, shipping_name, shipping_phone,
    shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_pincode
  ) values (
    p_user_id, p_reward_id, v_cost, p_size,
    p_shipping->>'name', p_shipping->>'phone',
    p_shipping->>'line1', p_shipping->>'line2',
    p_shipping->>'city', p_shipping->>'state', p_shipping->>'pincode'
  ) returning id into v_redemption_id;

  insert into point_transactions(user_id, action_code, points, ref_table, ref_id, idempotency_key, metadata)
  values (
    p_user_id, 'REDEMPTION', -v_cost, 'reward_redemptions', v_redemption_id::text,
    'REDEMPTION:' || v_redemption_id::text, p_shipping
  );

  return query select v_redemption_id, v_balance;
end;
$$;

revoke execute on function redeem_reward(uuid, uuid, text, jsonb) from public;
revoke execute on function redeem_reward(uuid, uuid, text, jsonb) from anon;
revoke execute on function redeem_reward(uuid, uuid, text, jsonb) from authenticated;
grant execute on function redeem_reward(uuid, uuid, text, jsonb) to service_role;

-- ── update_redemption_status() ──────────────────────────────────────────
-- Handles every admin status transition in one call. Cancelling is the
-- only transition with side effects: it atomically refunds the spent
-- points and restores stock, so the queue can never orphan spent points
-- by way of a plain UPDATE.
create or replace function update_redemption_status(
  p_redemption_id uuid,
  p_new_status text,
  p_tracking_number text default null,
  p_courier_name text default null,
  p_admin_notes text default null,
  p_cancelled_reason text default null
) returns table(ok boolean, message text)
language plpgsql security definer as $$
declare
  v_row reward_redemptions%rowtype;
begin
  select * into v_row from reward_redemptions where id = p_redemption_id for update;
  if not found then
    return query select false, 'Redemption not found';
    return;
  end if;

  if p_new_status = 'cancelled' then
    if v_row.status = 'cancelled' then
      return query select false, 'Already cancelled';
      return;
    end if;

    update user_profiles set points_balance = points_balance + v_row.points_spent
      where id = v_row.user_id;

    insert into point_transactions(user_id, action_code, points, ref_table, ref_id, idempotency_key, metadata)
    values (
      v_row.user_id, 'REFUND', v_row.points_spent, 'reward_redemptions', v_row.id::text,
      'REFUND:' || v_row.id::text, jsonb_build_object('reason', p_cancelled_reason)
    );

    update rewards set stock_quantity = stock_quantity + 1
      where id = v_row.reward_id and stock_quantity is not null;

    update reward_redemptions set
      status = 'cancelled',
      cancelled_at = now(),
      cancelled_reason = p_cancelled_reason,
      admin_notes = coalesce(p_admin_notes, admin_notes),
      updated_at = now()
      where id = p_redemption_id;
  else
    update reward_redemptions set
      status = p_new_status,
      tracking_number = coalesce(p_tracking_number, tracking_number),
      courier_name = coalesce(p_courier_name, courier_name),
      admin_notes = coalesce(p_admin_notes, admin_notes),
      approved_at = case when p_new_status = 'approved' then now() else approved_at end,
      shipped_at = case when p_new_status = 'shipped' then now() else shipped_at end,
      delivered_at = case when p_new_status = 'delivered' then now() else delivered_at end,
      updated_at = now()
      where id = p_redemption_id;
  end if;

  return query select true, 'Updated';
end;
$$;

revoke execute on function update_redemption_status(uuid, text, text, text, text, text) from public;
revoke execute on function update_redemption_status(uuid, text, text, text, text, text) from anon;
revoke execute on function update_redemption_status(uuid, text, text, text, text, text) from authenticated;
grant execute on function update_redemption_status(uuid, text, text, text, text, text) to service_role;
