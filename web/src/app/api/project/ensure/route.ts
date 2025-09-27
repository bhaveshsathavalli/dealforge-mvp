import { NextResponse } from 'next/server';
import { withOrg } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const POST = withOrg(async ({ orgId, clerkUserId }) => {
  try {
    const supabase = supabaseServer();

    // User already has an org (guaranteed by withOrg wrapper)
    return NextResponse.json({ 
      projectId: orgId,
      message: 'Using existing organization'
    });

  } catch (error: unknown) {
    console.error('Project ensure error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
