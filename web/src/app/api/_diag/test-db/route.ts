import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST() {
  try {
    const { userId, orgId } = await auth();
    
    console.log('Test API: userId =', userId, 'orgId =', orgId);
    
    if (!userId || !orgId) {
      return NextResponse.json({ 
        error: 'Authentication required',
        userId,
        orgId 
      }, { status: 401 });
    }

    // Test direct database access with service role
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/query_runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        clerk_org_id: orgId,
        clerk_user_id: userId,
        query_text: 'Test query from API',
        status: 'collecting'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Database error:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Database insert failed',
        status: response.status,
        details: errorText
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Test run created successfully',
      userId,
      orgId
    });
  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error.message 
    }, { status: 500 });
  }
}
