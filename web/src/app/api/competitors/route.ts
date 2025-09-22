import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get organization data using service role
    const { data: org, error: orgError } = await supabaseAdmin
      .from("orgs")
      .select("id")
      .eq('clerk_org_id', orgId)
      .single();
      
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get competitors for the organization
    const { data: competitors, error: competitorsError } = await supabaseAdmin
      .from('competitors')
      .select('id, name, website, slug, active, aliases')
      .eq('org_id', org.id)
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
}

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

    // Get organization data using service role
    const { data: org, error: orgError } = await supabaseAdmin
      .from("orgs")
      .select("id")
      .eq('clerk_org_id', orgId)
      .single();
      
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Insert new competitor
    const { data: newCompetitor, error: insertError } = await supabaseAdmin
      .from('competitors')
      .insert({
        org_id: org.id,
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
}
