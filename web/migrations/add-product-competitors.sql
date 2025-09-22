-- Add org-scoped product and competitors functionality
-- Run this in your Supabase SQL Editor

-- 1. Add product_name column to orgs table
ALTER TABLE orgs 
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- 2. Create competitors table with proper schema
CREATE TABLE IF NOT EXISTS competitors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    website TEXT,
    slug TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_competitors_org_id ON competitors(org_id);
CREATE INDEX IF NOT EXISTS idx_competitors_active ON competitors(active);
CREATE INDEX IF NOT EXISTS idx_competitors_slug ON competitors(slug);

-- 4. Enable RLS on competitors table
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for competitors table
-- Service role can access all competitors (for server-side operations)
CREATE POLICY "Service role can access all competitors" ON competitors
    FOR ALL TO service_role USING (true);

-- Authenticated users can access competitors from their org
CREATE POLICY "Users can access competitors from their org" ON competitors
    FOR ALL TO authenticated USING (
        org_id IN (
            SELECT id FROM orgs 
            WHERE clerk_org_id IN (
                SELECT clerk_org_id FROM org_memberships 
                WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- 6. Create function to generate slug from name
CREATE OR REPLACE FUNCTION generate_competitor_slug(name TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
    RETURN lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$;

-- 7. Create trigger to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION set_competitor_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = generate_competitor_slug(NEW.name);
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_competitor_slug_trigger
    BEFORE INSERT OR UPDATE ON competitors
    FOR EACH ROW
    EXECUTE FUNCTION set_competitor_slug();

-- 8. Add unique constraint on org_id + slug combination
ALTER TABLE competitors 
ADD CONSTRAINT unique_competitor_slug_per_org 
UNIQUE (org_id, slug);

