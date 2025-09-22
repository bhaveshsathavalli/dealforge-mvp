-- DEV ONLY — replace with org-scoped policies before production.
-- This migration enables writes on facts-pipeline tables for local testing

-- Ensure RLS is enabled on all facts pipeline tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compare_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compare_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlecard_bullets ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can access vendors" ON vendors;
DROP POLICY IF EXISTS "Authenticated users can access sources" ON sources;
DROP POLICY IF EXISTS "Authenticated users can access facts" ON facts;
DROP POLICY IF EXISTS "Authenticated users can access compare_runs" ON compare_runs;
DROP POLICY IF EXISTS "Authenticated users can access compare_rows" ON compare_rows;
DROP POLICY IF EXISTS "Authenticated users can access battlecard_bullets" ON battlecard_bullets;
DROP POLICY IF EXISTS "Authenticated users can access update_events" ON update_events;
DROP POLICY IF EXISTS "Authenticated users can access personal_saves" ON personal_saves;
DROP POLICY IF EXISTS "Authenticated users can access org_snapshots" ON org_snapshots;

-- Grant INSERT/UPDATE/DELETE permissions to authenticated role
GRANT INSERT ON public.vendors TO authenticated;
GRANT UPDATE ON public.vendors TO authenticated;
GRANT DELETE ON public.vendors TO authenticated;

GRANT INSERT ON public.sources TO authenticated;
GRANT UPDATE ON public.sources TO authenticated;
GRANT DELETE ON public.sources TO authenticated;

GRANT INSERT ON public.facts TO authenticated;
GRANT UPDATE ON public.facts TO authenticated;
GRANT DELETE ON public.facts TO authenticated;

GRANT INSERT ON public.compare_runs TO authenticated;
GRANT UPDATE ON public.compare_runs TO authenticated;
GRANT DELETE ON public.compare_runs TO authenticated;

GRANT INSERT ON public.compare_rows TO authenticated;
GRANT UPDATE ON public.compare_rows TO authenticated;
GRANT DELETE ON public.compare_rows TO authenticated;

GRANT INSERT ON public.battlecard_bullets TO authenticated;
GRANT UPDATE ON public.battlecard_bullets TO authenticated;
GRANT DELETE ON public.battlecard_bullets TO authenticated;

GRANT INSERT ON public.update_events TO authenticated;
GRANT UPDATE ON public.update_events TO authenticated;
GRANT DELETE ON public.update_events TO authenticated;

GRANT INSERT ON public.personal_saves TO authenticated;
GRANT UPDATE ON public.personal_saves TO authenticated;
GRANT DELETE ON public.personal_saves TO authenticated;

GRANT INSERT ON public.org_snapshots TO authenticated;
GRANT UPDATE ON public.org_snapshots TO authenticated;
GRANT DELETE ON public.org_snapshots TO authenticated;

-- Grant USAGE on sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create temporary dev policies that allow all authenticated users full access
-- TODO: Replace with org-scoped policies before production
CREATE POLICY "DEV: Authenticated users can access vendors" ON vendors
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "DEV: Authenticated users can access sources" ON sources
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "DEV: Authenticated users can access facts" ON facts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "DEV: Authenticated users can access compare_runs" ON compare_runs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "DEV: Authenticated users can access compare_rows" ON compare_rows
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "DEV: Authenticated users can access battlecard_bullets" ON battlecard_bullets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "DEV: Authenticated users can access update_events" ON update_events
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "DEV: Authenticated users can access personal_saves" ON personal_saves
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "DEV: Authenticated users can access org_snapshots" ON org_snapshots
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role policies (for server-side operations)
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
