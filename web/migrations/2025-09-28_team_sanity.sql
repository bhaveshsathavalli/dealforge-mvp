-- Safe, idempotent database sanity checks and optimizations for team management
-- This migration only adds indices and ensures the view exists

-- Create indices for better performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON org_memberships(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON org_memberships(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);

-- Ensure the v_org_team view exists (idempotent)
CREATE OR REPLACE VIEW public.v_org_team AS
SELECT
    om.clerk_org_id,
    om.clerk_user_id,
    p.email,
    p.name,
    om.role
FROM
    public.org_memberships om
    JOIN public.profiles p ON om.clerk_user_id = p.clerk_user_id
WHERE
    om.role IN ('admin', 'member')
    AND om.deleted_at IS NULL;

-- Add RLS policy for the view
ALTER VIEW public.v_org_team SET (security_invoker = true);


