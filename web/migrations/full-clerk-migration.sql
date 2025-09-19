-- ============================================================================
-- FULL CLERK MIGRATION PLAN
-- ============================================================================
-- This script migrates your Supabase schema to work with Clerk string IDs
-- while preserving your existing Prisma schema structure

-- ============================================================================
-- PHASE 1: BACKUP EXISTING DATA (CRITICAL!)
-- ============================================================================
-- Run these first to backup your data
CREATE TABLE IF NOT EXISTS org_members_backup AS SELECT * FROM org_members;
CREATE TABLE IF NOT EXISTS query_runs_backup AS SELECT * FROM query_runs;
CREATE TABLE IF NOT EXISTS feedback_backup AS SELECT * FROM feedback;
CREATE TABLE IF NOT EXISTS competitors_backup AS SELECT * FROM competitors;
CREATE TABLE IF NOT EXISTS orgs_backup AS SELECT * FROM orgs;

-- ============================================================================
-- PHASE 2: DROP RLS POLICIES AND CONSTRAINTS
-- ============================================================================

-- Drop RLS policies that depend on user_id columns
DROP POLICY IF EXISTS "read mine" ON org_members;
DROP POLICY IF EXISTS "orgs readable by members" ON orgs;
DROP POLICY IF EXISTS "members manage their org rows" ON org_members;
DROP POLICY IF EXISTS "scoped access" ON competitors;
DROP POLICY IF EXISTS "scoped access" ON query_runs;
DROP POLICY IF EXISTS "scoped access" ON raw_hits;
DROP POLICY IF EXISTS "scoped access" ON claims;
DROP POLICY IF EXISTS "scoped access" ON citations;
DROP POLICY IF EXISTS "scoped access" ON evidence;
DROP POLICY IF EXISTS "scoped access" ON battlecards;
DROP POLICY IF EXISTS "scoped access" ON pricing_observations;
DROP POLICY IF EXISTS "scoped access" ON feedback;

-- Drop foreign key constraints to auth.users
ALTER TABLE org_members DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;
ALTER TABLE query_runs DROP CONSTRAINT IF EXISTS query_runs_user_id_fkey;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;

-- ============================================================================
-- PHASE 3: ALTER COLUMN TYPES (UUID → TEXT)
-- ============================================================================

-- Change user_id columns from uuid to text
ALTER TABLE org_members ALTER COLUMN user_id TYPE text;
ALTER TABLE query_runs ALTER COLUMN user_id TYPE text;
ALTER TABLE feedback ALTER COLUMN user_id TYPE text;

-- ============================================================================
-- PHASE 4: DISABLE RLS (SERVICE ROLE ACCESS)
-- ============================================================================

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

-- ============================================================================
-- PHASE 5: ADD PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON org_members(user_id);
CREATE INDEX IF NOT EXISTS query_runs_user_id_idx ON query_runs(user_id);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);

-- ============================================================================
-- PHASE 6: CREATE CLERK USER MAPPING (OPTIONAL SAFETY)
-- ============================================================================
-- This table helps track Clerk users and can be used for data migration if needed

CREATE TABLE IF NOT EXISTS clerk_user_mapping (
  clerk_user_id text PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now(),
  migrated_from_uuid uuid -- For tracking old Supabase users
);

CREATE INDEX IF NOT EXISTS clerk_mapping_email_idx ON clerk_user_mapping(email);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration worked:

-- Check column types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('org_members', 'query_runs', 'feedback') 
AND column_name = 'user_id';

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('orgs', 'org_members', 'competitors', 'query_runs');

-- Check indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('org_members', 'query_runs', 'feedback')
AND indexname LIKE '%user_id%';
