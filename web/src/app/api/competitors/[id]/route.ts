import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';
import { logCompetitorDelete, serialize } from '@/lib/logs';
import { z } from 'zod';

const CompetitorIdSchema = z.string().uuid();

export const DELETE = withOrgId(async ({ orgId, role, clerkUserId }: { orgId: string | null; role: 'admin' | 'member'; clerkUserId: string }, req: Request) => {
  try {
    // Extract ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    // Validate competitor ID
    const idValidation = CompetitorIdSchema.safeParse(id);
    if (!idValidation.success) {
      logCompetitorDelete({
        event: 'validation_error',
        orgId,
        userId: clerkUserId,
        id,
        error: 'Invalid competitor ID format'
      });
      return NextResponse.json({
        ok: false,
        error: { code: 'INVALID_ID', message: 'Invalid competitor ID format' }
      }, { status: 400 });
    }
    
    // Check authentication
    if (!clerkUserId) {
      logCompetitorDelete({
        event: 'auth_error',
        orgId,
        userId: clerkUserId,
        id,
        error: 'No authenticated user'
      });
      return NextResponse.json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' }
      }, { status: 401 });
    }
    
    // Check organization
    if (!orgId) {
      logCompetitorDelete({
        event: 'org_error',
        orgId,
        userId: clerkUserId,
        id,
        error: 'No organization found'
      });
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'Organization not found' }
      }, { status: 401 });
    }
    
    // Check admin role
    if (role !== 'admin') {
      logCompetitorDelete({
        event: 'authz_error',
        orgId,
        userId: clerkUserId,
        id,
        role,
        error: 'Admin access required'
      });
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }
    
    const sb = supabaseServer();

    // First, verify the competitor exists and belongs to the org
    const { data: existingCompetitor, error: fetchError } = await sb
      .from('competitors')
      .select('id, name, org_id, active')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (fetchError) {
      logCompetitorDelete({
        event: 'fetch_error',
        orgId,
        userId: clerkUserId,
        id,
        error: serialize(fetchError)
      });
      return NextResponse.json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Competitor not found' }
      }, { status: 404 });
    }

    if (!existingCompetitor) {
      logCompetitorDelete({
        event: 'not_found',
        orgId,
        userId: clerkUserId,
        id,
        error: 'Competitor not found in organization'
      });
      return NextResponse.json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Competitor not found' }
      }, { status: 404 });
    }

    // Soft delete by setting active = false
    const { data: deletedCompetitor, error: deleteError } = await sb
      .from('competitors')
      .update({ active: false })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id, name')
      .single();

    if (deleteError) {
      logCompetitorDelete({
        event: 'delete_error',
        orgId,
        userId: clerkUserId,
        id,
        error: serialize(deleteError)
      });
      return NextResponse.json({
        ok: false,
        error: { code: 'INTERNAL', message: 'Delete failed' }
      }, { status: 500 });
    }

    if (!deletedCompetitor) {
      logCompetitorDelete({
        event: 'delete_no_result',
        orgId,
        userId: clerkUserId,
        id,
        error: 'No competitor returned after delete'
      });
      return NextResponse.json({
        ok: false,
        error: { code: 'INTERNAL', message: 'Delete failed' }
      }, { status: 500 });
    }

    logCompetitorDelete({
      event: 'success',
      orgId,
      userId: clerkUserId,
      id,
      competitorName: deletedCompetitor.name
    });

    return NextResponse.json({ ok: true });

  } catch (error: unknown) {
    // Extract ID from URL for error logging
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const errorId = pathParts[pathParts.length - 1];
    
    logCompetitorDelete({
      event: 'error',
      orgId,
      userId: clerkUserId,
      id: errorId,
      error: serialize(error)
    });
    return NextResponse.json({
      ok: false,
      error: { code: 'INTERNAL', message: 'Delete failed' }
    }, { status: 500 });
  }
});
