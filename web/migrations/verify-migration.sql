-- Test script to verify data access security
-- Run this in Supabase SQL Editor to check your data

-- 1. Check that user_id columns are now text
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE column_name = 'user_id' 
  AND table_schema = 'public'
ORDER BY table_name;

-- 2. Verify RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('org_members', 'query_runs', 'feedback')
ORDER BY tablename;

-- 3. Check indexes were created
SELECT 
  indexname, 
  tablename, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE '%user_id%'
ORDER BY tablename;

-- 4. Sample data (if any exists)
SELECT 'org_members' as table_name, count(*) as row_count FROM org_members
UNION ALL
SELECT 'query_runs' as table_name, count(*) as row_count FROM query_runs
UNION ALL
SELECT 'feedback' as table_name, count(*) as row_count FROM feedback;
