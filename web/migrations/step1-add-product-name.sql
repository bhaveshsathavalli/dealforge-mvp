-- Step 1: Add product_name column to orgs table
ALTER TABLE orgs 
ADD COLUMN IF NOT EXISTS product_name TEXT;

