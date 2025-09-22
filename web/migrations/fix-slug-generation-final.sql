-- Fix slug generation to handle duplicates (final corrected version)
CREATE OR REPLACE FUNCTION generate_competitor_slug(name TEXT, org_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base slug from name
    base_slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing dashes
    base_slug = regexp_replace(base_slug, '^-+|-+$', '', 'g');
    -- Ensure it's not empty
    IF base_slug = '' THEN
        base_slug = 'competitor';
    END IF;
    
    final_slug = base_slug;
    
    -- Check for duplicates and append number if needed
    -- Use table alias to avoid ambiguity with function parameter
    WHILE EXISTS (
        SELECT 1 FROM competitors c
        WHERE c.slug = final_slug 
        AND c.org_id = generate_competitor_slug.org_id
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$;

-- Update trigger function to use the new slug generation
CREATE OR REPLACE FUNCTION set_competitor_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = generate_competitor_slug(NEW.name, NEW.org_id);
    END IF;
    RETURN NEW;
END;
$$;

-- Fix existing competitors that might have duplicate slugs
UPDATE competitors 
SET slug = generate_competitor_slug(name, org_id)
WHERE slug IS NULL OR slug = '';

-- Ensure all competitors have unique slugs within their org
DO $$
DECLARE
    competitor_record RECORD;
    new_slug TEXT;
BEGIN
    FOR competitor_record IN 
        SELECT id, name, org_id, slug 
        FROM competitors 
        WHERE active = true
        ORDER BY created_at
    LOOP
        new_slug = generate_competitor_slug(competitor_record.name, competitor_record.org_id);
        
        -- Only update if slug is different
        IF competitor_record.slug != new_slug THEN
            UPDATE competitors 
            SET slug = new_slug 
            WHERE id = competitor_record.id;
        END IF;
    END LOOP;
END;
$$;

