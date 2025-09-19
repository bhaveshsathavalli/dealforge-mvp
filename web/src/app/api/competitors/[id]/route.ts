import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  console.log('Competitor API: PUT /api/competitors/[id] called');
  
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('Competitor API: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Competitor API: User authenticated:', user.id);

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.log('Competitor API: No organization membership found');
      return NextResponse.json({ error: 'No organization membership' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { name, aliases } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Competitor name is required' }, { status: 400 });
    }

    console.log('Competitor API: Updating competitor:', { id, name, aliases });

    // Update competitor
    const { data: updatedCompetitor, error: updateError } = await supabase
      .from('competitors')
      .update({
        name: name.trim(),
        aliases: aliases ? aliases.split(',').map((a: string) => a.trim()).filter((a: string) => a) : []
      })
      .eq('id', id)
      .eq('org_id', membership.org_id) // Ensure user can only update their org's competitors
      .select('id, name, aliases')
      .single();

    if (updateError) {
      console.error('Competitor API: Failed to update competitor:', updateError);
      return NextResponse.json({ error: 'Failed to update competitor' }, { status: 500 });
    }

    if (!updatedCompetitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    console.log('Competitor API: Updated competitor:', updatedCompetitor.id);
    return NextResponse.json({ 
      success: true, 
      competitor: updatedCompetitor 
    });

  } catch (error: unknown) {
    console.error('Competitor API: Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  console.log('Competitor API: DELETE /api/competitors/[id] called');
  
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('Competitor API: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Competitor API: User authenticated:', user.id);

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.log('Competitor API: No organization membership found');
      return NextResponse.json({ error: 'No organization membership' }, { status: 403 });
    }

    console.log('Competitor API: Deleting competitor:', id);

    // Delete competitor
    const { error: deleteError } = await supabase
      .from('competitors')
      .delete()
      .eq('id', id)
      .eq('org_id', membership.org_id); // Ensure user can only delete their org's competitors

    if (deleteError) {
      console.error('Competitor API: Failed to delete competitor:', deleteError);
      return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 });
    }

    console.log('Competitor API: Deleted competitor:', id);
    return NextResponse.json({ 
      success: true, 
      message: 'Competitor deleted successfully' 
    });

  } catch (error: unknown) {
    console.error('Competitor API: Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
