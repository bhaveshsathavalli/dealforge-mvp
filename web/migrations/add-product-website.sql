-- Add product_website column to orgs table
ALTER TABLE orgs 
ADD COLUMN IF NOT EXISTS product_website TEXT;

