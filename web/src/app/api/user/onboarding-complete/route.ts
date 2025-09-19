import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function POST(req: Request) {
  console.log('Onboarding API: POST /api/user/onboarding-complete called');
  
  try {
    // Get the authenticated user from Clerk
    const { userId, orgId } = await auth();
    if (!userId) {
      console.log('Onboarding API: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!orgId) {
      console.log('Onboarding API: No active organization');
      return NextResponse.json({ error: 'No active organization' }, { status: 400 });
    }

    console.log('Onboarding API: User authenticated:', userId, 'Org:', orgId);

    // Parse the request body to get onboarding data
    const body = await req.json();
    const { product, category, competitors } = body;

    console.log('Onboarding API: Received data:', { product, category, competitorsCount: competitors?.length });

    // Update organization with onboarding data
    const { error: orgUpdateError } = await supabaseAdmin
      .from('orgs')
      .update({
        name: product ? `${product} Organization` : undefined,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('clerk_org_id', orgId);

    if (orgUpdateError) {
      console.error('Onboarding API: Failed to update organization:', orgUpdateError);
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    // Insert/update competitors if provided
    if (competitors && competitors.length > 0) {
      // First, delete existing competitors for this org
      await supabaseAdmin
        .from('competitors')
        .delete()
        .eq('clerk_org_id', orgId);

      // Insert new competitors
      const competitorsToInsert = competitors
        .filter((c: { name: string }) => c.name.trim()) // Only insert competitors with names
        .map((c: { name: string; aliases?: string }) => ({
          clerk_org_id: orgId,
          name: c.name.trim(),
          aliases: c.aliases ? c.aliases.split(',').map((a: string) => a.trim()).filter((a: string) => a) : []
        }));

      if (competitorsToInsert.length > 0) {
        const { error: competitorsError } = await supabaseAdmin
          .from('competitors')
          .insert(competitorsToInsert);

        if (competitorsError) {
          console.error('Onboarding API: Failed to insert competitors:', competitorsError);
          // Don't fail the whole request for competitor insertion errors
        } else {
          console.log('Onboarding API: Inserted', competitorsToInsert.length, 'competitors');
        }
      }
    }

    console.log('Onboarding API: Onboarding completed for user:', userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding completed successfully',
      userId: userId,
      orgId: orgId
    });

  } catch (error: unknown) {
    console.error('Onboarding API: Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
