-- Facts Pipeline V2 Schema Updates
-- This migration adds org_id columns, new fields, indexes, triggers, and RLS policies

-- ============================================================================
-- SOURCES TABLE UPDATES
-- ============================================================================

-- Add new columns to sources table
alter table sources add column if not exists org_id uuid;
alter table sources add column if not exists metric_guess text;
alter table sources add column if not exists page_class_confidence numeric;
alter table sources add column if not exists http_cache jsonb;
alter table sources add column if not exists trust_tier smallint not null default 1;

-- Backfill org_id using vendors.org_id for existing rows
update sources 
set org_id = v.org_id 
from vendors v 
where sources.vendor_id = v.id 
and sources.org_id is null;

-- Add unique index on (vendor_id, url)
create unique index if not exists sources_vendor_url_unique 
on sources (vendor_id, url);

-- ============================================================================
-- FACTS TABLE UPDATES
-- ============================================================================

-- Add new columns to facts table (all nullable for back-compat)
alter table facts add column if not exists org_id uuid;
alter table facts add column if not exists subject text;
alter table facts add column if not exists units text;
alter table facts add column if not exists confidence numeric;
alter table facts add column if not exists value_json jsonb;
alter table facts add column if not exists first_seen_at timestamptz default now();
alter table facts add column if not exists last_seen_at timestamptz default now();

-- Backfill org_id via vendors.org_id
update facts 
set org_id = v.org_id 
from vendors v 
where facts.vendor_id = v.id 
and facts.org_id is null;

-- Add unique index on (vendor_id, metric, subject, key) where subject is not null
create unique index if not exists facts_vendor_metric_subject_key_unique 
on facts (vendor_id, metric, subject, key) 
where subject is not null;

-- ============================================================================
-- UPDATE_EVENTS TABLE UPDATES
-- ============================================================================

-- Add org_id column
alter table update_events add column if not exists org_id uuid;

-- Backfill org_id from vendors.org_id
update update_events 
set org_id = v.org_id 
from vendors v 
where update_events.vendor_id = v.id 
and update_events.org_id is null;

-- Add index on (vendor_id, metric, detected_at desc)
create index if not exists update_events_vendor_metric_detected_at_idx 
on update_events (vendor_id, metric, detected_at desc);

-- ============================================================================
-- TRIGGERS FOR ORG_ID POPULATION
-- ============================================================================

-- Function to set org_id from vendors table
create or replace function set_org_id_from_vendor()
returns trigger as $$
begin
  if new.org_id is null and new.vendor_id is not null then
    select org_id into new.org_id 
    from vendors 
    where id = new.vendor_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- Create triggers for sources, facts, update_events
create trigger sources_set_org_id_trigger
  before insert on sources
  for each row execute function set_org_id_from_vendor();

create trigger facts_set_org_id_trigger
  before insert on facts
  for each row execute function set_org_id_from_vendor();

create trigger update_events_set_org_id_trigger
  before insert on update_events
  for each row execute function set_org_id_from_vendor();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on tables that don't have it yet
alter table sources enable row level security;
alter table facts enable row level security;
alter table update_events enable row level security;
alter table compare_runs enable row level security;
alter table compare_rows enable row level security;
alter table battlecard_bullets enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "org_scope_select" on sources;
drop policy if exists "org_scope_select" on facts;
drop policy if exists "org_scope_select" on update_events;
drop policy if exists "org_scope_select" on compare_runs;
drop policy if exists "org_scope_select" on compare_rows;
drop policy if exists "org_scope_select" on battlecard_bullets;

drop policy if exists "org_scope_cud" on sources;
drop policy if exists "org_scope_cud" on facts;
drop policy if exists "org_scope_cud" on update_events;
drop policy if exists "org_scope_cud" on compare_runs;
drop policy if exists "org_scope_cud" on compare_rows;
drop policy if exists "org_scope_cud" on battlecard_bullets;

-- Create org-scoped SELECT policies
create policy "org_scope_select" on sources
  for select using (org_id = auth.jwt() ->> 'org_id');

create policy "org_scope_select" on facts
  for select using (org_id = auth.jwt() ->> 'org_id');

create policy "org_scope_select" on update_events
  for select using (org_id = auth.jwt() ->> 'org_id');

create policy "org_scope_select" on compare_runs
  for select using (org_id = auth.jwt() ->> 'org_id');

create policy "org_scope_select" on compare_rows
  for select using (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'
    )
  );

create policy "org_scope_select" on battlecard_bullets
  for select using (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'
    )
  );

-- Create org-scoped CUD (Create/Update/Delete) policies
create policy "org_scope_cud" on sources
  for all using (org_id = auth.jwt() ->> 'org_id')
  with check (org_id = auth.jwt() ->> 'org_id');

create policy "org_scope_cud" on facts
  for all using (org_id = auth.jwt() ->> 'org_id')
  with check (org_id = auth.jwt() ->> 'org_id');

create policy "org_scope_cud" on update_events
  for all using (org_id = auth.jwt() ->> 'org_id')
  with check (org_id = auth.jwt() ->> 'org_id');

create policy "org_scope_cud" on compare_runs
  for all using (org_id = auth.jwt() ->> 'org_id')
  with check (org_id = auth.jwt() ->> 'org_id');

create policy "org_scope_cud" on compare_rows
  for all using (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'
    )
  )
  with check (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'
    )
  );

create policy "org_scope_cud" on battlecard_bullets
  for all using (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'
    )
  )
  with check (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'
    )
  );

-- Service role bypasses RLS
create policy "service_role_bypass" on sources
  for all using (auth.role() = 'service_role');

create policy "service_role_bypass" on facts
  for all using (auth.role() = 'service_role');

create policy "service_role_bypass" on update_events
  for all using (auth.role() = 'service_role');

create policy "service_role_bypass" on compare_runs
  for all using (auth.role() = 'service_role');

create policy "service_role_bypass" on compare_rows
  for all using (auth.role() = 'service_role');

create policy "service_role_bypass" on battlecard_bullets
  for all using (auth.role() = 'service_role');

-- ============================================================================
-- FOREIGN KEY HYGIENE
-- ============================================================================

-- Add foreign key constraints if they don't exist
-- Note: These should already exist from the original migration, but adding for safety

-- Sources already has: vendor_id uuid not null references vendors(id) on delete cascade
-- Facts already has: vendor_id uuid not null references vendors(id) on delete cascade  
-- Update_events already has: vendor_id uuid not null references vendors(id) on delete cascade

-- Add foreign key for sources.org_id -> vendors.org_id (optional, for data integrity)
-- Note: This is commented out as vendors.org_id can be null for global competitors
-- alter table sources add constraint sources_org_id_fkey 
--   foreign key (org_id) references vendors(org_id);

-- Add foreign key for facts.org_id -> vendors.org_id (optional, for data integrity)
-- Note: This is commented out as vendors.org_id can be null for global competitors
-- alter table facts add constraint facts_org_id_fkey 
--   foreign key (org_id) references vendors(org_id);

-- Add foreign key for update_events.org_id -> vendors.org_id (optional, for data integrity)
-- Note: This is commented out as vendors.org_id can be null for global competitors
-- alter table update_events add constraint update_events_org_id_fkey 
--   foreign key (org_id) references vendors(org_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

comment on column sources.org_id is 'Organization ID for RLS scoping';
comment on column sources.metric_guess is 'AI-generated guess of what metric this page contains';
comment on column sources.page_class_confidence is 'Confidence score for page classification';
comment on column sources.http_cache is 'HTTP response metadata and caching info';
comment on column sources.trust_tier is 'Trust level: 1=high, 2=medium, 3=low';

comment on column facts.org_id is 'Organization ID for RLS scoping';
comment on column facts.subject is 'Subject/entity the fact is about (e.g., "Enterprise Plan", "API Rate Limit")';
comment on column facts.units is 'Units for the fact value (e.g., "$/month", "requests/hour")';
comment on column facts.confidence is 'Confidence score for this fact extraction';
comment on column facts.value_json is 'Structured value data (numbers, objects, arrays)';
comment on column facts.first_seen_at is 'When this fact was first discovered';
comment on column facts.last_seen_at is 'When this fact was last verified';

comment on column update_events.org_id is 'Organization ID for RLS scoping';
