-- 20240927_cleanup_orphaned_memberships.sql
-- This migration cleans up orphaned org_memberships records before adding foreign key constraints

begin;

-- Find and delete org_memberships records that don't have corresponding profiles
delete from public.org_memberships 
where clerk_user_id not in (
  select clerk_user_id from public.profiles
);

-- Show how many records were cleaned up
select 'Cleaned up orphaned org_memberships records' as message;

commit;


