import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureOrg, EnsureOrgInput } from '@/server/ensureOrg';

export async function POST(req: Request) {
  try {
    const { userId, orgId: clerkOrgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!clerkOrgId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    // Parse request body for optional name and slug
    let body: Partial<EnsureOrgInput> = {};
    try {
      const contentType = req.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await req.json();
      }
    } catch (error) {
      console.warn('Failed to parse request body, using defaults:', error);
    }

    // Validate input
    const input: EnsureOrgInput = {
      clerkOrgId,
      name: body.name,
      slug: body.slug
    };

    // Call ensureOrg function
    const result = await ensureOrg(input);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/orgs/ensure:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
