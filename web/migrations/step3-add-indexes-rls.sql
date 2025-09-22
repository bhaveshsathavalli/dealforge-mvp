-- Step 3: Add indexes and enable RLS
CREATE INDEX IF NOT EXISTS idx_competitors_org_id ON competitors(org_id);
CREATE INDEX IF NOT EXISTS idx_competitors_active ON competitors(active);
CREATE INDEX IF NOT EXISTS idx_competitors_slug ON competitors(slug);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

