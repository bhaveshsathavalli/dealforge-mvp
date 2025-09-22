-- Fix RLS policies - simpler approach
-- Drop all existing policies first
DROP POLICY IF EXISTS "Service role can access all vendors" ON vendors;
DROP POLICY IF EXISTS "Service role can access all sources" ON sources;
DROP POLICY IF EXISTS "Service role can access all facts" ON facts;
DROP POLICY IF EXISTS "Service role can access all compare_runs" ON compare_runs;
DROP POLICY IF EXISTS "Service role can access all compare_rows" ON compare_rows;
DROP POLICY IF EXISTS "Service role can access all battlecard_bullets" ON battlecard_bullets;
DROP POLICY IF EXISTS "Service role can access all update_events" ON update_events;
DROP POLICY IF EXISTS "Service role can access all personal_saves" ON personal_saves;
DROP POLICY IF EXISTS "Service role can access all org_snapshots" ON org_snapshots;

DROP POLICY IF EXISTS "Users can access vendors from their org" ON vendors;
DROP POLICY IF EXISTS "Users can access sources from their org vendors" ON sources;
DROP POLICY IF EXISTS "Users can access facts from their org vendors" ON facts;
DROP POLICY IF EXISTS "Users can access compare_runs from their org" ON compare_runs;
DROP POLICY IF EXISTS "Users can access compare_rows from their org runs" ON compare_rows;
DROP POLICY IF EXISTS "Users can access battlecard_bullets from their org runs" ON battlecard_bullets;
DROP POLICY IF EXISTS "Users can access update_events from their org vendors" ON update_events;
DROP POLICY IF EXISTS "Users can access their own personal_saves" ON personal_saves;
DROP POLICY IF EXISTS "Users can access org_snapshots from their org" ON org_snapshots;

-- Create simple policies that allow all authenticated users
CREATE POLICY "Authenticated users can access vendors" ON vendors
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can access sources" ON sources
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can access facts" ON facts
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can access compare_runs" ON compare_runs
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can access compare_rows" ON compare_rows
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can access battlecard_bullets" ON battlecard_bullets
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can access update_events" ON update_events
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can access personal_saves" ON personal_saves
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can access org_snapshots" ON org_snapshots
    FOR ALL TO authenticated USING (true);

-- Service role policies
CREATE POLICY "Service role can access all vendors" ON vendors
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all sources" ON sources
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all facts" ON facts
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all compare_runs" ON compare_runs
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all compare_rows" ON compare_rows
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all battlecard_bullets" ON battlecard_bullets
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all update_events" ON update_events
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all personal_saves" ON personal_saves
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can access all org_snapshots" ON org_snapshots
    FOR ALL TO service_role USING (true);
