-- ============================================================================
-- CORRECTED CLERK MIGRATION - HANDLES POLICY DEPENDENCIES
-- ============================================================================

-- PHASE 1: BACKUP (CRITICAL!)
CREATE TABLE IF NOT EXISTS org_members_backup AS SELECT * FROM org_members;
CREATE TABLE IF NOT EXISTS query_runs_backup AS SELECT * FROM query_runs;
CREATE TABLE IF NOT EXISTS feedback_backup AS SELECT * FROM feedback;

-- PHASE 2: DROP ALL RLS POLICIES COMPLETELY
-- Drop policies on org_members
DROP POLICY IF EXISTS "read mine" ON org_members;
DROP POLICY IF EXISTS "members manage their org rows" ON org_members;
DROP POLICY IF EXISTS "orgs readable by members" ON orgs;

-- Drop policies on competitors
DROP POLICY IF EXISTS "scoped access" ON competitors;

-- Drop policies on query_runs
DROP POLICY IF EXISTS "scoped access" ON query_runs;

-- Drop policies on raw_hits
DROP POLICY IF EXISTS "scoped access" ON raw_hits;

-- Drop policies on claims
DROP POLICY IF EXISTS "scoped access" ON claims;

-- Drop policies on citations
DROP POLICY IF EXISTS "scoped access" ON citations;

-- Drop policies on evidence
DROP POLICY IF EXISTS "scoped access" ON evidence;

-- Drop policies on battlecards
DROP POLICY IF EXISTS "scoped access" ON battlecards;

-- Drop policies on pricing_observations
DROP POLICY IF EXISTS "scoped access" ON pricing_observations;

-- Drop policies on feedback
DROP POLICY IF EXISTS "scoped access" ON feedback;

-- PHASE 3: DROP FOREIGN KEY CONSTRAINTS
ALTER TABLE org_members DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;
ALTER TABLE query_runs DROP CONSTRAINT IF EXISTS query_runs_user_id_fkey;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;

-- PHASE 4: ALTER COLUMN TYPES (now safe after dropping policies)
ALTER TABLE org_members ALTER COLUMN user_id TYPE text;
ALTER TABLE query_runs ALTER COLUMN user_id TYPE text;
ALTER TABLE feedback ALTER COLUMN user_id TYPE text;

-- PHASE 5: DISABLE RLS ON ALL TABLES
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

-- PHASE 6: ADD INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON org_members(user_id);
CREATE INDEX IF NOT EXISTS query_runs_user_id_idx ON query_runs(user_id);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);

-- PHASE 7: VERIFICATION QUERIES
SELECT 'Migration completed successfully!' as status;
SELECT 'Backup tables created:' as info;
SELECT 'org_members_backup' as table_name, count(*) as row_count FROM org_members_backup
UNION ALL
SELECT 'query_runs_backup' as table_name, count(*) as row_count FROM query_runs_backup
UNION ALL
SELECT 'feedback_backup' as table_name, count(*) as row_count FROM feedback_backup;
