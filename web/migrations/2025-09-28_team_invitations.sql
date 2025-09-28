-- Invitations table (safe/idempotent)
create table if not exists org_invitations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null,
  email text not null,
  role text not null default 'member' check (role in ('admin','member')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by text, -- clerk_user_id
  created_at timestamptz default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_org_invitations_org on org_invitations(clerk_org_id);
create index if not exists idx_org_invitations_email on org_invitations(email);
-- Prevent duplicate pending invites per (org,email)
create unique index if not exists uq_org_invitations_pending
on org_invitations(clerk_org_id, email)
where status = 'pending';

-- Helpful indexes for memberships (idempotent)
create index if not exists idx_org_memberships_org on org_memberships(clerk_org_id);
create index if not exists idx_org_memberships_user on org_memberships(clerk_user_id);


