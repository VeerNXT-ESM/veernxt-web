-- ============================================================
-- VeerNXT Legal Aid Queries Table
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jtcyeufhvpieyngracpo/sql
-- ============================================================

create table if not exists legal_aid_queries (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null,
  created_at timestamptz default now(),
  profile text,
  service text,
  category text,
  situation text,
  urgency text,
  route text,
  qa_summary jsonb,
  contact_method text,
  mobile text,
  email text,
  consent boolean default true,
  status text default 'new',
  admin_notes text
);

-- Enable RLS
alter table legal_aid_queries enable row level security;

-- Allow any visitor (anon) to insert (submit a query)
create policy "Allow anon insert on legal_aid_queries"
  on legal_aid_queries
  for insert
  with check (true);

-- Only service_role (backend) can read/update/delete
create policy "Service role full access on legal_aid_queries"
  on legal_aid_queries
  for all
  using (auth.role() = 'service_role');
