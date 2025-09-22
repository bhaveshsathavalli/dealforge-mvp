-- Step 4: Create RLS policies
CREATE POLICY "Service role can access all competitors" ON competitors
    FOR ALL TO service_role USING (true);

CREATE POLICY "Users can access competitors from their org" ON competitors
    FOR ALL TO authenticated USING (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

