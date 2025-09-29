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
  
  // Check if vendor already exists for this org
  const { data: existingVendor } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  
  if (existingVendor) {
    // Update existing vendor
    const { error } = await supabaseAdmin
      .from('vendors')
      .update({ 
        name: data.name.trim(),
        website: normalizedWebsite || null 
      })
      .eq('id', existingVendor.id);
    
    if (error) throw new Error(error.message);
  } else {
    // Create new vendor
    const { error } = await supabaseAdmin
      .from('vendors')
      .insert({ 
        org_id: orgId,
        name: data.name.trim(),
        website: normalizedWebsite || null 
      });
    
    if (error) throw new Error(error.message);
  }
  
  revalidatePath('/settings');
}

export async function detectProductWebsite() {
  const { orgId: clerkOrgId } = await requireOrg();
  const orgId = await getOrgIdFromClerkOrgId(clerkOrgId);
  
  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .select('name')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
    
  if (error || !vendor) {
    throw new Error('Vendor not found');
  }
  
  if (!vendor.name) {
    throw new Error('Product name is required to detect website');
  }
  
  const url = await serpFindHomepage(vendor.name);
  return { url };
}
