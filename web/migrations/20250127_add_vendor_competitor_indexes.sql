-- 20250127_add_vendor_competitor_indexes.sql
-- Add unique indexes for vendors and competitors to support upsert operations

begin;

-- Add unique index for vendors (org_id, name)
create unique index if not exists vendors_org_name_unique 
  on public.vendors (org_id, name);

-- Add unique index for competitors (org_id, name)  
create unique index if not exists competitors_org_name_unique 
  on public.competitors (org_id, name);

-- Optional: Reset toast tuple target for better performance after index creation
-- alter table public.vendors reset (toast_tuple_target);
-- alter table public.competitors reset (toast_tuple_target);

commit;


