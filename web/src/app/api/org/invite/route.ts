import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const POST = withOrgId(async ({ orgId, clerkOrgId, role }, req: Request) => {
  try {
    if (role !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    const { email } = await req.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({
        ok: false,
        error: { code: 'INVALID_EMAIL', message: 'Valid email is required' }
      }, { status: 400 });
    }

    const sb = supabaseServer();

    // For testing, we'll create a mock user and add them to the org
    // In production, this would integrate with Clerk's invitation system
    const mockUserId = `user_${Math.random().toString(36).slice(2, 10)}`;
    
    // Create profile
    const { error: profileError } = await sb
      .from('profiles')
      .upsert({
        clerk_user_id: mockUserId,
        email: email,
        name: email.split('@')[0],
      }, { onConflict: 'clerk_user_id' });

    if (profileError) {
      return NextResponse.json({
        ok: false,
        error: { code: 'DB_ERROR', message: profileError.message }
      }, { status: 500 });
    }

    // Add to org membership
    const { error: membershipError } = await sb
      .from('org_memberships')
      .upsert({
        clerk_org_id: clerkOrgId,
        clerk_user_id: mockUserId,
        role: 'member',
      }, { onConflict: 'clerk_user_id' });

    if (membershipError) {
      return NextResponse.json({
        ok: false,
        error: { code: 'DB_ERROR', message: membershipError.message }
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Member invited successfully'
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: { 
        code: 'INTERNAL', 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
});