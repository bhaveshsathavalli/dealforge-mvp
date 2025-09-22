-- Step 5: Create slug generation functions and triggers
CREATE OR REPLACE FUNCTION generate_competitor_slug(name TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
    RETURN lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$;

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

