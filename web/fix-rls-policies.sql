-- Fix RLS policies to allow service role access
-- This script grants the service role permission to access all tables

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE query_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies that allow service role to access all data
-- These policies bypass RLS for the service role

-- Query runs policies
CREATE POLICY "Service role can access all query_runs" ON query_runs
    FOR ALL TO service_role USING (true);

-- Raw hits policies  
CREATE POLICY "Service role can access all raw_hits" ON raw_hits
    FOR ALL TO service_role USING (true);

-- Orgs policies
CREATE POLICY "Service role can access all orgs" ON orgs
    FOR ALL TO service_role USING (true);

-- Org members policies
CREATE POLICY "Service role can access all org_members" ON org_members
    FOR ALL TO service_role USING (true);

-- Org memberships policies
CREATE POLICY "Service role can access all org_memberships" ON org_memberships
    FOR ALL TO service_role USING (true);

-- Profiles policies
CREATE POLICY "Service role can access all profiles" ON profiles
    FOR ALL TO service_role USING (true);

-- Competitors policies
CREATE POLICY "Service role can access all competitors" ON competitors
    FOR ALL TO service_role USING (true);

-- Battlecards policies
CREATE POLICY "Service role can access all battlecards" ON battlecards
    FOR ALL TO service_role USING (true);

-- Claims policies
CREATE POLICY "Service role can access all claims" ON claims
    FOR ALL TO service_role USING (true);

-- Citations policies
CREATE POLICY "Service role can access all citations" ON citations
    FOR ALL TO service_role USING (true);

-- Evidence policies
CREATE POLICY "Service role can access all evidence" ON evidence
    FOR ALL TO service_role USING (true);

-- Pricing observations policies
CREATE POLICY "Service role can access all pricing_observations" ON pricing_observations
    FOR ALL TO service_role USING (true);

-- Feedback policies
CREATE POLICY "Service role can access all feedback" ON feedback
    FOR ALL TO service_role USING (true);

-- Also create policies for authenticated users to access their own data
-- Query runs - users can access runs from their org
CREATE POLICY "Users can access query_runs from their org" ON query_runs
    FOR ALL TO authenticated USING (
        clerk_org_id IN (
            SELECT clerk_org_id FROM org_memberships 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Raw hits - users can access hits from their org's runs
CREATE POLICY "Users can access raw_hits from their org" ON raw_hits
    FOR ALL TO authenticated USING (
        run_id IN (
            SELECT id FROM query_runs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Orgs - users can access their own orgs
CREATE POLICY "Users can access their orgs" ON orgs
    FOR ALL TO authenticated USING (
        clerk_org_id IN (
            SELECT clerk_org_id FROM org_memberships 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Org memberships - users can access their own memberships
CREATE POLICY "Users can access their org_memberships" ON org_memberships
    FOR ALL TO authenticated USING (
        clerk_user_id = auth.jwt() ->> 'sub'
    );

-- Profiles - users can access their own profile
CREATE POLICY "Users can access their own profile" ON profiles
    FOR ALL TO authenticated USING (
        clerk_user_id = auth.jwt() ->> 'sub'
    );

-- Competitors - users can access competitors from their org
CREATE POLICY "Users can access competitors from their org" ON competitors
    FOR ALL TO authenticated USING (
        clerk_org_id IN (
            SELECT clerk_org_id FROM org_memberships 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Battlecards - users can access battlecards from their org
CREATE POLICY "Users can access battlecards from their org" ON battlecards
    FOR ALL TO authenticated USING (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Claims - users can access claims from their org's runs
CREATE POLICY "Users can access claims from their org" ON claims
    FOR ALL TO authenticated USING (
        run_id IN (
            SELECT id FROM query_runs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Citations - users can access citations from their org's runs
CREATE POLICY "Users can access citations from their org" ON citations
    FOR ALL TO authenticated USING (
        run_id IN (
            SELECT id FROM query_runs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Evidence - users can access evidence from their org's runs
CREATE POLICY "Users can access evidence from their org" ON evidence
    FOR ALL TO authenticated USING (
        run_id IN (
            SELECT id FROM query_runs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Pricing observations - users can access pricing observations from their org's runs
CREATE POLICY "Users can access pricing_observations from their org" ON pricing_observations
    FOR ALL TO authenticated USING (
        run_id IN (
            SELECT id FROM query_runs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Feedback - users can access feedback from their org's runs
CREATE POLICY "Users can access feedback from their org" ON feedback
    FOR ALL TO authenticated USING (
        run_id IN (
            SELECT id FROM query_runs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );
