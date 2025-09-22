-- Add missing columns to support compare functionality
-- Add product_website column to orgs table
ALTER TABLE orgs 
ADD COLUMN IF NOT EXISTS product_website TEXT;

-- Add run_context column to query_runs table
ALTER TABLE query_runs 
ADD COLUMN IF NOT EXISTS run_context JSONB;

