// web/src/middleware.ts
import { clerkMiddleware, createClerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabaseAdmin";

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth();
  
  // Skip middleware for unauthenticated users on public routes
  if (!userId) {
    return NextResponse.next();
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  // Skip middleware for static files and API routes
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname.includes('.') ||
      pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // If user has no organization, redirect to dashboard
  if (!orgId) {
    if (pathname !== '/dashboard' && pathname !== '/sign-in' && pathname !== '/sign-up') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Redirect any remaining onboarding/welcome routes to dashboard
  if (pathname.startsWith('/welcome') || pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files
    "/((?!_next|.*\\..*|favicon.ico|robots.txt|sitemap.xml).*)",
    // Always run on API routes
    "/(api|trpc)(.*)",
  ],
};
