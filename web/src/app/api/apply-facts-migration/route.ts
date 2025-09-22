import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const sb = await createClient();
    
    // Read the migration file
    const migrationSQL = `
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

-- Grant basic permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compare_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compare_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battlecard_bullets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_saves TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_snapshots TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    `;
    
    // Execute the migration
    const { error } = await sb.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: `Migration failed: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Facts pipeline migration applied successfully" 
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
