import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  console.log('Auth callback: Starting authentication flow');
  
  try {
    // Get Clerk session and user
    const { userId, orgId } = await auth();
    
    if (!userId) {
      console.log('Auth callback: No user found, redirecting to sign-in');
      return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }

    console.log('Auth callback: User authenticated:', userId, 'Org:', orgId);

    // Simple redirect based on org status
    if (orgId) {
      console.log('Auth callback: User has active org, redirecting to /app');
      return NextResponse.redirect(new URL('/app', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    } else {
      console.log('Auth callback: No active org, redirecting to /app (will show org selection)');
      return NextResponse.redirect(new URL('/app', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }

  } catch (error) {
    console.error('Auth callback: Unexpected error:', error);
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}
