-- Simple fix: Disable RLS on competitors table
-- This matches the pattern used in other tables in the codebase

ALTER TABLE competitors DISABLE ROW LEVEL SECURITY;

