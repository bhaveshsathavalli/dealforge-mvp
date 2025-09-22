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
  metric text not null, -- pricing|features|integrations|security|reliability|changelog|marketplace|social
  url text not null,
  title text,
  body text, -- normalized HTML/JSON
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
  persona text null, -- SE|PM|Security|Finance
  computed_at timestamptz not null default now()
);

-- Update events from diffs
create table if not exists update_events (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  metric text not null,
  type text not null, -- PRICE_CHANGE|LIMIT_CHANGE|NEW_INTEGRATION|INCIDENT|RELEASE_NOTE|SECURITY_SCOPE|MARKETPLACE_UPDATE|SOCIAL_POST
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

-- Enable RLS
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
-- Vendors: org-scoped access
create policy "Users can view vendors in their org" on vendors
  for select using (org_id = auth.jwt() ->> 'org_id'::uuid);

create policy "Users can insert vendors in their org" on vendors
  for insert with check (org_id = auth.jwt() ->> 'org_id'::uuid);

create policy "Users can update vendors in their org" on vendors
  for update using (org_id = auth.jwt() ->> 'org_id'::uuid);

-- Sources: org-scoped via vendor
create policy "Users can view sources for their org vendors" on sources
  for select using (
    vendor_id in (
      select id from vendors where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

create policy "Users can insert sources for their org vendors" on sources
  for insert with check (
    vendor_id in (
      select id from vendors where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

-- Facts: org-scoped via vendor
create policy "Users can view facts for their org vendors" on facts
  for select using (
    vendor_id in (
      select id from vendors where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

create policy "Users can insert facts for their org vendors" on facts
  for insert with check (
    vendor_id in (
      select id from vendors where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

-- Compare runs: org-scoped
create policy "Users can view compare runs in their org" on compare_runs
  for select using (org_id = auth.jwt() ->> 'org_id'::uuid);

create policy "Users can insert compare runs in their org" on compare_runs
  for insert with check (org_id = auth.jwt() ->> 'org_id'::uuid);

-- Compare rows: org-scoped via run
create policy "Users can view compare rows for their org runs" on compare_rows
  for select using (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

create policy "Users can insert compare rows for their org runs" on compare_rows
  for insert with check (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

-- Battlecard bullets: org-scoped via run
create policy "Users can view battlecard bullets for their org runs" on battlecard_bullets
  for select using (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

create policy "Users can insert battlecard bullets for their org runs" on battlecard_bullets
  for insert with check (
    run_id in (
      select id from compare_runs where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

-- Update events: org-scoped via vendor
create policy "Users can view update events for their org vendors" on update_events
  for select using (
    vendor_id in (
      select id from vendors where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

create policy "Users can insert update events for their org vendors" on update_events
  for insert with check (
    vendor_id in (
      select id from vendors where org_id = auth.jwt() ->> 'org_id'::uuid
    )
  );

-- Personal saves: user-scoped
create policy "Users can view their personal saves" on personal_saves
  for select using (user_id = auth.jwt() ->> 'sub');

create policy "Users can insert their personal saves" on personal_saves
  for insert with check (user_id = auth.jwt() ->> 'sub');

-- Org snapshots: org-scoped
create policy "Users can view org snapshots in their org" on org_snapshots
  for select using (org_id = auth.jwt() ->> 'org_id'::uuid);

create policy "Users can insert org snapshots in their org" on org_snapshots
  for insert with check (org_id = auth.jwt() ->> 'org_id'::uuid);

-- Service role policies for cron jobs
create policy "Service role can access all vendors" on vendors
  for all using (auth.role() = 'service_role');

create policy "Service role can access all sources" on sources
  for all using (auth.role() = 'service_role');

create policy "Service role can access all facts" on facts
  for all using (auth.role() = 'service_role');

create policy "Service role can access all compare runs" on compare_runs
  for all using (auth.role() = 'service_role');

create policy "Service role can access all compare rows" on compare_rows
  for all using (auth.role() = 'service_role');

create policy "Service role can access all battlecard bullets" on battlecard_bullets
  for all using (auth.role() = 'service_role');

create policy "Service role can access all update events" on update_events
  for all using (auth.role() = 'service_role');

create policy "Service role can access all personal saves" on personal_saves
  for all using (auth.role() = 'service_role');

create policy "Service role can access all org snapshots" on org_snapshots
  for all using (auth.role() = 'service_role');
