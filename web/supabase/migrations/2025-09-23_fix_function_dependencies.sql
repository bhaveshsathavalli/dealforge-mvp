-- Fix SQL conflicts by properly handling function dependencies
-- This migration handles conflicts from previous attempts

-- First, drop all policies that depend on the is_member function
DROP POLICY IF EXISTS "orgs_read_if_member" ON orgs;
DROP POLICY IF EXISTS "runs_read_if_member" ON query_runs;
DROP POLICY IF EXISTS "runs_insert_if_member" ON query_runs;
DROP POLICY IF EXISTS "hits_read_if_member_via_run" ON raw_hits;
DROP POLICY IF EXISTS "battlecards_read_if_member" ON battlecards;

-- Now drop the function (it should work without dependencies)
DROP FUNCTION IF EXISTS is_member(uuid);
DROP FUNCTION IF EXISTS is_member_of_org(uuid);

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Service role can access all vendors" ON vendors;
DROP POLICY IF EXISTS "Service role can access all sources" ON sources;
DROP POLICY IF EXISTS "Service role can access all facts" ON facts;
DROP POLICY IF EXISTS "Service role can access all compare_runs" ON compare_runs;
DROP POLICY IF EXISTS "Service role can access all compare_rows" ON compare_rows;
DROP POLICY IF EXISTS "Service role can access all battlecard_bullets" ON battlecard_bullets;
DROP POLICY IF EXISTS "Service role can access all update_events" ON update_events;
DROP POLICY IF EXISTS "Service role can access all personal_saves" ON personal_saves;
DROP POLICY IF EXISTS "Service role can access all org_snapshots" ON org_snapshots;

-- Drop dev policies
DROP POLICY IF EXISTS "Authenticated users can access vendors (DEV)" ON vendors;
DROP POLICY IF EXISTS "Authenticated users can access sources (DEV)" ON sources;
DROP POLICY IF EXISTS "Authenticated users can access facts (DEV)" ON facts;
DROP POLICY IF EXISTS "Authenticated users can access compare_runs (DEV)" ON compare_runs;
DROP POLICY IF EXISTS "Authenticated users can access compare_rows (DEV)" ON compare_rows;
DROP POLICY IF EXISTS "Authenticated users can access battlecard_bullets (DEV)" ON battlecard_bullets;
DROP POLICY IF EXISTS "Authenticated users can access update_events (DEV)" ON update_events;
DROP POLICY IF EXISTS "Authenticated users can access personal_saves (DEV)" ON personal_saves;
DROP POLICY IF EXISTS "Authenticated users can access org_snapshots (DEV)" ON org_snapshots;

-- Create the helper function with consistent parameter name
CREATE OR REPLACE FUNCTION is_member_of_org(target_org_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    clerk_user_id text;
BEGIN
    -- Get the Clerk user ID from the JWT
    clerk_user_id := auth.jwt() ->> 'sub';

    -- If no user ID, then not authenticated
    IF clerk_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if the user is a member of the target_org_id
    RETURN EXISTS (
        SELECT 1
        FROM public.org_memberships om
        JOIN public.orgs o ON om.clerk_org_id = o.clerk_org_id
        WHERE om.clerk_user_id = clerk_user_id
          AND o.id = target_org_id
    );
END;
$$;

-- Enable RLS on all facts pipeline tables (if not already enabled)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compare_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compare_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlecard_bullets ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for 'vendors'
CREATE POLICY "Users can view their org's vendors and global vendors" ON vendors
    FOR SELECT TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')) OR org_id IS NULL);
CREATE POLICY "Users can insert vendors for their org" ON vendors
    FOR INSERT TO authenticated WITH CHECK (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can update their org's vendors" ON vendors
    FOR UPDATE TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))) WITH CHECK (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can delete their org's vendors" ON vendors
    FOR DELETE TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));

-- RLS Policies for 'sources'
CREATE POLICY "Users can view sources for their org's vendors" ON sources
    FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')) OR org_id IS NULL));
CREATE POLICY "Users can insert sources for their org's vendors" ON sources
    FOR INSERT TO authenticated WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can update sources for their org's vendors" ON sources
    FOR UPDATE TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')))) WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can delete sources for their org's vendors" ON sources
    FOR DELETE TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));

-- RLS Policies for 'facts'
CREATE POLICY "Users can view facts for their org's vendors" ON facts
    FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')) OR org_id IS NULL));
CREATE POLICY "Users can insert facts for their org's vendors" ON facts
    FOR INSERT TO authenticated WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can update facts for their org's vendors" ON facts
    FOR UPDATE TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')))) WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can delete facts for their org's vendors" ON facts
    FOR DELETE TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));

-- RLS Policies for 'compare_runs'
CREATE POLICY "Users can view their org's compare runs" ON compare_runs
    FOR SELECT TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can insert compare runs for their org" ON compare_runs
    FOR INSERT TO authenticated WITH CHECK (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can update their org's compare runs" ON compare_runs
    FOR UPDATE TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))) WITH CHECK (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can delete their org's compare runs" ON compare_runs
    FOR DELETE TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));

-- RLS Policies for 'compare_rows'
CREATE POLICY "Users can view compare rows for their org's runs" ON compare_rows
    FOR SELECT TO authenticated USING (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can insert compare rows for their org's runs" ON compare_rows
    FOR INSERT TO authenticated WITH CHECK (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can update compare rows for their org's runs" ON compare_rows
    FOR UPDATE TO authenticated USING (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')))) WITH CHECK (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can delete compare rows for their org's runs" ON compare_rows
    FOR DELETE TO authenticated USING (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));

-- RLS Policies for 'battlecard_bullets'
CREATE POLICY "Users can view battlecard bullets for their org's runs" ON battlecard_bullets
    FOR SELECT TO authenticated USING (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can insert battlecard bullets for their org's runs" ON battlecard_bullets
    FOR INSERT TO authenticated WITH CHECK (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can update battlecard bullets for their org's runs" ON battlecard_bullets
    FOR UPDATE TO authenticated USING (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')))) WITH CHECK (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can delete battlecard bullets for their org's runs" ON battlecard_bullets
    FOR DELETE TO authenticated USING (run_id IN (SELECT id FROM compare_runs WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));

-- RLS Policies for 'update_events'
CREATE POLICY "Users can view update events for their org's vendors" ON update_events
    FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can insert update events for their org's vendors" ON update_events
    FOR INSERT TO authenticated WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can update update events for their org's vendors" ON update_events
    FOR UPDATE TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')))) WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));
CREATE POLICY "Users can delete update events for their org's vendors" ON update_events
    FOR DELETE TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))));

-- RLS Policies for 'personal_saves'
CREATE POLICY "Users can view their personal saves" ON personal_saves
    FOR SELECT TO authenticated USING (user_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "Users can insert personal saves" ON personal_saves
    FOR INSERT TO authenticated WITH CHECK (user_id = (auth.jwt() ->> 'sub') AND org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can update their personal saves" ON personal_saves
    FOR UPDATE TO authenticated USING (user_id = (auth.jwt() ->> 'sub')) WITH CHECK (user_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "Users can delete their personal saves" ON personal_saves
    FOR DELETE TO authenticated USING (user_id = (auth.jwt() ->> 'sub'));

-- RLS Policies for 'org_snapshots'
CREATE POLICY "Users can view their org's snapshots" ON org_snapshots
    FOR SELECT TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can insert org snapshots" ON org_snapshots
    FOR INSERT TO authenticated WITH CHECK (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can update their org's snapshots" ON org_snapshots
    FOR UPDATE TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id'))) WITH CHECK (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));
CREATE POLICY "Users can delete their org's snapshots" ON org_snapshots
    FOR DELETE TO authenticated USING (org_id = (SELECT id FROM orgs WHERE clerk_org_id = (auth.jwt() ->> 'org_id')));

-- Service role policies (full access)
CREATE POLICY "Service role can access all vendors" ON vendors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can access all sources" ON sources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can access all facts" ON facts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can access all compare_runs" ON compare_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can access all compare_rows" ON compare_rows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can access all battlecard_bullets" ON battlecard_bullets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can access all update_events" ON update_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can access all personal_saves" ON personal_saves FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can access all org_snapshots" ON org_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
