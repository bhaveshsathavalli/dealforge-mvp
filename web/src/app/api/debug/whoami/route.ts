import { NextResponse } from 'next/server';
import { resolveOrgContext, OrgContextError } from '@/server/orgContext';

export async function GET(req: Request) {
  try {
    const context = await resolveOrgContext(req);
    
    console.info('team.debug', JSON.stringify({
      evt: 'whoami',
      clerkUserId: context.clerkUserId,
      clerkOrgId: context.clerkOrgId,
      role: context.role
    }));
    
    return NextResponse.json({
      ok: true,
      data: {
        clerkUserId: context.clerkUserId,
        clerkOrgId: context.clerkOrgId,
        role: context.role
      }
    });
  } catch (error) {
    if (error instanceof OrgContextError) {
      const status = error.code === 'UNAUTHENTICATED' ? 401 : 403;
      return NextResponse.json({
        ok: false,
        error: { code: error.code, message: error.message }
      }, { status });
    }
    
    console.error('team.debug', JSON.stringify({
      evt: 'whoami_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    
    return NextResponse.json({
      ok: false,
      error: { code: 'INTERNAL', message: 'Internal server error' }
    }, { status: 500 });
  }
}
