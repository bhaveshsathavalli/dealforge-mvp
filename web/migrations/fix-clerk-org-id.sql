-- Fix the existing organization by adding the clerk_org_id
-- Run this in Supabase SQL Editor

UPDATE orgs 
SET clerk_org_id = 'org_32t4PH52hlsXG6uOhDvQKfzmUvg'
WHERE id = '24380377-0628-4469-83e0-2422a1a883d8';

-- Verify the update worked
SELECT 
  id,
  name,
  clerk_org_id,
  product_name,
  plan_type,
  created_at
FROM orgs 
WHERE id = '24380377-0628-4469-83e0-2422a1a883d8';

