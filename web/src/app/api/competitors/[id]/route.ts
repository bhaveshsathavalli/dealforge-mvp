import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Get organization data using service role
    const { data: org, error: orgError } = await supabaseAdmin
      .from("orgs")
      .select("id")
      .eq('clerk_org_id', orgId)
      .single();
      
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Delete competitor (soft delete by setting active = false)
    const { data: deletedCompetitor, error: deleteError } = await supabaseAdmin
      .from('competitors')
      .update({ active: false })
      .eq('id', id)
      .eq('org_id', org.id) // Ensure user can only delete their org's competitors
      .select('id, name')
      .single();

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedCompetitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Competitor deleted successfully' 
    });

  } catch (error: unknown) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
