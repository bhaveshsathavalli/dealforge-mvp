// src/app/api/debug/whoami/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  // Get the authenticated user from Clerk
  const { userId, sessionId } = await auth();
  
  return NextResponse.json({
    user: userId ? { id: userId, sessionId } : null,
    authenticated: !!userId,
  });
}