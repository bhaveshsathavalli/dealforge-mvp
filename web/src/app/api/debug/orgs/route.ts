import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        userId: !!userId,
        orgId: !!orgId
      }, { status: 401 });
    }

    // Check what's in the orgs table
    const { data: allOrgs, error: allOrgsError } = await supabaseAdmin
      .from('orgs')
      .select('id, name, clerk_org_id, product_name, plan_type, created_at')
      .order('created_at', { ascending: false });

    // Check specific org
    const { data: specificOrg, error: specificOrgError } = await supabaseAdmin
      .from('orgs')
      .select('id, name, clerk_org_id, product_name, plan_type, created_at')
      .eq('clerk_org_id', orgId)
      .single();

    return NextResponse.json({
      userId,
      orgId,
      allOrgs: allOrgs || [],
      allOrgsError: allOrgsError?.message,
      specificOrg: specificOrg || null,
      specificOrgError: specificOrgError?.message,
    });

  } catch (error: unknown) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

