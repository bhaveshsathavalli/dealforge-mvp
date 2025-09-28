import { NextResponse } from 'next/server';
import { auth, createClerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.redirect(new URL('/sign-in', base));
  if (!orgId)  return NextResponse.redirect(new URL('/dashboard', base));

  const cc = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const mem = await cc.users.getOrganizationMembershipList({ userId, limit: 1 });
  const userMembership = mem.data.find(m => m.organization.id === orgId);
  const role = (userMembership?.role as 'admin' | 'member') ?? 'member';

  // Always redirect to dashboard - onboarding removed
  return NextResponse.redirect(new URL('/dashboard', base));
}
