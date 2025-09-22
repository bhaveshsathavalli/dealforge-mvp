-- Step 6: Add unique constraint
ALTER TABLE competitors 
ADD CONSTRAINT unique_competitor_slug_per_org 
UNIQUE (org_id, slug);

