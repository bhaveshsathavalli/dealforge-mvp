-- Create competitors table with RLS enabled
-- Run this in Supabase SQL Editor

-- Create competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  slug TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitors_org_id ON competitors(org_id);
CREATE INDEX IF NOT EXISTS idx_competitors_active ON competitors(active);
CREATE INDEX IF NOT EXISTS idx_competitors_slug ON competitors(slug);

-- Enable RLS (no permissive policies needed - service-role bypasses RLS)
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Add aliases field for backward compatibility
ALTER TABLE competitors 
ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION generate_competitor_slug(name TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
    RETURN lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$;

-- Create trigger to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION set_competitor_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = generate_competitor_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_competitor_slug_trigger
    BEFORE INSERT OR UPDATE ON competitors
    FOR EACH ROW
    EXECUTE FUNCTION set_competitor_slug();

-- Add unique constraint on org_id + slug combination
ALTER TABLE competitors 
ADD CONSTRAINT unique_competitor_slug_per_org 
UNIQUE (org_id, slug);

