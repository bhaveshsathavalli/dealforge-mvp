-- Verify unique indexes and counts
-- Run this in Supabase SQL Editor to check database state

-- Get table counts
SELECT 'orgs' as table_name, count(*) as count FROM public.orgs
UNION ALL
SELECT 'profiles' as table_name, count(*) as count FROM public.profiles
UNION ALL
SELECT 'org_memberships' as table_name, count(*) as count FROM public.org_memberships;

-- List indexes on org_memberships table
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'org_memberships'
ORDER BY indexname;

-- Check for duplicate memberships (should be 0 if constraint is working)
SELECT 
    clerk_user_id, 
    count(*) as membership_count
FROM public.org_memberships
GROUP BY clerk_user_id
HAVING count(*) > 1;

-- Check constraint details
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.org_memberships'::regclass
AND contype = 'u'; -- unique constraints only


