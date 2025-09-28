import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { clerkUserId, clerkOrgId } = await req.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set('TEST_CLERK_USER', clerkUserId, { httpOnly: true, path: '/' });
  res.cookies.set('TEST_CLERK_ORG', clerkOrgId, { httpOnly: true, path: '/' });
  return res;
}


