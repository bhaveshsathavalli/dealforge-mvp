import { NextResponse } from 'next/server';
import { resolveOrgContext, OrgContextError } from '@/server/orgContext';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { z } from 'zod';
import { createHash } from 'crypto';

const acceptSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: Request) {
  try {
    const context = await resolveOrgContext(req);

    if (context.role !== 'admin') {
      throw new OrgContextError('Only admins can accept test invitations', 'FORBIDDEN');
    }

    const body = await req.json();
    const validation = acceptSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors }
      }, { status: 400 });
    }

    const { email } = validation.data;

    // Find pending invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('org_invitations')
      .select('*')
      .eq('clerk_org_id', context.clerkOrgId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'No pending invitation found for this email' }
      }, { status: 404 });
    }

    // Generate a test clerk_user_id
    const clerkUserId = 'user_' + createHash('md5').update(email).digest('hex').substring(0, 16);

    // Create profile if missing
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        clerk_user_id: clerkUserId,
        email,
        name: email.split('@')[0],
        updated_at: new Date().toISOString()
      }, { onConflict: 'clerk_user_id' });

    if (profileError) {
      console.error('team.invite', JSON.stringify({
        event: 'accept_test_profile_error',
        email,
        clerkUserId,
        error: profileError.message
      }));
      return NextResponse.json({
        ok: false,
        error: { code: 'DB_ERROR', message: 'Failed to create profile' }
      }, { status: 500 });
    }

    // Create membership
    const { error: membershipError } = await supabaseAdmin
      .from('org_memberships')
      .upsert({
        clerk_org_id: context.clerkOrgId,
        clerk_user_id: clerkUserId,
        role: invitation.role,
        updated_at: new Date().toISOString()
      }, { onConflict: 'clerk_user_id,clerk_org_id' });

    if (membershipError) {
      console.error('team.invite', JSON.stringify({
        event: 'accept_test_membership_error',
        email,
        clerkUserId,
        error: membershipError.message
      }));
      return NextResponse.json({
        ok: false,
        error: { code: 'DB_ERROR', message: 'Failed to create membership' }
      }, { status: 500 });
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from('org_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('team.invite', JSON.stringify({
        event: 'accept_test_update_error',
        invitationId: invitation.id,
        error: updateError.message
      }));
      // Don't fail the request, just log the error
    }

    console.info('team.invite', JSON.stringify({
      event: 'accept_test',
      orgId: context.clerkOrgId,
      email,
      clerkUserId,
      role: invitation.role,
      invitationId: invitation.id
    }));

    return NextResponse.json({ ok: true });

  } catch (error) {
    if (error instanceof OrgContextError) {
      const status = error.code === 'UNAUTHENTICATED' ? 401 : 403;
      return NextResponse.json({
        ok: false,
        error: { code: error.code, message: error.message }
      }, { status });
    }
    console.error('team.invite', JSON.stringify({
      event: 'accept_test_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    return NextResponse.json({
      ok: false,
      error: { code: 'INTERNAL', message: 'Internal server error' }
    }, { status: 500 });
  }
}
