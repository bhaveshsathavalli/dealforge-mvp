import { supabaseAdmin } from '@/server/supabaseAdmin';
import { withOrgScope } from '@/lib/org';

export async function listCompetitors() {
  return withOrgScope(async (orgId) => {
    const { data, error } = await supabaseAdmin
      .from('competitors')
      .select('*')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

export async function addCompetitor(input: { name: string; website?: string; aliases?: string[] }) {
  return withOrgScope(async (orgId) => {
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
  });
}

export async function updateCompetitor(id: string, patch: { name?: string; website?: string; active?: boolean; aliases?: string[] }) {
  return withOrgScope(async (orgId) => {
    const { data, error } = await supabaseAdmin
      .from('competitors')
      .update(patch)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  });
}

export async function deleteCompetitor(id: string) {
  return withOrgScope(async (orgId) => {
    const { error } = await supabaseAdmin
      .from('competitors')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);
    
    if (error) throw new Error(error.message);
  });
}
