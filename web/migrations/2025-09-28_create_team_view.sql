-- Drop existing view if it exists
DROP VIEW IF EXISTS public.v_org_team;

-- Create the v_org_team view for team management
CREATE VIEW public.v_org_team AS
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
    om.role IN ('admin', 'member');

-- Add RLS policy for the view
ALTER VIEW public.v_org_team SET (security_invoker = true);
