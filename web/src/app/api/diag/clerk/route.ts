import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { ENV } from '@/lib/env';

export async function GET(req: Request) {
  try {
    const { userId, orgId, sessionClaims } = await auth();
    
    // Basic environment check
    const env = {
      secretKeyPresent: !!ENV.CLERK_SECRET_KEY,
      publishableKeyPresent: !!ENV.CLERK_PUBLISHABLE_KEY,
      instanceIdPresent: !!ENV.CLERK_INSTANCE_ID,
    };

    if (!userId) {
      return NextResponse.json({
        ok: true,
        data: {
          userId: null,
          orgId: null,
          role: null,
          canInvite: false,
          env,
        }
      });
    }

    // Get role from sessionClaims or membership lookup
    let role: string | null = null;
    let canInvite = false;
    let clerkError: any = null;

    if (orgId) {
      try {
        // First try to get role from sessionClaims
        role = sessionClaims?.org_role as string || null;
        
        // If not in sessionClaims, look up membership
        if (!role) {
          const memberships = await clerkClient.organizations.getOrganizationMembershipList({
            organizationId: orgId,
            limit: 100
          });
          
          const me = memberships.data.find(m => m.publicUserData?.userId === userId);
          if (me) {
            role = me.role;
          }
        }

        // Check if user can invite (must be org:admin)
        canInvite = role === 'org:admin';

        // Test Clerk API with a noop probe (get organization)
        if (canInvite) {
          try {
            await clerkClient.organizations.getOrganization({ organizationId: orgId });
          } catch (probeError: any) {
            canInvite = false;
            clerkError = probeError?.errors?.[0] || { code: 'PROBE_FAILED', message: probeError.message };
          }
        }

        console.info('diag.clerk', JSON.stringify({
          evt: 'success',
          userId,
          orgId,
          role,
          canInvite,
          env
        }));

      } catch (error: any) {
        clerkError = error?.errors?.[0] || { code: 'MEMBERSHIP_LOOKUP_FAILED', message: error.message };
        
        console.error('diag.clerk', JSON.stringify({
          evt: 'error',
          userId,
          orgId,
          error: clerkError
        }));
      }
    }

    const response = {
      ok: true,
      data: {
        userId,
        orgId,
        role,
        canInvite,
        env,
        dryRun: canInvite ? { success: true } : undefined
      }
    };

    // Include Clerk error if present
    if (clerkError) {
      (response as any).clerkError = {
        code: clerkError.code,
        message: clerkError.message
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('diag.clerk', JSON.stringify({
      evt: 'fatal_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    
    return NextResponse.json({
      ok: false,
      error: { 
        code: 'DIAG_ERROR', 
        message: 'Diagnostic failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}
