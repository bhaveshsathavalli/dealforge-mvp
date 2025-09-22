-- Replace dev RLS policies with org-scoped policies
-- This migration replaces the temporary dev policies with proper org membership checks

-- First, create a helper function to check org membership
CREATE OR REPLACE FUNCTION is_member(org uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.org_id = org AND m.clerk_user_id = auth.jwt() ->> 'sub'
  );
$$;

-- Drop the temporary dev policies
DROP POLICY IF EXISTS "DEV: Authenticated users can access vendors" ON vendors;
DROP POLICY IF EXISTS "DEV: Authenticated users can access sources" ON sources;
DROP POLICY IF EXISTS "DEV: Authenticated users can access facts" ON facts;
DROP POLICY IF EXISTS "DEV: Authenticated users can access compare_runs" ON compare_runs;
DROP POLICY IF EXISTS "DEV: Authenticated users can access compare_rows" ON compare_rows;
DROP POLICY IF EXISTS "DEV: Authenticated users can access battlecard_bullets" ON battlecard_bullets;
DROP POLICY IF EXISTS "DEV: Authenticated users can access update_events" ON update_events;
DROP POLICY IF EXISTS "DEV: Authenticated users can access personal_saves" ON personal_saves;
DROP POLICY IF EXISTS "DEV: Authenticated users can access org_snapshots" ON org_snapshots;

-- Create org-scoped policies for vendors
CREATE POLICY "Users can access vendors from their org" ON vendors
    FOR ALL TO authenticated USING (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        ) OR org_id IS NULL
    ) WITH CHECK (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        ) OR org_id IS NULL
    );

-- Create org-scoped policies for sources
CREATE POLICY "Users can access sources from their org vendors" ON sources
    FOR ALL TO authenticated USING (
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
    ) WITH CHECK (
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

-- Create org-scoped policies for facts
CREATE POLICY "Users can access facts from their org vendors" ON facts
    FOR ALL TO authenticated USING (
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
    ) WITH CHECK (
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

-- Create org-scoped policies for compare_runs
CREATE POLICY "Users can access compare_runs from their org" ON compare_runs
    FOR ALL TO authenticated USING (
        is_member(org_id)
    ) WITH CHECK (
        is_member(org_id)
    );

-- Create org-scoped policies for compare_rows
CREATE POLICY "Users can access compare_rows from their org runs" ON compare_rows
    FOR ALL TO authenticated USING (
        run_id IN (
            SELECT id FROM compare_runs 
            WHERE is_member(org_id)
        )
    ) WITH CHECK (
        run_id IN (
            SELECT id FROM compare_runs 
            WHERE is_member(org_id)
        )
    );

-- Create org-scoped policies for battlecard_bullets
CREATE POLICY "Users can access battlecard_bullets from their org runs" ON battlecard_bullets
    FOR ALL TO authenticated USING (
        run_id IN (
            SELECT id FROM compare_runs 
            WHERE is_member(org_id)
        )
    ) WITH CHECK (
        run_id IN (
            SELECT id FROM compare_runs 
            WHERE is_member(org_id)
        )
    );

-- Create org-scoped policies for update_events
CREATE POLICY "Users can access update_events from their org vendors" ON update_events
    FOR ALL TO authenticated USING (
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
    ) WITH CHECK (
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

-- Create org-scoped policies for personal_saves
CREATE POLICY "Users can access their own personal_saves" ON personal_saves
    FOR ALL TO authenticated USING (
        user_id = auth.jwt() ->> 'sub' AND is_member(org_id)
    ) WITH CHECK (
        user_id = auth.jwt() ->> 'sub' AND is_member(org_id)
    );

-- Create org-scoped policies for org_snapshots
CREATE POLICY "Users can access org_snapshots from their org" ON org_snapshots
    FOR ALL TO authenticated USING (
        is_member(org_id)
    ) WITH CHECK (
        is_member(org_id)
    );
