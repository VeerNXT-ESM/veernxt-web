-- Points/gamification system — Phase 2 of the Learning Center deep dive.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- This repo has no migration tooling, so schema changes are applied this way
-- by convention — matches how `user_profiles`, `quizzes`, etc. were created.

create extension if not exists pgcrypto;

-- ── Ledger ────────────────────────────────────────────────────────────────
-- Append-only. The unique(user_id, idempotency_key) constraint is what
-- prevents double-awarding (e.g. retaking a quiz, re-running profiling).
create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  action_code text not null,
  points integer not null,
  ref_table text,
  -- text, not uuid: not every ref_id in this codebase is a real UUID
  -- (e.g. resources_v2.resource_id may be a slug), and this column is
  -- purely informational/audit, never joined against.
  ref_id text,
  idempotency_key text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  unique (user_id, idempotency_key)
);
create index if not exists point_transactions_user_id_idx on point_transactions(user_id);

alter table user_profiles
  add column if not exists points_balance integer not null default 0,
  add column if not exists points_lifetime integer not null default 0;

-- Users can read their own transaction history; no client-side write policy
-- is defined on purpose — every write must go through the award_points()
-- RPC below, called only from server-side (service-role) code.
alter table point_transactions enable row level security;
drop policy if exists "Users can view their own point transactions" on point_transactions;
create policy "Users can view their own point transactions"
  on point_transactions for select
  using (auth.uid() = user_id);

-- ── award_points() ──────────────────────────────────────────────────────
-- SECURITY DEFINER so it can update user_profiles.points_balance for the
-- target user regardless of caller RLS. The unique constraint above (via
-- the exception handler) is the actual double-award guard — this closes
-- the race that a JS-level "check then insert" can't, since Vercel
-- functions are stateless/concurrent.
create or replace function award_points(
  p_user_id uuid,
  p_action_code text,
  p_points integer,
  p_idempotency_key text,
  p_ref_table text default null,
  p_ref_id text default null,
  p_metadata jsonb default '{}'
) returns table(awarded boolean, new_balance integer)
language plpgsql security definer as $$
declare
  v_balance integer;
begin
  begin
    insert into point_transactions(user_id, action_code, points, ref_table, ref_id, idempotency_key, metadata)
    values (p_user_id, p_action_code, p_points, p_ref_table, p_ref_id, p_idempotency_key, p_metadata);
  exception when unique_violation then
    select points_balance into v_balance from user_profiles where id = p_user_id;
    return query select false, v_balance;
    return;
  end;

  update user_profiles
    set points_balance = points_balance + p_points,
        points_lifetime = points_lifetime + greatest(p_points, 0)
    where id = p_user_id
    returning points_balance into v_balance;

  return query select true, v_balance;
end;
$$;

-- IMPORTANT: Postgres grants EXECUTE on new functions to PUBLIC by default,
-- which would let anyone with the anon/authenticated key call this
-- SECURITY DEFINER function directly via PostgREST (/rest/v1/rpc/award_points)
-- with an arbitrary p_user_id/p_points — a straight point-injection bug.
-- Lock it down to service_role only; all awards must go through server code.
revoke execute on function award_points(uuid, text, integer, text, text, text, jsonb) from public;
revoke execute on function award_points(uuid, text, integer, text, text, text, jsonb) from anon;
revoke execute on function award_points(uuid, text, integer, text, text, text, jsonb) from authenticated;
grant execute on function award_points(uuid, text, integer, text, text, text, jsonb) to service_role;
