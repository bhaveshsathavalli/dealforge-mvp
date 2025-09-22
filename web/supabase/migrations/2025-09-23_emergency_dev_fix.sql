-- Emergency fix: Grant basic permissions to authenticated users
-- This is a temporary fix to unblock development

-- Grant basic permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compare_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compare_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battlecard_bullets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_saves TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_snapshots TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Disable RLS temporarily for development
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE facts DISABLE ROW LEVEL SECURITY;
ALTER TABLE compare_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE compare_rows DISABLE ROW LEVEL SECURITY;
ALTER TABLE battlecard_bullets DISABLE ROW LEVEL SECURITY;
ALTER TABLE update_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE personal_saves DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_snapshots DISABLE ROW LEVEL SECURITY;
