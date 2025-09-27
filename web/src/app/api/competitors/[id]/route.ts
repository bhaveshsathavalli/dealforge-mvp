import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const DELETE = withOrgId(async ({ orgId }, req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const sb = supabaseServer();

    // Delete competitor (soft delete by setting active = false)
    const { data: deletedCompetitor, error: deleteError } = await sb
      .from('competitors')
      .update({ active: false })
      .eq('id', id)
      .eq('org_id', orgId) // Ensure user can only delete their org's competitors
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
});
