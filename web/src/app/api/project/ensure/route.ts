import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function POST() {
  try {
    // Get the authenticated user from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use server-only Supabase client
    const supabase = supabaseAdmin;

    // Check if user already has an org
    const { data: existingMembership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId) // Use Clerk userId
      .single();

    if (existingMembership && !membershipError) {
      return NextResponse.json({ 
        projectId: existingMembership.org_id,
        message: 'Using existing organization'
      });
    }

    // Create a new org for the user
    const { data: newOrg, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: `${userId}'s Organization`, // Use userId since we don't have email from Clerk here
        plan_type: 'starter',
        max_users: 5,
        max_competitors: 5
      })
      .select('id')
      .single();

    if (orgError || !newOrg) {
      return NextResponse.json({ 
        error: 'Failed to create organization' 
      }, { status: 500 });
    }

    // Add user as member of the org
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: newOrg.id,
        user_id: userId, // Use Clerk userId
        role: 'admin'
      });

    if (memberError) {
      return NextResponse.json({ 
        error: 'Failed to add user to organization' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      projectId: newOrg.id,
      message: 'Created new organization'
    });

  } catch (error: unknown) {
    console.error('Project ensure error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
