import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { projectId, query } = body;

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Debug: Check if the org exists
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, name')
      .eq('id', projectId)
      .single();

    // Debug: Check current memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('org_members')
      .select('org_id, user_id, role')
      .eq('user_id', user.id);

    // Debug: Check specific membership
    const { data: specificMembership, error: specificError } = await supabase
      .from('org_members')
      .select('org_id, user_id, role')
      .eq('org_id', projectId)
      .eq('user_id', user.id)
      .single();

    // Try to insert membership
    const { data: insertResult, error: insertError } = await supabase
      .from('org_members')
      .insert({
        org_id: projectId,
        user_id: user.id,
        role: 'admin'
      })
      .select();

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      projectId,
      org: org || null,
      orgError: orgError?.message,
      memberships: memberships || [],
      membershipsError: membershipsError?.message,
      specificMembership: specificMembership || null,
      specificError: specificError?.message,
      insertResult: insertResult || null,
      insertError: insertError?.message,
    });

  } catch (error: unknown) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
