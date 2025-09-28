-- 20240927_team_view_and_one_org_per_user.sql
-- NOTE: Run 20240927_cleanup_orphaned_memberships.sql first to clean up orphaned records
begin;

-- Clean up any remaining orphaned records (safety check)
delete from public.org_memberships 
where clerk_user_id not in (
  select clerk_user_id from public.profiles
);

alter table public.org_memberships
  drop constraint if exists org_memberships_user_fk,
  drop constraint if exists org_memberships_org_fk;

alter table public.org_memberships
  add constraint org_memberships_user_fk
    foreign key (clerk_user_id) references public.profiles(clerk_user_id)
    on delete cascade,
  add constraint org_memberships_org_fk
    foreign key (clerk_org_id) references public.orgs(clerk_org_id)
    on delete cascade;

-- Enforce 1 account = 1 org (if duplicates exist, clean then create)
create unique index if not exists org_memberships_one_org_per_user
  on public.org_memberships (clerk_user_id);

create or replace view public.v_org_team as
select m.clerk_org_id, m.clerk_user_id, m.role, p.email, p.name, p.image_url
from public.org_memberships m
join public.profiles p using (clerk_user_id);

commit;
