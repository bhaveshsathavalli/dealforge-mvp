-- 1) Plans catalog
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                -- 'starter' | 'pro' | 'enterprise'
  name text not null,
  max_users int not null,
  max_competitors int not null,
  stripe_price_id text unique,              -- map to Stripe Price
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) Seed plans (edit numbers if you like)
insert into public.plans (slug, name, max_users, max_competitors, sort_order)
values
  ('starter','Starter',5,5,10),
  ('pro','Pro',25,25,20),
  ('enterprise','Enterprise',9999,200,30)
on conflict (slug) do nothing;

-- 3) orgs → planFK + Stripe columns (non-breaking)
alter table public.orgs add column if not exists plan_id uuid;
alter table public.orgs add constraint orgs_plan_id_fkey
  foreign key (plan_id) references public.plans(id);

alter table public.orgs add column if not exists stripe_customer_id text;
alter table public.orgs add column if not exists stripe_subscription_id text;
alter table public.orgs add column if not exists subscription_status text;          -- trialing|active|past_due|canceled|unpaid
alter table public.orgs add column if not exists cancel_at_period_end boolean;
alter table public.orgs add column if not exists current_period_end timestamptz;

-- 4) Backfill existing orgs by plan_type text
update public.orgs o
set plan_id = p.id,
    max_users = coalesce(o.max_users, p.max_users),
    max_competitors = coalesce(o.max_competitors, p.max_competitors)
from public.plans p
where o.plan_type = p.slug
  and o.plan_id is null;

-- 5) Keep cache in sync whenever plan_id changes or row is inserted
create or replace function public.sync_org_limits_from_plan()
returns trigger language plpgsql as $$
begin
  if new.plan_id is not null then
    select max_users, max_competitors
      into new.max_users, new.max_competitors
    from public.plans where id = new.plan_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_orgs_plan_sync on public.orgs;
create trigger trg_orgs_plan_sync
before insert or update of plan_id on public.orgs
for each row execute function public.sync_org_limits_from_plan();

-- 6) A simple view for UI (optional)
create or replace view public.v_org_limits as
select
  o.id as org_id,
  coalesce(p.slug, o.plan_type) as plan_slug,
  coalesce(p.name, initcap(o.plan_type)) as plan_name,
  coalesce(o.max_users, p.max_users) as max_users,
  coalesce(o.max_competitors, p.max_competitors) as max_competitors
from public.orgs o
left join public.plans p on p.id = o.plan_id;
