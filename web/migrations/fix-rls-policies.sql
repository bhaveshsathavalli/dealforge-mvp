-- Fix RLS policies for competitors table
-- Run this to fix the permission denied error

-- First, drop the incorrect policies
DROP POLICY IF EXISTS "Service role can access all competitors" ON competitors;
DROP POLICY IF EXISTS "Users can access competitors from their org" ON competitors;

-- Disable RLS temporarily to fix the issue
ALTER TABLE competitors DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Create corrected policies
-- Service role can access all competitors (for server-side operations)
CREATE POLICY "Service role can access all competitors" ON competitors
    FOR ALL TO service_role USING (true);

-- Authenticated users can access competitors from their org
-- Using the correct table name: org_members (not org_memberships)
CREATE POLICY "Users can access competitors from their org" ON competitors
    FOR ALL TO authenticated USING (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_members 
                WHERE user_id = auth.jwt() ->> 'sub'
            )
        )
    );

