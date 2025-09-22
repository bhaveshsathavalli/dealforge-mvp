-- Debug query to check orgs table
-- Run this in Supabase SQL Editor to see what's in the orgs table

SELECT 
  id,
  name,
  clerk_org_id,
  product_name,
  plan_type,
  created_at
FROM orgs 
ORDER BY created_at DESC;

-- Check if there are any orgs with the specific clerk_org_id from the error
-- Replace 'org_32t4PH52hlsXG6uOhDvQKfzmUvg' with the actual orgId from the error
SELECT 
  id,
  name,
  clerk_org_id,
  product_name,
  plan_type,
  created_at
FROM orgs 
WHERE clerk_org_id = 'org_32t4PH52hlsXG6uOhDvQKfzmUvg';

