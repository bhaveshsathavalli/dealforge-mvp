-- 2025-09-28_competitors_delete_safety.sql
-- Safe database improvements for competitor delete operations

begin;

-- Add indexes for better performance on competitor queries
-- These are safe operations that won't break existing functionality

-- Index for org_id + id lookups (used in DELETE operations)
create index if not exists idx_competitors_org_id_id 
on public.competitors (org_id, id);

-- Index for org_id + active filtering (used in UI lists)
create index if not exists idx_competitors_org_id_active 
on public.competitors (org_id, active);

-- Index for org_id + created_at ordering (used in recent queries)
create index if not exists idx_competitors_org_id_created_at 
on public.competitors (org_id, created_at desc);

-- Create a view for active competitors only (optional but recommended)
create or replace view public.v_competitors_active as
select 
  id,
  org_id,
  name,
  website,
  slug,
  active,
  aliases,
  created_at,
  updated_at
from public.competitors
where active = true;

-- Add RLS policy to ensure users can only see their org's competitors
-- (if RLS is enabled on the competitors table)
alter table public.competitors enable row level security;

-- Policy to allow users to see only their org's competitors
create policy if not exists "Users can view their org's competitors"
on public.competitors
for select
using (
  org_id in (
    select o.id 
    from public.orgs o
    join public.org_memberships om on o.clerk_org_id = om.clerk_org_id
    where om.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Policy to allow admins to modify their org's competitors
create policy if not exists "Admins can modify their org's competitors"
on public.competitors
for all
using (
  org_id in (
    select o.id 
    from public.orgs o
    join public.org_memberships om on o.clerk_org_id = om.clerk_org_id
    where om.clerk_user_id = auth.jwt() ->> 'sub'
    and om.role = 'admin'
  )
);

commit;


