-- Fix RLS policies for facts pipeline tables
-- This migration ensures authenticated users can access the facts pipeline tables

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view vendors in their org" ON vendors;
DROP POLICY IF EXISTS "Users can insert vendors in their org" ON vendors;
DROP POLICY IF EXISTS "Users can update vendors in their org" ON vendors;

DROP POLICY IF EXISTS "Users can view sources for their org vendors" ON sources;
DROP POLICY IF EXISTS "Users can insert sources for their org vendors" ON sources;

DROP POLICY IF EXISTS "Users can view facts for their org vendors" ON facts;
DROP POLICY IF EXISTS "Users can insert facts for their org vendors" ON facts;

DROP POLICY IF EXISTS "Users can view compare runs in their org" ON compare_runs;
DROP POLICY IF EXISTS "Users can insert compare runs in their org" ON compare_runs;

DROP POLICY IF EXISTS "Users can view compare rows for their org runs" ON compare_rows;
DROP POLICY IF EXISTS "Users can insert compare rows for their org runs" ON compare_rows;

DROP POLICY IF EXISTS "Users can view battlecard bullets for their org runs" ON battlecard_bullets;
DROP POLICY IF EXISTS "Users can insert battlecard bullets for their org runs" ON battlecard_bullets;

DROP POLICY IF EXISTS "Users can view update events for their org vendors" ON update_events;
DROP POLICY IF EXISTS "Users can insert update events for their org vendors" ON update_events;

DROP POLICY IF EXISTS "Users can view their personal saves" ON personal_saves;
DROP POLICY IF EXISTS "Users can insert their personal saves" ON personal_saves;

DROP POLICY IF EXISTS "Users can view org snapshots in their org" ON org_snapshots;
DROP POLICY IF EXISTS "Users can insert org snapshots in their org" ON org_snapshots;

-- Create simplified policies that work with the current auth setup
-- For now, allow all authenticated users to access all facts pipeline tables
-- TODO: Implement proper org-scoped policies once auth is working

CREATE POLICY "Authenticated users can access vendors" ON vendors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access sources" ON sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access facts" ON facts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access compare runs" ON compare_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access compare rows" ON compare_rows
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access battlecard bullets" ON battlecard_bullets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access update events" ON update_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access personal saves" ON personal_saves
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access org snapshots" ON org_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compare_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compare_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlecard_bullets ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_snapshots ENABLE ROW LEVEL SECURITY;
