-- Facts Pipeline Migration
-- Creates tables for the new deterministic facts-based comparison system

-- Vendors (competitors + "us")
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null, -- our product record can be org-scoped; competitors may be shared/global
  name text not null,
  website text,
  official_site_confidence int default 0,
  socials jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Raw fetched pages (normalized)
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  metric text not null,  -- pricing|features|integrations|security|reliability|changelog|marketplace|social
  url text not null,
  title text,
  body text,             -- normalized HTML/JSON
  first_party boolean default true,
  fetched_at timestamptz not null default now(),
  body_hash text not null,
  source_score float4 default 0
);

-- Atomic facts
create table if not exists facts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  metric text not null,
  key text,
  value text,
  text_summary text,
  citations jsonb not null default '[]'::jsonb, -- [{url,title,source_id}]
  fact_score float4 default 0,
  computed_at timestamptz not null default now()
);

-- Compare runs + rows (render-ready)
create table if not exists compare_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  you_vendor_id uuid not null references vendors(id),
  comp_vendor_id uuid not null references vendors(id),
  version int not null default 1,
  frozen_at timestamptz null,
  created_at timestamptz default now()
);

create table if not exists compare_rows (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references compare_runs(id) on delete cascade,
  metric text not null,
  you_text text not null,
  comp_text text not null,
  you_citations jsonb not null default '[]'::jsonb,
  comp_citations jsonb not null default '[]'::jsonb,
  answer_score_you float4 default 0,
  answer_score_comp float4 default 0,
  computed_at timestamptz not null default now()
);

-- Battlecards (render-ready)
create table if not exists battlecard_bullets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references compare_runs(id) on delete cascade,
  section text not null, -- differentiators|objections|counters|landmines|proof|pricing
  text text not null,
  citations jsonb not null default '[]'::jsonb,
  answer_score float4 default 0,
  persona text null,     -- SE|PM|Security|Finance
  computed_at timestamptz not null default now()
);

-- Update events from diffs
create table if not exists update_events (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  metric text not null,
  type text not null,   -- PRICE_CHANGE|LIMIT_CHANGE|NEW_INTEGRATION|INCIDENT|RELEASE_NOTE|SECURITY_SCOPE|MARKETPLACE_UPDATE|SOCIAL_POST
  old jsonb,
  new jsonb,
  severity int not null default 1,
  detected_at timestamptz not null default now(),
  source_ids uuid[] default '{}'
);

-- Saves: personal (private) & org-shared
create table if not exists personal_saves (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  org_id uuid not null,
  base_run_id uuid not null references compare_runs(id) on delete cascade,
  name text not null,
  snapshot jsonb not null,
  created_at timestamptz default now()
);

create table if not exists org_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  base_run_id uuid not null references compare_runs(id) on delete cascade,
  name text not null,
  snapshot jsonb not null,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_vendors_org_id on vendors(org_id);
create index if not exists idx_vendors_name on vendors(name);
create index if not exists idx_sources_vendor_id on sources(vendor_id);
create index if not exists idx_sources_metric on sources(metric);
create index if not exists idx_sources_body_hash on sources(body_hash);
create index if not exists idx_facts_vendor_id on facts(vendor_id);
create index if not exists idx_facts_metric on facts(metric);
create index if not exists idx_compare_runs_org_id on compare_runs(org_id);
create index if not exists idx_compare_rows_run_id on compare_rows(run_id);
create index if not exists idx_battlecard_bullets_run_id on battlecard_bullets(run_id);
create index if not exists idx_update_events_vendor_id on update_events(vendor_id);
create index if not exists idx_update_events_detected_at on update_events(detected_at);
create index if not exists idx_personal_saves_user_id on personal_saves(user_id);
create index if not exists idx_personal_saves_org_id on personal_saves(org_id);
create index if not exists idx_org_snapshots_org_id on org_snapshots(org_id);

-- Enable RLS on all tables
alter table vendors enable row level security;
alter table sources enable row level security;
alter table facts enable row level security;
alter table compare_runs enable row level security;
alter table compare_rows enable row level security;
alter table battlecard_bullets enable row level security;
alter table update_events enable row level security;
alter table personal_saves enable row level security;
alter table org_snapshots enable row level security;

-- RLS Policies

-- Service role can access all tables
create policy "Service role can access all vendors" on vendors
    for all to service_role using (true);

create policy "Service role can access all sources" on sources
    for all to service_role using (true);

create policy "Service role can access all facts" on facts
    for all to service_role using (true);

create policy "Service role can access all compare_runs" on compare_runs
    for all to service_role using (true);

create policy "Service role can access all compare_rows" on compare_rows
    for all to service_role using (true);

create policy "Service role can access all battlecard_bullets" on battlecard_bullets
    for all to service_role using (true);

create policy "Service role can access all update_events" on update_events
    for all to service_role using (true);

create policy "Service role can access all personal_saves" on personal_saves
    for all to service_role using (true);

create policy "Service role can access all org_snapshots" on org_snapshots
    for all to service_role using (true);

-- Vendors: org-scoped access (competitors can be shared globally)
create policy "Users can access vendors from their org" on vendors
    for all to authenticated using (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        ) OR org_id IS NULL  -- Allow global competitors
    );

-- Sources: accessible through vendor access
create policy "Users can access sources from their org vendors" on sources
    for all to authenticated using (
        vendor_id IN (
            SELECT id FROM vendors 
            WHERE org_id IN (
                SELECT id FROM orgs 
                WHERE clerk_org_id IN (
                    SELECT clerk_org_id FROM org_memberships 
                    WHERE clerk_user_id = auth.jwt() ->> 'sub'
                )
            ) OR org_id IS NULL
        )
    );

-- Facts: accessible through vendor access
create policy "Users can access facts from their org vendors" on facts
    for all to authenticated using (
        vendor_id IN (
            SELECT id FROM vendors 
            WHERE org_id IN (
                SELECT id FROM orgs 
                WHERE clerk_org_id IN (
                    SELECT clerk_org_id FROM org_memberships 
                    WHERE clerk_user_id = auth.jwt() ->> 'sub'
                )
            ) OR org_id IS NULL
        )
    );

-- Compare runs: org-scoped
create policy "Users can access compare_runs from their org" on compare_runs
    for all to authenticated using (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Compare rows: accessible through run access
create policy "Users can access compare_rows from their org runs" on compare_rows
    for all to authenticated using (
        run_id IN (
            SELECT id FROM compare_runs 
            WHERE org_id IN (
                SELECT id FROM orgs 
                WHERE clerk_org_id IN (
                    SELECT clerk_org_id FROM org_memberships 
                    WHERE clerk_user_id = auth.jwt() ->> 'sub'
                )
            )
        )
    );

-- Battlecard bullets: accessible through run access
create policy "Users can access battlecard_bullets from their org runs" on battlecard_bullets
    for all to authenticated using (
        run_id IN (
            SELECT id FROM compare_runs 
            WHERE org_id IN (
                SELECT id FROM orgs 
                WHERE clerk_org_id IN (
                    SELECT clerk_org_id FROM org_memberships 
                    WHERE clerk_user_id = auth.jwt() ->> 'sub'
                )
            )
        )
    );

-- Update events: accessible through vendor access
create policy "Users can access update_events from their org vendors" on update_events
    for all to authenticated using (
        vendor_id IN (
            SELECT id FROM vendors 
            WHERE org_id IN (
                SELECT id FROM orgs 
                WHERE clerk_org_id IN (
                    SELECT clerk_org_id FROM org_memberships 
                    WHERE clerk_user_id = auth.jwt() ->> 'sub'
                )
            ) OR org_id IS NULL
        )
    );

-- Personal saves: user-scoped
create policy "Users can access their own personal_saves" on personal_saves
    for all to authenticated using (
        user_id = auth.jwt() ->> 'sub' AND
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Org snapshots: org-scoped
create policy "Users can access org_snapshots from their org" on org_snapshots
    for all to authenticated using (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );
