-- Migration script to update schema for Clerk authentication
-- Run this in your Supabase SQL editor

-- 1. Drop the foreign key constraint on org_members.user_id
ALTER TABLE org_members DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;

-- 2. Change user_id column type from uuid to text (Clerk uses string IDs)
ALTER TABLE org_members ALTER COLUMN user_id TYPE text;

-- 3. Update other tables that reference auth.users(id)
ALTER TABLE query_runs DROP CONSTRAINT IF EXISTS query_runs_user_id_fkey;
ALTER TABLE query_runs ALTER COLUMN user_id TYPE text;

ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;
ALTER TABLE feedback ALTER COLUMN user_id TYPE text;

-- 4. Update the is_member_of function to work with text user_id
CREATE OR REPLACE FUNCTION is_member_of(org uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members m
    WHERE m.org_id = org AND m.user_id = auth.uid()::text
  );
$$;

-- 5. Since we're using server-only Supabase access, we can disable RLS
-- or create policies that work with service role
-- For now, let's disable RLS since we're using service role key
ALTER TABLE orgs DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE competitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE query_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE raw_hits DISABLE ROW LEVEL SECURITY;
ALTER TABLE claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE citations DISABLE ROW LEVEL SECURITY;
ALTER TABLE evidence DISABLE ROW LEVEL SECURITY;
ALTER TABLE battlecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_observations DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;

-- 6. Add indexes for better performance with text user_id
CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON org_members(user_id);
CREATE INDEX IF NOT EXISTS query_runs_user_id_idx ON query_runs(user_id);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
