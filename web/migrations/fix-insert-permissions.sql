-- Fix RLS Policies - Grant INSERT permissions to authenticated users
-- This fixes the "permission denied for table vendors" error

-- Grant INSERT permissions to authenticated role
GRANT INSERT ON public.vendors TO authenticated;
GRANT INSERT ON public.sources TO authenticated;
GRANT INSERT ON public.facts TO authenticated;
GRANT INSERT ON public.compare_runs TO authenticated;
GRANT INSERT ON public.compare_rows TO authenticated;
GRANT INSERT ON public.battlecard_bullets TO authenticated;
GRANT INSERT ON public.update_events TO authenticated;
GRANT INSERT ON public.personal_saves TO authenticated;
GRANT INSERT ON public.org_snapshots TO authenticated;

-- Grant UPDATE permissions to authenticated role
GRANT UPDATE ON public.vendors TO authenticated;
GRANT UPDATE ON public.sources TO authenticated;
GRANT UPDATE ON public.facts TO authenticated;
GRANT UPDATE ON public.compare_runs TO authenticated;
GRANT UPDATE ON public.compare_rows TO authenticated;
GRANT UPDATE ON public.battlecard_bullets TO authenticated;
GRANT UPDATE ON public.update_events TO authenticated;
GRANT UPDATE ON public.personal_saves TO authenticated;
GRANT UPDATE ON public.org_snapshots TO authenticated;

-- Grant DELETE permissions to authenticated role
GRANT DELETE ON public.vendors TO authenticated;
GRANT DELETE ON public.sources TO authenticated;
GRANT DELETE ON public.facts TO authenticated;
GRANT DELETE ON public.compare_runs TO authenticated;
GRANT DELETE ON public.compare_rows TO authenticated;
GRANT DELETE ON public.battlecard_bullets TO authenticated;
GRANT DELETE ON public.update_events TO authenticated;
GRANT DELETE ON public.personal_saves TO authenticated;
GRANT DELETE ON public.org_snapshots TO authenticated;

-- Grant USAGE on sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Also grant to anon for testing purposes
GRANT SELECT ON public.vendors TO anon;
GRANT SELECT ON public.sources TO anon;
GRANT SELECT ON public.facts TO anon;
GRANT SELECT ON public.compare_runs TO anon;
GRANT SELECT ON public.compare_rows TO anon;
GRANT SELECT ON public.battlecard_bullets TO anon;
GRANT SELECT ON public.update_events TO anon;
GRANT SELECT ON public.personal_saves TO anon;
GRANT SELECT ON public.org_snapshots TO anon;
