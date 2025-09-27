import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const GET = withOrgId(async ({ orgId }) => {
  console.log('Onboarding Status API: GET /api/user/onboarding-status called');
  
  try {
    const supabase = supabaseServer();

    // User has an organization - check for competitors
    const { data: competitorsData } = await supabase
      .from('competitors')
      .select('name, aliases')
      .eq('org_id', orgId)
      .order('name');

    const competitors: Array<{ name: string; aliases: string[] }> = competitorsData || [];
    const onboardingCompleted = true; // If they have an org, consider onboarding completed

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
});
