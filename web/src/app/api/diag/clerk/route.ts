import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { resolveOrgContext } from '@/server/orgContext';

export async function GET(req: Request) {
  try {
    console.log('invites.clerk', JSON.stringify({ evt: 'diag_start' }));
    
    // Get org context
    const ctx = await resolveOrgContext();
    
    // Environment check
    const env = {
      secretKeyPresent: !!process.env.CLERK_SECRET_KEY,
      publishableKeyPresent: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      instanceIdPresent: !!process.env.CLERK_INSTANCE_ID,
    };

    // Base response
    const response = {
      ok: true,
      data: {
        userId: ctx.userId || null,
        orgId: ctx.orgId || null,
        role: ctx.role || null,
        canInvite: ctx.role === 'admin',
        env,
      }
    };

    // Add context error if present
    if (!ctx.ok) {
      (response as any).contextError = {
        reason: ctx.reason,
        clerkCode: ctx.clerkCode,
        clerkMessage: ctx.clerkMessage
      };
    }

    // Dry run: test organization access if we have orgId
    if (ctx.ok && ctx.orgId) {
      try {
        console.log('invites.clerk', JSON.stringify({ 
          evt: 'dry_run_start', 
          orgId: ctx.orgId 
        }));
        
        await clerkClient.organizations.getOrganization({ 
          organizationId: ctx.orgId 
        });
        
        (response as any).dryRun = { success: true, exists: true };
        
        console.log('invites.clerk', JSON.stringify({ 
          evt: 'dry_run_success', 
          orgId: ctx.orgId 
        }));
        
      } catch (dryRunError: any) {
        console.error('invites.clerk', JSON.stringify({ 
          evt: 'dry_run_failed', 
          orgId: ctx.orgId,
          error: dryRunError.message,
          code: dryRunError?.errors?.[0]?.code 
        }));
        
        (response as any).dryRun = { 
          success: false, 
          exists: false,
          code: dryRunError?.errors?.[0]?.code,
          message: dryRunError.message 
        };
      }
    }

    console.log('invites.clerk', JSON.stringify({ 
      evt: 'diag_success', 
      userId: ctx.userId,
      orgId: ctx.orgId,
      role: ctx.role,
      canInvite: ctx.role === 'admin'
    }));

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('invites.clerk', JSON.stringify({
      evt: 'diag_fatal_error',
      error: error.message
    }));
    
    return NextResponse.json({
      ok: false,
      error: { 
        code: 'DIAG_ERROR', 
        message: 'Diagnostic failed',
        details: error.message
      }
    }, { status: 500 });
  }
}