import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  console.log('Competitors API: GET /api/competitors called');
  
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('Competitors API: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Competitors API: User authenticated:', user.id);

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.log('Competitors API: No organization membership found');
      return NextResponse.json({ error: 'No organization membership' }, { status: 403 });
    }

    // Get competitors for the organization
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('id, name, aliases')
      .eq('org_id', membership.org_id)
      .order('name');

    if (competitorsError) {
      console.error('Competitors API: Error fetching competitors:', competitorsError);
      return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
    }

    console.log('Competitors API: Returning', competitors?.length || 0, 'competitors');
    return NextResponse.json({ competitors: competitors || [] });

  } catch (error: unknown) {
    console.error('Competitors API: Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  console.log('Competitors API: POST /api/competitors called');
  
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('Competitors API: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Competitors API: User authenticated:', user.id);

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.log('Competitors API: No organization membership found');
      return NextResponse.json({ error: 'No organization membership' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { name, aliases } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Competitor name is required' }, { status: 400 });
    }

    console.log('Competitors API: Creating competitor:', { name, aliases });

    // Insert new competitor
    const { data: newCompetitor, error: insertError } = await supabase
      .from('competitors')
      .insert({
        org_id: membership.org_id,
        name: name.trim(),
        aliases: aliases ? aliases.split(',').map((a: string) => a.trim()).filter((a: string) => a) : []
      })
      .select('id, name, aliases')
      .single();

    if (insertError) {
      console.error('Competitors API: Failed to create competitor:', insertError);
      return NextResponse.json({ error: 'Failed to create competitor' }, { status: 500 });
    }

    console.log('Competitors API: Created competitor:', newCompetitor.id);
    return NextResponse.json({ 
      success: true, 
      competitor: newCompetitor 
    });

  } catch (error: unknown) {
    console.error('Competitors API: Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
