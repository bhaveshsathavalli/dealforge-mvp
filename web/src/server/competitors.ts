import { supabaseAdmin } from '@/server/supabaseAdmin';
import { requireOrg } from '@/lib/authz';

// Helper function to get org_id UUID from clerk_org_id
async function getOrgIdFromClerkOrgId(clerkOrgId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('orgs')
    .select('id')
    .eq('clerk_org_id', clerkOrgId)
    .single();
  
  if (error || !data) {
    throw new Error(`Organization not found for clerk_org_id: ${clerkOrgId}`);
  }
  
  return data.id;
}

export async function listCompetitors() {
  const { orgId: clerkOrgId } = await requireOrg();
  const orgId = await getOrgIdFromClerkOrgId(clerkOrgId);
  
  const { data, error } = await supabaseAdmin
    .from('competitors')
    .select('*')
    .eq('org_id', orgId)
    .eq('active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addCompetitor(input: { name: string; website?: string; aliases?: string[] }) {
  const { orgId: clerkOrgId } = await requireOrg();
  const orgId = await getOrgIdFromClerkOrgId(clerkOrgId);
  
  const { data, error } = await supabaseAdmin
    .from('competitors')
    .insert([{ 
      org_id: orgId, 
      name: input.name, 
      website: input.website ?? null,
      aliases: input.aliases ?? []
    }])
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCompetitor(id: string, patch: { name?: string; website?: string; active?: boolean; aliases?: string[] }) {
  const { orgId: clerkOrgId } = await requireOrg();
  const orgId = await getOrgIdFromClerkOrgId(clerkOrgId);
  
  const { data, error } = await supabaseAdmin
    .from('competitors')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCompetitor(id: string) {
  const { orgId: clerkOrgId } = await requireOrg();
  const orgId = await getOrgIdFromClerkOrgId(clerkOrgId);
  
  const { error } = await supabaseAdmin
    .from('competitors')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);
  
  if (error) throw new Error(error.message);
}
