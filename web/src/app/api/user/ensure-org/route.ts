import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

// This endpoint automatically creates an organization for new users
// Call this after user signs up to ensure they have an org membership
export async function POST() {
  try {
    // Get the authenticated user from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use server-only Supabase client
    const supabase = supabaseAdmin;

    // Check if user already has an organization
    const { data: existingMembership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', userId)
      .single();

    if (existingMembership && !membershipError) {
      // User already has an organization
      return NextResponse.json({ 
        success: true,
        message: 'User already has an organization',
        orgId: existingMembership.org_id,
        role: existingMembership.role
      });
    }

    // Create a new organization for the user
    const { data: newOrg, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: `User ${userId}'s Organization`,
        plan_type: 'starter',
        max_users: 5,
        max_competitors: 5
      })
      .select('id')
      .single();

    if (orgError || !newOrg) {
      console.error('Failed to create organization:', orgError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    // Add user as admin to the new organization
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: newOrg.id,
        user_id: userId,
        role: 'admin'
      });

    if (memberError) {
      console.error('Failed to add user to organization:', memberError);
      return NextResponse.json({ error: 'Failed to add user to organization' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Organization created successfully',
      orgId: newOrg.id,
      role: 'admin'
    });

  } catch (error: unknown) {
    console.error('Auto-create org error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
