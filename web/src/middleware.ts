// web/src/middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files
    "/((?!_next|.*\\..*|favicon.ico|robots.txt|sitemap.xml).*)",
    // Always run on API routes
    "/(api|trpc)(.*)",
  ],
};
