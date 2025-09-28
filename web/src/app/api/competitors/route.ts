import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const GET = withOrgId(async ({ orgId, role }) => {
  try {
    const sb = supabaseServer();

    // Get competitors for the organization
    const { data: competitors, error: competitorsError } = await sb
      .from('competitors')
      .select('id, name, website, slug, active, aliases')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (competitorsError) {
      return NextResponse.json({ error: competitorsError.message }, { status: 500 });
    }

    return NextResponse.json({ competitors: competitors || [] });

  } catch (error: unknown) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

export const POST = withOrgId(async ({ orgId, role }, req: Request) => {
  try {
    console.log('POST competitor request:', { orgId, role });
    
    // Check if orgId is available
    if (!orgId) {
      console.error('No orgId available for competitor creation');
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }
    
    // Handle both JSON and FormData requests
    let name: string, website: string | undefined, aliases: string[] = [];
    
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await req.json();
      name = String(body.name ?? '').trim();
      website = body.website ? String(body.website).trim() : undefined;
      aliases = Array.isArray(body.aliases) ? body.aliases : [];
    } else {
      const formData = await req.formData();
      name = String(formData.get('name') ?? '').trim();
      website = String(formData.get('website') ?? '').trim() || undefined;
      const aliasesString = String(formData.get('aliases') ?? '').trim();
      aliases = aliasesString ? aliasesString.split(',').map(a => a.trim()).filter(a => a) : [];
    }

    if (!name) {
      return NextResponse.json({ error: 'Competitor name is required' }, { status: 400 });
    }

    // Only admins can create competitors
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const sb = supabaseServer();

    // Insert new competitor
    const { data: newCompetitor, error: insertError } = await sb
      .from('competitors')
      .insert({
        org_id: orgId,
        name: name,
        website: website,
        aliases: aliases,
        active: true
      })
      .select('id, name, website, slug, active, aliases')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      competitor: newCompetitor
    });

  } catch (error: unknown) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
