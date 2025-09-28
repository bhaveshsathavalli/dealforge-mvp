import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const sbAdmin = createClient(url, serviceKey, { 
  auth: { persistSession: false } 
});

export type SeedOrg = { 
  orgId: string; 
  clerkOrgId: string; 
  adminUserId: string; 
  adminEmail: string; 
  memberUserId: string; 
  memberEmail: string; 
};

export async function seedOrg(): Promise<SeedOrg> {
  // 1) upsert org (by unique clerk_org_id)
  const clerkOrgId = `org_${Math.random().toString(36).slice(2, 10)}`;
  const adminUserId = `user_${Math.random().toString(36).slice(2, 10)}`;
  const memberUserId = `user_${Math.random().toString(36).slice(2, 10)}`;
  const adminEmail = `admin+${Date.now()}@example.com`;
  const memberEmail = `member+${Date.now()}@example.com`;

  const { data: orgRow, error: orgErr } = await sbAdmin
    .from('orgs')
    .insert({ 
      name: `Test Org ${clerkOrgId}`, 
      clerk_org_id: clerkOrgId, 
      plan_type: 'starter' 
    })
    .select('id, clerk_org_id')
    .single();

  if (orgErr) throw orgErr;
  const orgId = orgRow.id;

  // 2) profiles
  await sbAdmin.from('profiles').upsert([
    { 
      clerk_user_id: adminUserId, 
      email: adminEmail, 
      name: 'Admin Test' 
    },
    { 
      clerk_user_id: memberUserId, 
      email: memberEmail, 
      name: 'Member Test' 
    },
  ]);

  // 3) memberships
  await sbAdmin.from('org_memberships').upsert([
    { 
      clerk_org_id: clerkOrgId, 
      clerk_user_id: adminUserId, 
      role: 'admin' 
    },
    { 
      clerk_org_id: clerkOrgId, 
      clerk_user_id: memberUserId, 
      role: 'member' 
    },
  ]);

  return { 
    orgId, 
    clerkOrgId, 
    adminUserId, 
    adminEmail, 
    memberUserId, 
    memberEmail 
  };
}

export async function removeMember(clerkOrgId: string, clerkUserId: string) {
  await sbAdmin
    .from('org_memberships')
    .delete()
    .eq('clerk_org_id', clerkOrgId)
    .eq('clerk_user_id', clerkUserId);
}