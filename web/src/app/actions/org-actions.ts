'use server';

import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function setActive(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  const organizationId = formData.get('organizationId') as string;
  
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  try {
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    
    // Set active organization in Clerk
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        activeOrganizationId: organizationId
      }
    });

    // Mirror to Supabase
    const org = await clerkClient.organizations.getOrganization({ organizationId });
    
    // Upsert organization
    await supabaseAdmin
      .from('orgs')
      .upsert({
        clerk_org_id: organizationId,
        name: org.name,
        slug: org.slug,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_org_id'
      });

    // Get user's role in the org from Clerk
    const memberships = await clerkClient.organizations.getOrganizationMembershipList({ organizationId });
    const userMembership = memberships.data.find(m => m.publicUserData.userId === userId);
    const role = userMembership?.role || 'member';

    // Upsert membership
    await supabaseAdmin
      .from('org_memberships')
      .upsert({
        clerk_org_id: organizationId,
        clerk_user_id: userId,
        role: role,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_org_id,clerk_user_id'
      });

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ last_active_org_id: organizationId })
      .eq('clerk_user_id', userId);

    console.log('Organization set active:', organizationId);
    
    revalidatePath('/app');
    redirect('/app');
    
  } catch (error) {
    console.error('Error setting active organization:', error);
    throw error;
  }
}

export async function createOrganization(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  const name = formData.get('name') as string;
  
  if (!name) {
    throw new Error('Organization name is required');
  }

  try {
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    
    // Create organization in Clerk
    const org = await clerkClient.organizations.createOrganization({
      name,
      createdBy: userId
    });

    // Mirror to Supabase
    await supabaseAdmin
      .from('orgs')
      .insert({
        clerk_org_id: org.id,
        name: org.name,
        slug: org.slug,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Create membership
    await supabaseAdmin
      .from('org_memberships')
      .insert({
        clerk_org_id: org.id,
        clerk_user_id: userId,
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ last_active_org_id: org.id })
      .eq('clerk_user_id', userId);

    console.log('Organization created:', org.id);
    
    revalidatePath('/app');
    redirect('/app');
    
  } catch (error) {
    console.error('Error creating organization:', error);
    // NEXT_REDIRECT is expected behavior, don't treat it as an error
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error; // Re-throw redirect errors
    }
    throw error;
  }
}