-- Add foreign key constraint for vendors.org_id to orgs.id
-- This is needed for the RLS policies to work correctly

-- Add the foreign key constraint
ALTER TABLE vendors 
ADD CONSTRAINT vendors_org_id_fkey 
FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE;
