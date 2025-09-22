'use server'

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { requireOrg } from '@/lib/authz';
import { serpFindHomepage } from '@/server/search';

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

export async function saUpdateProductName(form: FormData) {
  const { orgId: clerkOrgId } = await requireOrg();
  const orgId = await getOrgIdFromClerkOrgId(clerkOrgId);
  const productName = String(form.get('productName') ?? '').trim();
  
  const { error } = await supabaseAdmin
    .from('orgs')
    .update({ product_name: productName })
    .eq('id', orgId);
  
  if (error) throw new Error(error.message);
  
  revalidatePath('/settings');
}

export async function saveProduct(data: { name: string; website?: string }) {
  const { orgId: clerkOrgId } = await requireOrg();
  const orgId = await getOrgIdFromClerkOrgId(clerkOrgId);
  
  // Normalize website URL to domain only
  let normalizedWebsite = data.website?.trim();
  if (normalizedWebsite) {
    try {
      // Add protocol if missing
      if (!normalizedWebsite.startsWith('http://') && !normalizedWebsite.startsWith('https://')) {
        normalizedWebsite = `https://${normalizedWebsite}`;
      }
      
      const url = new URL(normalizedWebsite);
      normalizedWebsite = `https://${url.hostname}`;
    } catch (e) {
      // Invalid URL, keep as is
    }
  }
  
  const { error } = await supabaseAdmin
    .from('orgs')
    .update({ 
      product_name: data.name.trim(),
      product_website: normalizedWebsite || null 
    })
    .eq('id', orgId);
  
  if (error) throw new Error(error.message);
  
  revalidatePath('/settings');
}

export async function detectProductWebsite() {
  const { orgId: clerkOrgId } = await requireOrg();
  const orgId = await getOrgIdFromClerkOrgId(clerkOrgId);
  
  const { data: org, error } = await supabaseAdmin
    .from('orgs')
    .select('product_name')
    .eq('id', orgId)
    .single();
    
  if (error || !org) {
    throw new Error('Organization not found');
  }
  
  if (!org.product_name) {
    throw new Error('Product name is required to detect website');
  }
  
  const url = await serpFindHomepage(org.product_name);
  return { url };
}
