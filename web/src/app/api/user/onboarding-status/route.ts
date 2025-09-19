import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function GET() {
  console.log('Onboarding Status API: GET /api/user/onboarding-status called');
  
  try {
    // Get the authenticated user from Clerk
    const { userId } = await auth();
    if (!userId) {
      console.log('Onboarding Status API: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Onboarding Status API: User authenticated:', userId);

    // Use server-only Supabase client
    const supabase = supabaseAdmin;

    // Check if user has an organization
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId) // Use Clerk userId (string)
      .single();

    let competitors: Array<{ name: string; aliases: string[] }> = [];
    let onboardingCompleted = false;

    if (membership && !membershipError) {
      // User has an organization - check for competitors
      const { data: competitorsData } = await supabase
        .from('competitors')
        .select('name, aliases')
        .eq('org_id', membership.org_id)
        .order('name');

      competitors = competitorsData || [];
      onboardingCompleted = true; // If they have an org, consider onboarding completed
    } else {
      // User doesn't have an organization yet
      console.log('Onboarding Status API: User has no organization membership yet');
      onboardingCompleted = false;
    }

    console.log('Onboarding Status API: Status:', { 
      completed: onboardingCompleted, 
      competitorsCount: competitors.length 
    });

    return NextResponse.json({
      completed: onboardingCompleted,
      data: null, // We don't store onboarding data in user metadata with Clerk
      competitors: competitors.map(c => ({
        name: c.name,
        url: '', // No website column exists
        aliases: Array.isArray(c.aliases) ? c.aliases.join(', ') : ''
      }))
    });

  } catch (error: unknown) {
    console.error('Onboarding Status API: Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
